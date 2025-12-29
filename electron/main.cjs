const { app, BrowserWindow, ipcMain, shell, desktopCapturer, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
const isDev = !app.isPackaged;

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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize(); // Start in windowed fullscreen
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Ensure user data directories exist
  ensureDir(path.join(userDataPath, 'snapshots'));
  ensureDir(path.join(userDataPath, 'sessions'));
  ensureDir(path.join(userDataPath, 'configs'));
  ensureDir(path.join(userDataPath, 'recordings'));
  ensureDir(path.join(userDataPath, 'rag-outputs'));
  ensureDir(path.join(userDataPath, 'prompt-lists'));
  ensureDir(path.join(userDataPath, 'chain-configs'));

  createWindow();

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
