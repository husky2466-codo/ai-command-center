/**
 * API Server IPC Handlers
 * Channels: api-server:status, api-server:start, api-server:stop
 */

function register(ipcMain, context) {
  // Get API server status
  ipcMain.handle('api-server:status', () => {
    const status = context.getServerStatus();
    return {
      success: true,
      ...status
    };
  });

  // Start API server
  ipcMain.handle('api-server:start', async (event, port) => {
    try {
      const apiPort = port || process.env.API_SERVER_PORT || 3939;
      await context.startApiServer(parseInt(apiPort));
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
      await context.stopApiServer();
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
}

module.exports = { register };
