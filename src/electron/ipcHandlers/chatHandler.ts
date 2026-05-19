import { ipcMain } from 'electron';
import { createLogger } from '../../services/debugLogger';
import { loadProviderWithApiKey } from '../secureStorage';

const logger = createLogger('ChatHandler');

export function registerChatHandler(): void {
  // Secure chat request handler - API keys never leave main process
  ipcMain.handle('secure-chat-request', async (_event, request) => {
    try {
      logger.debug('Secure chat request called', { providerId: request?.provider?.id });

      // Import API functions only in main process
      logger.debug('Importing API module');
      const { sendChatMessage } = await import('../../services/api');
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
          apiKey: (providerWithKey as Record<string, unknown>).apiKey  // Add API key from secure storage
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
}
