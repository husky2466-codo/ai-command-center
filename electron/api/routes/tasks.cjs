/**
 * Tasks Routes
 * GET /api/tasks - List tasks
 * POST /api/tasks - Create task
 * PUT /api/tasks/:id - Update task
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

// List tasks
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { project_id, status, energy_type, limit = 100 } = req.query;

    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (project_id) {
      sql += ' AND project_id = ?';
      params.push(project_id);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (energy_type) {
      sql += ' AND energy_type = ?';
      params.push(energy_type);
    }

    sql += ' ORDER BY sort_order ASC, created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const tasks = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: tasks
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      project_id,
      title,
      description,
      energy_type,
      status = 'pending',
      due_date,
      sort_order = 0
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, energy_type, status, due_date, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id, title, description, energy_type, status, due_date, sort_order, now, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    res.json({
      success: true,
      data: task
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const allowedFields = ['title', 'description', 'energy_type', 'status', 'due_date', 'sort_order'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Handle completed status
    let extraFields = '';
    let extraValues = [];
    if (updates.status === 'completed' && existing.status !== 'completed') {
      extraFields = ', completed_at = ?';
      extraValues.push(new Date().toISOString());
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => updates[f]), ...extraValues, new Date().toISOString(), id];

    db.prepare(`UPDATE tasks SET ${setClause}${extraFields}, updated_at = ? WHERE id = ?`).run(...values);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    res.json({
      success: true,
      data: task
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
