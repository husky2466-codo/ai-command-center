/**
 * Dialog IPC Handlers
 * Handles: open-path, select-folder, dialog:open-file, shell:open-path
 */
const fs = require('fs');
const path = require('path');

function register(ipcMain, context) {
  const { shell, dialog } = context;
  const getMainWindow = context.mainWindow;

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
      const result = await dialog.showOpenDialog(getMainWindow(), {
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

  // File picker for attachments
  ipcMain.handle('dialog:open-file', async (event, options = {}) => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
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
}

module.exports = { register };
