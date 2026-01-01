/**
 * Operation Monitor - Polls running DGX operations and tracks progress
 *
 * Features:
 * - Polls running operations every 2-3 seconds
 * - Checks if processes are still alive via SSH
 * - Parses log files for training progress
 * - Updates operation status in database
 * - Emits events for UI updates
 */

const EventEmitter = require('events');
const { getDatabase } = require('../database/db.cjs');
const dgxManager = require('./dgxManager.cjs');

class OperationMonitor extends EventEmitter {
  constructor() {
    super();

    // Map of connectionId -> polling interval
    this.pollingIntervals = new Map();

    // Polling interval in milliseconds (2.5 seconds)
    this.pollIntervalMs = 2500;

    // Track last known state to detect changes
    this.lastKnownStates = new Map();

    console.log('[OperationMonitor] Initialized');
  }

  /**
   * Start monitoring operations for a specific connection
   * @param {string} connectionId - DGX connection ID
   */
  startMonitoring(connectionId) {
    // Don't start if already monitoring
    if (this.pollingIntervals.has(connectionId)) {
      console.log(`[OperationMonitor] Already monitoring connection: ${connectionId}`);
      return;
    }

    console.log(`[OperationMonitor] Starting monitoring for connection: ${connectionId}`);

    // Initial poll
    this._pollOperations(connectionId);

    // Set up polling interval
    const intervalId = setInterval(() => {
      this._pollOperations(connectionId);
    }, this.pollIntervalMs);

    this.pollingIntervals.set(connectionId, intervalId);
  }

  /**
   * Stop monitoring operations for a specific connection
   * @param {string} connectionId - DGX connection ID
   */
  stopMonitoring(connectionId) {
    const intervalId = this.pollingIntervals.get(connectionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(connectionId);
      console.log(`[OperationMonitor] Stopped monitoring connection: ${connectionId}`);
    }
  }

  /**
   * Stop all monitoring (cleanup on app shutdown)
   */
  stopAll() {
    console.log(`[OperationMonitor] Stopping all monitoring (${this.pollingIntervals.size} connections)`);
    for (const [connectionId, intervalId] of this.pollingIntervals.entries()) {
      clearInterval(intervalId);
    }
    this.pollingIntervals.clear();
    this.lastKnownStates.clear();
  }

  /**
   * Get current progress for a specific operation
   * @param {string} operationId - Operation ID
   * @returns {object} Progress information
   */
  getOperationProgress(operationId) {
    try {
      const db = getDatabase();
      const operation = db.prepare(`
        SELECT id, name, type, status, pid, progress, progress_current, progress_total, progress_message, metrics
        FROM dgx_operations
        WHERE id = ?
      `).get(operationId);

      if (!operation) {
        return { success: false, error: 'Operation not found' };
      }

      return {
        success: true,
        data: {
          ...operation,
          metrics: operation.metrics ? JSON.parse(operation.metrics) : null
        }
      };
    } catch (error) {
      console.error('[OperationMonitor] getOperationProgress error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Poll all running operations for a connection
   * @param {string} connectionId - DGX connection ID
   * @private
   */
  async _pollOperations(connectionId) {
    try {
      // Check if connection is active
      const status = dgxManager.getConnectionStatus(connectionId);
      if (!status.success || !status.data.connected) {
        // Connection lost, stop monitoring
        this.stopMonitoring(connectionId);
        return;
      }

      // Get all running operations for this connection
      const db = getDatabase();
      const runningOps = db.prepare(`
        SELECT * FROM dgx_operations
        WHERE connection_id = ? AND status = 'running'
      `).all(connectionId);

      if (runningOps.length === 0) {
        return; // Nothing to monitor
      }

      // Check each operation
      for (const op of runningOps) {
        await this._checkOperation(connectionId, op);
      }
    } catch (error) {
      console.error('[OperationMonitor] Poll error:', error.message);
    }
  }

  /**
   * Check a single operation's status
   * @param {string} connectionId - DGX connection ID
   * @param {object} operation - Operation record from database
   * @private
   */
  async _checkOperation(connectionId, operation) {
    try {
      const updates = {};
      let statusChanged = false;

      // Check if process is still alive (if we have a PID)
      if (operation.pid) {
        const isAlive = await this._checkProcessAlive(connectionId, operation.pid);

        if (!isAlive) {
          // Process has died
          updates.status = 'stopped';
          updates.completed_at = new Date().toISOString();
          statusChanged = true;
          console.log(`[OperationMonitor] Process ${operation.pid} for operation ${operation.name} has stopped`);
        }
      }

      // Parse log file for progress (if log_file is set and process is running)
      if (operation.log_file && !updates.status) {
        const progress = await this._parseLogProgress(connectionId, operation);
        if (progress) {
          if (progress.current !== undefined) updates.progress_current = progress.current;
          if (progress.total !== undefined) updates.progress_total = progress.total;
          if (progress.message) updates.progress_message = progress.message;
          if (progress.metrics) updates.metrics = JSON.stringify(progress.metrics);

          // Calculate percentage
          if (progress.current !== undefined && progress.total !== undefined && progress.total > 0) {
            updates.progress = Math.round((progress.current / progress.total) * 100);
          }
        }
      }

      // Update database if we have changes
      if (Object.keys(updates).length > 0) {
        this._updateOperation(operation.id, updates);

        // Emit update event
        this.emit('operation-update', {
          operationId: operation.id,
          connectionId,
          name: operation.name,
          type: operation.type,
          ...updates,
          statusChanged
        });
      }

    } catch (error) {
      console.error(`[OperationMonitor] Check operation error for ${operation.name}:`, error.message);
    }
  }

  /**
   * Check if a process is still alive via SSH
   * @param {string} connectionId - DGX connection ID
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} True if process is alive
   * @private
   */
  async _checkProcessAlive(connectionId, pid) {
    try {
      const result = await dgxManager.executeCommand(connectionId, `ps -p ${pid} -o pid= 2>/dev/null`);

      if (!result.success) {
        return false;
      }

      // If command succeeded and returned the PID, process is alive
      const output = result.data.stdout.trim();
      return output.includes(String(pid));
    } catch (error) {
      console.error('[OperationMonitor] Check process alive error:', error.message);
      return false;
    }
  }

  /**
   * Parse log file for training progress
   * @param {string} connectionId - DGX connection ID
   * @param {object} operation - Operation record
   * @returns {Promise<object|null>} Progress information or null
   * @private
   */
  async _parseLogProgress(connectionId, operation) {
    try {
      // Get last 50 lines of log file
      const result = await dgxManager.executeCommand(
        connectionId,
        `tail -50 "${operation.log_file}" 2>/dev/null`
      );

      if (!result.success || !result.data.stdout) {
        return null;
      }

      const logContent = result.data.stdout;
      const progress = {};

      // Parse different progress patterns
      const patterns = [
        // Epoch X/Y pattern (common in PyTorch training)
        /[Ee]poch[:\s]+(\d+)[\/\s]+(\d+)/,
        /[Ee]poch[:\s]+(\d+)\s+of\s+(\d+)/i,

        // Step X/Y pattern
        /[Ss]tep[:\s]+(\d+)[\/\s]+(\d+)/,
        /[Ss]tep[:\s]+(\d+)\s+of\s+(\d+)/i,

        // Iteration X/Y pattern
        /[Ii]ter(?:ation)?[:\s]+(\d+)[\/\s]+(\d+)/,

        // Percentage pattern
        /(\d+(?:\.\d+)?)\s*%/,

        // Progress bar pattern [====>   ] X/Y
        /\[[\s=>#\-]+\]\s*(\d+)[\/\s]+(\d+)/,
      ];

      // Try each pattern
      for (const pattern of patterns) {
        const lines = logContent.split('\n').reverse(); // Check most recent first
        for (const line of lines) {
          const match = line.match(pattern);
          if (match) {
            if (match.length === 3) {
              progress.current = parseInt(match[1]);
              progress.total = parseInt(match[2]);
            } else if (match.length === 2) {
              // Percentage match
              progress.current = parseFloat(match[1]);
              progress.total = 100;
            }
            progress.message = line.trim().substring(0, 200); // Limit message length
            break;
          }
        }
        if (progress.current !== undefined) break;
      }

      // Parse loss values
      const lossPatterns = [
        /loss[:\s=]+(\d+\.\d+)/i,
        /train_loss[:\s=]+(\d+\.\d+)/i,
        /val_loss[:\s=]+(\d+\.\d+)/i,
      ];

      const metrics = {};
      for (const line of logContent.split('\n').reverse()) {
        // Loss
        const lossMatch = line.match(/loss[:\s=]+(\d+\.\d+)/i);
        if (lossMatch && !metrics.loss) {
          metrics.loss = parseFloat(lossMatch[1]);
        }

        // Training loss
        const trainLossMatch = line.match(/train_loss[:\s=]+(\d+\.\d+)/i);
        if (trainLossMatch && !metrics.train_loss) {
          metrics.train_loss = parseFloat(trainLossMatch[1]);
        }

        // Validation loss
        const valLossMatch = line.match(/val(?:idation)?_loss[:\s=]+(\d+\.\d+)/i);
        if (valLossMatch && !metrics.val_loss) {
          metrics.val_loss = parseFloat(valLossMatch[1]);
        }

        // Accuracy
        const accMatch = line.match(/acc(?:uracy)?[:\s=]+(\d+\.\d+)/i);
        if (accMatch && !metrics.accuracy) {
          metrics.accuracy = parseFloat(accMatch[1]);
        }

        // Learning rate
        const lrMatch = line.match(/(?:lr|learning_rate)[:\s=]+(\d+\.?\d*e?-?\d*)/i);
        if (lrMatch && !metrics.learning_rate) {
          metrics.learning_rate = parseFloat(lrMatch[1]);
        }
      }

      if (Object.keys(metrics).length > 0) {
        progress.metrics = metrics;
      }

      return Object.keys(progress).length > 0 ? progress : null;
    } catch (error) {
      console.error('[OperationMonitor] Parse log progress error:', error.message);
      return null;
    }
  }

  /**
   * Update operation in database
   * @param {string} operationId - Operation ID
   * @param {object} updates - Fields to update
   * @private
   */
  _updateOperation(operationId, updates) {
    try {
      const db = getDatabase();

      // Build dynamic UPDATE query
      const fields = Object.keys(updates);
      if (fields.length === 0) return;

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => updates[f]);
      values.push(operationId);

      db.prepare(`
        UPDATE dgx_operations
        SET ${setClause}
        WHERE id = ?
      `).run(...values);

    } catch (error) {
      console.error('[OperationMonitor] Update operation error:', error.message);
    }
  }

  /**
   * Manually trigger a status check for an operation
   * @param {string} connectionId - DGX connection ID
   * @param {string} operationId - Operation ID
   * @returns {Promise<object>} Updated operation info
   */
  async checkOperationNow(connectionId, operationId) {
    try {
      const db = getDatabase();
      const operation = db.prepare(`
        SELECT * FROM dgx_operations WHERE id = ?
      `).get(operationId);

      if (!operation) {
        return { success: false, error: 'Operation not found' };
      }

      await this._checkOperation(connectionId, operation);

      // Return updated operation
      const updated = db.prepare(`
        SELECT * FROM dgx_operations WHERE id = ?
      `).get(operationId);

      return {
        success: true,
        data: {
          ...updated,
          metrics: updated.metrics ? JSON.parse(updated.metrics) : null
        }
      };
    } catch (error) {
      console.error('[OperationMonitor] checkOperationNow error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new OperationMonitor();
