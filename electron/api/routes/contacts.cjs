/**
 * Contacts Routes
 * GET /api/contacts - List contacts
 * GET /api/contacts/:id - Get contact with interactions
 * POST /api/contacts - Create contact
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();
const uuidv4 = () => crypto.randomUUID();

// List contacts
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { limit = 100 } = req.query;

    const contacts = db.prepare('SELECT * FROM contacts ORDER BY name ASC LIMIT ?').all(limit);

    res.json({
      success: true,
      data: contacts
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get single contact with interactions
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ? OR slug = ?').get(id, id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Get recent interactions
    const interactions = db.prepare(`
      SELECT * FROM contact_interactions
      WHERE contact_id = ?
      ORDER BY occurred_at DESC
      LIMIT 10
    `).all(contact.id);

    res.json({
      success: true,
      data: {
        ...contact,
        interactions
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create contact
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      name,
      email,
      company,
      title,
      location,
      priority = 'medium',
      context,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Contact name is required'
      });
    }

    const id = uuidv4();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO contacts (id, slug, name, email, company, title, location, priority, context, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, slug, name, email, company, title, location, priority, context, notes, now, now);

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);

    res.json({
      success: true,
      data: contact
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
