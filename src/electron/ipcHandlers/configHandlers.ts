import { app, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from '../../services/debugLogger';
import { getUserConfigPath, type ConfigProvider } from '../secureStorage';

const logger = createLogger('ConfigHandlers');

// Conversation IDs originate from the renderer over IPC; sanitize before use in a file path
// to prevent path traversal (e.g. "../../../etc/passwd") escaping the conversations directory.
function sanitizeConversationId(id: unknown): string {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Invalid conversation id: must be a non-empty string.');
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function registerConfigHandlers(): void {
  // Save configuration
  ipcMain.handle('save-config', async (_event, config) => {
    try {
      const configPath = getUserConfigPath();
      const sanitizedConfig = {
        ...config,
        providers: Array.isArray(config?.providers)
          ? config.providers.map((provider: ConfigProvider): ConfigProvider => {
              const sanitizedProvider = { ...provider };
              delete sanitizedProvider._tempApiKey;
              return sanitizedProvider;
            })
          : [],
      };

      await fs.promises.writeFile(configPath, JSON.stringify(sanitizedConfig, null, 2));
      return { success: true };
    } catch (error) {
      logger.error('Failed to save configuration', { error });
      return {
        success: false,
        error: {
          code: 'CONFIG_SAVE_FAILED',
          message: 'Failed to save configuration. Check logs for details.',
        },
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
          message: 'Failed to load configuration. Check logs for details.',
        },
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
      const filename = `${sanitizeConversationId(conversation?.id)}.json`;
      const filepath = path.join(conversationsDir, filename);
      await fs.promises.writeFile(filepath, JSON.stringify(conversation, null, 2));

      return { success: true, data: { filepath, filename } };
    } catch (error) {
      logger.error('Failed to save conversation', { error });
      return {
        success: false,
        error: {
          code: 'CONVERSATION_SAVE_FAILED',
          message: 'Failed to save conversation. Check logs for details.',
        },
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
      const results = await Promise.all(
        files
          .filter((f): boolean => f.endsWith('.json'))
          .map(async (file): Promise<unknown> => {
            try {
              const data = await fs.promises.readFile(path.join(conversationsDir, file), 'utf-8');
              return JSON.parse(data);
            } catch (error) {
              // Skip a single corrupted/unreadable conversation file rather than failing
              // the entire load, which would make every conversation inaccessible.
              logger.warn('Skipping unreadable conversation file', { file, error });
              return null;
            }
          })
      );

      return { success: true, data: results.filter((c): boolean => c !== null) };
    } catch (error) {
      logger.error('Failed to load conversations', { error });
      return {
        success: false,
        error: {
          code: 'CONVERSATIONS_LOAD_FAILED',
          message: 'Failed to load conversations. Check logs for details.',
        },
      };
    }
  });

  // Delete conversation
  ipcMain.handle('delete-conversation', async (_event, conversationId: string) => {
    try {
      const userDataPath = app.getPath('userData');
      const conversationsDir = path.join(userDataPath, 'conversations');
      const filename = `${sanitizeConversationId(conversationId)}.json`;
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
          message: 'Failed to delete conversation. Check logs for details.',
        },
      };
    }
  });
}
