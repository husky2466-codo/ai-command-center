/**
 * Screen Capture IPC Handlers
 * Handles: get-desktop-sources
 */

function register(ipcMain, context) {
  const { desktopCapturer } = context;
  const getMainWindow = context.mainWindow;

  // Get desktop sources for screen recording - ONLY capture app window, never full screen
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      // Get the media source ID directly from mainWindow first
      const mainWindow = getMainWindow();
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
}

module.exports = { register };
