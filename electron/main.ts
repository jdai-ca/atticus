import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { createLogger } from '../src/services/logger';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;

// Create logger for main process
const logger = createLogger('Main');

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
    // Import API functions only in main process
    const { sendChatMessage } = await import('../src/services/api');

    // Validate request structure
    if (!request?.provider || !request?.messages) {
      throw new Error('Invalid chat request structure');
    }

    // Load provider config with API key from secure storage
    const providerWithKey = await loadProviderWithApiKey(request.provider.id);
    if (!providerWithKey) {
      throw new Error(`Provider ${request.provider.id} not configured or missing API key`);
    }

    const chatRequest = {
      ...request,
      provider: providerWithKey
    };

    const response = await sendChatMessage(chatRequest);
    return { success: true, data: response };
  } catch (error) {
    logger.error('Secure chat request failed', { error });
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

    // TODO: Replace with secure storage. For now, use temporary API key field
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
    const ALLOWED_CONFIGS = new Set(['providers.yaml', 'practices.yaml', 'advisory.yaml']);

    if (!ALLOWED_CONFIGS.has(configName)) {
      throw new Error(`Invalid config file requested: ${configName}`);
    }

    // In production, config files are in dist/config/ relative to the app
    let configPath: string;

    if (isDev) {
      // In development, files are in public/config/
      configPath = path.join(__dirname, '..', 'public', 'config', configName);
    } else {
      // In production, files are in dist/config/ next to index.html
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
