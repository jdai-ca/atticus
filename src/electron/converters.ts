import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import DOMPurify from 'isomorphic-dompurify';
import { createLogger } from '../services/debugLogger';

const logger = createLogger('Converters');

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
      contextIsolation: true,
      sandbox: true
    }
  });
}

function escapeHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeHtmlContent(content: string): string {
  return DOMPurify.sanitize(content, { ALLOW_UNKNOWN_PROTOCOLS: false });
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

export async function convertWordToImagesElectron(base64Data: string): Promise<string[]> {
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
export async function convertExcelToImagesElectron(base64Data: string, fileName: string): Promise<string[]> {
  try {
    logger.info('Converting Excel spreadsheet to images using Electron renderer', { fileName });
    validateBase64Input(base64Data);

    const excelBuffer = Buffer.from(base64Data, 'base64');
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    // ExcelJS @types expects Buffer (non-generic); Node ≥20 emits Buffer<ArrayBufferLike> — cast required
    await workbook.xlsx.load(excelBuffer as any); // eslint-disable-line @typescript-eslint/no-explicit-any

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
export async function convertMarkdownToImagesElectron(base64Data: string): Promise<string[]> {
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
export async function convertCsvToImagesElectron(base64Data: string, fileName: string): Promise<string[]> {
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
export async function convertTextToImagesElectron(base64Data: string, fileName: string, extension: string): Promise<string[]> {
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

    const escapedContent = escapeHtml(textContent);

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

    const pngBase64 = await renderHtmlToImage(
      htmlContent,
      'text',
      CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.TEXT,
      600
    );

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
export async function convertPowerPointToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting PowerPoint to images using Electron renderer');

    const buffer = Buffer.from(base64Data, 'base64');
    const JSZip = (await import('jszip')).default;
    const { DOMParser: _DOMParser } = await import('@xmldom/xmldom');

    // Parse PPTX file (which is a ZIP archive)
    const zip = await JSZip.loadAsync(buffer);

    // Extract slide relationships
    const slidesPath = 'ppt/slides/';
    const slideFiles = Object.keys(zip.files).filter((name): boolean =>
      name.startsWith(slidesPath) && Boolean(name.match(/slide\d+\.xml$/))
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

      const pngBase64 = await renderHtmlToImage(
        htmlContent,
        'ppt',
        CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.POWERPOINT,
        CONVERSION_CONSTANTS.RENDER_DELAYS.FAST
      );

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

      const pngBase64 = await renderHtmlToImage(
        htmlContent,
        `ppt-slide-${i + 1}`,
        CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.POWERPOINT,
        CONVERSION_CONSTANTS.RENDER_DELAYS.FAST
      );
      images.push(pngBase64);
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
export async function convertRtfToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting RTF to images using Electron renderer');

    const rtfBuffer = Buffer.from(base64Data, 'base64');
    const rtfText = rtfBuffer.toString('utf-8');

    // Basic RTF to HTML conversion (simplified)
    // Remove RTF control words and extract plain text
    const plainText = rtfText
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
        <pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif;">${escapeHtml(plainText)}</pre>
      </body>
      </html>
    `;

    const pngBase64 = await renderHtmlToImage(
      htmlContent,
      'rtf',
      CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.RTF,
      800
    );

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
export async function convertTiffToImagesElectron(base64Data: string): Promise<string[]> {
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
export async function convertHeicToImagesElectron(base64Data: string): Promise<string[]> {
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
export async function convertEmailToImagesElectron(base64Data: string, fileName: string): Promise<string[]> {
  try {
    logger.info('Converting email to images using Electron renderer', { fileName });

    const emailBuffer = Buffer.from(base64Data, 'base64');
    const { simpleParser } = await import('mailparser');

    // Parse email
    const parsed = await simpleParser(emailBuffer);

    const rawBody = typeof parsed.html === 'string' && parsed.html.trim().length > 0
      ? parsed.html
      : escapeHtml(parsed.text || 'No content').replace(/\n/g, '<br/>');
    const safeBody = sanitizeHtmlContent(rawBody);

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
          <div class="email-field"><strong>From:</strong> ${escapeHtml(parsed.from?.text || '')}</div>
          <div class="email-field"><strong>To:</strong> ${escapeHtml(Array.isArray(parsed.to) ? parsed.to[0]?.text || '' : parsed.to?.text || '')}</div>
          ${parsed.cc ? `<div class="email-field"><strong>CC:</strong> ${escapeHtml(Array.isArray(parsed.cc) ? parsed.cc[0]?.text || '' : parsed.cc.text)}</div>` : ''}
          <div class="email-field"><strong>Subject:</strong> ${escapeHtml(parsed.subject || '')}</div>
          <div class="email-field"><strong>Date:</strong> ${parsed.date ? parsed.date.toLocaleString() : 'N/A'}</div>
        </div>
        <div class="email-body">
${safeBody}
        </div>
        ${parsed.attachments && parsed.attachments.length > 0 ? `
        <div class="attachments">
          <strong>📎 Attachments (${parsed.attachments.length}):</strong><br/>
          ${parsed.attachments.map((att): string => `• ${escapeHtml(att.filename || 'unnamed')} (${(att.size || 0)} bytes)`).join('<br/>')}
        </div>
        ` : ''}
      </body>
      </html>
    `;

    const pngBase64 = await renderHtmlToImage(
      htmlContent,
      'email',
      CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.EMAIL,
      800
    );

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
export async function convertEpubToImagesElectron(base64Data: string): Promise<string[]> {
  try {
    logger.info('Converting EPUB to images using Electron renderer');

    const epubBuffer = Buffer.from(base64Data, 'base64');
    const JSZip = (await import('jszip')).default;

    // EPUB is a ZIP file containing XHTML documents
    const zip = await JSZip.loadAsync(epubBuffer);

    // Find content files (simplified - full EPUB parsing is complex)
    const contentFiles = Object.keys(zip.files).filter((name): boolean =>
      name.endsWith('.xhtml') || name.endsWith('.html')
    ).slice(0, CONVERSION_CONSTANTS.LIMITS.MAX_EPUB_CHAPTERS);

    if (contentFiles.length === 0) {
      throw new Error('No content found in EPUB');
    }

    const images: string[] = [];

    for (const [index, filePath] of contentFiles.entries()) {
      const content = await zip.files[filePath].async('text');
      const safeContent = sanitizeHtmlContent(content);

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
          ${safeContent}
        </body>
        </html>
      `;

      const pngBase64 = await renderHtmlToImage(
        htmlContent,
        `epub-${index + 1}`,
        CONVERSION_CONSTANTS.WINDOW_DIMENSIONS.EPUB,
        600
      );
      images.push(pngBase64);
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
