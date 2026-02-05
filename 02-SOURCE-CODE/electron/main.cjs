const { app, BrowserWindow, ipcMain, shell, desktopCapturer, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger.cjs');
const { setupErrorHandlers, wrapIpcHandler } = require('./utils/errorHandler.cjs');
const { initializeDatabase, closeDatabase, getDatabase } = require('./database/db.cjs');
const { registerDatabaseHandlers } = require('./database/ipc.cjs');
const { initializeOAuth2Client, authenticateGoogle, refreshTokens, revokeAccess, getOAuth2Client } = require('./services/googleAuth.cjs');
const { listStoredAccounts, getEncryptionStatus } = require('./services/tokenStorage.cjs');
const GoogleAccountService = require('./services/googleAccountService.cjs');
const { startApiServer, stopApiServer, getServerStatus } = require('./api/server.cjs');
const dgxManager = require('./services/dgxManager.cjs');
const projectWatcher = require('./services/projectWatcher.cjs');
const operationMonitor = require('./services/operationMonitor.cjs');
const projectRefreshDaemon = require('./services/projectRefreshDaemon.cjs');
const claudeCliService = require('./services/claudeCliService.cjs');
const { registerAllHandlers } = require('./ipc-handlers/index.cjs');
const { loadEnvKeys } = require('./ipc-handlers/config.cjs');

// Setup error handlers for main process
setupErrorHandlers();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
const isDev = !app.isPackaged;

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open User Data Folder',
          click: () => {
            shell.openPath(userDataPath);
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          label: 'Open Admin Panel',
          accelerator: 'Ctrl+Shift+A',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate-to', 'admin');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'View Console Logs',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.openDevTools({ mode: 'bottom' });
            }
          }
        },
        {
          label: 'Clear Cache & Reload',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.session.clearCache().then(() => {
                mainWindow.webContents.reload();
              });
            }
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'maximize' },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: async () => {
            await shell.openExternal('https://github.com/husky2466-codo/ai-command-center');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/husky2466-codo/ai-command-center/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About AI Command Center',
              message: 'AI Command Center',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// User data paths
const userDataPath = app.getPath('userData');
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../src/assets/icon.ico'),
    show: false,
    backgroundColor: '#1a1a2e',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools disabled by default - use Ctrl+Shift+I to open manually if needed
    // mainWindow.webContents.openDevTools({ mode: 'bottom' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Add error handlers
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('Window failed to load', { errorCode, errorDescription });
  });

  mainWindow.webContents.on('crashed', () => {
    logger.error('Renderer process crashed');
  });

  mainWindow.on('unresponsive', () => {
    logger.error('Window became unresponsive');
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logger.info('Application starting', {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    isDev
  });

  // Create application menu
  createMenu();

  // Ensure user data directories exist
  ensureDir(path.join(userDataPath, 'snapshots'));
  ensureDir(path.join(userDataPath, 'sessions'));
  ensureDir(path.join(userDataPath, 'configs'));
  ensureDir(path.join(userDataPath, 'recordings'));
  ensureDir(path.join(userDataPath, 'rag-outputs'));
  ensureDir(path.join(userDataPath, 'prompt-lists'));
  ensureDir(path.join(userDataPath, 'chain-configs'));
  ensureDir(path.join(userDataPath, 'extracted-memories'));
  ensureDir(path.join(userDataPath, 'tokens'));
  ensureDir(path.join(userDataPath, 'exports'));
  ensureDir(path.join(userDataPath, 'exports', 'dgx-metrics'));

  // Initialize database and register IPC handlers
  try {
    initializeDatabase();
    registerDatabaseHandlers();
    logger.info('Database initialized successfully');

    // Reset DGX connection states (in case of previous crash)
    dgxManager.resetConnectionStates();
  } catch (err) {
    logger.error('Failed to initialize database', { error: err.message, stack: err.stack });
    // Continue running - some features may be unavailable
  }

  // Start HTTP API server for external control
  try {
    const apiPort = process.env.API_SERVER_PORT || 3939;
    await startApiServer(parseInt(apiPort));
    logger.info('HTTP API server started successfully', { port: apiPort });
  } catch (err) {
    logger.error('Failed to start HTTP API server', { error: err.message, stack: err.stack });
    // Continue running - API server is optional
  }

  // Initialize Google OAuth2 client with credentials
  try {
    const envKeys = await loadEnvKeys(app.getPath('home'));
    if (envKeys.GOOGLE_CLIENT_ID && envKeys.GOOGLE_CLIENT_SECRET) {
      initializeOAuth2Client({
        clientId: envKeys.GOOGLE_CLIENT_ID,
        clientSecret: envKeys.GOOGLE_CLIENT_SECRET
      });
      logger.info('Google OAuth2 client initialized');
    } else {
      logger.warn('Google OAuth2 credentials not found in .env');
    }
  } catch (err) {
    logger.error('Failed to initialize Google OAuth2', { error: err.message });
  }

  // Sync any existing token accounts to database
  try {
    const storedAccounts = await listStoredAccounts('google');
    if (storedAccounts.length > 0) {
      const db = getDatabase();
      const { loadStoredTokens } = require('./services/googleAuth.cjs');
      const oauth2Client = getOAuth2Client();

      for (const email of storedAccounts) {
        const existing = db.prepare('SELECT id FROM connected_accounts WHERE email = ? AND provider = ?').get(email, 'google');
        if (!existing) {
          // Load tokens for this account first
          const tokensLoaded = await loadStoredTokens(email);
          if (tokensLoaded) {
            const accountId = await GoogleAccountService.addAccount(db, email, oauth2Client);
            logger.info('Added stored account to database', { email, accountId });
          } else {
            logger.warn('Could not load tokens for account', { email });
          }
        }
      }
    }
  } catch (err) {
    logger.error('Failed to sync stored accounts', { error: err.message });
  }

  // Register custom protocol for OAuth callback (alternative to localhost)
  // app.setAsDefaultProtocolClient('aicommandcenter');

  // Build shared context for IPC handler modules
  const context = {
    app,
    mainWindow: () => mainWindow,
    shell,
    dialog,
    desktopCapturer,
    getDatabase,
    getOAuth2Client,
    userDataPath,
    isDev,
    dgxManager,
    projectWatcher,
    operationMonitor,
    projectRefreshDaemon,
    claudeCliService,
    GoogleAccountService,
    authenticateGoogle,
    refreshTokens,
    revokeAccess,
    listStoredAccounts,
    getEncryptionStatus,
    startApiServer,
    stopApiServer,
    getServerStatus,
    loadEnvKeys,
    logger,
    wrapIpcHandler,
  };

  // Register modular IPC handlers
  registerAllHandlers(ipcMain, context);

  createWindow();

  // Subscribe to DGX command events and forward to renderer
  dgxManager.dgxEvents.on('command-executed', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dgx:command-executed', data);
    }
  });

  // Forward operation updates to renderer
  operationMonitor.on('operation-update', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('dgx:operation-update', data);
    }
  });

  // Subscribe to project refresh daemon events and forward to renderer
  projectRefreshDaemon.on('projects-refreshed', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('projects:refreshed', data);
    }
  });

  projectRefreshDaemon.on('refresh-error', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('projects:refresh-error', data);
    }
  });

  // Start the refresh daemon (60 seconds interval)
  projectRefreshDaemon.start(60000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  logger.info('Application shutting down');

  // Stop project refresh daemon
  try {
    projectRefreshDaemon.stop();
    logger.info('Project refresh daemon stopped');
  } catch (err) {
    logger.error('Error stopping project refresh daemon', { error: err.message });
  }

  // Stop all operation monitors
  try {
    operationMonitor.stopAll();
    logger.info('All operation monitors stopped');
  } catch (err) {
    logger.error('Error stopping operation monitors', { error: err.message });
  }

  // Stop all project watchers
  try {
    await projectWatcher.stopAllWatchers();
    logger.info('All project watchers stopped');
  } catch (err) {
    logger.error('Error stopping project watchers', { error: err.message });
  }

  // Disconnect all DGX connections
  try {
    dgxManager.disconnectAll();
    logger.info('All DGX connections closed');
  } catch (err) {
    logger.error('Error disconnecting DGX', { error: err.message });
  }

  // Cleanup Claude CLI service
  try {
    await claudeCliService.cleanup();
    logger.info('Claude CLI service cleanup complete');
  } catch (err) {
    logger.error('Error cleaning up Claude CLI service', { error: err.message });
  }

  // Stop API server
  try {
    await stopApiServer();
    logger.info('HTTP API server stopped');
  } catch (err) {
    logger.error('Error stopping API server', { error: err.message });
  }

  // Close database
  closeDatabase();
  logger.info('Application shutdown complete');
});
