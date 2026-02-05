/**
 * Calendar Routes
 * GET /api/calendar/events - List upcoming meetings
 * GET /api/calendar/calendars - List available calendars
 * POST /api/calendar/events - Create calendar event
 * PUT /api/calendar/events/:id - Update calendar event
 * DELETE /api/calendar/events/:id - Delete calendar event
 */

const express = require('express');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();

/**
 * Helper to get GoogleAccountService instance for an account
 */
async function getServiceForAccount(db, accountId) {
  const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(accountId);
  if (!account) {
    return null;
  }

  const GoogleAccountService = require('../../services/googleAccountService.cjs');
  const service = new GoogleAccountService(db, account.email);
  await service.initialize();
  return service;
}

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

// List available calendars
router.get('/calendars', async (req, res) => {
  try {
    const { account_id } = req.query;
    const db = getDatabase();

    if (account_id) {
      const calendars = db.prepare('SELECT * FROM account_calendars WHERE account_id = ?').all(account_id);
      return res.json({ success: true, data: calendars });
    }

    const calendars = db.prepare('SELECT * FROM account_calendars').all();
    res.json({ success: true, data: calendars });
  } catch (error) {
    console.error('[API Server] GET /api/calendar/calendars error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create calendar event
router.post('/events', async (req, res) => {
  try {
    const { account_id, summary, description, start, end, location, attendees } = req.body;

    if (!account_id || !summary || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: account_id, summary, start, end'
      });
    }

    const db = getDatabase();
    const service = await getServiceForAccount(db, account_id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const result = await service.createEvent(account_id, {
      summary,
      description,
      start: { dateTime: start, timeZone: 'America/New_York' },
      end: { dateTime: end, timeZone: 'America/New_York' },
      location,
      attendees: attendees ? attendees.map(email => ({ email })) : undefined
    });

    console.log('[API Server] POST /api/calendar/events - Created event:', result.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[API Server] POST /api/calendar/events error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update calendar event
router.put('/events/:id', async (req, res) => {
  try {
    const { account_id, summary, description, start, end, location } = req.body;
    const eventId = req.params.id;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing account_id in request body'
      });
    }

    const db = getDatabase();
    const service = await getServiceForAccount(db, account_id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Build update object with only provided fields
    const updates = {};
    if (summary !== undefined) updates.summary = summary;
    if (description !== undefined) updates.description = description;
    if (location !== undefined) updates.location = location;
    if (start) updates.start = { dateTime: start, timeZone: 'America/New_York' };
    if (end) updates.end = { dateTime: end, timeZone: 'America/New_York' };

    const result = await service.updateEvent(account_id, eventId, updates);

    console.log('[API Server] PUT /api/calendar/events/:id - Updated event:', eventId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[API Server] PUT /api/calendar/events/:id error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete calendar event
router.delete('/events/:id', async (req, res) => {
  try {
    const { account_id } = req.query;
    const eventId = req.params.id;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing account_id query param'
      });
    }

    const db = getDatabase();
    const service = await getServiceForAccount(db, account_id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    await service.deleteEvent(account_id, eventId);

    console.log('[API Server] DELETE /api/calendar/events/:id - Deleted event:', eventId);
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('[API Server] DELETE /api/calendar/events/:id error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
