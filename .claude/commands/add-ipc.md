Add a new IPC channel to AI Command Center: $ARGUMENTS

Steps:
1. Add the IPC handler in `electron/main.cjs` using `ipcMain.handle('channel-name', async (event, ...args) => { ... })`
2. Expose it in `electron/preload.cjs` via `contextBridge.exposeInMainWorld` in the `electronAPI` object
3. Show example usage in the renderer: `await window.electronAPI.channelName(args)`

Follow the existing patterns in main.cjs for error handling (return `{ success: true/false, ... }`).
