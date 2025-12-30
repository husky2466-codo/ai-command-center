/**
 * Project Watcher Service
 * Monitors project folders for file/folder changes and calculates progress metrics
 * Uses chokidar for cross-platform file watching
 */

const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const { getDatabase } = require('../database/db.cjs');

// Active watchers: Map<projectId, { watcher: FSWatcher, metrics: Object }>
const activeWatchers = new Map();

// Activity tracking: Map<projectId, Array<{ type, path, timestamp }>>
const activityLog = new Map();

// Maximum activity log entries per project
const MAX_ACTIVITY_ENTRIES = 100;

/**
 * Start watching a project's filesystem directory
 * @param {string} projectId - UUID of the project
 * @param {string} fsPath - Filesystem path to watch
 * @param {function} onUpdate - Callback for progress updates (optional)
 * @returns {Promise<boolean>} Success status
 */
async function startWatching(projectId, fsPath, onUpdate = null) {
  try {
    // Check if already watching
    if (activeWatchers.has(projectId)) {
      console.log(`[ProjectWatcher] Already watching project ${projectId}`);
      return true;
    }

    // Validate path exists
    try {
      await fs.access(fsPath);
    } catch (err) {
      console.error(`[ProjectWatcher] Path does not exist: ${fsPath}`);
      return false;
    }

    console.log(`[ProjectWatcher] Starting watch on: ${fsPath}`);

    // Initialize activity log for this project
    if (!activityLog.has(projectId)) {
      activityLog.set(projectId, []);
    }

    // Create watcher with chokidar
    const watcher = chokidar.watch(fsPath, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        /node_modules/,
        /\.git/,
        /dist/,
        /build/,
        /coverage/,
        /\.next/,
        /\.nuxt/,
        /\.vscode/,
        /__pycache__/,
        /\.pytest_cache/,
        /venv/,
        /env/,
        /\.venv/
      ],
      persistent: true,
      ignoreInitial: true, // Don't fire events for existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    // Event handlers
    watcher
      .on('add', (filePath) => handleFileEvent(projectId, 'add', filePath, onUpdate))
      .on('change', (filePath) => handleFileEvent(projectId, 'change', filePath, onUpdate))
      .on('unlink', (filePath) => handleFileEvent(projectId, 'unlink', filePath, onUpdate))
      .on('addDir', (dirPath) => handleFileEvent(projectId, 'addDir', dirPath, onUpdate))
      .on('unlinkDir', (dirPath) => handleFileEvent(projectId, 'unlinkDir', dirPath, onUpdate))
      .on('error', (error) => console.error(`[ProjectWatcher] Error watching ${fsPath}:`, error));

    // Store watcher instance and initial metrics
    const metrics = await calculateMetrics(fsPath);
    activeWatchers.set(projectId, { watcher, fsPath, metrics });

    console.log(`[ProjectWatcher] Now watching ${fsPath} for project ${projectId}`);
    return true;
  } catch (err) {
    console.error(`[ProjectWatcher] Failed to start watching:`, err);
    return false;
  }
}

/**
 * Stop watching a project
 * @param {string} projectId - UUID of the project
 * @returns {Promise<boolean>} Success status
 */
async function stopWatching(projectId) {
  try {
    const watchData = activeWatchers.get(projectId);
    if (!watchData) {
      console.log(`[ProjectWatcher] Project ${projectId} not being watched`);
      return false;
    }

    await watchData.watcher.close();
    activeWatchers.delete(projectId);
    activityLog.delete(projectId);

    console.log(`[ProjectWatcher] Stopped watching project ${projectId}`);
    return true;
  } catch (err) {
    console.error(`[ProjectWatcher] Failed to stop watching:`, err);
    return false;
  }
}

/**
 * Handle file system events
 * @private
 */
function handleFileEvent(projectId, eventType, filePath, onUpdate) {
  const timestamp = new Date().toISOString();

  console.log(`[ProjectWatcher] ${projectId} - ${eventType}: ${filePath}`);

  // Add to activity log
  const log = activityLog.get(projectId) || [];
  log.push({ type: eventType, path: filePath, timestamp });

  // Keep only recent entries
  if (log.length > MAX_ACTIVITY_ENTRIES) {
    log.shift();
  }
  activityLog.set(projectId, log);

  // Update metrics and trigger progress calculation
  const watchData = activeWatchers.get(projectId);
  if (watchData) {
    // Debounce progress updates (calculate after 2 seconds of inactivity)
    if (watchData.updateTimeout) {
      clearTimeout(watchData.updateTimeout);
    }

    watchData.updateTimeout = setTimeout(async () => {
      await updateProjectProgress(projectId, watchData.fsPath, onUpdate);
    }, 2000);
  }
}

/**
 * Calculate progress metrics for a project directory
 * @private
 */
async function calculateMetrics(fsPath) {
  const metrics = {
    totalFiles: 0,
    totalDirs: 0,
    filesByExtension: {},
    hasReadme: false,
    hasPackageJson: false,
    hasTestsDir: false,
    hasSrcDir: false,
    hasBuildDir: false,
    hasGit: false,
    lastActivity: null,
    size: 0
  };

  try {
    const entries = await fs.readdir(fsPath, { withFileTypes: true, recursive: false });

    for (const entry of entries) {
      const fullPath = path.join(fsPath, entry.name);

      if (entry.isDirectory()) {
        metrics.totalDirs++;

        // Check for milestone directories
        const lowerName = entry.name.toLowerCase();
        if (lowerName === 'tests' || lowerName === 'test' || lowerName === '__tests__') {
          metrics.hasTestsDir = true;
        } else if (lowerName === 'src' || lowerName === 'source') {
          metrics.hasSrcDir = true;
        } else if (lowerName === 'build' || lowerName === 'dist' || lowerName === 'release') {
          metrics.hasBuildDir = true;
        } else if (lowerName === '.git') {
          metrics.hasGit = true;
        }
      } else if (entry.isFile()) {
        metrics.totalFiles++;

        // Track file extensions
        const ext = path.extname(entry.name);
        if (ext) {
          metrics.filesByExtension[ext] = (metrics.filesByExtension[ext] || 0) + 1;
        }

        // Check for milestone files
        const lowerName = entry.name.toLowerCase();
        if (lowerName === 'readme.md' || lowerName === 'readme.txt' || lowerName === 'readme') {
          metrics.hasReadme = true;
        } else if (lowerName === 'package.json') {
          metrics.hasPackageJson = true;
        }

        // Get file stats for size
        try {
          const stats = await fs.stat(fullPath);
          metrics.size += stats.size;
        } catch (err) {
          // Ignore stat errors
        }
      }
    }

    metrics.lastActivity = new Date().toISOString();
    return metrics;
  } catch (err) {
    console.error(`[ProjectWatcher] Error calculating metrics for ${fsPath}:`, err);
    return metrics;
  }
}

/**
 * Calculate progress score based on metrics
 * Progress is a value from 0.0 to 1.0
 * @private
 */
function calculateProgress(metrics, recentActivity = []) {
  let progress = 0;

  // Milestone-based progress (70% weight)
  if (metrics.hasReadme) progress += 0.10;
  if (metrics.hasPackageJson) progress += 0.10;
  if (metrics.hasTestsDir) progress += 0.10;
  if (metrics.hasSrcDir && metrics.totalFiles > 0) progress += 0.15;
  if (metrics.hasBuildDir) progress += 0.15;
  if (metrics.hasGit) progress += 0.10;

  // Activity-based progress (30% weight)
  // Recent activity (last 7 days) adds up to 0.30
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentChanges = recentActivity.filter(
    (entry) => new Date(entry.timestamp) > sevenDaysAgo
  );

  if (recentChanges.length > 0) {
    // Scale activity: 1-10 changes = +0.05, 11-30 = +0.15, 31+ = +0.30
    if (recentChanges.length >= 31) {
      progress += 0.30;
    } else if (recentChanges.length >= 11) {
      progress += 0.15;
    } else {
      progress += 0.05;
    }
  }

  // Cap at 1.0
  return Math.min(progress, 1.0);
}

/**
 * Update project progress in database
 * @private
 */
async function updateProjectProgress(projectId, fsPath, onUpdate) {
  try {
    const db = getDatabase();

    // Recalculate metrics
    const metrics = await calculateMetrics(fsPath);

    // Get recent activity
    const recentActivity = activityLog.get(projectId) || [];

    // Calculate progress
    const progress = calculateProgress(metrics, recentActivity);

    // Update watcher data
    const watchData = activeWatchers.get(projectId);
    if (watchData) {
      watchData.metrics = metrics;
    }

    // Update database
    const now = new Date().toISOString();
    db.prepare('UPDATE projects SET progress = ?, updated_at = ? WHERE id = ?')
      .run(progress, now, projectId);

    console.log(`[ProjectWatcher] Updated progress for ${projectId}: ${(progress * 100).toFixed(1)}%`);

    // Trigger callback if provided
    if (onUpdate) {
      onUpdate({ projectId, progress, metrics, recentActivity });
    }

    return { progress, metrics };
  } catch (err) {
    console.error(`[ProjectWatcher] Failed to update progress:`, err);
    return null;
  }
}

/**
 * Get recent activity for a project
 * @param {string} projectId - UUID of the project
 * @param {number} limit - Maximum number of entries to return
 * @returns {Array} Recent activity entries
 */
function getRecentActivity(projectId, limit = 20) {
  const log = activityLog.get(projectId) || [];
  return log.slice(-limit).reverse(); // Most recent first
}

/**
 * Get current metrics for a watched project
 * @param {string} projectId - UUID of the project
 * @returns {Object|null} Current metrics or null if not watched
 */
function getMetrics(projectId) {
  const watchData = activeWatchers.get(projectId);
  return watchData ? watchData.metrics : null;
}

/**
 * Manually sync progress for a project (even if not watched)
 * @param {string} projectId - UUID of the project
 * @param {string} fsPath - Filesystem path
 * @returns {Promise<Object|null>} Updated progress and metrics
 */
async function syncProgress(projectId, fsPath) {
  try {
    const metrics = await calculateMetrics(fsPath);
    const progress = calculateProgress(metrics, []);

    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare('UPDATE projects SET progress = ?, updated_at = ? WHERE id = ?')
      .run(progress, now, projectId);

    console.log(`[ProjectWatcher] Synced progress for ${projectId}: ${(progress * 100).toFixed(1)}%`);

    return { progress, metrics };
  } catch (err) {
    console.error(`[ProjectWatcher] Failed to sync progress:`, err);
    return null;
  }
}

/**
 * Check if a project is currently being watched
 * @param {string} projectId - UUID of the project
 * @returns {boolean}
 */
function isWatching(projectId) {
  return activeWatchers.has(projectId);
}

/**
 * Get list of all watched project IDs
 * @returns {Array<string>}
 */
function getWatchedProjects() {
  return Array.from(activeWatchers.keys());
}

/**
 * Stop all watchers (cleanup on app shutdown)
 * @returns {Promise<void>}
 */
async function stopAllWatchers() {
  console.log(`[ProjectWatcher] Stopping all watchers (${activeWatchers.size} active)`);

  const promises = [];
  for (const [projectId, watchData] of activeWatchers) {
    promises.push(watchData.watcher.close());
  }

  await Promise.all(promises);
  activeWatchers.clear();
  activityLog.clear();

  console.log('[ProjectWatcher] All watchers stopped');
}

module.exports = {
  startWatching,
  stopWatching,
  getRecentActivity,
  getMetrics,
  syncProgress,
  isWatching,
  getWatchedProjects,
  stopAllWatchers
};
