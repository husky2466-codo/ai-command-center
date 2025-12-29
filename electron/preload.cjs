const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Path helpers
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getHomePath: () => ipcRenderer.invoke('get-home-path'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  writeFileBinary: (filePath, base64Data) => ipcRenderer.invoke('write-file-binary', filePath, base64Data),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // Shell operations
  openPath: (folderPath) => ipcRenderer.invoke('open-path', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Screen capture
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // API keys
  getEnvKeys: () => ipcRenderer.invoke('get-env-keys'),

  // Events
  onFileChange: (callback) => {
    ipcRenderer.on('file-changed', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('file-changed');
  },
});
