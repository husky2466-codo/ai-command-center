/**
 * Project Refresh Daemon - Periodically updates project progress for active projects
 *
 * Features:
 * - Polls active/on_deck/growing projects every 60 seconds (configurable)
 * - Reuses projectWatcher.syncProgress() for progress calculation
 * - Emits events for UI updates
 * - Runs as a background daemon
 */

const EventEmitter = require('events');
const { getDatabase } = require('../database/db.cjs');
const projectWatcher = require('./projectWatcher.cjs');

class ProjectRefreshDaemon extends EventEmitter {
  constructor() {
    super();

    // Polling interval in milliseconds (default: 60 seconds)
    this.pollIntervalMs = 60000;

    // Interval ID for the polling loop
    this.intervalId = null;

    // Track daemon state
    this.isRunning = false;
    this.lastRefreshTime = null;

    console.log('[ProjectRefreshDaemon] Initialized');
  }

  /**
   * Start the daemon with a polling interval
   * @param {number} intervalMs - Polling interval in milliseconds (default: 60000)
   */
  start(intervalMs = 60000) {
    if (this.isRunning) {
      console.log('[ProjectRefreshDaemon] Already running');
      return;
    }

    this.pollIntervalMs = intervalMs;
    this.isRunning = true;

    console.log(`[ProjectRefreshDaemon] Starting with interval: ${intervalMs}ms (${intervalMs / 1000}s)`);

    // Initial refresh on start
    this.refresh();

    // Set up polling interval
    this.intervalId = setInterval(() => {
      this.refresh();
    }, this.pollIntervalMs);

    console.log('[ProjectRefreshDaemon] Started successfully');
  }

  /**
   * Stop the daemon
   */
  stop() {
    if (!this.isRunning) {
      console.log('[ProjectRefreshDaemon] Not running');
      return;
    }

    console.log('[ProjectRefreshDaemon] Stopping...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[ProjectRefreshDaemon] Stopped');
  }

  /**
   * Manually trigger a refresh cycle (even if daemon is stopped)
   * @returns {Promise<void>}
   */
  async refresh() {
    const startTime = Date.now();
    console.log('[ProjectRefreshDaemon] Starting refresh cycle...');

    try {
      // Get all active projects with filesystem paths
      const db = getDatabase();
      const projects = db.prepare(`
        SELECT id, name, fs_path, status, progress
        FROM projects
        WHERE fs_path IS NOT NULL
          AND fs_path != ''
          AND status IN ('active_focus', 'on_deck', 'growing')
        ORDER BY status ASC, name ASC
      `).all();

      if (projects.length === 0) {
        console.log('[ProjectRefreshDaemon] No active projects with fs_path found');
        this.lastRefreshTime = new Date().toISOString();
        return;
      }

      console.log(`[ProjectRefreshDaemon] Found ${projects.length} projects to refresh`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Refresh each project sequentially
      for (const project of projects) {
        try {
          console.log(`[ProjectRefreshDaemon] Refreshing: ${project.name} (${project.id})`);

          // Use projectWatcher.syncProgress to calculate and update progress
          const result = await projectWatcher.syncProgress(project.id, project.fs_path);

          if (result) {
            successCount++;
            results.push({
              projectId: project.id,
              name: project.name,
              status: project.status,
              oldProgress: project.progress,
              newProgress: result.progress,
              metrics: result.metrics,
              changed: Math.abs(result.progress - project.progress) > 0.001 // Detect meaningful changes
            });
          } else {
            errorCount++;
            console.warn(`[ProjectRefreshDaemon] Failed to refresh ${project.name}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`[ProjectRefreshDaemon] Error refreshing ${project.name}:`, error.message);

          // Emit error event for this project
          this.emit('refresh-error', {
            projectId: project.id,
            name: project.name,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      this.lastRefreshTime = new Date().toISOString();

      console.log(`[ProjectRefreshDaemon] Refresh cycle completed in ${duration}ms`);
      console.log(`[ProjectRefreshDaemon] Success: ${successCount}, Errors: ${errorCount}`);

      // Emit success event with all results
      this.emit('projects-refreshed', {
        timestamp: this.lastRefreshTime,
        totalProjects: projects.length,
        successCount,
        errorCount,
        duration,
        projects: results
      });

    } catch (error) {
      console.error('[ProjectRefreshDaemon] Refresh cycle error:', error.message);
      this.lastRefreshTime = new Date().toISOString();

      // Emit general error event
      this.emit('refresh-error', {
        error: error.message,
        timestamp: this.lastRefreshTime
      });
    }
  }

  /**
   * Update the polling interval (stops and restarts daemon if running)
   * @param {number} intervalMs - New interval in milliseconds
   */
  setInterval(intervalMs) {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.pollIntervalMs = intervalMs;
    console.log(`[ProjectRefreshDaemon] Interval updated to ${intervalMs}ms (${intervalMs / 1000}s)`);

    if (wasRunning) {
      this.start(intervalMs);
    }
  }

  /**
   * Get current daemon status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pollIntervalMs: this.pollIntervalMs,
      pollIntervalSeconds: this.pollIntervalMs / 1000,
      lastRefreshTime: this.lastRefreshTime,
      nextRefreshIn: this.isRunning && this.lastRefreshTime
        ? Math.max(0, this.pollIntervalMs - (Date.now() - new Date(this.lastRefreshTime).getTime()))
        : null
    };
  }
}

// Export singleton instance
module.exports = new ProjectRefreshDaemon();
