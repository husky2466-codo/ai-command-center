/**
 * DGX Manager - Centralized SSH connection and metrics management
 * Shared between main process IPC handlers and HTTP API server
 */

const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');
const { getDatabase } = require('../database/db.cjs');

// Event emitter for command execution notifications
const dgxEvents = new EventEmitter();

/**
 * Expand ~ to home directory (works on Windows and Unix)
 * @param {string} filePath - Path that may contain ~
 * @returns {string} Expanded path
 */
function expandHomePath(filePath) {
  if (!filePath) return filePath;
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

// Active SSH connections
const dgxConnections = new Map();

/**
 * Connect to a DGX server via SSH
 * @param {object} config - Connection configuration
 * @param {string} config.id - Connection ID
 * @param {string} config.hostname - DGX hostname/IP
 * @param {string} config.username - SSH username
 * @param {string} config.sshKeyPath - Path to SSH private key
 * @param {number} config.port - SSH port (default: 22)
 * @returns {Promise<object>} Result object with success/error
 */
async function connectToDGX(config) {
  try {
    const { id, hostname, username, sshKeyPath, port = 22 } = config;

    // Validate required parameters
    if (!id || !hostname || !username || !sshKeyPath) {
      return { success: false, error: 'Missing required connection parameters' };
    }

    // Expand ~ in SSH key path (Windows compatibility)
    const expandedKeyPath = expandHomePath(sshKeyPath);

    // Verify SSH key exists
    if (!fs.existsSync(expandedKeyPath)) {
      return { success: false, error: `SSH key not found: ${expandedKeyPath} (original: ${sshKeyPath})` };
    }

    // Check if connection already exists
    if (dgxConnections.has(id)) {
      const existing = dgxConnections.get(id);
      if (existing.isConnected()) {
        return { success: false, error: 'Connection already exists' };
      }
      // Clean up stale connection
      existing.dispose();
      dgxConnections.delete(id);
    }

    // Create new SSH connection
    const ssh = new NodeSSH();

    // Connect with timeout
    await Promise.race([
      ssh.connect({
        host: hostname,
        username: username,
        privateKeyPath: expandedKeyPath,
        readyTimeout: 30000,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout (30s)')), 30000)
      )
    ]);

    // Store connection
    dgxConnections.set(id, ssh);

    // Update database
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE dgx_connections
      SET is_active = 1, last_connected_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, id);

    console.log(`[DGX Manager] Connection established: ${id} (${username}@${hostname})`);
    return { success: true, data: { connectionId: id } };
  } catch (error) {
    console.error('[DGX Manager] Connect error:', error.message);
    console.error('[DGX Manager] Connect error stack:', error.stack);
    return { success: false, error: `Failed to connect: ${error.message}` };
  }
}

/**
 * Disconnect from a DGX server
 * @param {string} connectionId - Connection ID
 * @returns {Promise<object>} Result object
 */
async function disconnectFromDGX(connectionId) {
  try {
    const ssh = dgxConnections.get(connectionId);
    if (!ssh) {
      return { success: false, error: 'Connection not found' };
    }

    ssh.dispose();
    dgxConnections.delete(connectionId);

    // Update database
    const db = getDatabase();
    db.prepare(`
      UPDATE dgx_connections
      SET is_active = 0, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), connectionId);

    console.log(`[DGX Manager] Connection closed: ${connectionId}`);
    return { success: true, data: {} };
  } catch (error) {
    console.error('[DGX Manager] Disconnect error:', error.message);
    return { success: false, error: 'Failed to disconnect' };
  }
}

/**
 * Check connection status
 * @param {string} connectionId - Connection ID (optional, returns active connection if not provided)
 * @returns {object} Status object
 */
function getConnectionStatus(connectionId = null) {
  try {
    if (connectionId) {
      const ssh = dgxConnections.get(connectionId);
      return {
        success: true,
        data: {
          connectionId,
          connected: ssh ? ssh.isConnected() : false
        }
      };
    }

    // Return active connection if no ID provided
    for (const [id, ssh] of dgxConnections.entries()) {
      if (ssh.isConnected()) {
        return {
          success: true,
          data: {
            connectionId: id,
            connected: true
          }
        };
      }
    }

    return { success: true, data: { connected: false } };
  } catch (error) {
    return { success: true, data: { connected: false } };
  }
}

/**
 * Execute command on DGX server
 * @param {string} connectionId - Connection ID
 * @param {string} command - Command to execute
 * @returns {Promise<object>} Result with stdout/stderr
 */
async function executeCommand(connectionId, command) {
  try {
    const ssh = dgxConnections.get(connectionId);
    if (!ssh || !ssh.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    const startTime = Date.now();

    const result = await ssh.execCommand(command, {
      cwd: '/home',
      execOptions: { pty: true }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Emit command executed event (will be sent to renderer via main.cjs)
    const commandEvent = {
      connectionId,
      command: command.substring(0, 100), // Truncate for safety
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
      duration,
      exitCode: result.code,
      success: result.code === 0
    };

    // Store last command for reference
    if (!module.exports.commandHistory) {
      module.exports.commandHistory = [];
    }
    module.exports.commandHistory.push(commandEvent);
    // Keep only last 50 commands
    if (module.exports.commandHistory.length > 50) {
      module.exports.commandHistory.shift();
    }

    // Emit event for listeners (main.cjs will forward to renderer)
    dgxEvents.emit('command-executed', commandEvent);

    if (result.code !== 0) {
      return {
        success: false,
        error: result.stderr || 'Command failed',
        data: {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
          duration
        }
      };
    }

    return {
      success: true,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code,
        duration
      }
    };
  } catch (error) {
    console.error('[DGX Manager] Execute command error:', error.message);
    return { success: false, error: 'Command execution failed' };
  }
}

/**
 * Get comprehensive system metrics (GPU, memory, network)
 * @param {string} connectionId - Connection ID
 * @returns {Promise<object>} System metrics
 */
async function getGPUMetrics(connectionId) {
  try {
    const ssh = dgxConnections.get(connectionId);
    if (!ssh || !ssh.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    // Run all commands in parallel for efficiency
    const [gpuResult, memResult, netResult, diskResult] = await Promise.all([
      ssh.execCommand('nvidia-smi --query-gpu=index,name,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits'),
      ssh.execCommand('free -m | grep Mem'),
      ssh.execCommand('cat /proc/net/dev | grep -E "enP7s7|eth0" | head -1'),
      ssh.execCommand('df -BG /home 2>/dev/null | tail -1')
    ]);

    // Parse GPU metrics (handle GB10 which doesn't report memory)
    let gpus = [];
    if (gpuResult.code === 0 && gpuResult.stdout.trim()) {
      const lines = gpuResult.stdout.trim().split('\n');
      gpus = lines.map(line => {
        const parts = line.split(',').map(v => v.trim());
        return {
          index: parseInt(parts[0]) || 0,
          name: parts[1] || 'Unknown GPU',
          gpuUtilization: parseFloat(parts[2]) || 0,
          temperature: parseInt(parts[3]) || 0,
          powerDraw: parseFloat(parts[4]) || 0
        };
      });
    }

    // Parse system memory (unified memory for GB10)
    let memory = { used: 0, total: 0, free: 0 };
    if (memResult.code === 0 && memResult.stdout.trim()) {
      const parts = memResult.stdout.trim().split(/\s+/);
      // Format: Mem: total used free shared buff/cache available
      memory = {
        total: parseInt(parts[1]) || 0,
        used: parseInt(parts[2]) || 0,
        free: parseInt(parts[3]) || 0,
        available: parseInt(parts[6]) || 0
      };
    }

    // Parse network stats
    let network = { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0, interface: 'unknown' };
    if (netResult.code === 0 && netResult.stdout.trim()) {
      const line = netResult.stdout.trim();
      const match = line.match(/(\w+):\s*(\d+)\s+(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)\s+(\d+)/);
      if (match) {
        network = {
          interface: match[1],
          rxBytes: parseInt(match[2]) || 0,
          rxPackets: parseInt(match[3]) || 0,
          txBytes: parseInt(match[4]) || 0,
          txPackets: parseInt(match[5]) || 0
        };
      }
    }

    // Parse disk/storage stats
    let storage = { total: 0, used: 0, available: 0, usedPercent: 0, mountPoint: '/home' };
    if (diskResult.code === 0 && diskResult.stdout.trim()) {
      // Format: Filesystem Size Used Avail Use% Mounted
      const parts = diskResult.stdout.trim().split(/\s+/);
      if (parts.length >= 5) {
        storage = {
          total: parseInt(parts[1]) || 0,      // Size in GB
          used: parseInt(parts[2]) || 0,       // Used in GB
          available: parseInt(parts[3]) || 0,  // Available in GB
          usedPercent: parseInt(parts[4]) || 0, // Use%
          mountPoint: parts[5] || '/home'
        };
      }
    }

    // Combine into GPU array format (for backwards compatibility)
    const enrichedGpus = gpus.map(gpu => ({
      ...gpu,
      memoryUsed: memory.used,
      memoryTotal: memory.total,
      memoryAvailable: memory.available,
      network
    }));

    // Store in database for history
    const db = getDatabase();
    const now = new Date().toISOString();
    const avgUtil = gpus.length > 0 ? gpus.reduce((sum, gpu) => sum + gpu.gpuUtilization, 0) / gpus.length : 0;
    const avgTemp = gpus.length > 0 ? gpus.reduce((sum, gpu) => sum + gpu.temperature, 0) / gpus.length : 0;
    const avgPower = gpus.length > 0 ? gpus.reduce((sum, gpu) => sum + gpu.powerDraw, 0) / gpus.length : 0;

    db.prepare(`
      INSERT INTO dgx_metrics (connection_id, gpu_utilization, memory_used_mb, memory_total_mb, temperature_c, power_watts, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(connectionId, avgUtil, memory.used, memory.total, avgTemp, avgPower, now);

    return {
      success: true,
      data: {
        gpus: enrichedGpus,
        memory,
        network,
        storage,
        timestamp: now
      }
    };
  } catch (error) {
    console.error('[DGX Manager] Get metrics error:', error.message);
    return { success: false, error: 'Failed to get metrics' };
  }
}

/**
 * Get metrics history from database
 * @param {string} connectionId - Connection ID
 * @param {number} hours - Number of hours of history (default: 24)
 * @returns {object} Metrics history
 */
function getMetricsHistory(connectionId, hours = 24) {
  try {
    const db = getDatabase();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const metrics = db.prepare(`
      SELECT * FROM dgx_metrics
      WHERE connection_id = ? AND recorded_at >= ?
      ORDER BY recorded_at ASC
    `).all(connectionId, since);

    return { success: true, data: metrics };
  } catch (error) {
    console.error('[DGX Manager] Get metrics history error:', error.message);
    return { success: false, error: 'Failed to get metrics history' };
  }
}

/**
 * Get active connection (for operations without specified ID)
 * @returns {object|null} SSH connection object or null
 */
function getActiveConnection() {
  for (const [id, ssh] of dgxConnections.entries()) {
    if (ssh.isConnected()) {
      return { id, ssh };
    }
  }
  return null;
}

/**
 * Disconnect all connections (cleanup on app shutdown)
 */
function disconnectAll() {
  console.log(`[DGX Manager] Disconnecting ${dgxConnections.size} connections...`);
  for (const [id, ssh] of dgxConnections.entries()) {
    try {
      ssh.dispose();
    } catch (error) {
      console.error(`[DGX Manager] Error disconnecting ${id}:`, error.message);
    }
  }
  dgxConnections.clear();

  // Update database to mark all connections as inactive
  try {
    const db = getDatabase();
    db.prepare(`UPDATE dgx_connections SET is_active = 0`).run();
    console.log('[DGX Manager] All connections marked as inactive in database');
  } catch (error) {
    console.error('[DGX Manager] Failed to update database:', error.message);
  }
}

/**
 * Reset all connection states on app startup
 * (In case app crashed without proper cleanup)
 */
function resetConnectionStates() {
  try {
    const db = getDatabase();
    db.prepare(`UPDATE dgx_connections SET is_active = 0`).run();
    console.log('[DGX Manager] Connection states reset on startup');
  } catch (error) {
    console.error('[DGX Manager] Failed to reset connection states:', error.message);
  }
}

module.exports = {
  connectToDGX,
  disconnectFromDGX,
  getConnectionStatus,
  executeCommand,
  getGPUMetrics,
  getMetricsHistory,
  getActiveConnection,
  disconnectAll,
  resetConnectionStates,
  // Export Map for direct access if needed
  dgxConnections,
  commandHistory: [],
  dgxEvents
};
