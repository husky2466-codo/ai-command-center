/**
 * Logging IPC Handlers
 * Handles: log-error, show-error-dialog
 */

function register(ipcMain, context) {
  const { logger, wrapIpcHandler, dialog } = context;

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
}

module.exports = { register };
