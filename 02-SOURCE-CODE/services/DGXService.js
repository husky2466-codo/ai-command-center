/**
 * DGXService - Business logic for DGX Spark management
 * Handles SSH connections, remote projects, training jobs, and GPU metrics
 */

import { BaseService } from './BaseService.js';

class DGXService extends BaseService {
  constructor() {
    super('dgx_connections');
  }

  // ============================================================================
  // DGX CONNECTIONS
  // ============================================================================

  /**
   * Get all DGX connections
   * @returns {Promise<Array>}
   */
  async getConnections() {
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM dgx_connections ORDER BY created_at DESC'
    );
    if (!result.success) {
      throw new Error(`Failed to get DGX connections: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Get all active connections
   * @returns {Promise<Array>}
   */
  async getActiveConnections() {
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM dgx_connections WHERE is_active = 1 ORDER BY name'
    );
    if (!result.success) {
      throw new Error(`Failed to get active DGX connections: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Connect to all DGX servers in parallel
   * @returns {Promise<Object>} Results object with success/failure counts
   */
  async connectAll() {
    const connections = await this.getConnections();

    // Connect to all in parallel
    const results = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          const result = await window.electronAPI.dgx.connect(conn.id);
          return { id: conn.id, ...result };
        } catch (error) {
          return { id: conn.id, success: false, error: error.message };
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    const failed = results.length - successful;

    return {
      success: failed === 0,
      total: results.length,
      successful,
      failed,
      results: results.map(r => r.value)
    };
  }

  /**
   * Disconnect from all DGX servers
   * @returns {Promise<Object>} Results object
   */
  async disconnectAll() {
    const activeConnections = await this.getActiveConnections();

    await Promise.allSettled(
      activeConnections.map(conn => window.electronAPI.dgx.disconnect(conn.id))
    );

    return {
      success: true,
      disconnected: activeConnections.length
    };
  }

  /**
   * Get connection statuses for all connections
   * @returns {Promise<Array>} Array of connection statuses
   */
  async getConnectionStatuses() {
    const connections = await this.getConnections();

    const statuses = await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          const result = await window.electronAPI.dgx.getStatus(conn.id);
          return {
            id: conn.id,
            name: conn.name,
            hostname: conn.hostname,
            connected: result.success && result.data?.connected === true,
            lastPing: new Date().toISOString()
          };
        } catch (error) {
          return {
            id: conn.id,
            name: conn.name,
            hostname: conn.hostname,
            connected: false,
            error: error.message
          };
        }
      })
    );

    return statuses
      .filter(s => s.status === 'fulfilled')
      .map(s => s.value);
  }

  /**
   * Get bulk metrics from all active connections
   * @returns {Promise<Object>} Metrics grouped by connection ID
   */
  async getBulkMetrics() {
    const activeConnections = await this.getActiveConnections();

    const metricsResults = await Promise.allSettled(
      activeConnections.map(async (conn) => {
        try {
          const result = await window.electronAPI.dgx.getMetrics(conn.id);
          return {
            connectionId: conn.id,
            ...result
          };
        } catch (error) {
          return {
            connectionId: conn.id,
            success: false,
            error: error.message
          };
        }
      })
    );

    const metrics = {};
    metricsResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.success) {
        metrics[result.value.connectionId] = result.value.data;
      }
    });

    return metrics;
  }

  /**
   * Get a single DGX connection by ID
   * @param {string} id - Connection ID
   * @returns {Promise<Object|null>}
   */
  async getConnection(id) {
    const result = await window.electronAPI.dbGet(
      'SELECT * FROM dgx_connections WHERE id = ?',
      [id]
    );
    if (!result.success) {
      throw new Error(`Failed to get DGX connection: ${result.error}`);
    }
    return result.data || null;
  }

  /**
   * Create a new DGX connection
   * @param {Object} data - Connection data
   * @returns {Promise<Object>}
   */
  async createConnection({ name, hostname, username, ssh_key_path = null, port = 22 }) {
    const id = this.generateId();
    const now = new Date().toISOString();

    const result = await window.electronAPI.dbRun(
      `INSERT INTO dgx_connections
       (id, name, hostname, username, ssh_key_path, port, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, name, hostname, username, ssh_key_path, port, now, now]
    );

    if (!result.success) {
      throw new Error(`Failed to create DGX connection: ${result.error}`);
    }

    return this.getConnection(id);
  }

  /**
   * Update a DGX connection
   * @param {string} id - Connection ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateConnection(id, updates) {
    const { name, hostname, username, ssh_key_path, port, is_active, last_connected_at } = updates;
    const now = new Date().toISOString();

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (hostname !== undefined) {
      fields.push('hostname = ?');
      values.push(hostname);
    }
    if (username !== undefined) {
      fields.push('username = ?');
      values.push(username);
    }
    if (ssh_key_path !== undefined) {
      fields.push('ssh_key_path = ?');
      values.push(ssh_key_path);
    }
    if (port !== undefined) {
      fields.push('port = ?');
      values.push(port);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (last_connected_at !== undefined) {
      fields.push('last_connected_at = ?');
      values.push(last_connected_at);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const result = await window.electronAPI.dbRun(
      `UPDATE dgx_connections SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (!result.success) {
      throw new Error(`Failed to update DGX connection: ${result.error}`);
    }

    return this.getConnection(id);
  }

  /**
   * Delete a DGX connection and all related data
   * @param {string} id - Connection ID
   * @param {boolean} force - Force delete even if projects exist
   * @returns {Promise<void>}
   */
  async deleteConnection(id, force = false) {
    // Check if connection has projects
    const projects = await window.electronAPI.dbQuery(
      'SELECT id FROM dgx_projects WHERE connection_id = ?',
      [id]
    );
    const projectList = projects?.success ? projects.data : [];

    if (projectList.length > 0 && !force) {
      throw new Error(`Cannot delete DGX connection with ${projectList.length} existing projects. Use force delete.`);
    }

    // Delete related training jobs (for each project)
    for (const project of projectList) {
      await window.electronAPI.dbRun(
        'DELETE FROM dgx_training_jobs WHERE project_id = ?',
        [project.id]
      );
    }

    // Delete related projects
    await window.electronAPI.dbRun(
      'DELETE FROM dgx_projects WHERE connection_id = ?',
      [id]
    );

    // Delete related metrics
    await window.electronAPI.dbRun(
      'DELETE FROM dgx_metrics WHERE connection_id = ?',
      [id]
    );

    // Now delete the connection itself
    const result = await window.electronAPI.dbRun(
      'DELETE FROM dgx_connections WHERE id = ?',
      [id]
    );

    if (!result.success) {
      throw new Error(`Failed to delete DGX connection: ${result.error}`);
    }
  }

  /**
   * Set a connection as active (and deactivate others)
   * @param {string|null} id - Connection ID (null to deactivate all)
   * @returns {Promise<Object|null>}
   */
  async setActiveConnection(id) {
    // Deactivate all connections
    await window.electronAPI.dbRun('UPDATE dgx_connections SET is_active = 0');

    // If id is null, just deactivate all
    if (!id) {
      return null;
    }

    // Activate the specified connection and update last_connected_at
    const now = new Date().toISOString();
    await this.updateConnection(id, {
      is_active: true,
      last_connected_at: now
    });

    return this.getConnection(id);
  }

  /**
   * Get the currently active connection
   * @returns {Promise<Object|null>}
   */
  async getActiveConnection() {
    const result = await window.electronAPI.dbGet(
      'SELECT * FROM dgx_connections WHERE is_active = 1 LIMIT 1'
    );
    if (!result.success) {
      throw new Error(`Failed to get active DGX connection: ${result.error}`);
    }
    return result.data || null;
  }

  // ============================================================================
  // DGX PROJECTS
  // ============================================================================

  /**
   * Get all DGX projects (optionally filtered by connection)
   * @param {string|null} connectionId - Filter by connection ID
   * @returns {Promise<Array>}
   */
  async getProjects(connectionId = null) {
    let query = 'SELECT * FROM dgx_projects';
    const params = [];

    if (connectionId) {
      query += ' WHERE connection_id = ?';
      params.push(connectionId);
    }

    query += ' ORDER BY updated_at DESC';

    const result = await window.electronAPI.dbQuery(query, params);
    if (!result.success) {
      throw new Error(`Failed to get DGX projects: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Get a single DGX project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>}
   */
  async getProject(id) {
    const result = await window.electronAPI.dbGet(
      'SELECT * FROM dgx_projects WHERE id = ?',
      [id]
    );
    if (!result.success) {
      throw new Error(`Failed to get DGX project: ${result.error}`);
    }
    return result.data || null;
  }

  /**
   * Create a new DGX project
   * @param {Object} data - Project data
   * @returns {Promise<Object>}
   */
  async createProject({
    connection_id,
    name,
    description = null,
    project_type = null,
    remote_path = null,
    status = 'active',
    config = null
  }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const configJson = config ? JSON.stringify(config) : null;

    const result = await window.electronAPI.dbRun(
      `INSERT INTO dgx_projects
       (id, connection_id, name, description, project_type, remote_path, status, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, connection_id, name, description, project_type, remote_path, status, configJson, now, now]
    );

    if (!result.success) {
      throw new Error(`Failed to create DGX project: ${result.error}`);
    }

    return this.getProject(id);
  }

  /**
   * Update a DGX project
   * @param {string} id - Project ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateProject(id, updates) {
    const { name, description, project_type, remote_path, status, config } = updates;
    const now = new Date().toISOString();

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (project_type !== undefined) {
      fields.push('project_type = ?');
      values.push(project_type);
    }
    if (remote_path !== undefined) {
      fields.push('remote_path = ?');
      values.push(remote_path);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(config));
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const result = await window.electronAPI.dbRun(
      `UPDATE dgx_projects SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (!result.success) {
      throw new Error(`Failed to update DGX project: ${result.error}`);
    }

    return this.getProject(id);
  }

  /**
   * Delete a DGX project
   * @param {string} id - Project ID
   * @returns {Promise<void>}
   */
  async deleteProject(id) {
    const result = await window.electronAPI.dbRun(
      'DELETE FROM dgx_projects WHERE id = ?',
      [id]
    );

    if (!result.success) {
      throw new Error(`Failed to delete DGX project: ${result.error}`);
    }
  }

  // ============================================================================
  // TRAINING JOBS
  // ============================================================================

  /**
   * Get all training jobs for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>}
   */
  async getTrainingJobs(projectId) {
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM dgx_training_jobs WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    if (!result.success) {
      throw new Error(`Failed to get training jobs: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Get a single training job by ID
   * @param {string} id - Job ID
   * @returns {Promise<Object|null>}
   */
  async getTrainingJob(id) {
    const result = await window.electronAPI.dbGet(
      'SELECT * FROM dgx_training_jobs WHERE id = ?',
      [id]
    );
    if (!result.success) {
      throw new Error(`Failed to get training job: ${result.error}`);
    }
    return result.data || null;
  }

  /**
   * Create a new training job
   * @param {Object} data - Job data
   * @returns {Promise<Object>}
   */
  async createTrainingJob({
    project_id,
    name,
    model_name = null,
    status = 'pending',
    config = null,
    container_id = null
  }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const configJson = config ? JSON.stringify(config) : null;

    const result = await window.electronAPI.dbRun(
      `INSERT INTO dgx_training_jobs
       (id, project_id, name, model_name, status, config, container_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, name, model_name, status, configJson, container_id, now]
    );

    if (!result.success) {
      throw new Error(`Failed to create training job: ${result.error}`);
    }

    return this.getTrainingJob(id);
  }

  /**
   * Update a training job
   * @param {string} id - Job ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateJobStatus(id, updates) {
    const { status, metrics, container_id, started_at, completed_at } = updates;

    const fields = [];
    const values = [];

    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (metrics !== undefined) {
      fields.push('metrics = ?');
      values.push(JSON.stringify(metrics));
    }
    if (container_id !== undefined) {
      fields.push('container_id = ?');
      values.push(container_id);
    }
    if (started_at !== undefined) {
      fields.push('started_at = ?');
      values.push(started_at);
    }
    if (completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(completed_at);
    }

    values.push(id);

    const result = await window.electronAPI.dbRun(
      `UPDATE dgx_training_jobs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (!result.success) {
      throw new Error(`Failed to update training job: ${result.error}`);
    }

    return this.getTrainingJob(id);
  }

  /**
   * Delete a training job
   * @param {string} id - Job ID
   * @returns {Promise<void>}
   */
  async deleteTrainingJob(id) {
    const result = await window.electronAPI.dbRun(
      'DELETE FROM dgx_training_jobs WHERE id = ?',
      [id]
    );

    if (!result.success) {
      throw new Error(`Failed to delete training job: ${result.error}`);
    }
  }

  // ============================================================================
  // GPU METRICS
  // ============================================================================

  /**
   * Save GPU metrics snapshot
   * @param {Object} data - Metrics data
   * @returns {Promise<void>}
   */
  async saveMetrics({
    connection_id,
    gpu_utilization,
    memory_used_mb,
    memory_total_mb,
    temperature_c,
    power_watts
  }) {
    const now = new Date().toISOString();

    const result = await window.electronAPI.dbRun(
      `INSERT INTO dgx_metrics
       (connection_id, gpu_utilization, memory_used_mb, memory_total_mb, temperature_c, power_watts, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [connection_id, gpu_utilization, memory_used_mb, memory_total_mb, temperature_c, power_watts, now]
    );

    if (!result.success) {
      throw new Error(`Failed to save GPU metrics: ${result.error}`);
    }
  }

  /**
   * Get metrics history for a connection
   * @param {string} connectionId - Connection ID
   * @param {number} hours - Number of hours of history (default 24)
   * @returns {Promise<Array>}
   */
  async getMetricsHistory(connectionId, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM dgx_metrics
       WHERE connection_id = ? AND recorded_at >= ?
       ORDER BY recorded_at ASC`,
      [connectionId, since]
    );

    if (!result.success) {
      throw new Error(`Failed to get metrics history: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Get latest metrics for a connection
   * @param {string} connectionId - Connection ID
   * @returns {Promise<Object|null>}
   */
  async getLatestMetrics(connectionId) {
    const result = await window.electronAPI.dbGet(
      `SELECT * FROM dgx_metrics
       WHERE connection_id = ?
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [connectionId]
    );

    if (!result.success) {
      throw new Error(`Failed to get latest metrics: ${result.error}`);
    }

    return result.data || null;
  }

  /**
   * Clean up old metrics (keep last N days)
   * @param {number} days - Number of days to keep (default 30)
   * @returns {Promise<void>}
   */
  async cleanupOldMetrics(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const result = await window.electronAPI.dbRun(
      'DELETE FROM dgx_metrics WHERE recorded_at < ?',
      [cutoff]
    );

    if (!result.success) {
      throw new Error(`Failed to cleanup old metrics: ${result.error}`);
    }
  }

  // ============================================================================
  // PROCESS MANAGEMENT
  // ============================================================================

  /**
   * Kill a process on a DGX connection
   * @param {string} connectionId - Connection UUID
   * @param {number} pid - Process ID to kill
   * @param {string} signal - Signal to send (TERM, KILL, etc.)
   * @returns {Promise<Object>}
   */
  async killProcess(connectionId, pid, signal = 'TERM') {
    const response = await fetch(`http://localhost:3939/api/dgx/kill-process/${connectionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, signal })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to kill process');
    }

    return result.data;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Count records in dgx_projects table
   * @param {string} whereClause - SQL WHERE clause (without WHERE keyword)
   * @param {Array} params - Query parameters
   * @returns {Promise<number>}
   */
  async count(whereClause = '1=1', params = []) {
    const result = await window.electronAPI.dbGet(
      `SELECT COUNT(*) as count FROM dgx_projects WHERE ${whereClause}`,
      params
    );

    if (!result.success) {
      throw new Error(`Failed to count DGX projects: ${result.error}`);
    }

    return result.data?.count || 0;
  }

  /**
   * Get project with job count
   * @param {string} id - Project ID
   * @returns {Promise<Object|null>}
   */
  async getProjectWithJobCount(id) {
    const project = await this.getProject(id);
    if (!project) return null;

    const jobCountResult = await window.electronAPI.dbGet(
      'SELECT COUNT(*) as count FROM dgx_training_jobs WHERE project_id = ?',
      [id]
    );

    const jobCount = jobCountResult.success ? (jobCountResult.data?.count || 0) : 0;

    return {
      ...project,
      job_count: jobCount
    };
  }
}

// Export singleton instance
export const dgxService = new DGXService();
