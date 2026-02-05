/**
 * Reminders Routes
 * GET /api/reminders - List reminders
 * GET /api/reminders/:id - Get single reminder
 * POST /api/reminders - Create reminder
 * PUT /api/reminders/:id - Update reminder
 * DELETE /api/reminders/:id - Delete reminder
 * POST /api/reminders/:id/snooze - Snooze reminder
 * POST /api/reminders/:id/dismiss - Dismiss/complete reminder
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

// List reminders
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { status, limit = 100 } = req.query;

    let sql = 'SELECT * FROM reminders WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      // By default, exclude completed
      sql += " AND status != 'completed'";
    }

    sql += ' ORDER BY due_at ASC LIMIT ?';
    params.push(parseInt(limit));

    const reminders = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: reminders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create reminder
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      title,
      description,
      due_at,
      is_recurring = 0,
      recurrence_rule,
      source_type,
      source_id,
      url
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Reminder title is required'
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reminders (id, title, description, due_at, is_recurring, recurrence_rule, source_type, source_id, url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, due_at, is_recurring, recurrence_rule, source_type, source_id, url, now, now);

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);

    res.json({
      success: true,
      data: reminder
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Update reminder
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const updates = req.body;

    const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    const allowedFields = ['title', 'description', 'due_at', 'status', 'snooze_count', 'snoozed_until'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    let extraFields = '';
    let extraValues = [];
    if (updates.status === 'completed' && existing.status !== 'completed') {
      extraFields = ', completed_at = ?';
      extraValues.push(new Date().toISOString());
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => updates[f]), ...extraValues, new Date().toISOString(), id];

    db.prepare(`UPDATE reminders SET ${setClause}${extraFields}, updated_at = ? WHERE id = ?`).run(...values);

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);

    res.json({
      success: true,
      data: reminder
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get single reminder
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    res.json({ success: true, data: reminder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete reminder
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Snooze reminder
router.post('/:id/snooze', (req, res) => {
  try {
    const db = getDatabase();
    const { minutes = 15 } = req.body;

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    const newDueAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const snoozeCount = (reminder.snooze_count || 0) + 1;

    db.prepare(`
      UPDATE reminders
      SET due_at = ?, snooze_count = ?, status = 'pending', updated_at = ?
      WHERE id = ?
    `).run(newDueAt, snoozeCount, new Date().toISOString(), req.params.id);

    const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dismiss/complete reminder
router.post('/:id/dismiss', (req, res) => {
  try {
    const db = getDatabase();

    const result = db.prepare(`
      UPDATE reminders
      SET status = 'completed', completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), new Date().toISOString(), req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    res.json({ success: true, data: { dismissed: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
