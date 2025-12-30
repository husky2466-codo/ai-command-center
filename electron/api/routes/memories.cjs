/**
 * Memories Routes
 * GET /api/memories - List memories
 * POST /api/memories - Create memory
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

// List memories
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { type, limit = 100 } = req.query;

    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY last_observed_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const memories = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: memories
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create memory
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      type,
      category,
      title,
      content,
      source_chunk,
      related_entities,
      target_agents,
      confidence_score,
      reasoning,
      evidence
    } = req.body;

    if (!type || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Type, title, and content are required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO memories (
        id, type, category, title, content, source_chunk,
        related_entities, target_agents, confidence_score, reasoning, evidence,
        first_observed_at, last_observed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, type, category, title, content, source_chunk,
      related_entities, target_agents, confidence_score, reasoning, evidence,
      now, now
    );

    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);

    res.json({
      success: true,
      data: memory
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
