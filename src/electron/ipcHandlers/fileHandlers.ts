import { dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from '../../services/debugLogger';
import {
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  SUPPORTED_UPLOAD_EXTENSIONS,
  toDialogExtensions,
} from '../../constants/fileExtensions';

const logger = createLogger('FileHandlers');

export function registerFileHandlers(): void {
  // Upload file
  ipcMain.handle('upload-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: toDialogExtensions(DOCUMENT_EXTENSIONS) },
          { name: 'Images', extensions: toDialogExtensions(IMAGE_EXTENSIONS) },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filepath = result.filePaths[0];
      const filename = path.basename(filepath);
      const ext = path.extname(filepath).toLowerCase();

      // Security: Validate file type
      const ALLOWED_EXTENSIONS = new Set<string>(SUPPORTED_UPLOAD_EXTENSIONS);
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type ${ext} not allowed. Allowed types: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
          },
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
            message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. File size: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`,
          },
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
            message: 'Failed to encode file data',
          },
        };
      }

      logger.info('File uploaded successfully', {
        filename,
        extension: ext,
        size: fileBuffer.length,
        base64Length: base64.length,
      });

      return {
        success: true,
        data: {
          name: filename,
          path: filepath,
          extension: ext,
          size: fileBuffer.length,
          data: base64,
        },
      };
    } catch (error) {
      logger.error('Failed to upload file', { error });
      return {
        success: false,
        error: {
          code: 'FILE_UPLOAD_FAILED',
          message: 'Failed to upload file. Check logs for details.',
        },
      };
    }
  });

  // Save PDF
  ipcMain.handle('save-pdf', async (_event, { filename, data }) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
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
          message: 'Failed to save PDF. Check logs for details.',
        },
      };
    }
  });
}
