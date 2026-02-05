/**
 * Contacts Routes
 * GET /api/contacts - List contacts
 * GET /api/contacts/:id - Get contact with interactions
 * POST /api/contacts - Create contact
 * PUT /api/contacts/:id - Update contact
 * DELETE /api/contacts/:id - Delete contact
 * POST /api/contacts/:id/interactions - Log interaction
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

// Update contact
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, email, phone, company, title, location, priority, notes, professional_background } = req.body;

    // Check contact exists
    const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    // Build dynamic update
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (company !== undefined) { updates.push('company = ?'); values.push(company); }
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (location !== undefined) { updates.push('location = ?'); values.push(location); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (professional_background !== undefined) { updates.push('professional_background = ?'); values.push(professional_background); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete contact
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();

    // Also delete related interactions
    db.prepare('DELETE FROM contact_interactions WHERE contact_id = ?').run(req.params.id);

    const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log interaction for contact
router.post('/:id/interactions', (req, res) => {
  try {
    const db = getDatabase();
    const { type, summary, occurred_at } = req.body;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO contact_interactions (id, contact_id, type, summary, occurred_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.params.id, type, summary, occurred_at || new Date().toISOString());

    // Update contact's last_contact_at
    db.prepare('UPDATE contacts SET last_contact_at = ? WHERE id = ?')
      .run(new Date().toISOString(), req.params.id);

    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
