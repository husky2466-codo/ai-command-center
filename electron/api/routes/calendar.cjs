/**
 * Calendar Routes
 * GET /api/calendar/events - List upcoming meetings
 * POST /api/calendar/events - Create calendar event (not yet implemented)
 */

const express = require('express');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();

// List upcoming calendar events
router.get('/events', async (req, res) => {
  try {
    const db = getDatabase();
    const { limit = 20 } = req.query;

    // Get upcoming meetings from database
    const meetings = db.prepare(`
      SELECT * FROM meetings
      WHERE status = 'scheduled' AND scheduled_at >= datetime('now')
      ORDER BY scheduled_at ASC
      LIMIT ?
    `).all(limit);

    res.json({
      success: true,
      data: meetings,
      note: 'Calendar sync requires Google account connection'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Create calendar event (not yet implemented)
router.post('/events', async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Calendar event creation requires Google account connection (not yet implemented)'
  });
});

module.exports = router;
