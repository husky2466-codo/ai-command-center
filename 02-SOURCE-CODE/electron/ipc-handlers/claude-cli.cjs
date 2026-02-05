/**
 * Claude CLI Service IPC Handlers
 * Channels: claude-cli:check, claude-cli:get-status, claude-cli:check-oauth,
 *           claude-cli:query, claude-cli:query-with-image, claude-cli:stream,
 *           claude-cli:cancel, claude-cli:setup-token
 */

function register(ipcMain, context) {
  const { claudeCliService } = context;

  // Check if Claude CLI is available
  ipcMain.handle('claude-cli:check', async () => {
    return await claudeCliService.checkAvailability();
  });

  // Get Claude CLI status
  ipcMain.handle('claude-cli:get-status', async () => {
    return claudeCliService.getStatus();
  });

  // Check OAuth status
  ipcMain.handle('claude-cli:check-oauth', async () => {
    return await claudeCliService.checkOAuthStatus();
  });

  // Query Claude CLI
  ipcMain.handle('claude-cli:query', async (event, prompt, options) => {
    return await claudeCliService.query(prompt, options);
  });

  // Query with image
  ipcMain.handle('claude-cli:query-with-image', async (event, prompt, imageBase64, options) => {
    return await claudeCliService.queryWithImage(prompt, imageBase64, options);
  });

  // Stream query
  // Note: uses event.sender.send() (not context.mainWindow()) since event.sender
  // is the specific webContents that initiated the request
  ipcMain.handle('claude-cli:stream', async (event, prompt, options) => {
    // For streaming, we'll send chunks via webContents
    const result = await claudeCliService.streamQuery(prompt, options, (chunk) => {
      event.sender.send('claude-cli:stream-chunk', chunk);
    });
    return result;
  });

  // Cancel request
  ipcMain.handle('claude-cli:cancel', async (event, requestId) => {
    return claudeCliService.cancel(requestId);
  });

  // Setup authentication token
  ipcMain.handle('claude-cli:setup-token', async () => {
    // Open terminal for user to run claude auth login
    const { exec } = require('child_process');
    exec('start cmd /k claude auth login');
    return { started: true };
  });
}

module.exports = { register };
