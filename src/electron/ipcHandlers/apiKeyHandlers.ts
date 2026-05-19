import { ipcMain } from 'electron';
import { createLogger } from '../../services/debugLogger';
import { storeApiKeySecure, deleteApiKeySecure } from '../secureStorage';

const logger = createLogger('ApiKeyHandlers');

export function registerApiKeyHandlers(): void {
  // Save API key to secure storage
  ipcMain.handle('save-api-key', async (_event, providerId: string, apiKey: string) => {
    try {
      if (!providerId || typeof providerId !== 'string') {
        throw new Error('Provider ID is required');
      }
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error('API key is required');
      }

      await storeApiKeySecure(providerId, apiKey.trim());
      return { success: true };
    } catch (error) {
      logger.error('Failed to save API key', { error, providerId });
      return {
        success: false,
        error: {
          code: 'SAVE_API_KEY_FAILED',
          message: 'Failed to save API key to secure storage.'
        }
      };
    }
  });

  // Delete API key from secure storage
  ipcMain.handle('delete-api-key', async (_event, providerId: string) => {
    try {
      logger.info('Deleting API key', { providerId });

      await deleteApiKeySecure(providerId);

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
}
