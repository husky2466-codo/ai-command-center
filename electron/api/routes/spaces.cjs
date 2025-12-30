/**
 * Spaces Routes
 * GET /api/spaces - List spaces
 * POST /api/spaces - Create space
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

// List spaces
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const spaces = db.prepare('SELECT * FROM spaces ORDER BY sort_order ASC').all();

    res.json({
      success: true,
      data: spaces
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create space
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      name,
      description,
      color = '#8b5cf6',
      icon,
      sort_order = 0
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Space name is required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO spaces (id, name, description, color, icon, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, color, icon, sort_order, now, now);

    const space = db.prepare('SELECT * FROM spaces WHERE id = ?').get(id);

    res.json({
      success: true,
      data: space
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
