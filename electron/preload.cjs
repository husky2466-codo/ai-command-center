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
  scanProjectsFolder: async () => {
    console.log('[Preload] scanProjectsFolder called, invoking scan-projects-folder');
    const result = await ipcRenderer.invoke('scan-projects-folder');
    console.log('[Preload] scanProjectsFolder result:', result);
    return result;
  },

  // Screen capture
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // API keys
  getEnvKeys: () => ipcRenderer.invoke('get-env-keys'),

  // Error logging
  logError: (errorData) => ipcRenderer.invoke('log-error', errorData),
  showErrorDialog: (options) => ipcRenderer.invoke('show-error-dialog', options),

  // Database operations
  dbQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
  dbRun: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
  dbGet: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
  dbTransaction: (operations) => ipcRenderer.invoke('db:transaction', operations),
  dbHealth: () => ipcRenderer.invoke('db:health'),
  dbTables: () => ipcRenderer.invoke('db:tables'),
  dbSchema: (tableName) => ipcRenderer.invoke('db:schema', tableName),
  dbVectorSearch: (params) => ipcRenderer.invoke('db:vector-search', params),

  // Memory extraction
  memoryFindClaudeSessions: () => ipcRenderer.invoke('memory:find-claude-sessions'),
  memoryExtractFromSession: (sessionPath, apiKey) => ipcRenderer.invoke('memory:extract-from-session', sessionPath, apiKey),
  memoryGetExtractionState: () => ipcRenderer.invoke('memory:get-extraction-state'),
  memorySaveExtractionState: (state) => ipcRenderer.invoke('memory:save-extraction-state', state),

  // Events
  onFileChange: (callback) => {
    ipcRenderer.on('file-changed', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('file-changed');
  },
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', (event, moduleId) => callback(moduleId));
    return () => ipcRenderer.removeAllListeners('navigate-to');
  },

  // Google OAuth2
  googleAuthAuthenticate: (scopes) => ipcRenderer.invoke('google-auth:authenticate', scopes),
  googleAuthRefreshTokens: (email) => ipcRenderer.invoke('google-auth:refresh-tokens', email),
  googleAuthRevokeAccess: (email) => ipcRenderer.invoke('google-auth:revoke-access', email),
  googleAuthListAccounts: () => ipcRenderer.invoke('google-auth:list-accounts'),
  googleAuthEncryptionStatus: () => ipcRenderer.invoke('google-auth:encryption-status'),

  // Google Account Service - Account Management
  googleAddAccount: (email) => ipcRenderer.invoke('google:add-account', email),
  googleRemoveAccount: (accountId) => ipcRenderer.invoke('google:remove-account', accountId),
  googleListAccounts: () => ipcRenderer.invoke('google:list-accounts'),
  googleGetAccount: (accountId) => ipcRenderer.invoke('google:get-account', accountId),
  googleToggleSync: (accountId, enabled) => ipcRenderer.invoke('google:toggle-sync', accountId, enabled),

  // Google Account Service - Sync
  googleSyncAll: (accountId) => ipcRenderer.invoke('google:sync-all', accountId),
  googleSyncEmails: (accountId, options) => ipcRenderer.invoke('google:sync-emails', accountId, options),
  googleSyncCalendar: (accountId) => ipcRenderer.invoke('google:sync-calendar', accountId),
  googleSyncContacts: (accountId) => ipcRenderer.invoke('google:sync-contacts', accountId),
  googleGetSyncStatus: (accountId) => ipcRenderer.invoke('google:get-sync-status', accountId),

  // Google Account Service - Emails
  googleGetEmails: (accountId, options) => ipcRenderer.invoke('google:get-emails', accountId, options),
  googleGetEmail: (accountId, emailId) => ipcRenderer.invoke('google:get-email', accountId, emailId),
  googleSendEmail: (accountId, message) => ipcRenderer.invoke('google:send-email', accountId, message),
  googleTrashEmail: (accountId, emailId) => ipcRenderer.invoke('google:trash-email', accountId, emailId),
  googleDeleteEmail: (accountId, emailId) => ipcRenderer.invoke('google:delete-email', accountId, emailId),
  googleMarkEmailRead: (accountId, emailId, isRead) => ipcRenderer.invoke('google:mark-email-read', accountId, emailId, isRead),
  googleToggleEmailStar: (accountId, emailId, isStarred) => ipcRenderer.invoke('google:toggle-email-star', accountId, emailId, isStarred),
  googleReplyEmail: (accountId, emailId, message) => ipcRenderer.invoke('google:reply-email', accountId, emailId, message),
  googleForwardEmail: (accountId, emailId, message) => ipcRenderer.invoke('google:forward-email', accountId, emailId, message),

  // Google Account Service - Batch Email Operations
  googleBatchModifyEmails: (accountId, emailIds, modifications) => ipcRenderer.invoke('google:batch-modify-emails', accountId, emailIds, modifications),
  googleBatchTrashEmails: (accountId, emailIds) => ipcRenderer.invoke('google:batch-trash-emails', accountId, emailIds),
  googleBatchDeleteEmails: (accountId, emailIds) => ipcRenderer.invoke('google:batch-delete-emails', accountId, emailIds),

  // Google Account Service - Calendar
  googleGetEvents: (accountId, options) => ipcRenderer.invoke('google:get-events', accountId, options),
  googleCreateEvent: (accountId, eventData) => ipcRenderer.invoke('google:create-event', accountId, eventData),
  googleUpdateEvent: (accountId, eventId, updates) => ipcRenderer.invoke('google:update-event', accountId, eventId, updates),
  googleDeleteEvent: (accountId, eventId) => ipcRenderer.invoke('google:delete-event', accountId, eventId),

  // Google Account Service - Contacts
  googleGetContacts: (accountId, options) => ipcRenderer.invoke('google:get-contacts', accountId, options),
  googleGetContact: (accountId, contactId) => ipcRenderer.invoke('google:get-contact', accountId, contactId),

  // Google Account Service - Attachments
  googleDownloadAttachment: (accountId, messageId, attachmentId, filename) =>
    ipcRenderer.invoke('google:download-attachment', accountId, messageId, attachmentId, filename),
  googleGetAttachments: (accountId, messageId) =>
    ipcRenderer.invoke('google:get-attachments', accountId, messageId),
  googleGetInlineImages: (accountId, messageId) =>
    ipcRenderer.invoke('google:get-inline-images', accountId, messageId),

  // Google Account Service - Labels
  googleGetLabels: (accountId) =>
    ipcRenderer.invoke('google:get-labels', accountId),
  googleGetLabel: (accountId, labelId) =>
    ipcRenderer.invoke('google:get-label', accountId, labelId),
  googleCreateLabel: (accountId, name, options) =>
    ipcRenderer.invoke('google:create-label', accountId, name, options),
  googleUpdateLabel: (accountId, labelId, updates) =>
    ipcRenderer.invoke('google:update-label', accountId, labelId, updates),
  googleDeleteLabel: (accountId, labelId) =>
    ipcRenderer.invoke('google:delete-label', accountId, labelId),
  googleApplyLabel: (accountId, emailId, labelId) =>
    ipcRenderer.invoke('google:apply-label', accountId, emailId, labelId),
  googleRemoveLabel: (accountId, emailId, labelId) =>
    ipcRenderer.invoke('google:remove-label', accountId, emailId, labelId),

  // Google Account Service - Advanced Email Search
  googleSearchEmails: (accountId, query, options) =>
    ipcRenderer.invoke('google:search-emails', accountId, query, options),
  googleSaveSearch: (accountId, name, query, isFavorite) =>
    ipcRenderer.invoke('google:save-search', accountId, name, query, isFavorite),
  googleGetSavedSearches: (accountId, options) =>
    ipcRenderer.invoke('google:get-saved-searches', accountId, options),
  googleUpdateSavedSearch: (searchId, updates) =>
    ipcRenderer.invoke('google:update-saved-search', searchId, updates),
  googleDeleteSavedSearch: (searchId) =>
    ipcRenderer.invoke('google:delete-saved-search', searchId),
  googleRecordSearchUsage: (searchId) =>
    ipcRenderer.invoke('google:record-search-usage', searchId),
  googleGetRecentSearches: (accountId, limit) =>
    ipcRenderer.invoke('google:get-recent-searches', accountId, limit),

  // Dialog operations
  dialogOpenFile: (options) => ipcRenderer.invoke('dialog:open-file', options),
  shellOpenPath: (filePath) => ipcRenderer.invoke('shell:open-path', filePath),

  // Email Templates
  emailGetTemplates: (accountId) => ipcRenderer.invoke('email:get-templates', accountId),
  emailGetTemplate: (templateId) => ipcRenderer.invoke('email:get-template', templateId),
  emailCreateTemplate: (data) => ipcRenderer.invoke('email:create-template', data),
  emailUpdateTemplate: (templateId, updates) => ipcRenderer.invoke('email:update-template', templateId, updates),
  emailDeleteTemplate: (templateId) => ipcRenderer.invoke('email:delete-template', templateId),
  emailIncrementTemplateUsage: (templateId) => ipcRenderer.invoke('email:increment-template-usage', templateId),
  emailToggleTemplateFavorite: (templateId) => ipcRenderer.invoke('email:toggle-template-favorite', templateId),
  emailGetTemplateCategories: (accountId) => ipcRenderer.invoke('email:get-template-categories', accountId),

  // Email Signatures
  emailGetSignatures: (accountId) => ipcRenderer.invoke('email:get-signatures', accountId),
  emailGetSignature: (signatureId) => ipcRenderer.invoke('email:get-signature', signatureId),
  emailCreateSignature: (accountId, data) => ipcRenderer.invoke('email:create-signature', accountId, data),
  emailUpdateSignature: (signatureId, data) => ipcRenderer.invoke('email:update-signature', signatureId, data),
  emailDeleteSignature: (signatureId) => ipcRenderer.invoke('email:delete-signature', signatureId),
  emailGetDefaultSignature: (accountId, type) => ipcRenderer.invoke('email:get-default-signature', accountId, type),
  emailSetDefaultSignature: (accountId, signatureId) => ipcRenderer.invoke('email:set-default-signature', accountId, signatureId),

  // Terminal PTY operations
  createTerminal: () => ipcRenderer.invoke('pty:create'),
  writeToTerminal: (terminalId, data) => ipcRenderer.invoke('pty:write', terminalId, data),
  resizeTerminal: (terminalId, cols, rows) => ipcRenderer.invoke('pty:resize', terminalId, cols, rows),
  killTerminal: (terminalId) => ipcRenderer.invoke('pty:kill', terminalId),
  onTerminalData: (terminalId, callback) => {
    const channel = `pty:data:${terminalId}`;
    const handler = (event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onTerminalExit: (terminalId, callback) => {
    const channel = `pty:exit:${terminalId}`;
    const handler = (event, data) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // API Server operations
  apiServerStatus: () => ipcRenderer.invoke('api-server:status'),
  apiServerStart: (port) => ipcRenderer.invoke('api-server:start', port),
  apiServerStop: () => ipcRenderer.invoke('api-server:stop'),

  // DGX Spark SSH operations
  dgxConnect: (config) => ipcRenderer.invoke('dgx:connect', config),
  dgxDisconnect: (connectionId) => ipcRenderer.invoke('dgx:disconnect', connectionId),
  dgxCheckStatus: (connectionId) => ipcRenderer.invoke('dgx:check-status', connectionId),
  dgxExecCommand: (connectionId, command) => ipcRenderer.invoke('dgx:exec-command', connectionId, command),
  dgxGetMetrics: (connectionId) => ipcRenderer.invoke('dgx:get-metrics', connectionId),
  dgxStartTunnel: (connectionId, localPort, remotePort) => ipcRenderer.invoke('dgx:start-tunnel', connectionId, localPort, remotePort),
  dgxStopTunnel: (connectionId) => ipcRenderer.invoke('dgx:stop-tunnel', connectionId),
  dgxListContainers: (connectionId) => ipcRenderer.invoke('dgx:list-containers', connectionId),

  // Project Watcher operations
  projectStartWatching: (projectId, fsPath) => ipcRenderer.invoke('project:start-watching', projectId, fsPath),
  projectStopWatching: (projectId) => ipcRenderer.invoke('project:stop-watching', projectId),
  projectGetActivity: (projectId, limit) => ipcRenderer.invoke('project:get-activity', projectId, limit),
  projectGetMetrics: (projectId) => ipcRenderer.invoke('project:get-metrics', projectId),
  projectSyncProgress: (projectId, fsPath) => ipcRenderer.invoke('project:sync-progress', projectId, fsPath),
  projectIsWatching: (projectId) => ipcRenderer.invoke('project:is-watching', projectId),
  projectGetWatchedProjects: () => ipcRenderer.invoke('project:get-watched-projects'),
  onProjectProgressUpdated: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('project:progress-updated', handler);
    return () => ipcRenderer.removeListener('project:progress-updated', handler);
  },
});
