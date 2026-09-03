import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import { createLogger } from '../services/debugLogger';
import { migratePlaintextApiKeys } from './secureStorage';
import { registerConfigHandlers } from './ipcHandlers/configHandlers';
import { registerFileHandlers } from './ipcHandlers/fileHandlers';
import { registerBundledConfigHandlers } from './ipcHandlers/bundledConfigHandlers';
import { registerApiKeyHandlers } from './ipcHandlers/apiKeyHandlers';
import { registerChatHandler } from './ipcHandlers/chatHandler';
import { registerConversionHandlers } from './ipcHandlers/conversionHandlers';
import { registerAuditHandlers } from './ipcHandlers/auditHandlers';

// Polyfill DOMMatrix for Node.js environment (required by some SDK dependencies)
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor() {}
    translate() {
      return this;
    }
    scale() {
      return this;
    }
    rotate() {
      return this;
    }
    multiply() {
      return this;
    }
    inverse() {
      return this;
    }
  }
  // DOMMatrix polyfill for pdfjs-dist in Electron main process (no DOM available)

  (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixPolyfill;
}

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;

// Create logger for main process
const logger = createLogger('Main');

function createWindow() {
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
      sandbox: true,
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

// Initialize app
app.whenReady().then(async () => {
  try {
    await migratePlaintextApiKeys();
  } catch (error) {
    logger.error('API key migration failed', { error });
  }

  // Check if we are running in MCP server headless mode
  const isMcpMode = process.argv.includes('--mcp') || process.argv.includes('--mcp-server');
  if (isMcpMode) {
    // Set environment flag to guarantee logs redirect to stderr and don't pollute MCP JSON-RPC stdout
    process.env.ATTICUS_MCP_MODE = 'true';
    logger.info('Starting Atticus in headless MCP Server mode');
    try {
      const { startMcpServer } = await import('./mcpServer');
      startMcpServer();
    } catch (e) {
      logger.error('Failed to start MCP server', { error: e });
      process.exit(1);
    }
  } else {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
registerConfigHandlers();
registerFileHandlers();
registerBundledConfigHandlers(isDev, __dirname);
registerApiKeyHandlers();
registerChatHandler();
registerConversionHandlers();
registerAuditHandlers();
