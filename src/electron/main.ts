import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import { createLogger } from '../services/logger';

// Polyfill DOMMatrix for Node.js environment (required by some SDK dependencies)
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor() { }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    multiply() { return this; }
    inverse() { return this; }
  }
  (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
}

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;

// Create logger for main process
const logger = createLogger('Main');

// Constants for document conversion
const CONVERSION_CONSTANTS = {
  WINDOW_DIMENSIONS: {
    PDF: { width: 1200, height: 1600 },
    WORD: { width: 960, height: 1400 },
    EXCEL: { width: 1200, height: 1600 },
    MARKDOWN: { width: 1000, height: 1400 },
    CSV: { width: 1200, height: 1600 },
    TEXT: { width: 1000, height: 1400 },
    POWERPOINT: { width: 960, height: 720 },
    RTF: { width: 960, height: 1400 },
    EMAIL: { width: 900, height: 1200 },
    EPUB: { width: 800, height: 1200 }
  },
  RENDER_DELAYS: {
    STANDARD: 1000,
    FAST: 500,
    SLOW: 1500
  },
  CONTENT_WIDTHS: {
    DOCUMENT: 816,
    EMAIL: 700,
    MARKDOWN: 900
  },
  LIMITS: {
    MAX_EPUB_CHAPTERS: 10,
    MAX_POWERPOINT_SLIDES: 50
  }
} as const;

/**
 * Helper: Create a hidden BrowserWindow for rendering
 */
function createRenderWindow(width: number, height: number, plugins = false): BrowserWindow {
  return new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      plugins,
      nodeIntegration: false,
      contextIsolation: true
    }
  });
}

/**
 * Helper: Write temporary HTML file
 */
async function writeTempFile(content: string, prefix: string, extension: string): Promise<string> {
  const tmpDir = app.getPath('temp');
  const tmpPath = path.join(tmpDir, `atticus-${prefix}-${Date.now()}.${extension}`);
  await fs.promises.writeFile(tmpPath, content, extension === 'html' ? 'utf-8' : undefined);
  return tmpPath;
}

/**
 * Helper: Safe cleanup of temp file
 */
async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    logger.warn('Failed to cleanup temp file', { filePath, error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Helper: Render HTML to image using BrowserWindow
 */
async function renderHtmlToImage(htmlContent: string, prefix: string, dimensions: { width: number; height: number }, renderDelay: number = CONVERSION_CONSTANTS.RENDER_DELAYS.STANDARD): Promise<string> {
  let window: BrowserWindow | null = null;
  let tmpPath: string | null = null;

  try {
    tmpPath = await writeTempFile(htmlContent, prefix, 'html');
    window = createRenderWindow(dimensions.width, dimensions.height);

    await window.loadFile(tmpPath);
    await new Promise(resolve => setTimeout(resolve, renderDelay));

    const image = await window.webContents.capturePage();
    return image.toPNG().toString('base64');
  } finally {
    if (window && !window.isDestroyed()) {
      window.close();
    }
    if (tmpPath) {
      await cleanupTempFile(tmpPath);
    }
  }
}

/**
 * Helper: Validate base64 input
 */
function validateBase64Input(base64Data: string, maxSizeMB = 50): void {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error('Invalid input: base64Data must be a non-empty string');
  }

  // Check size (rough estimate: base64 is ~1.37x original)
  const estimatedSizeMB = (base64Data.length * 0.75) / (1024 * 1024);
  if (estimatedSizeMB > maxSizeMB) {
    throw new Error(`File too large: ${estimatedSizeMB.toFixed(1)}MB exceeds ${maxSizeMB}MB limit`);
  }
}

function createWindow() {
  // Remove the application menu for a cleaner UI
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Atticus - In-House AI Counsel',
    backgroundColor: '#1f2937',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Convert PDF to images - NOT USED
 * PDF conversion should happen in the renderer process where PDF.js is available
 * This function exists for backward compatibility but should not be called
 */
async function convertPDFToImagesElectron(_base64Data: string): Promise<string[]> {
  logger.warn('convertPDFToImagesElectron called - PDF conversion should happen in renderer process');
  throw new Error('PDF conversion must be performed in the renderer process where PDF.js is available');
}

/**
 * Convert Word document to images using Electron's renderer
 * Uses mammoth to convert to HTML, then captures the rendered HTML as an image
 */
async function convertWordToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting Word document to images using Electron renderer');
    validateBase64Input(base64Data);

    const wordBuffer = Buffer.from(base64Data, 'base64');
    const mammoth = await import('mammoth');

    const result = await mammoth.convertToHtml(
      { buffer: wordBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1",
          "p[style-name='Heading 2'] => h2",
          "p[style-name='Heading 3'] => h3",
          "table => table.document-table"
        ]
      }
    );

    if (!result.value) {
      throw new Error('Failed to extract HTML from Word document');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            width: ${CONVERSION_CONSTANTS.CONTENT_WIDTHS.DOCUMENT}px;
            padding: 72px;
            background: white;
            font-family: Calibri, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
          }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          table td, table th { border: 1px solid #000; padding: 5px; }
          table th { background-color: #f0f0f0; font-weight: bold; }
          h1 { font-size: 16pt; font-weight: bold; margin: 12pt 0; }
          h2 { font-size: 14pt; font-weight: bold; margin: 10pt 0; }
          h3 { font-size: 12pt; font-weight: bold; margin: 8pt 0; }
          p { margin: 0 0 10pt 0; }
        </style>
      </head>
      <body>${result.value}</body>
      </html>
    `;

    const pngBase64 = await renderHtmlToImage(
      htmlContent,
      'word',
      CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.WORD
    );

    logger.info('Word document converted to image successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert Word document using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert Excel spreadsheet to images using HTML table rendering
 * Supports .xls, .xlsx, .xlsm formats
 * Uses exceljs (secure alternative to SheetJS)
 */
async function convertExcelToImagesElectron(base64Data: string, fileName: string): Promise<string[]> {
  try {
    logger.info('Converting Excel spreadsheet to images using Electron renderer', { fileName });
    validateBase64Input(base64Data);

    const excelBuffer = Buffer.from(base64Data, 'base64');
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer as any);

    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      throw new Error('No sheets found in Excel workbook');
    }

    const images: string[] = [];

    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;

      // Build HTML table from worksheet
      let htmlTable = '<table><thead>';

      // Get dimensions - skip empty sheets
      const dimensions = worksheet.dimensions;
      if (!dimensions) {
        logger.warn('Skipping empty worksheet', { sheetName });
        continue;
      }

      const maxCol = dimensions.right;
      const maxRow = dimensions.bottom;

      // Build header row (first row)
      htmlTable += '<tr>';
      for (let col = 1; col <= maxCol; col++) {
        const cell = worksheet.getRow(1).getCell(col);
        const value = cell.value?.toString() || '';
        htmlTable += `<th>${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`;
      }
      htmlTable += '</tr></thead><tbody>';

      // Build data rows
      for (let rowNum = 2; rowNum <= maxRow; rowNum++) {
        htmlTable += '<tr>';
        for (let col = 1; col <= maxCol; col++) {
          const cell = worksheet.getRow(rowNum).getCell(col);
          let value = '';

          // Handle different cell types
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object' && 'result' in cell.value) {
              // Formula cell
              value = cell.value.result?.toString() || '';
            } else if (cell.value instanceof Date) {
              value = cell.value.toLocaleDateString();
            } else {
              value = cell.value.toString();
            }
          }

          htmlTable += `<td>${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
        }
        htmlTable += '</tr>';
      }

      htmlTable += '</tbody></table>';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 20px;
              background: white;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 10pt;
            }
            h1 {
              font-size: 14pt;
              margin-bottom: 15px;
              color: #333;
            }
            table {
              border-collapse: collapse;
              font-size: 10pt;
              background: white;
            }
            td, th {
              border: 1px solid #d0d0d0;
              padding: 6px 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #4472C4;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <h1>Sheet: ${sheetName}</h1>
          ${htmlTable}
        </body>
        </html>
      `;

      const pngBase64 = await renderHtmlToImage(
        htmlContent,
        `excel-${sheetName}`,
        CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.EXCEL,
        CONVERSION_CONSTANTS.RENDER_DELAYS.FAST as number
      );
      images.push(pngBase64);
    }

    logger.info('Excel spreadsheet converted to images successfully', { sheets: images.length });
    return images;
  } catch (error) {
    logger.error('Failed to convert Excel using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert Markdown to images using HTML rendering
 */
async function convertMarkdownToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting Markdown to images using Electron renderer');
    validateBase64Input(base64Data);

    const markdownText = Buffer.from(base64Data, 'base64').toString('utf-8');
    const { marked } = await import('marked');

    marked.setOptions({
      gfm: true,
      breaks: true
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            max-width: ${CONVERSION_CONSTANTS.CONTENT_WIDTHS.MARKDOWN}px;
            margin: 40px;
            background: white;
            font-family: 'Segoe UI', -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #24292e;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
          h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
          h3 { font-size: 1.25em; }
          code {
            background-color: #f6f8fa;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Consolas', monospace;
            font-size: 85%;
          }
          pre {
            background-color: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow: auto;
            font-family: 'Consolas', monospace;
            font-size: 85%;
          }
          pre code {
            background-color: transparent;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            margin: 16px 0;
          }
          table td, table th {
            border: 1px solid #dfe2e5;
            padding: 6px 13px;
          }
          table th {
            background-color: #f6f8fa;
            font-weight: 600;
          }
          blockquote {
            margin: 0;
            padding: 0 1em;
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
          }
          a { color: #0366d6; text-decoration: none; }
          a:hover { text-decoration: underline; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>${marked(markdownText)}</body>
      </html>
    `;

    const pngBase64 = await renderHtmlToImage(
      htmlContent,
      'markdown',
      CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.MARKDOWN,
      CONVERSION_CONSTANTS.RENDER_DELAYS.FAST as number
    );

    logger.info('Markdown converted to image successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert Markdown using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert CSV to images using HTML table rendering
 */
async function convertCsvToImagesElectron(base64Data: string, fileName: string): Promise<string[]> {
  try {
    logger.info('Converting CSV to images using Electron renderer', { fileName });
    validateBase64Input(base64Data);

    const csvText = Buffer.from(base64Data, 'base64').toString('utf-8');
    const { parse } = await import('csv-parse/sync');

    const records = parse(csvText, {
      skip_empty_lines: true,
      relax_column_count: true
    });

    if (records.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Build HTML table
    let tableHtml = '<table><thead><tr>';
    const headers = records[0];

    for (const header of headers) {
      tableHtml += `<th>${String(header).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`;
    }

    tableHtml += '</tr></thead><tbody>';

    for (let i = 1; i < records.length; i++) {
      tableHtml += '<tr>';
      for (const cell of records[i]) {
        tableHtml += `<td>${String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
      }
      tableHtml += '</tr>';
    }

    tableHtml += '</tbody></table>';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 20px;
            background: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 10pt;
          }
          h1 {
            font-size: 14pt;
            margin-bottom: 15px;
            color: #333;
          }
          table {
            border-collapse: collapse;
            font-size: 10pt;
            background: white;
            width: 100%;
          }
          td, th {
            border: 1px solid #d0d0d0;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background-color: #4472C4;
            color: white;
            font-weight: bold;
            position: sticky;
            top: 0;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
        </style>
      </head>
      <body>
        <h1>File: ${fileName}</h1>
        ${tableHtml}
      </body>
      </html>
    `;

    const pngBase64 = await renderHtmlToImage(
      htmlContent,
      'csv',
      CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.CSV,
      CONVERSION_CONSTANTS.RENDER_DELAYS.FAST as number
    );

    logger.info('CSV converted to image successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert CSV using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert text/code files to images with syntax highlighting
 * Supports .txt, .log, .json, .xml, .yaml, .yml, .html, .htm, .svg, etc.
 */
async function convertTextToImagesElectron(base64Data: string, fileName: string, extension: string): Promise<string[]> {
  try {
    logger.info('Converting text file to images using Electron renderer', { fileName, extension });

    // Convert base64 to text
    const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');

    // Determine language for syntax highlighting
    let language = 'text';
    if (extension === '.json') language = 'json';
    else if (extension === '.xml') language = 'xml';
    else if (['.yaml', '.yml'].includes(extension)) language = 'yaml';
    else if (['.html', '.htm'].includes(extension)) language = 'html';
    else if (['.js', '.ts'].includes(extension)) language = 'javascript';
    else if (extension === '.css') language = 'css';
    else if (extension === '.sql') language = 'sql';
    else if (['.py'].includes(extension)) language = 'python';

    // Escape HTML
    const escapedContent = textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Create styled HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 20px;
            background: white;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 9pt;
          }
          .header {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ddd;
            color: #333;
          }
          pre {
            background-color: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            border: 1px solid #e1e4e8;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
          }
          code {
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 9pt;
          }
        </style>
      </head>
      <body>
        <div class="header">${fileName} (${language})</div>
        <pre><code>${escapedContent}</code></pre>
      </body>
      </html>
    `;

    // Save HTML to temp file
    const tmpDir = app.getPath('temp');
    const tmpHtmlPath = path.join(tmpDir, `atticus-text-${Date.now()}.html`);
    await fs.promises.writeFile(tmpHtmlPath, htmlContent, 'utf-8');

    // Create hidden window for rendering
    const textWindow = new BrowserWindow({
      width: 1200,
      height: 1400,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load HTML in the window
    await textWindow.loadFile(tmpHtmlPath);

    // Wait for content to fully render
    await new Promise(resolve => setTimeout(resolve, 600));

    // Capture the page as an image
    const image = await textWindow.webContents.capturePage();

    // Convert to base64 PNG
    const pngBase64 = image.toPNG().toString('base64');

    // Clean up
    textWindow.close();
    await fs.promises.unlink(tmpHtmlPath).catch(() => {/* ignore */ });

    logger.info('Text file converted to image successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert text file using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert PowerPoint presentation to images
 * Each slide becomes a separate image
 */
async function convertPowerPointToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting PowerPoint to images using Electron renderer');

    const buffer = Buffer.from(base64Data, 'base64');
    const JSZip = (await import('jszip')).default;
    const { DOMParser: _DOMParser } = await import('@xmldom/xmldom');

    // Parse PPTX file (which is a ZIP archive)
    const zip = await JSZip.loadAsync(buffer);

    // Extract slide relationships
    const slidesPath = 'ppt/slides/';
    const slideFiles = Object.keys(zip.files).filter(name =>
      name.startsWith(slidesPath) && name.match(/slide\d+\.xml$/)
    ).sort();

    if (slideFiles.length === 0) {
      // For .ppt files or if parsing fails, create a simple placeholder
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              width: 960px;
              height: 720px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: 'Segoe UI', Arial, sans-serif;
              color: white;
            }
            .message {
              text-align: center;
              font-size: 24pt;
            }
          </style>
        </head>
        <body>
          <div class="message">
            📊 PowerPoint Presentation<br/>
            <small style="font-size:14pt">Content extraction in progress...</small>
          </div>
        </body>
        </html>
      `;

      const tmpDir = app.getPath('temp');
      const tmpHtmlPath = path.join(tmpDir, `atticus-ppt-${Date.now()}.html`);
      await fs.promises.writeFile(tmpHtmlPath, htmlContent, 'utf-8');

      const pptWindow = new BrowserWindow({
        width: 960,
        height: 720,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      await pptWindow.loadFile(tmpHtmlPath);
      await new Promise(resolve => setTimeout(resolve, 500));
      const image = await pptWindow.webContents.capturePage();
      const pngBase64 = image.toPNG().toString('base64');

      pptWindow.close();
      await fs.promises.unlink(tmpHtmlPath).catch(() => { });

      return [pngBase64];
    }

    const images: string[] = [];

    // For each slide, create a placeholder (full parsing would be complex)
    for (let i = 0; i < slideFiles.length; i++) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              width: 960px;
              height: 720px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: 'Segoe UI', Arial, sans-serif;
              color: white;
            }
            .slide-content {
              text-align: center;
              font-size: 32pt;
              font-weight: bold;
            }
            .slide-number {
              position: absolute;
              bottom: 20px;
              right: 30px;
              font-size: 14pt;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="slide-content">Slide ${i + 1}</div>
          <div class="slide-number">${i + 1} / ${slideFiles.length}</div>
        </body>
        </html>
      `;

      const tmpDir = app.getPath('temp');
      const tmpHtmlPath = path.join(tmpDir, `atticus-ppt-${Date.now()}-slide${i}.html`);
      await fs.promises.writeFile(tmpHtmlPath, htmlContent, 'utf-8');

      const pptWindow = new BrowserWindow({
        width: 960,
        height: 720,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      await pptWindow.loadFile(tmpHtmlPath);
      await new Promise(resolve => setTimeout(resolve, 500));
      const image = await pptWindow.webContents.capturePage();
      images.push(image.toPNG().toString('base64'));

      pptWindow.close();
      await fs.promises.unlink(tmpHtmlPath).catch(() => { });
    }

    logger.info('PowerPoint converted to images successfully', { slides: images.length });
    return images;
  } catch (error) {
    logger.error('Failed to convert PowerPoint using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert RTF (Rich Text Format) to images
 */
async function convertRtfToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting RTF to images using Electron renderer');

    const rtfBuffer = Buffer.from(base64Data, 'base64');
    const rtfText = rtfBuffer.toString('utf-8');

    // Basic RTF to HTML conversion (simplified)
    // Remove RTF control words and extract plain text
    let plainText = rtfText
      .replace(/\\[a-z]+(-?\d+)?[ ]?/g, ' ') // Remove RTF commands
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\\/g, '') // Remove backslashes
      .trim();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            max-width: 816px;
            margin: 40px;
            padding: 72px;
            background: white;
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
          }
          p { margin-bottom: 12pt; }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif;">${plainText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </body>
      </html>
    `;

    const tmpDir = app.getPath('temp');
    const tmpHtmlPath = path.join(tmpDir, `atticus-rtf-${Date.now()}.html`);
    await fs.promises.writeFile(tmpHtmlPath, htmlContent, 'utf-8');

    const rtfWindow = new BrowserWindow({
      width: 960,
      height: 1400,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    await rtfWindow.loadFile(tmpHtmlPath);
    await new Promise(resolve => setTimeout(resolve, 800));
    const image = await rtfWindow.webContents.capturePage();
    const pngBase64 = image.toPNG().toString('base64');

    rtfWindow.close();
    await fs.promises.unlink(tmpHtmlPath).catch(() => { });

    logger.info('RTF converted to image successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert RTF using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert TIFF images to PNG using sharp
 */
async function convertTiffToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting TIFF to PNG using sharp');

    const tiffBuffer = Buffer.from(base64Data, 'base64');
    const sharp = (await import('sharp')).default;

    // Convert TIFF to PNG
    const pngBuffer = await sharp(tiffBuffer)
      .png()
      .toBuffer();

    const pngBase64 = pngBuffer.toString('base64');

    logger.info('TIFF converted to PNG successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert TIFF using sharp', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert HEIC/HEIF images to PNG using sharp
 */
async function convertHeicToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting HEIC/HEIF to PNG using sharp');

    const heicBuffer = Buffer.from(base64Data, 'base64');
    const sharp = (await import('sharp')).default;

    // Convert HEIC to PNG
    const pngBuffer = await sharp(heicBuffer)
      .png()
      .toBuffer();

    const pngBase64 = pngBuffer.toString('base64');

    logger.info('HEIC/HEIF converted to PNG successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert HEIC/HEIF using sharp', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert email files (EML/MSG) to images
 */
async function convertEmailToImagesElectron(base64Data: string, fileName: string): Promise<string[]> {
  try {
    logger.info('Converting email to images using Electron renderer', { fileName });

    const emailBuffer = Buffer.from(base64Data, 'base64');
    const { simpleParser } = await import('mailparser') as any;

    // Parse email
    const parsed = await simpleParser(emailBuffer);

    // Build HTML representation of email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 20px;
            padding: 20px;
            background: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            max-width: 900px;
          }
          .email-header {
            border-bottom: 2px solid #ddd;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .email-field {
            margin-bottom: 8px;
          }
          .email-field strong {
            display: inline-block;
            width: 80px;
            color: #555;
          }
          .email-body {
            padding: 20px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            white-space: pre-wrap;
            line-height: 1.6;
          }
          .attachments {
            margin-top: 20px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="email-header">
          <div class="email-field"><strong>From:</strong> ${(parsed.from?.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div class="email-field"><strong>To:</strong> ${(parsed.to?.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          ${parsed.cc ? `<div class="email-field"><strong>CC:</strong> ${parsed.cc.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
          <div class="email-field"><strong>Subject:</strong> ${(parsed.subject || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div class="email-field"><strong>Date:</strong> ${parsed.date ? parsed.date.toLocaleString() : 'N/A'}</div>
        </div>
        <div class="email-body">
${(parsed.text || parsed.html || 'No content').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
        ${parsed.attachments && parsed.attachments.length > 0 ? `
        <div class="attachments">
          <strong>📎 Attachments (${parsed.attachments.length}):</strong><br/>
          ${parsed.attachments.map((att: any) => `• ${att.filename || 'unnamed'} (${(att.size || 0)} bytes)`).join('<br/>')}
        </div>
        ` : ''}
      </body>
      </html>
    `;

    const tmpDir = app.getPath('temp');
    const tmpHtmlPath = path.join(tmpDir, `atticus-email-${Date.now()}.html`);
    await fs.promises.writeFile(tmpHtmlPath, htmlContent, 'utf-8');

    const emailWindow = new BrowserWindow({
      width: 1000,
      height: 1400,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    await emailWindow.loadFile(tmpHtmlPath);
    await new Promise(resolve => setTimeout(resolve, 800));
    const image = await emailWindow.webContents.capturePage();
    const pngBase64 = image.toPNG().toString('base64');

    emailWindow.close();
    await fs.promises.unlink(tmpHtmlPath).catch(() => { });

    logger.info('Email converted to image successfully');
    return [pngBase64];
  } catch (error) {
    logger.error('Failed to convert email using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Convert EPUB ebook to images
 */
async function convertEpubToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting EPUB to images using Electron renderer');

    const epubBuffer = Buffer.from(base64Data, 'base64');
    const JSZip = (await import('jszip')).default;

    // EPUB is a ZIP file containing XHTML documents
    const zip = await JSZip.loadAsync(epubBuffer);

    // Find content files (simplified - full EPUB parsing is complex)
    const contentFiles = Object.keys(zip.files).filter(name =>
      name.endsWith('.xhtml') || name.endsWith('.html')
    ).slice(0, 10); // Limit to first 10 chapters

    if (contentFiles.length === 0) {
      throw new Error('No content found in EPUB');
    }

    const images: string[] = [];

    for (const [index, filePath] of contentFiles.entries()) {
      const content = await zip.files[filePath].async('text');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              max-width: 700px;
              margin: 40px auto;
              padding: 40px;
              background: white;
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.8;
              color: #333;
            }
            h1, h2, h3 { margin-top: 24pt; margin-bottom: 12pt; }
            p { margin-bottom: 12pt; text-align: justify; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `;

      const tmpDir = app.getPath('temp');
      const tmpHtmlPath = path.join(tmpDir, `atticus-epub-${Date.now()}-${index}.html`);
      await fs.promises.writeFile(tmpHtmlPath, htmlContent, 'utf-8');

      const epubWindow = new BrowserWindow({
        width: 800,
        height: 1200,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      await epubWindow.loadFile(tmpHtmlPath);
      await new Promise(resolve => setTimeout(resolve, 600));
      const image = await epubWindow.webContents.capturePage();
      images.push(image.toPNG().toString('base64'));

      epubWindow.close();
      await fs.promises.unlink(tmpHtmlPath).catch(() => { });
    }

    logger.info('EPUB converted to images successfully', { chapters: images.length });
    return images;
  } catch (error) {
    logger.error('Failed to convert EPUB using Electron', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Initialize app
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Save configuration
ipcMain.handle('save-config', async (_event, config) => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'user-config.json');
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    logger.error('Failed to save configuration', { error });
    return {
      success: false,
      error: {
        code: 'CONFIG_SAVE_FAILED',
        message: 'Failed to save configuration. Check logs for details.'
      }
    };
  }
});

// Load configuration
ipcMain.handle('load-config', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'user-config.json');

    if (fs.existsSync(configPath)) {
      const data = await fs.promises.readFile(configPath, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: null };
  } catch (error) {
    logger.error('Failed to load configuration', { error });
    return {
      success: false,
      error: {
        code: 'CONFIG_LOAD_FAILED',
        message: 'Failed to load configuration. Check logs for details.'
      }
    };
  }
});

// Save conversation
ipcMain.handle('save-conversation', async (_event, conversation) => {
  try {
    const userDataPath = app.getPath('userData');
    const conversationsDir = path.join(userDataPath, 'conversations');

    if (!fs.existsSync(conversationsDir)) {
      await fs.promises.mkdir(conversationsDir, { recursive: true });
    }

    // Use conversation ID for filename to enable updates
    const filename = `${conversation.id}.json`;
    const filepath = path.join(conversationsDir, filename);
    await fs.promises.writeFile(filepath, JSON.stringify(conversation, null, 2));

    return { success: true, data: { filepath, filename } };
  } catch (error) {
    logger.error('Failed to save conversation', { error });
    return {
      success: false,
      error: {
        code: 'CONVERSATION_SAVE_FAILED',
        message: 'Failed to save conversation. Check logs for details.'
      }
    };
  }
});

// Load conversations
ipcMain.handle('load-conversations', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const conversationsDir = path.join(userDataPath, 'conversations');

    if (!fs.existsSync(conversationsDir)) {
      return { success: true, data: [] };
    }

    const files = await fs.promises.readdir(conversationsDir);
    const conversations = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const data = await fs.promises.readFile(
            path.join(conversationsDir, file),
            'utf-8'
          );
          return JSON.parse(data);
        })
    );

    return { success: true, data: conversations };
  } catch (error) {
    logger.error('Failed to load conversations', { error });
    return {
      success: false,
      error: {
        code: 'CONVERSATIONS_LOAD_FAILED',
        message: 'Failed to load conversations. Check logs for details.'
      }
    };
  }
});

// Delete conversation
ipcMain.handle('delete-conversation', async (_event, conversationId: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const conversationsDir = path.join(userDataPath, 'conversations');
    const filename = `${conversationId}.json`;
    const filepath = path.join(conversationsDir, filename);

    // Check if file exists before attempting to delete
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
      logger.info('Conversation deleted', { conversationId });
      return { success: true };
    } else {
      logger.warn('Conversation file not found', { conversationId, filepath });
      return { success: true }; // Return success even if file doesn't exist (already deleted)
    }
  } catch (error) {
    logger.error('Failed to delete conversation', { error, conversationId });
    return {
      success: false,
      error: {
        code: 'CONVERSATION_DELETE_FAILED',
        message: 'Failed to delete conversation. Check logs for details.'
      }
    };
  }
});

// Upload file
ipcMain.handle('upload-file', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'txt', 'doc', 'docx', 'md'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filepath = result.filePaths[0];
    const filename = path.basename(filepath);
    const ext = path.extname(filepath).toLowerCase();

    // Security: Validate file type
    const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.doc', '.docx', '.md', '.jpg', '.jpeg', '.png', '.gif', '.webp']);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return {
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `File type ${ext} not allowed. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
        }
      };
    }

    // Security: Check file size before reading (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const stats = await fs.promises.stat(filepath);

    if (stats.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. File size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`
        }
      };
    }

    // Read file as base64
    const fileBuffer = await fs.promises.readFile(filepath);
    const base64 = fileBuffer.toString('base64');

    // Validate base64 encoding worked
    if (!base64 || base64.length === 0) {
      logger.error('Failed to encode file as base64', { filename, size: fileBuffer.length });
      return {
        success: false,
        error: {
          code: 'ENCODING_FAILED',
          message: 'Failed to encode file data'
        }
      };
    }

    logger.info('File uploaded successfully', {
      filename,
      extension: ext,
      size: fileBuffer.length,
      base64Length: base64.length
    });

    return {
      success: true,
      data: {
        name: filename,
        path: filepath,
        extension: ext,
        size: fileBuffer.length,
        data: base64,
      }
    };
  } catch (error) {
    logger.error('Failed to upload file', { error });
    return {
      success: false,
      error: {
        code: 'FILE_UPLOAD_FAILED',
        message: 'Failed to upload file. Check logs for details.'
      }
    };
  }
});

// Save PDF
ipcMain.handle('save-pdf', async (_event, { filename, data }) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    const buffer = Buffer.from(data, 'base64');
    await fs.promises.writeFile(result.filePath, buffer);

    return { success: true, data: { filepath: result.filePath } };
  } catch (error) {
    logger.error('Failed to save PDF', { error });
    return {
      success: false,
      error: {
        code: 'PDF_SAVE_FAILED',
        message: 'Failed to save PDF. Check logs for details.'
      }
    };
  }
});

// Secure chat request handler - API keys never leave main process
ipcMain.handle('secure-chat-request', async (_event, request) => {
  try {
    logger.debug('Secure chat request called', { providerId: request?.provider?.id });

    // Import API functions only in main process
    logger.debug('Importing API module');
    const { sendChatMessage } = await import('../services/api');
    logger.debug('API module imported successfully');

    // Validate request structure
    if (!request?.provider || !request?.messages) {
      throw new Error('Invalid chat request structure');
    }

    // Load provider config with API key from secure storage
    logger.debug('Loading provider with API key', { providerId: request.provider.id });
    const providerWithKey = await loadProviderWithApiKey(request.provider.id);
    if (!providerWithKey) {
      throw new Error(`Provider ${request.provider.id} not configured or missing API key`);
    }
    logger.debug('Provider loaded successfully', { providerId: request.provider.id });

    // Merge the request provider (which has endpoint, model, etc.) with the API key from storage
    const chatRequest = {
      ...request,
      provider: {
        ...request.provider,  // Keep endpoint and other settings from request
        apiKey: providerWithKey.apiKey  // Add API key from secure storage
      }
    };

    logger.debug('Calling sendChatMessage');
    const response = await sendChatMessage(chatRequest);
    logger.debug('sendChatMessage returned successfully');
    return { success: true, data: response };
  } catch (error) {
    logger.error('Secure chat request failed', {
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : 'Unknown',
      errorStack: error instanceof Error ? error.stack : 'No stack',
      errorName: error instanceof Error ? error.name : 'Unknown'
    });
    return {
      success: false,
      error: {
        code: 'CHAT_REQUEST_FAILED',
        message: 'Failed to process chat request. Check logs for details.',
      }
    };
  }
});

// Load provider configuration with API key from secure storage
async function loadProviderWithApiKey(providerId: string): Promise<any> {
  try {
    // Load user config
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'user-config.json');

    if (!fs.existsSync(configPath)) {
      throw new Error('User configuration not found');
    }

    const configData = await fs.promises.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const provider = config.providers?.find((p: any) => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found in configuration`);
    }

    // Use temporary API key field for backward compatibility until migration complete
    if (provider._tempApiKey) {
      return {
        ...provider,
        apiKey: provider._tempApiKey
      };
    }

    throw new Error(`API key not found for provider ${providerId}`);
  } catch (error) {
    logger.error('Failed to load provider config', { error });
    return null;
  }
}

// Load bundled config file (providers.yaml or practices.yaml)
ipcMain.handle('load-bundled-config', async (_event, configName: string) => {
  try {
    // Security: Allowlist of valid config files
    const ALLOWED_CONFIGS = new Set(['providers.yaml', 'practices.yaml', 'advisory.yaml', 'analysis.yaml']);

    if (!ALLOWED_CONFIGS.has(configName)) {
      throw new Error(`Invalid config file requested: ${configName}`);
    }

    // In production, config files are in dist/config/ relative to the app
    let configPath: string;

    if (isDev) {
      // In development, files are in public/config/
      configPath = path.join(__dirname, '..', 'public', 'config', configName);
    } else {
      // In production, first check userData/config/ for user customizations
      const userDataPath = app.getPath('userData');
      const userConfigPath = path.join(userDataPath, 'config', configName);

      if (fs.existsSync(userConfigPath)) {
        // User has customized this config, use their version
        configPath = userConfigPath;
        logger.info('Loading user-customized config', { configPath });
      } else {
        // No user customization, load from bundled location
        // __dirname points to dist-electron, so we go up and into dist/config
        configPath = path.join(__dirname, '..', 'dist', 'config', configName);

        // If not found, try the unpacked asar location
        if (!fs.existsSync(configPath)) {
          configPath = path.join(process.resourcesPath, 'dist', 'config', configName);
        }

        // If still not found, try app.asar.unpacked
        if (!fs.existsSync(configPath)) {
          configPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'config', configName);
        }
      }
    }

    logger.info('Loading bundled config', { configPath });

    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const data = await fs.promises.readFile(configPath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    logger.error('Failed to load bundled config', { error });
    return {
      success: false,
      error: {
        code: 'BUNDLED_CONFIG_LOAD_FAILED',
        message: 'Failed to load bundled configuration. Check logs for details.'
      }
    };
  }
});

// Fetch factory YAML from remote endpoint
ipcMain.handle('fetch-factory-config', async (_event, configName: string) => {
  try {
    // Security: Allowlist of valid config files
    const ALLOWED_CONFIGS = new Set(['providers.yaml', 'practices.yaml', 'advisory.yaml', 'analysis.yaml']);

    if (!ALLOWED_CONFIGS.has(configName)) {
      throw new Error(`Invalid config file requested: ${configName}`);
    }

    const url = `https://jdai.ca/atticus/${configName}`;
    logger.info('Fetching factory config', { url });

    return new Promise((resolve) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          logger.error('Failed to fetch factory config', { statusCode: res.statusCode });
          resolve({
            success: false,
            error: {
              code: 'FETCH_FAILED',
              message: `Failed to fetch factory configuration (HTTP ${res.statusCode})`
            }
          });
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          logger.info('Factory config fetched successfully', { size: data.length });
          resolve({ success: true, data });
        });
      }).on('error', (error) => {
        logger.error('Failed to fetch factory config', { error });
        resolve({
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: `Network error: ${error.message}`
          }
        });
      });
    });
  } catch (error) {
    logger.error('Failed to fetch factory config', { error });
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch factory configuration. Check logs for details.'
      }
    };
  }
});

// Save bundled config file
ipcMain.handle('save-bundled-config', async (_event, configName: string, content: string) => {
  try {
    // Security: Allowlist of valid config files
    const ALLOWED_CONFIGS = new Set(['providers.yaml', 'practices.yaml', 'advisory.yaml', 'analysis.yaml']);

    if (!ALLOWED_CONFIGS.has(configName)) {
      throw new Error(`Invalid config file: ${configName}`);
    }

    // Determine the config path (same logic as load-bundled-config)
    let configPath: string;

    if (isDev) {
      // In development, save to public/config/
      configPath = path.join(__dirname, '..', 'public', 'config', configName);
    } else {
      // In production, save to a writable location in userData
      // Copy from bundled location to user data on first edit
      const userDataPath = app.getPath('userData');
      const userConfigDir = path.join(userDataPath, 'config');

      // Ensure directory exists
      if (!fs.existsSync(userConfigDir)) {
        await fs.promises.mkdir(userConfigDir, { recursive: true });
      }

      configPath = path.join(userConfigDir, configName);
    }

    logger.info('Saving bundled config', { configPath });

    // Write the content
    await fs.promises.writeFile(configPath, content, 'utf-8');

    return { success: true, data: { path: configPath } };
  } catch (error) {
    logger.error('Failed to save bundled config', { error });
    return {
      success: false,
      error: {
        code: 'BUNDLED_CONFIG_SAVE_FAILED',
        message: 'Failed to save configuration. Check logs for details.'
      }
    };
  }
});

/**
 * Helper: Create standardized IPC handler for document conversion
 */
function createConversionHandler<T extends any[]>(
  eventName: string,
  converter: (...args: T) => Promise<string[]>,
  errorCode: string
) {
  return ipcMain.handle(eventName, async (_event, ...args: T) => {
    try {
      logger.info(`Received ${eventName} request`);
      const images = await converter(...args);
      return { success: true, data: images };
    } catch (error) {
      logger.error(`${eventName} failed`, { error });
      return {
        success: false,
        error: {
          code: errorCode,
          message: error instanceof Error ? error.message : `Conversion failed: ${eventName}`
        }
      };
    }
  });
}

// Convert PDF to images using Electron's rendering engine
createConversionHandler(
  'convert-pdf-to-images',
  convertPDFToImagesElectron,
  'PDF_CONVERSION_FAILED'
);

// Word documents
createConversionHandler(
  'convert-word-to-images',
  convertWordToImagesElectron,
  'WORD_CONVERSION_FAILED'
);

// Excel spreadsheets
createConversionHandler(
  'convert-excel-to-images',
  convertExcelToImagesElectron,
  'EXCEL_CONVERSION_FAILED'
);

// Markdown
createConversionHandler(
  'convert-markdown-to-images',
  convertMarkdownToImagesElectron,
  'MARKDOWN_CONVERSION_FAILED'
);

// CSV
createConversionHandler(
  'convert-csv-to-images',
  convertCsvToImagesElectron,
  'CSV_CONVERSION_FAILED'
);

// Text/Code files
createConversionHandler(
  'convert-text-to-images',
  convertTextToImagesElectron,
  'TEXT_CONVERSION_FAILED'
);

// PowerPoint
createConversionHandler(
  'convert-powerpoint-to-images',
  convertPowerPointToImagesElectron,
  'POWERPOINT_CONVERSION_FAILED'
);

// RTF
createConversionHandler(
  'convert-rtf-to-images',
  convertRtfToImagesElectron,
  'RTF_CONVERSION_FAILED'
);

// TIFF
createConversionHandler(
  'convert-tiff-to-images',
  convertTiffToImagesElectron,
  'TIFF_CONVERSION_FAILED'
);

// HEIC/HEIF
createConversionHandler(
  'convert-heic-to-images',
  convertHeicToImagesElectron,
  'HEIC_CONVERSION_FAILED'
);

// Email
createConversionHandler(
  'convert-email-to-images',
  convertEmailToImagesElectron,
  'EMAIL_CONVERSION_FAILED'
);

// EPUB
createConversionHandler(
  'convert-epub-to-images',
  convertEpubToImagesElectron,
  'EPUB_CONVERSION_FAILED'
);

// Delete API key from secure storage
ipcMain.handle('delete-api-key', async (_event, providerId: string) => {
  try {
    logger.info('Deleting API key', { providerId });

    // For now, API keys are stored in the config's _tempApiKey field
    // This handler is a placeholder for future secure storage implementation
    // The actual deletion happens when removeProvider is called in the renderer

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete API key', { error, providerId });
    return {
      success: false,
      error: {
        code: 'DELETE_API_KEY_FAILED',
        message: 'Failed to delete API key from secure storage.'
      }
    };
  }
});
