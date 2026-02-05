/**
 * Memory Extraction IPC Handlers
 * Handles: memory:find-claude-sessions, memory:extract-from-session,
 *          memory:get-extraction-state, memory:save-extraction-state
 */
const fs = require('fs');
const path = require('path');

function register(ipcMain, context) {
  const { app, userDataPath } = context;

  // Find Claude Code sessions
  ipcMain.handle('memory:find-claude-sessions', async () => {
    try {
      // Claude Code stores sessions in AppData\Local\claude-code\sessions
      const localAppData = app.getPath('appData').replace('Roaming', 'Local');
      const claudeSessionsBase = path.join(localAppData, 'claude-code', 'sessions');

      if (!fs.existsSync(claudeSessionsBase)) {
        return { success: false, error: 'Claude Code sessions directory not found' };
      }

      // Find all .jsonl files in all project subdirectories
      const sessions = [];
      const projectDirs = fs.readdirSync(claudeSessionsBase);

      for (const projectDir of projectDirs) {
        const projectPath = path.join(claudeSessionsBase, projectDir);
        const stats = fs.statSync(projectPath);

        if (stats.isDirectory()) {
          const files = fs.readdirSync(projectPath);
          const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

          for (const file of jsonlFiles) {
            const filePath = path.join(projectPath, file);
            const fileStats = fs.statSync(filePath);

            sessions.push({
              path: filePath,
              project: projectDir,
              filename: file,
              size: fileStats.size,
              modified: fileStats.mtime.toISOString()
            });
          }
        }
      }

      // Sort by modified date (newest first)
      sessions.sort((a, b) => new Date(b.modified) - new Date(a.modified));

      return { success: true, sessions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Extract content from a session file
  ipcMain.handle('memory:extract-from-session', async (event, sessionPath, apiKey) => {
    try {
      // This is called from the renderer - we just need to read and return the file
      // The actual extraction happens in the renderer using the service
      const content = fs.readFileSync(sessionPath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get extraction state
  ipcMain.handle('memory:get-extraction-state', async () => {
    try {
      const stateFile = path.join(userDataPath, 'extracted-memories', 'extraction-state.json');

      if (!fs.existsSync(stateFile)) {
        return {
          success: true,
          state: {
            lastRun: null,
            processedFiles: {},
            inProgress: false
          }
        };
      }

      const content = fs.readFileSync(stateFile, 'utf-8');
      return { success: true, state: JSON.parse(content) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Save extraction state
  ipcMain.handle('memory:save-extraction-state', async (event, state) => {
    try {
      const stateFile = path.join(userDataPath, 'extracted-memories', 'extraction-state.json');
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
