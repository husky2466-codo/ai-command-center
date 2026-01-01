const { app, BrowserWindow, ipcMain, shell, desktopCapturer, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const pty = require('node-pty');
const { NodeSSH } = require('node-ssh');
const chokidar = require('chokidar');
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

// Setup error handlers for main process
setupErrorHandlers();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
const isDev = !app.isPackaged;

// Terminal PTY storage
const terminals = new Map();

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
    // DevTools disabled - use Ctrl+Shift+I to open manually
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
    const envKeys = await loadEnvKeys();
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

// IPC Handlers
ipcMain.handle('get-user-data-path', () => userDataPath);
ipcMain.handle('get-home-path', () => app.getPath('home'));
ipcMain.handle('get-app-path', () => {
  // In dev mode, return the project root; in prod, return the unpacked app folder
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, '..');
  }
  // In production, go up from resources/app.asar to the app folder
  return path.join(app.getAppPath(), '..', '..');
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file-binary', async (event, filePath, base64Data) => {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Convert base64 to buffer and write as binary
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, size: buffer.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return { success: true, stats: { mtime: stats.mtime, size: stats.size } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File does not exist' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load API keys from OneDrive vault (with ~/.env fallback)
ipcMain.handle('get-env-keys', async () => {
  const keys = {
    ANTHROPIC_API_KEY: '',
    OPENAI_API_KEY: '',
    HF_TOKEN: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
  };

  // Helper to parse .env file content
  const parseEnvFile = (envPath) => {
    try {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (keys.hasOwnProperty(key) && !keys[key]) {
              keys[key] = value;
            }
          }
        });
        return true;
      }
    } catch (error) {
      console.error(`Error reading ${envPath}:`, error.message);
    }
    return false;
  };

  // Primary: OneDrive vault
  const oneDriveVaultPath = 'D:\\OneDrive\\Claude Config (Windows)\\.env';
  if (parseEnvFile(oneDriveVaultPath)) {
    if (keys.ANTHROPIC_API_KEY && keys.OPENAI_API_KEY && keys.HF_TOKEN) {
      console.log('API keys loaded from OneDrive vault');
      return keys;
    }
    console.log('Some keys loaded from OneDrive vault, checking fallback for missing keys');
  }

  // Fallback: ~/.env for any missing keys
  const homeEnvPath = path.join(app.getPath('home'), '.env');
  if (parseEnvFile(homeEnvPath)) {
    console.log('Loaded missing keys from ~/.env');
  }

  return keys;
});

// Log errors from renderer process
ipcMain.handle('log-error', wrapIpcHandler(async (event, errorData) => {
  logger.error('Renderer Process Error:', {
    error: errorData.error,
    context: errorData.context,
    timestamp: errorData.timestamp,
    userAgent: errorData.userAgent,
    url: errorData.url
  });

  return { success: true };
}, 'log-error'));

// Show error dialog (for critical errors)
ipcMain.handle('show-error-dialog', wrapIpcHandler(async (event, options) => {
  const { title, message, detail } = options;

  dialog.showErrorBox(
    title || 'Error',
    detail ? `${message}\n\n${detail}` : message
  );

  return { success: true };
}, 'show-error-dialog'));

// Helper function to load env keys (used internally)
async function loadEnvKeys() {
  const keys = {
    ANTHROPIC_API_KEY: '',
    OPENAI_API_KEY: '',
    HF_TOKEN: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
  };

  const parseEnvFile = (envPath) => {
    try {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (keys.hasOwnProperty(key) && !keys[key]) {
              keys[key] = value;
            }
          }
        });
        return true;
      }
    } catch (error) {
      console.error(`Error reading ${envPath}:`, error.message);
    }
    return false;
  };

  // Primary: OneDrive vault
  const oneDriveVaultPath = 'D:\\OneDrive\\Claude Config (Windows)\\.env';
  parseEnvFile(oneDriveVaultPath);

  // Fallback: ~/.env
  const homeEnvPath = path.join(app.getPath('home'), '.env');
  parseEnvFile(homeEnvPath);

  return keys;
}

// Google OAuth2 IPC Handlers
ipcMain.handle('google-auth:authenticate', async (event, scopes) => {
  try {
    const result = await authenticateGoogle(scopes);

    // After successful authentication, add account to database
    if (result.email) {
      const db = getDatabase();
      try {
        // Check if account already exists
        const existing = db.prepare('SELECT id FROM connected_accounts WHERE email = ? AND provider = ?').get(result.email, 'google');

        if (!existing) {
          // Add new account - OAuth2 client already has credentials set after auth
          const oauth2Client = getOAuth2Client();
          const accountId = await GoogleAccountService.addAccount(db, result.email, oauth2Client);
          console.log(`[Main] Added Google account to database: ${result.email} (${accountId})`);
          return { success: true, ...result, accountId };
        } else {
          console.log(`[Main] Google account already exists: ${result.email}`);
          return { success: true, ...result, accountId: existing.id };
        }
      } catch (dbError) {
        console.error('[Main] Error adding account to database:', dbError.message);
        // Auth succeeded but DB failed - still return success with email
        return { success: true, ...result };
      }
    }

    return { success: true, ...result };
  } catch (error) {
    console.error('[Main] Google authentication error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google-auth:refresh-tokens', async (event, email) => {
  try {
    const tokens = await refreshTokens(email);
    return { success: true, tokens };
  } catch (error) {
    console.error('[Main] Token refresh error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google-auth:revoke-access', async (event, email) => {
  try {
    await revokeAccess(email);
    return { success: true };
  } catch (error) {
    console.error('[Main] Revoke access error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google-auth:list-accounts', async () => {
  try {
    const accounts = await listStoredAccounts('google');
    return { success: true, accounts };
  } catch (error) {
    console.error('[Main] List accounts error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google-auth:encryption-status', async () => {
  try {
    const status = getEncryptionStatus();
    return { success: true, ...status };
  } catch (error) {
    console.error('[Main] Encryption status error:', error.message);
    return { success: false, error: error.message };
  }
});

// Open a folder in the system file explorer
ipcMain.handle('open-path', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open folder picker dialog
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: 'D:\\Projects',
      properties: ['openDirectory']
    });
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    return { success: true, path: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Memory extraction handlers
ipcMain.handle('memory:find-claude-sessions', async () => {
  try {
    // Claude Code stores sessions in AppData\Local\claude-code\sessions
    const localAppData = app.getPath('appData').replace('Roaming', 'Local');
    const claudeSessionsBase = path.join(localAppData, 'claude-code', 'sessions');

    if (!fs.existsSync(claudeSessionsBase)) {
      return { success: false, error: 'Claude Code sessions directory not found' };
    }

    // Find all .jsonl files in all project subdirectories
    const sessions = [];
    const projectDirs = fs.readdirSync(claudeSessionsBase);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(claudeSessionsBase, projectDir);
      const stats = fs.statSync(projectPath);

      if (stats.isDirectory()) {
        const files = fs.readdirSync(projectPath);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

        for (const file of jsonlFiles) {
          const filePath = path.join(projectPath, file);
          const fileStats = fs.statSync(filePath);

          sessions.push({
            path: filePath,
            project: projectDir,
            filename: file,
            size: fileStats.size,
            modified: fileStats.mtime.toISOString()
          });
        }
      }
    }

    // Sort by modified date (newest first)
    sessions.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    return { success: true, sessions };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('memory:extract-from-session', async (event, sessionPath, apiKey) => {
  try {
    // This is called from the renderer - we just need to read and return the file
    // The actual extraction happens in the renderer using the service
    const content = fs.readFileSync(sessionPath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('memory:get-extraction-state', async () => {
  try {
    const stateFile = path.join(userDataPath, 'extracted-memories', 'extraction-state.json');

    if (!fs.existsSync(stateFile)) {
      return {
        success: true,
        state: {
          lastRun: null,
          processedFiles: {},
          inProgress: false
        }
      };
    }

    const content = fs.readFileSync(stateFile, 'utf-8');
    return { success: true, state: JSON.parse(content) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('memory:save-extraction-state', async (event, state) => {
  try {
    const stateFile = path.join(userDataPath, 'extracted-memories', 'extraction-state.json');
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =========================================================================
// GOOGLE ACCOUNT SERVICE IPC HANDLERS
// =========================================================================

// Account Management
ipcMain.handle('google:add-account', async (event, email) => {
  try {
    const db = getDatabase();
    const oauth2Client = getOAuth2Client();

    const accountId = await GoogleAccountService.addAccount(db, email, oauth2Client);
    return { success: true, data: { accountId } };
  } catch (error) {
    console.error('[Main] google:add-account error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:remove-account', async (event, accountId) => {
  try {
    const db = getDatabase();
    await GoogleAccountService.removeAccount(db, accountId);
    return { success: true, data: {} };
  } catch (error) {
    console.error('[Main] google:remove-account error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:list-accounts', async () => {
  try {
    const db = getDatabase();
    const accounts = await GoogleAccountService.listAccounts(db);

    // Enrich accounts with counts and sync status
    const enrichedAccounts = accounts.map(account => {
      // Get email count
      const emailCountStmt = db.prepare('SELECT COUNT(*) as count FROM account_emails WHERE account_id = ?');
      const emailCount = emailCountStmt.get(account.id)?.count || 0;

      // Get event count
      const eventCountStmt = db.prepare('SELECT COUNT(*) as count FROM account_calendar_events WHERE account_id = ?');
      const eventCount = eventCountStmt.get(account.id)?.count || 0;

      // Get contact count
      const contactCountStmt = db.prepare('SELECT COUNT(*) as count FROM account_contacts WHERE account_id = ?');
      const contactCount = contactCountStmt.get(account.id)?.count || 0;

      // Determine sync status
      let syncStatus = 'never';
      if (account.last_sync_at) {
        const now = Date.now();
        const lastSync = account.last_sync_at;
        const diffMinutes = (now - lastSync) / (1000 * 60);

        // Check if currently syncing (check sync_state table)
        const syncStateStmt = db.prepare('SELECT last_sync_at FROM account_sync_state WHERE account_id = ? ORDER BY last_sync_at DESC LIMIT 1');
        const syncState = syncStateStmt.get(account.id);

        // If synced in last 5 minutes, consider it synced
        if (diffMinutes < 5) {
          syncStatus = 'synced';
        } else {
          syncStatus = 'synced'; // Default to synced if we have a last_sync_at
        }
      }

      return {
        ...account,
        emailCount,
        eventCount,
        contactCount,
        syncStatus
      };
    });

    return { success: true, data: enrichedAccounts };
  } catch (error) {
    console.error('[Main] google:list-accounts error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-account', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);
    return { success: true, data: account };
  } catch (error) {
    console.error('[Main] google:get-account error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:toggle-sync', async (event, accountId, enabled) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE connected_accounts SET sync_enabled = ? WHERE id = ?');
    stmt.run(enabled ? 1 : 0, accountId);
    return { success: true, data: { accountId, enabled } };
  } catch (error) {
    console.error('[Main] google:toggle-sync error:', error.message);
    return { success: false, error: error.message };
  }
});

// Sync Operations
ipcMain.handle('google:sync-all', async (event, accountId) => {
  try {
    const db = getDatabase();

    // Get account to find email
    const account = await GoogleAccountService.getAccount(db, accountId);

    // Create service instance
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const results = await service.syncAll(accountId);
    return { success: true, data: results };
  } catch (error) {
    console.error('[Main] google:sync-all error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:sync-emails', async (event, accountId, options) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const results = await service.syncEmails(accountId, options || {});
    return { success: true, data: results };
  } catch (error) {
    console.error('[Main] google:sync-emails error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:sync-calendar', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    // Use syncAllCalendars to sync all selected calendars
    const results = await service.syncAllCalendars(accountId);
    return { success: true, data: results };
  } catch (error) {
    console.error('[Main] google:sync-calendar error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:list-calendars', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const calendars = await service.listCalendars(accountId);
    return { success: true, data: calendars };
  } catch (error) {
    console.error('[Main] google:list-calendars error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-calendars', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const calendars = service.getCalendarsFromDB(accountId);
    return { success: true, data: calendars };
  } catch (error) {
    console.error('[Main] google:get-calendars error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:toggle-calendar-sync', async (event, accountId, calendarId, isSelected) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    service.toggleCalendarSync(accountId, calendarId, isSelected);
    return { success: true };
  } catch (error) {
    console.error('[Main] google:toggle-calendar-sync error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:sync-contacts', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const results = await service.syncContacts(accountId);
    return { success: true, data: results };
  } catch (error) {
    console.error('[Main] google:sync-contacts error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-sync-status', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const status = await service.getSyncStatus(accountId);
    return { success: true, data: status };
  } catch (error) {
    console.error('[Main] google:get-sync-status error:', error.message);
    return { success: false, error: error.message };
  }
});

// Email Operations
ipcMain.handle('google:get-emails', async (event, accountId, options) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const emails = await service.getEmails(accountId, options || {});
    return { success: true, data: emails };
  } catch (error) {
    console.error('[Main] google:get-emails error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-email', async (event, accountId, emailId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const email = await service.getEmail(accountId, emailId);
    return { success: true, data: email };
  } catch (error) {
    console.error('[Main] google:get-email error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:send-email', async (event, accountId, message) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.sendEmail(accountId, message);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:send-email error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:trash-email', async (event, accountId, emailId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.trashEmail(accountId, emailId);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:trash-email error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:delete-email', async (event, accountId, emailId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.deleteEmail(accountId, emailId);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:delete-email error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:mark-email-read', async (event, accountId, emailId, isRead) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.markAsRead(accountId, emailId, isRead);
    return { success: true, data: result };
  } catch (error) {
    // Don't spam logs for scope errors
    if (!error.message?.includes('insufficient authentication scopes')) console.error('[Main] google:mark-email-read error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:toggle-email-star', async (event, accountId, emailId, isStarred) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.toggleStar(accountId, emailId, isStarred);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:toggle-email-star error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:reply-email', async (event, accountId, emailId, message) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.replyToEmail(accountId, emailId, message);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:reply-email error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:forward-email', async (event, accountId, emailId, message) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.forwardEmail(accountId, emailId, message);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:forward-email error:', error.message);
    return { success: false, error: error.message };
  }
});

// Batch Email Operations
ipcMain.handle('google:batch-modify-emails', async (event, accountId, emailIds, modifications) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.batchModifyEmails(accountId, emailIds, modifications);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:batch-modify-emails error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:batch-trash-emails', async (event, accountId, emailIds) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.batchTrashEmails(accountId, emailIds);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:batch-trash-emails error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:batch-delete-emails', async (event, accountId, emailIds) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.batchDeleteEmails(accountId, emailIds);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:batch-delete-emails error:', error.message);
    return { success: false, error: error.message };
  }
});

// Attachment Operations
ipcMain.handle('google:download-attachment', async (event, accountId, messageId, attachmentId, filename) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.downloadAttachment(accountId, messageId, attachmentId, filename);

    // Save to user's downloads folder
    const downloadsPath = app.getPath('downloads');
    const filePath = path.join(downloadsPath, filename);

    // Convert URL-safe base64 to standard base64
    const standardBase64 = result.data
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Write file
    const buffer = Buffer.from(standardBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    console.log(`[Main] Attachment saved: ${filePath}`);

    return {
      success: true,
      data: {
        filePath,
        size: buffer.length,
        filename
      }
    };
  } catch (error) {
    console.error('[Main] google:download-attachment error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-attachments', async (event, accountId, messageId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const attachments = await service.getAttachments(accountId, messageId);
    return { success: true, data: attachments };
  } catch (error) {
    console.error('[Main] google:get-attachments error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-inline-images', async (event, accountId, messageId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const inlineImages = await service.getInlineImages(accountId, messageId);
    return { success: true, data: inlineImages };
  } catch (error) {
    console.error('[Main] google:get-inline-images error:', error.message);
    return { success: false, error: error.message };
  }
});

// Advanced Email Search
ipcMain.handle('google:search-emails', async (event, accountId, query, options) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const results = await service.searchEmails(accountId, query, options || {});
    return { success: true, data: results };
  } catch (error) {
    console.error('[Main] google:search-emails error:', error.message);
    return { success: false, error: error.message };
  }
});

// Saved Searches
ipcMain.handle('google:save-search', async (event, accountId, name, query, isFavorite) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const savedSearch = await service.saveSearch(accountId, name, query, isFavorite);
    return { success: true, data: savedSearch };
  } catch (error) {
    console.error('[Main] google:save-search error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-saved-searches', async (event, accountId, options) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const searches = await service.getSavedSearches(accountId, options || {});
    return { success: true, data: searches };
  } catch (error) {
    console.error('[Main] google:get-saved-searches error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:update-saved-search', async (event, searchId, updates) => {
  try {
    const db = getDatabase();
    // For saved searches, we don't need to initialize the service
    const stmt = db.prepare('SELECT account_id FROM saved_searches WHERE id = ?');
    const search = stmt.get(searchId);

    if (!search) {
      return { success: false, error: 'Saved search not found' };
    }

    const account = await GoogleAccountService.getAccount(db, search.account_id);
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const updatedSearch = await service.updateSavedSearch(searchId, updates);
    return { success: true, data: updatedSearch };
  } catch (error) {
    console.error('[Main] google:update-saved-search error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:delete-saved-search', async (event, searchId) => {
  try {
    const db = getDatabase();
    // For saved searches, we don't need to initialize the service
    const stmt = db.prepare('SELECT account_id FROM saved_searches WHERE id = ?');
    const search = stmt.get(searchId);

    if (!search) {
      return { success: false, error: 'Saved search not found' };
    }

    const account = await GoogleAccountService.getAccount(db, search.account_id);
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const deleted = await service.deleteSavedSearch(searchId);
    return { success: true, data: { deleted } };
  } catch (error) {
    console.error('[Main] google:delete-saved-search error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:record-search-usage', async (event, searchId) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT account_id FROM saved_searches WHERE id = ?');
    const search = stmt.get(searchId);

    if (!search) {
      return { success: false, error: 'Saved search not found' };
    }

    const account = await GoogleAccountService.getAccount(db, search.account_id);
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    await service.recordSearchUsage(searchId);
    return { success: true };
  } catch (error) {
    console.error('[Main] google:record-search-usage error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-recent-searches', async (event, accountId, limit) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const searches = await service.getRecentSearches(accountId, limit || 10);
    return { success: true, data: searches };
  } catch (error) {
    console.error('[Main] google:get-recent-searches error:', error.message);
    return { success: false, error: error.message };
  }
});

// File picker for attachments
ipcMain.handle('dialog:open-file', async (event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', ...(options.multiple ? ['multiSelections'] : [])],
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const files = [];
    const mime = require('mime');

    for (const filePath of result.filePaths) {
      const content = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);

      files.push({
        path: filePath,
        name: path.basename(filePath),
        content: content.toString('base64'),
        size: stats.size,
        mimeType: mime.getType(filePath) || 'application/octet-stream'
      });
    }

    return {
      success: true,
      files: options.multiple ? files : undefined,
      file: !options.multiple ? files[0] : undefined
    };
  } catch (error) {
    console.error('[Main] dialog:open-file error:', error.message);
    return { success: false, error: error.message };
  }
});

// Open file in system default app
ipcMain.handle('shell:open-path', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('[Main] shell:open-path error:', error.message);
    return { success: false, error: error.message };
  }
});

// Calendar Operations
ipcMain.handle('google:get-events', async (event, accountId, options) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const events = await service.getEvents(accountId, options || {});
    return { success: true, data: events };
  } catch (error) {
    console.error('[Main] google:get-events error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:create-event', async (event, accountId, eventData) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.createEvent(accountId, eventData);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:create-event error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:update-event', async (event, accountId, eventId, updates) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.updateEvent(accountId, eventId, updates);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:update-event error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:delete-event', async (event, accountId, eventId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    await service.deleteEvent(accountId, eventId);
    return { success: true, data: {} };
  } catch (error) {
    console.error('[Main] google:delete-event error:', error.message);
    return { success: false, error: error.message };
  }
});

// Contacts Operations
ipcMain.handle('google:get-contacts', async (event, accountId, options) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const contacts = await service.getContacts(accountId, options || {});
    return { success: true, data: contacts };
  } catch (error) {
    console.error('[Main] google:get-contacts error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-contact', async (event, accountId, contactId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const contact = await service.getContact(accountId, contactId);
    return { success: true, data: contact };
  } catch (error) {
    console.error('[Main] google:get-contact error:', error.message);
    return { success: false, error: error.message };
  }
});

// Gmail Labels Operations
ipcMain.handle('google:get-labels', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const labels = await service.getLabels(accountId);
    return { success: true, data: labels };
  } catch (error) {
    console.error('[Main] google:get-labels error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:get-label', async (event, accountId, labelId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const label = await service.getLabel(accountId, labelId);
    return { success: true, data: label };
  } catch (error) {
    console.error('[Main] google:get-label error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:create-label', async (event, accountId, name, options) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const label = await service.createLabel(accountId, name, options || {});
    return { success: true, data: label };
  } catch (error) {
    console.error('[Main] google:create-label error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:update-label', async (event, accountId, labelId, updates) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const label = await service.updateLabel(accountId, labelId, updates);
    return { success: true, data: label };
  } catch (error) {
    console.error('[Main] google:update-label error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:delete-label', async (event, accountId, labelId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.deleteLabel(accountId, labelId);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:delete-label error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:apply-label', async (event, accountId, emailId, labelId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.applyLabel(accountId, emailId, labelId);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:apply-label error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:remove-label', async (event, accountId, emailId, labelId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.removeLabel(accountId, emailId, labelId);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] google:remove-label error:', error.message);
    return { success: false, error: error.message };
  }
});

// Email Templates Operations
ipcMain.handle('email:get-templates', async (event, accountId) => {
  try {
    const db = getDatabase();
    const templates = GoogleAccountService.getTemplates(db, accountId);
    return { success: true, data: templates };
  } catch (error) {
    console.error('[Main] email:get-templates error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:get-template', async (event, templateId) => {
  try {
    const db = getDatabase();
    const template = GoogleAccountService.getTemplate(db, templateId);
    return { success: true, data: template };
  } catch (error) {
    console.error('[Main] email:get-template error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:create-template', async (event, data) => {
  try {
    const db = getDatabase();
    const template = GoogleAccountService.createTemplate(db, data);
    return { success: true, data: template };
  } catch (error) {
    console.error('[Main] email:create-template error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:update-template', async (event, templateId, updates) => {
  try {
    const db = getDatabase();
    const template = GoogleAccountService.updateTemplate(db, templateId, updates);
    return { success: true, data: template };
  } catch (error) {
    console.error('[Main] email:update-template error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:delete-template', async (event, templateId) => {
  try {
    const db = getDatabase();
    const result = GoogleAccountService.deleteTemplate(db, templateId);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] email:delete-template error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:increment-template-usage', async (event, templateId) => {
  try {
    const db = getDatabase();
    const template = GoogleAccountService.incrementTemplateUsage(db, templateId);
    return { success: true, data: template };
  } catch (error) {
    console.error('[Main] email:increment-template-usage error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:toggle-template-favorite', async (event, templateId) => {
  try {
    const db = getDatabase();
    const template = GoogleAccountService.toggleTemplateFavorite(db, templateId);
    return { success: true, data: template };
  } catch (error) {
    console.error('[Main] email:toggle-template-favorite error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:get-template-categories', async (event, accountId) => {
  try {
    const db = getDatabase();
    const categories = GoogleAccountService.getTemplateCategories(db, accountId);
    return { success: true, data: categories };
  } catch (error) {
    console.error('[Main] email:get-template-categories error:', error.message);
    return { success: false, error: error.message };
  }
});

// Email Signatures Operations
ipcMain.handle('email:get-signatures', async (event, accountId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    const signatures = service.getSignatures(accountId);
    return { success: true, data: signatures };
  } catch (error) {
    console.error('[Main] email:get-signatures error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:get-signature', async (event, signatureId) => {
  try {
    const db = getDatabase();
    // We need to get account from the signature first, so use a simple query
    const stmt = db.prepare('SELECT * FROM email_signatures WHERE id = ?');
    const signature = stmt.get(signatureId);

    if (!signature) {
      return { success: false, error: 'Signature not found' };
    }

    return { success: true, data: signature };
  } catch (error) {
    console.error('[Main] email:get-signature error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:create-signature', async (event, accountId, data) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    const signature = service.createSignature(accountId, data);
    return { success: true, data: signature };
  } catch (error) {
    console.error('[Main] email:create-signature error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:update-signature', async (event, signatureId, data) => {
  try {
    const db = getDatabase();
    // Get the signature to find its account
    const stmt = db.prepare('SELECT account_id FROM email_signatures WHERE id = ?');
    const sigRow = stmt.get(signatureId);

    if (!sigRow) {
      return { success: false, error: 'Signature not found' };
    }

    const account = await GoogleAccountService.getAccount(db, sigRow.account_id);
    const service = new GoogleAccountService(db, account.email);
    const signature = service.updateSignature(signatureId, data);
    return { success: true, data: signature };
  } catch (error) {
    console.error('[Main] email:update-signature error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:delete-signature', async (event, signatureId) => {
  try {
    const db = getDatabase();
    // Get the signature to find its account
    const stmt = db.prepare('SELECT account_id FROM email_signatures WHERE id = ?');
    const sigRow = stmt.get(signatureId);

    if (!sigRow) {
      return { success: false, error: 'Signature not found' };
    }

    const account = await GoogleAccountService.getAccount(db, sigRow.account_id);
    const service = new GoogleAccountService(db, account.email);
    service.deleteSignature(signatureId);
    return { success: true, data: {} };
  } catch (error) {
    console.error('[Main] email:delete-signature error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:get-default-signature', async (event, accountId, type) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    const signature = service.getDefaultSignature(accountId, type || 'new');
    return { success: true, data: signature };
  } catch (error) {
    console.error('[Main] email:get-default-signature error:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('email:set-default-signature', async (event, accountId, signatureId) => {
  try {
    const db = getDatabase();
    const account = await GoogleAccountService.getAccount(db, accountId);

    const service = new GoogleAccountService(db, account.email);
    const signature = service.setDefaultSignature(accountId, signatureId);
    return { success: true, data: signature };
  } catch (error) {
    console.error('[Main] email:set-default-signature error:', error.message);
    return { success: false, error: error.message };
  }
});

// Scan D:\Projects folder for importable projects
ipcMain.handle('scan-projects-folder', async () => {
  console.log('[Main] scan-projects-folder handler called');
  try {
    const projectsPath = 'D:\\Projects';
    console.log('[Main] Checking path:', projectsPath);

    if (!fs.existsSync(projectsPath)) {
      console.error('[Main] Path does not exist:', projectsPath);
      return { success: false, error: 'D:\\Projects folder not found' };
    }

    const entries = fs.readdirSync(projectsPath, { withFileTypes: true });
    console.log('[Main] Found entries:', entries.length);

    const projects = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(projectsPath, entry.name);
        const stats = fs.statSync(fullPath);

        projects.push({
          name: entry.name,
          path: fullPath,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString()
        });
      }
    }

    console.log('[Main] Found directories:', projects.length);

    // Sort by modified date (newest first)
    projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    console.log('[Main] Returning projects:', projects.length);
    return { success: true, projects };
  } catch (error) {
    console.error('[Main] scan-projects-folder error:', error.message, error.stack);
    return { success: false, error: error.message };
  }
});

// Get desktop sources for screen recording - ONLY capture app window, never full screen
ipcMain.handle('get-desktop-sources', async () => {
  try {
    // Get the media source ID directly from mainWindow first
    if (!mainWindow) {
      return [{ id: null, name: null, debug: 'No main window available', error: true }];
    }

    const mediaSourceId = mainWindow.getMediaSourceId();
    console.log('Main window media source ID:', mediaSourceId);

    // The mediaSourceId format is like "window:12345:0" - we can use it directly
    // without needing to find it in desktopCapturer sources
    if (mediaSourceId) {
      return [{
        id: mediaSourceId,
        name: 'AI Command Center',
        debug: `Using direct window ID: ${mediaSourceId}`
      }];
    }

    // Fallback: try to find in sources list
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 150, height: 150 }
    });

    const sourceNames = sources.map(s => `${s.name} (${s.id})`);
    console.log('Window sources found:', sources.length, sourceNames);

    // Find by window title
    let appSource = sources.find(s =>
      s.name === 'AI Command Center' ||
      s.name.includes('AI Command Center')
    );

    if (appSource) {
      return [{ id: appSource.id, name: appSource.name, debug: `Found by name from ${sources.length} windows` }];
    }

    const windowList = sources.map(s => s.name).join(', ');
    return [{ id: null, name: null, debug: `Window not found. ${sources.length} windows: ${windowList}`, error: true }];
  } catch (error) {
    console.error('Failed to get desktop sources:', error);
    return [{ id: null, name: null, debug: `Error: ${error.message}`, error: true }];
  }
});

// =========================================================================
// TERMINAL PTY HANDLERS
// =========================================================================

let terminalIdCounter = 0;

// Create a new terminal PTY
ipcMain.handle('pty:create', () => {
  const terminalId = ++terminalIdCounter;

  // Determine shell based on platform
  const shell = process.platform === 'win32'
    ? 'powershell.exe'
    : process.env.SHELL || '/bin/bash';

  // Set default working directory to AI Command Center project
  const defaultCwd = 'D:\\Projects\\ai-command-center';

  // Create PTY process
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: defaultCwd,
    env: process.env
  });

  // Store the PTY process
  terminals.set(terminalId, ptyProcess);

  // Listen to PTY output and send to renderer
  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`pty:data:${terminalId}`, data);
    }
  });

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`Terminal ${terminalId} exited with code ${exitCode}`);
    terminals.delete(terminalId);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`pty:exit:${terminalId}`, { exitCode, signal });
    }
  });

  // Run startup command after a brief delay to ensure terminal is ready
  setTimeout(() => {
    ptyProcess.write('claude --dangerously-skip-permissions\r');
  }, 100);

  console.log(`Created terminal ${terminalId} with shell: ${shell} in ${defaultCwd}`);
  return terminalId;
});

// Write data to terminal
ipcMain.handle('pty:write', (event, terminalId, data) => {
  const ptyProcess = terminals.get(terminalId);
  if (ptyProcess) {
    ptyProcess.write(data);
    return { success: true };
  }
  return { success: false, error: 'Terminal not found' };
});

// Resize terminal
ipcMain.handle('pty:resize', (event, terminalId, cols, rows) => {
  const ptyProcess = terminals.get(terminalId);
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
    return { success: true };
  }
  return { success: false, error: 'Terminal not found' };
});

// Kill terminal
ipcMain.handle('pty:kill', (event, terminalId) => {
  const ptyProcess = terminals.get(terminalId);
  if (ptyProcess) {
    ptyProcess.kill();
    terminals.delete(terminalId);
    return { success: true };
  }
  return { success: false, error: 'Terminal not found' };
});

// =========================================================================
// API SERVER HANDLERS
// =========================================================================

// Get API server status
ipcMain.handle('api-server:status', () => {
  const status = getServerStatus();
  return {
    success: true,
    ...status
  };
});

// Start API server
ipcMain.handle('api-server:start', async (event, port) => {
  try {
    const apiPort = port || process.env.API_SERVER_PORT || 3939;
    await startApiServer(parseInt(apiPort));
    return {
      success: true,
      message: `API server started on port ${apiPort}`
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
});

// Stop API server
ipcMain.handle('api-server:stop', async () => {
  try {
    await stopApiServer();
    return {
      success: true,
      message: 'API server stopped'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
});

// =========================================================================
// DGX SPARK SSH HANDLERS
// =========================================================================

// Connect to DGX server via SSH
ipcMain.handle('dgx:connect', async (event, config) => {
  return await dgxManager.connectToDGX(config);
});

// Disconnect from DGX server
ipcMain.handle('dgx:disconnect', async (event, connectionId) => {
  return await dgxManager.disconnectFromDGX(connectionId);
});

// Check connection status
ipcMain.handle('dgx:check-status', async (event, connectionId) => {
  return dgxManager.getConnectionStatus(connectionId);
});

// Execute command on DGX server
ipcMain.handle('dgx:exec-command', async (event, connectionId, command) => {
  // dgxManager.executeCommand will emit the event via dgxEvents
  return await dgxManager.executeCommand(connectionId, command);
});

// Get command history
ipcMain.handle('dgx:get-command-history', async () => {
  return { success: true, data: dgxManager.commandHistory || [] };
});

// Get GPU metrics from nvidia-smi
ipcMain.handle('dgx:get-metrics', async (event, connectionId) => {
  return await dgxManager.getGPUMetrics(connectionId);
});

// Start operation monitoring for a connection
ipcMain.handle('dgx:start-monitoring', async (event, connectionId) => {
  operationMonitor.startMonitoring(connectionId);
  return { success: true };
});

// Stop operation monitoring for a connection
ipcMain.handle('dgx:stop-monitoring', async (event, connectionId) => {
  operationMonitor.stopMonitoring(connectionId);
  return { success: true };
});

// Start port forwarding tunnel
ipcMain.handle('dgx:start-tunnel', async (event, connectionId, localPort, remotePort) => {
  try {
    const ssh = dgxConnections.get(connectionId);
    if (!ssh || !ssh.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    // Forward local port to remote port
    await ssh.forwardOut(
      '127.0.0.1',
      localPort,
      '127.0.0.1',
      remotePort
    );

    console.log(`[Main] Port forwarding started: ${localPort} -> ${remotePort}`);
    return { success: true, data: { localPort, remotePort } };
  } catch (error) {
    console.error('[Main] dgx:start-tunnel error:', error.message);
    return { success: false, error: 'Failed to start tunnel' };
  }
});

// Stop port forwarding tunnel
ipcMain.handle('dgx:stop-tunnel', async (event, connectionId) => {
  try {
    const ssh = dgxConnections.get(connectionId);
    if (!ssh) {
      return { success: false, error: 'Connection not found' };
    }

    // Note: node-ssh doesn't provide a direct way to stop individual tunnels
    // This would typically require tracking tunnel handles separately
    // For now, we'll just acknowledge the request
    console.log(`[Main] Tunnel stop requested for: ${connectionId}`);
    return { success: true, data: {} };
  } catch (error) {
    console.error('[Main] dgx:stop-tunnel error:', error.message);
    return { success: false, error: 'Failed to stop tunnel' };
  }
});

// List Docker containers
ipcMain.handle('dgx:list-containers', async (event, connectionId) => {
  try {
    const ssh = dgxConnections.get(connectionId);
    if (!ssh || !ssh.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    const command = "docker ps --format '{{.ID}}\\t{{.Names}}\\t{{.Status}}\\t{{.Image}}'";
    const result = await ssh.execCommand(command);

    if (result.code !== 0) {
      return { success: false, error: 'Docker command failed' };
    }

    // Parse output
    const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);
    const containers = lines.map(line => {
      const [id, name, status, image] = line.split('\t');
      return {
        id: id || '',
        name: name || '',
        status: status || '',
        image: image || ''
      };
    });

    return { success: true, data: { containers } };
  } catch (error) {
    console.error('[Main] dgx:list-containers error:', error.message);
    return { success: false, error: 'Failed to list containers' };
  }
});

// ============================================================================
// PROJECT WATCHER IPC HANDLERS
// ============================================================================

// Start watching a project's filesystem directory
ipcMain.handle('project:start-watching', async (event, projectId, fsPath) => {
  try {
    const success = await projectWatcher.startWatching(projectId, fsPath, (updateData) => {
      // Send real-time progress updates to renderer
      if (mainWindow) {
        mainWindow.webContents.send('project:progress-updated', updateData);
      }
    });

    return { success: true, data: { watching: success } };
  } catch (error) {
    console.error('[Main] project:start-watching error:', error.message);
    return { success: false, error: error.message };
  }
});

// Stop watching a project
ipcMain.handle('project:stop-watching', async (event, projectId) => {
  try {
    const success = await projectWatcher.stopWatching(projectId);
    return { success: true, data: { stopped: success } };
  } catch (error) {
    console.error('[Main] project:stop-watching error:', error.message);
    return { success: false, error: error.message };
  }
});

// Get recent activity for a project
ipcMain.handle('project:get-activity', async (event, projectId, limit = 20) => {
  try {
    const activity = projectWatcher.getRecentActivity(projectId, limit);
    return { success: true, data: activity };
  } catch (error) {
    console.error('[Main] project:get-activity error:', error.message);
    return { success: false, error: error.message };
  }
});

// Get current metrics for a watched project
ipcMain.handle('project:get-metrics', async (event, projectId) => {
  try {
    const metrics = projectWatcher.getMetrics(projectId);
    return { success: true, data: metrics };
  } catch (error) {
    console.error('[Main] project:get-metrics error:', error.message);
    return { success: false, error: error.message };
  }
});

// Manually sync progress (even if not watched)
ipcMain.handle('project:sync-progress', async (event, projectId, fsPath) => {
  try {
    const result = await projectWatcher.syncProgress(projectId, fsPath);
    if (!result) {
      return { success: false, error: 'Failed to sync progress' };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error('[Main] project:sync-progress error:', error.message);
    return { success: false, error: error.message };
  }
});

// Check if a project is being watched
ipcMain.handle('project:is-watching', async (event, projectId) => {
  try {
    const watching = projectWatcher.isWatching(projectId);
    return { success: true, data: { watching } };
  } catch (error) {
    console.error('[Main] project:is-watching error:', error.message);
    return { success: false, error: error.message };
  }
});

// Get list of all watched projects
ipcMain.handle('project:get-watched-projects', async () => {
  try {
    const projectIds = projectWatcher.getWatchedProjects();
    return { success: true, data: projectIds };
  } catch (error) {
    console.error('[Main] project:get-watched-projects error:', error.message);
    return { success: false, error: error.message };
  }
});

// =========================================================================
// DGX METRICS EXPORT FILE HANDLERS
// =========================================================================

let exportsWatcher = null;

// List all metric exports
ipcMain.handle('dgx-exports:list', async (event, connectionId = null) => {
  try {
    const exportsDir = path.join(userDataPath, 'exports', 'dgx-metrics');

    if (!fs.existsSync(exportsDir)) {
      return { success: true, data: [] };
    }

    const files = fs.readdirSync(exportsDir)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(exportsDir, filename);
        const stats = fs.statSync(filePath);
        // Extract connection ID from filename: dgx-metrics-{connectionId}-{timestamp}.json
        const match = filename.match(/dgx-metrics-([^-]+-[^-]+-[^-]+-[^-]+-[^-]+)-/);
        const fileConnectionId = match ? match[1] : null;

        return {
          filename,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          connectionId: fileConnectionId
        };
      })
      .filter(f => !connectionId || f.connectionId === connectionId)
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    return { success: true, data: files };
  } catch (err) {
    console.error('[DGX Exports] List error:', err);
    return { success: false, error: err.message };
  }
});

// Read a specific export file
ipcMain.handle('dgx-exports:read', async (event, filename) => {
  try {
    const exportsDir = path.join(userDataPath, 'exports', 'dgx-metrics');
    const filePath = path.join(exportsDir, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    return { success: true, data };
  } catch (err) {
    console.error('[DGX Exports] Read error:', err);
    return { success: false, error: err.message };
  }
});

// Delete an export file
ipcMain.handle('dgx-exports:delete', async (event, filename) => {
  try {
    const exportsDir = path.join(userDataPath, 'exports', 'dgx-metrics');
    const filePath = path.join(exportsDir, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    fs.unlinkSync(filePath);
    console.log('[DGX Exports] Deleted:', filename);

    return { success: true };
  } catch (err) {
    console.error('[DGX Exports] Delete error:', err);
    return { success: false, error: err.message };
  }
});

// Start watching exports folder
ipcMain.handle('dgx-exports:start-watching', async () => {
  try {
    const exportsDir = path.join(userDataPath, 'exports', 'dgx-metrics');

    // Ensure directory exists
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Stop existing watcher if any
    if (exportsWatcher) {
      await exportsWatcher.close();
    }

    exportsWatcher = chokidar.watch(exportsDir, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500 }
    });

    exportsWatcher.on('add', (filePath) => {
      const filename = path.basename(filePath);
      if (filename.endsWith('.json')) {
        mainWindow?.webContents.send('dgx-exports:changed', { type: 'add', filename });
      }
    });

    exportsWatcher.on('unlink', (filePath) => {
      const filename = path.basename(filePath);
      mainWindow?.webContents.send('dgx-exports:changed', { type: 'delete', filename });
    });

    console.log('[DGX Exports] Started watching:', exportsDir);
    return { success: true };
  } catch (err) {
    console.error('[DGX Exports] Watch error:', err);
    return { success: false, error: err.message };
  }
});

// Stop watching exports folder
ipcMain.handle('dgx-exports:stop-watching', async () => {
  try {
    if (exportsWatcher) {
      await exportsWatcher.close();
      exportsWatcher = null;
      console.log('[DGX Exports] Stopped watching');
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
