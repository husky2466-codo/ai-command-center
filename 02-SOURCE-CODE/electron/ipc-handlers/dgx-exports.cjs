/**
 * DGX Metrics Export File IPC Handlers
 * Channels: dgx-exports:list, dgx-exports:read, dgx-exports:delete,
 *           dgx-exports:start-watching, dgx-exports:stop-watching
 * Local state: exportsWatcher (chokidar watcher)
 */

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

function register(ipcMain, context) {
  // Local state -- owned exclusively by this module
  let exportsWatcher = null;

  // List all metric exports
  ipcMain.handle('dgx-exports:list', async (event, connectionId = null) => {
    try {
      const exportsDir = path.join(context.userDataPath, 'exports', 'dgx-metrics');

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
      const exportsDir = path.join(context.userDataPath, 'exports', 'dgx-metrics');
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
      const exportsDir = path.join(context.userDataPath, 'exports', 'dgx-metrics');
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
      const exportsDir = path.join(context.userDataPath, 'exports', 'dgx-metrics');

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
          const win = context.mainWindow();
          win?.webContents.send('dgx-exports:changed', { type: 'add', filename });
        }
      });

      exportsWatcher.on('unlink', (filePath) => {
        const filename = path.basename(filePath);
        const win = context.mainWindow();
        win?.webContents.send('dgx-exports:changed', { type: 'delete', filename });
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
}

module.exports = { register };
