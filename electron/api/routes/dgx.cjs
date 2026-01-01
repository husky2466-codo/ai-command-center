/**
 * DGX Spark Routes
 * Connection Management:
 *   GET /api/dgx/connections - List connections
 *   GET /api/dgx/connections/:id - Get connection
 *   POST /api/dgx/connections - Create connection
 *   PUT /api/dgx/connections/:id - Update connection
 *   DELETE /api/dgx/connections/:id - Delete connection
 *   POST /api/dgx/connect/:id - Connect to DGX
 *   POST /api/dgx/disconnect/:id - Disconnect from DGX
 *   GET /api/dgx/status/:id - Get connection status
 *   GET /api/dgx/status - Get active connection status
 *   GET /api/dgx/metrics/:id - Get GPU metrics
 *   GET /api/dgx/metrics/:id/history - Get metrics history
 *   POST /api/dgx/exec/:id - Execute command
 *
 * Project Management:
 *   GET /api/dgx/projects - List projects
 *   GET /api/dgx/projects/:id - Get project with jobs
 *   POST /api/dgx/projects - Create project
 *   PUT /api/dgx/projects/:id - Update project
 *   DELETE /api/dgx/projects/:id - Delete project
 *
 * Training Jobs:
 *   GET /api/dgx/jobs - List jobs
 *   GET /api/dgx/jobs/:id - Get job
 *   POST /api/dgx/jobs - Create job
 *   PUT /api/dgx/jobs/:id - Update job
 *   DELETE /api/dgx/jobs/:id - Delete job
 *
 * Operations (ComfyUI, Services, etc.):
 *   GET /api/dgx/operations - List operations
 *   GET /api/dgx/operations/:id - Get operation
 *   POST /api/dgx/operations - Create operation
 *   PUT /api/dgx/operations/:id - Update operation
 *   POST /api/dgx/operations/:id/progress - Quick progress update
 *   POST /api/dgx/operations/:id/kill - Kill/terminate running operation
 *   GET /api/dgx/operations/:id/logs - Get operation logs
 *   POST /api/dgx/operations/:id/restart - Restart operation
 *   DELETE /api/dgx/operations/:id - Delete operation
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');
const dgxManager = require('../../services/dgxManager.cjs');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

// =========================================================================
// CONNECTION MANAGEMENT
// =========================================================================

// List all DGX connections
router.get('/connections', async (req, res) => {
  try {
    const db = getDatabase();
    const { limit = 100 } = req.query;

    const connections = db.prepare('SELECT * FROM dgx_connections ORDER BY updated_at DESC LIMIT ?').all(limit);

    res.json({
      success: true,
      data: connections
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get specific DGX connection
router.get('/connections/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    res.json({
      success: true,
      data: connection
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create new DGX connection
router.post('/connections', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      name,
      hostname,
      username,
      ssh_key_path,
      port = 22
    } = req.body;

    if (!name || !hostname || !username || !ssh_key_path) {
      return res.status(400).json({
        success: false,
        error: 'Name, hostname, username, and ssh_key_path are required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO dgx_connections (id, name, hostname, username, ssh_key_path, port, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, hostname, username, ssh_key_path, port, now, now);

    const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

    res.json({
      success: true,
      data: connection
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Update DGX connection
router.put('/connections/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const existing = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const allowedFields = ['name', 'hostname', 'username', 'ssh_key_path', 'port'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => updates[f]), new Date().toISOString(), id];

    db.prepare(`UPDATE dgx_connections SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values);

    const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

    res.json({
      success: true,
      data: connection
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Delete DGX connection
router.delete('/connections/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Disconnect if active
    await dgxManager.disconnectFromDGX(id);

    const result = db.prepare('DELETE FROM dgx_connections WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    res.json({
      success: true,
      data: { deleted: id }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Connect to DGX
router.post('/connect/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const result = await dgxManager.connectToDGX({
      id: connection.id,
      hostname: connection.hostname,
      username: connection.username,
      sshKeyPath: connection.ssh_key_path,
      port: connection.port
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Disconnect from DGX
router.post('/disconnect/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dgxManager.disconnectFromDGX(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get connection status (specific ID)
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = dgxManager.getConnectionStatus(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get active connection status
router.get('/status', async (req, res) => {
  try {
    const result = dgxManager.getConnectionStatus();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get GPU metrics
router.get('/metrics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dgxManager.getGPUMetrics(id);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get metrics history
router.get('/metrics/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.query;

    const result = dgxManager.getMetricsHistory(id, parseInt(hours));

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Execute command on DGX
router.post('/exec/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    const result = await dgxManager.executeCommand(id, command);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =========================================================================
// PROJECT MANAGEMENT
// =========================================================================

// List DGX projects
router.get('/projects', async (req, res) => {
  try {
    const db = getDatabase();
    const { connection_id, limit = 100 } = req.query;

    let sql = 'SELECT * FROM dgx_projects WHERE 1=1';
    const params = [];

    if (connection_id) {
      sql += ' AND connection_id = ?';
      params.push(connection_id);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const projects = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: projects
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get specific DGX project
router.get('/projects/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const project = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get associated training jobs
    const jobs = db.prepare('SELECT * FROM dgx_training_jobs WHERE project_id = ? ORDER BY created_at DESC').all(id);

    res.json({
      success: true,
      data: {
        ...project,
        jobs
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create DGX project
router.post('/projects', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      connection_id,
      name,
      description,
      project_type,
      remote_path,
      status = 'active',
      config
    } = req.body;

    if (!name || !connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Name and connection_id are required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const configStr = config ? JSON.stringify(config) : null;

    db.prepare(`
      INSERT INTO dgx_projects (id, connection_id, name, description, project_type, remote_path, status, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, connection_id, name, description, project_type, remote_path, status, configStr, now, now);

    const project = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);

    res.json({
      success: true,
      data: project
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Update DGX project
router.put('/projects/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const existing = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const allowedFields = ['name', 'description', 'project_type', 'remote_path', 'status', 'config'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Handle config JSON serialization
    const values = fields.map(f => {
      if (f === 'config' && typeof updates[f] === 'object') {
        return JSON.stringify(updates[f]);
      }
      return updates[f];
    });

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE dgx_projects SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values);

    const project = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);

    res.json({
      success: true,
      data: project
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Delete DGX project
router.delete('/projects/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM dgx_projects WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: { deleted: id }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =========================================================================
// TRAINING JOBS
// =========================================================================

// List training jobs
router.get('/jobs', async (req, res) => {
  try {
    const db = getDatabase();
    const { project_id, limit = 100 } = req.query;

    let sql = 'SELECT * FROM dgx_training_jobs WHERE 1=1';
    const params = [];

    if (project_id) {
      sql += ' AND project_id = ?';
      params.push(project_id);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const jobs = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: jobs
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get specific training job
router.get('/jobs/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const job = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create training job
router.post('/jobs', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      project_id,
      name,
      model_name,
      status = 'pending',
      config,
      metrics,
      container_id
    } = req.body;

    if (!name || !project_id) {
      return res.status(400).json({
        success: false,
        error: 'Name and project_id are required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const configStr = config ? JSON.stringify(config) : null;
    const metricsStr = metrics ? JSON.stringify(metrics) : null;

    db.prepare(`
      INSERT INTO dgx_training_jobs (id, project_id, name, model_name, status, config, metrics, container_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id, name, model_name, status, configStr, metricsStr, container_id, now);

    const job = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);

    res.json({
      success: true,
      data: job
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Update training job (for status and metrics updates)
router.put('/jobs/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const existing = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const allowedFields = ['name', 'model_name', 'status', 'config', 'metrics', 'container_id'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Handle JSON serialization and status timestamps
    let extraFields = '';
    let extraValues = [];

    if (updates.status === 'running' && existing.status !== 'running') {
      extraFields = ', started_at = ?';
      extraValues.push(new Date().toISOString());
    } else if (updates.status === 'completed' && existing.status !== 'completed') {
      extraFields = ', completed_at = ?';
      extraValues.push(new Date().toISOString());
    }

    const values = fields.map(f => {
      if ((f === 'config' || f === 'metrics') && typeof updates[f] === 'object') {
        return JSON.stringify(updates[f]);
      }
      return updates[f];
    });

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const allValues = [...values, ...extraValues, id];

    db.prepare(`UPDATE dgx_training_jobs SET ${setClause}${extraFields} WHERE id = ?`).run(...allValues);

    const job = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);

    res.json({
      success: true,
      data: job
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Delete training job
router.delete('/jobs/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM dgx_training_jobs WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: { deleted: id }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// =========================================================================
// OPERATIONS (ComfyUI, Services, etc.)
// =========================================================================

// List operations
router.get('/operations', async (req, res) => {
  try {
    const db = getDatabase();
    const { connection_id, type, status, limit = 100 } = req.query;

    let sql = 'SELECT * FROM dgx_operations WHERE 1=1';
    const params = [];

    if (connection_id) {
      sql += ' AND connection_id = ?';
      params.push(connection_id);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const operations = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: operations
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get specific operation
router.get('/operations/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const operation = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(id);

    if (!operation) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found'
      });
    }

    res.json({
      success: true,
      data: operation
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create operation
router.post('/operations', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      connection_id,
      project_id,
      name,
      type,
      category,
      status = 'pending',
      pid,
      command,
      progress = -1,
      progress_current,
      progress_total,
      progress_message,
      port,
      url,
      websocket_url,
      metrics,
      log_file
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const metricsStr = metrics ? JSON.stringify(metrics) : null;

    db.prepare(`
      INSERT INTO dgx_operations (
        id, connection_id, project_id, name, type, category, status,
        pid, command, progress, progress_current, progress_total,
        progress_message, port, url, websocket_url, metrics, log_file, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, connection_id, project_id, name, type, category, status,
      pid, command, progress, progress_current, progress_total,
      progress_message, port, url, websocket_url, metricsStr, log_file, now
    );

    const operation = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(id);

    res.json({
      success: true,
      data: operation
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Update operation (auto-set started_at/completed_at based on status)
router.put('/operations/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const existing = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found'
      });
    }

    const allowedFields = [
      'name', 'type', 'category', 'status', 'pid', 'command',
      'progress', 'progress_current', 'progress_total', 'progress_message',
      'port', 'url', 'websocket_url', 'metrics', 'log_file'
    ];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Handle timestamp auto-setting based on status changes
    let extraFields = '';
    let extraValues = [];

    if (updates.status === 'running' && existing.status !== 'running' && !existing.started_at) {
      extraFields = ', started_at = ?';
      extraValues.push(new Date().toISOString());
    } else if ((updates.status === 'completed' || updates.status === 'failed') &&
               !['completed', 'failed'].includes(existing.status) &&
               !existing.completed_at) {
      extraFields = ', completed_at = ?';
      extraValues.push(new Date().toISOString());
    }

    // Handle JSON serialization for metrics
    const values = fields.map(f => {
      if (f === 'metrics' && typeof updates[f] === 'object') {
        return JSON.stringify(updates[f]);
      }
      return updates[f];
    });

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const allValues = [...values, ...extraValues, id];

    db.prepare(`UPDATE dgx_operations SET ${setClause}${extraFields} WHERE id = ?`).run(...allValues);

    const operation = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(id);

    res.json({
      success: true,
      data: operation
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Quick progress update (convenience endpoint)
router.post('/operations/:id/progress', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { progress, progress_current, progress_total, progress_message } = req.body;

    const existing = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found'
      });
    }

    const updates = {};
    if (progress !== undefined) updates.progress = progress;
    if (progress_current !== undefined) updates.progress_current = progress_current;
    if (progress_total !== undefined) updates.progress_total = progress_total;
    if (progress_message !== undefined) updates.progress_message = progress_message;

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No progress fields provided'
      });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => updates[f]), id];

    db.prepare(`UPDATE dgx_operations SET ${setClause} WHERE id = ?`).run(...values);

    const operation = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(id);

    res.json({
      success: true,
      data: operation
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Delete operation
router.delete('/operations/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM dgx_operations WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found'
      });
    }

    res.json({
      success: true,
      data: { deleted: id }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Kill/terminate running operation
router.post('/operations/:id/kill', async (req, res) => {
  try {
    const db = getDatabase();
    const { signal = 'SIGTERM' } = req.body; // SIGTERM or SIGKILL

    // Get operation
    const operation = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(req.params.id);
    if (!operation) {
      return res.status(404).json({ success: false, error: 'Operation not found' });
    }

    if (!operation.pid) {
      return res.status(400).json({ success: false, error: 'Operation has no PID' });
    }

    if (operation.status !== 'running') {
      return res.status(400).json({ success: false, error: 'Operation is not running' });
    }

    // Get connection for this operation
    const connection = dgxManager.getActiveConnection();

    if (!connection) {
      return res.status(400).json({ success: false, error: 'No active DGX connection' });
    }

    // Execute kill command
    const killCmd = signal === 'SIGKILL' ? `kill -9 ${operation.pid}` : `kill ${operation.pid}`;
    const result = await dgxManager.executeCommand(connection.id, killCmd);

    if (result.success) {
      // Update operation status
      db.prepare(`
        UPDATE dgx_operations
        SET status = 'cancelled', completed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), new Date().toISOString(), req.params.id);

      res.json({ success: true, data: { killed: true, pid: operation.pid, signal } });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to kill process' });
    }
  } catch (error) {
    console.error('Kill operation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get operation logs
router.get('/operations/:id/logs', async (req, res) => {
  try {
    const db = getDatabase();
    const { tail = 100 } = req.query;

    const operation = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(req.params.id);
    if (!operation) {
      return res.status(404).json({ success: false, error: 'Operation not found' });
    }

    if (!operation.log_file) {
      return res.status(400).json({ success: false, error: 'Operation has no log file' });
    }

    const connection = dgxManager.getActiveConnection();

    if (!connection) {
      return res.status(400).json({ success: false, error: 'No active DGX connection' });
    }

    // Tail the log file
    const result = await dgxManager.executeCommand(connection.id, `tail -n ${tail} ${operation.log_file}`);

    if (result.success) {
      res.json({ success: true, data: { logs: result.data.stdout, file: operation.log_file } });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to read logs' });
    }
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restart operation
router.post('/operations/:id/restart', async (req, res) => {
  try {
    const db = getDatabase();

    const operation = db.prepare('SELECT * FROM dgx_operations WHERE id = ?').get(req.params.id);
    if (!operation) {
      return res.status(404).json({ success: false, error: 'Operation not found' });
    }

    if (!operation.command) {
      return res.status(400).json({ success: false, error: 'Operation has no command to restart' });
    }

    const connection = dgxManager.getActiveConnection();

    if (!connection) {
      return res.status(400).json({ success: false, error: 'No active DGX connection' });
    }

    // If running, kill first
    if (operation.status === 'running' && operation.pid) {
      await dgxManager.executeCommand(connection.id, `kill ${operation.pid}`);
    }

    // Re-run the command with nohup
    const logFile = operation.log_file || `/tmp/${operation.id}.log`;
    const cmd = `nohup ${operation.command} > ${logFile} 2>&1 & echo $!`;
    const result = await dgxManager.executeCommand(connection.id, cmd);

    if (result.success) {
      const newPid = parseInt(result.data.stdout.trim());

      db.prepare(`
        UPDATE dgx_operations
        SET status = 'running', pid = ?, started_at = ?, completed_at = NULL, updated_at = ?
        WHERE id = ?
      `).run(newPid, new Date().toISOString(), new Date().toISOString(), req.params.id);

      res.json({ success: true, data: { restarted: true, pid: newPid } });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to restart' });
    }
  } catch (error) {
    console.error('Restart operation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
