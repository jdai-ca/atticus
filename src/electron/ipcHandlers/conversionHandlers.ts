import { ipcMain } from 'electron';
import { createLogger } from '../../services/debugLogger';
import {
  convertWordToImagesElectron,
  convertExcelToImagesElectron,
  convertMarkdownToImagesElectron,
  convertCsvToImagesElectron,
  convertTextToImagesElectron,
  convertPowerPointToImagesElectron,
  convertRtfToImagesElectron,
  convertTiffToImagesElectron,
  convertHeicToImagesElectron,
  convertEmailToImagesElectron,
  convertEpubToImagesElectron,
} from '../converters';

const logger = createLogger('ConversionHandlers');

function createConversionHandler<T extends unknown[]>(
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

export function registerConversionHandlers(): void {
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
}
