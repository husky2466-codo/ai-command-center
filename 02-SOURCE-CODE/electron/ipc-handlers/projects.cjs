/**
 * Projects IPC Handlers
 * Channels: scan-projects-folder, project:start-watching, project:stop-watching,
 *           project:get-activity, project:get-metrics, project:sync-progress,
 *           project:is-watching, project:get-watched-projects,
 *           projects:manual-refresh, projects:daemon-status, projects:set-refresh-interval
 */

const fs = require('fs');
const path = require('path');

function register(ipcMain, context) {
  const { projectWatcher, projectRefreshDaemon } = context;

  // Scan D:\Projects folder for importable projects
  ipcMain.handle('scan-projects-folder', async () => {
    console.log('[Main] scan-projects-folder handler called');
    try {
      const projectsPath = 'D:\\Projects';
      console.log('[Main] Checking path:', projectsPath);

      if (!fs.existsSync(projectsPath)) {
        console.error('[Main] Path does not exist:', projectsPath);
        return { success: false, error: 'D:\\Projects folder not found' };
      }

      const entries = fs.readdirSync(projectsPath, { withFileTypes: true });
      console.log('[Main] Found entries:', entries.length);

      const projects = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(projectsPath, entry.name);
          const stats = fs.statSync(fullPath);

          projects.push({
            name: entry.name,
            path: fullPath,
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString()
          });
        }
      }

      console.log('[Main] Found directories:', projects.length);

      // Sort by modified date (newest first)
      projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));

      console.log('[Main] Returning projects:', projects.length);
      return { success: true, projects };
    } catch (error) {
      console.error('[Main] scan-projects-folder error:', error.message, error.stack);
      return { success: false, error: error.message };
    }
  });

  // Start watching a project's filesystem directory
  ipcMain.handle('project:start-watching', async (event, projectId, fsPath) => {
    try {
      const success = await projectWatcher.startWatching(projectId, fsPath, (updateData) => {
        // Send real-time progress updates to renderer
        const win = context.mainWindow();
        if (win) {
          win.webContents.send('project:progress-updated', updateData);
        }
      });

      return { success: true, data: { watching: success } };
    } catch (error) {
      console.error('[Main] project:start-watching error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Stop watching a project
  ipcMain.handle('project:stop-watching', async (event, projectId) => {
    try {
      const success = await projectWatcher.stopWatching(projectId);
      return { success: true, data: { stopped: success } };
    } catch (error) {
      console.error('[Main] project:stop-watching error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Get recent activity for a project
  ipcMain.handle('project:get-activity', async (event, projectId, limit = 20) => {
    try {
      const activity = projectWatcher.getRecentActivity(projectId, limit);
      return { success: true, data: activity };
    } catch (error) {
      console.error('[Main] project:get-activity error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Get current metrics for a watched project
  ipcMain.handle('project:get-metrics', async (event, projectId) => {
    try {
      const metrics = projectWatcher.getMetrics(projectId);
      return { success: true, data: metrics };
    } catch (error) {
      console.error('[Main] project:get-metrics error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Manually sync progress (even if not watched)
  ipcMain.handle('project:sync-progress', async (event, projectId, fsPath) => {
    try {
      const result = await projectWatcher.syncProgress(projectId, fsPath);
      if (!result) {
        return { success: false, error: 'Failed to sync progress' };
      }
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main] project:sync-progress error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Check if a project is being watched
  ipcMain.handle('project:is-watching', async (event, projectId) => {
    try {
      const watching = projectWatcher.isWatching(projectId);
      return { success: true, data: { watching } };
    } catch (error) {
      console.error('[Main] project:is-watching error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Get list of all watched projects
  ipcMain.handle('project:get-watched-projects', async () => {
    try {
      const projectIds = projectWatcher.getWatchedProjects();
      return { success: true, data: projectIds };
    } catch (error) {
      console.error('[Main] project:get-watched-projects error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================================
  // PROJECT REFRESH DAEMON IPC HANDLERS
  // ============================================================================

  // Manual refresh of all projects
  ipcMain.handle('projects:manual-refresh', async () => {
    try {
      await projectRefreshDaemon.refresh();
      return { success: true };
    } catch (error) {
      console.error('[Main] projects:manual-refresh error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Get daemon status
  ipcMain.handle('projects:daemon-status', async () => {
    try {
      const status = projectRefreshDaemon.getStatus();
      return { success: true, data: status };
    } catch (error) {
      console.error('[Main] projects:daemon-status error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Set refresh interval
  ipcMain.handle('projects:set-refresh-interval', async (event, intervalMs) => {
    try {
      projectRefreshDaemon.setInterval(intervalMs);
      return { success: true };
    } catch (error) {
      console.error('[Main] projects:set-refresh-interval error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
