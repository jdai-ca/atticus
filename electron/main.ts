import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;

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
    console.error('Error saving config:', error);
    return { success: false, error: (error as Error).message };
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
    console.error('Error loading config:', error);
    return { success: false, error: (error as Error).message };
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

    const filename = `conversation-${Date.now()}.json`;
    const filepath = path.join(conversationsDir, filename);
    await fs.promises.writeFile(filepath, JSON.stringify(conversation, null, 2));

    return { success: true, filepath, filename };
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error: (error as Error).message };
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
    console.error('Error loading conversations:', error);
    return { success: false, error: (error as Error).message };
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

    // Read file as base64
    const fileBuffer = await fs.promises.readFile(filepath);
    const base64 = fileBuffer.toString('base64');

    return {
      success: true,
      file: {
        name: filename,
        path: filepath,
        extension: ext,
        size: fileBuffer.length,
        data: base64,
      }
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: (error as Error).message };
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

    return { success: true, filepath: result.filePath };
  } catch (error) {
    console.error('Error saving PDF:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Load bundled config file (providers.yaml or practices.yaml)
ipcMain.handle('load-bundled-config', async (_event, configName: string) => {
  try {
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

    console.log('[Main] Loading config from:', configPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const data = await fs.promises.readFile(configPath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    console.error('[Main] Error loading bundled config:', error);
    return { success: false, error: (error as Error).message };
  }
});
