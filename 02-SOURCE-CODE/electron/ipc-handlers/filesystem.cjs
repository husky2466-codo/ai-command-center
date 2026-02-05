/**
 * Filesystem IPC Handlers
 * Handles file/directory read, write, list, stats, and delete operations.
 */

const fs = require('fs');
const path = require('path');

function register(ipcMain, context) {
  const { app, userDataPath, isDev } = context;

  ipcMain.handle('get-user-data-path', () => userDataPath);

  ipcMain.handle('get-home-path', () => app.getPath('home'));

  ipcMain.handle('get-app-path', () => {
    // In dev mode, return the project root; in prod, return the unpacked app folder
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.join(__dirname, '..', '..');
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

  // List directory contents with detailed info for folder browser
  ipcMain.handle('list-directory-detailed', async (event, dirPath, options = {}) => {
    try {
      const { maxItems = 500 } = options;

      // Validate path exists
      if (!fs.existsSync(dirPath)) {
        return { success: false, error: 'Directory not found' };
      }

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      let items = entries
        .filter(entry => !entry.isSymbolicLink())  // Skip symlinks only
        .slice(0, maxItems)
        .map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          path: path.join(dirPath, entry.name)
        }));

      // Sort: folders first, then alphabetically
      items.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return b.isDirectory - a.isDirectory;
        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        items,
        truncated: entries.length > maxItems,
        totalCount: entries.length
      };
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
}

module.exports = { register };
