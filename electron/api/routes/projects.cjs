/**
 * Projects Routes
 * GET /api/projects - List projects
 * GET /api/projects/:id - Get project with tasks
 * POST /api/projects - Create project
 * PUT /api/projects/:id - Update project
 * DELETE /api/projects/:id - Delete project
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

// List projects
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { status, space_id, limit = 100 } = req.query;

    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (space_id) {
      sql += ' AND space_id = ?';
      params.push(space_id);
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

// Get single project with tasks
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get associated tasks
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(id);

    res.json({
      success: true,
      data: {
        ...project,
        tasks
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      name,
      description,
      space_id,
      status = 'on_deck',
      deadline,
      planning_notes
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Project name is required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, name, description, space_id, status, deadline, planning_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, space_id, status, deadline, planning_notes, now, now);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

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

// Update project
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    // Check if project exists
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Build dynamic UPDATE query
    const allowedFields = ['name', 'description', 'status', 'progress', 'deadline', 'planning_notes', 'space_id'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    values.push(new Date().toISOString()); // updated_at
    values.push(id);

    db.prepare(`UPDATE projects SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

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

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);

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

module.exports = router;
