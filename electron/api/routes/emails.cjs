/**
 * Email Routes
 * GET /api/emails - List emails
 * GET /api/emails/:id - Get single email
 * POST /api/emails/send - Send email
 * POST /api/emails/search - Search emails
 * POST /api/emails/batch - Batch operations
 * POST /api/emails/:id/reply - Reply to email
 * POST /api/emails/:id/forward - Forward email
 */

const express = require('express');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();

// List emails from a connected Google account
router.get('/', async (req, res) => {
  try {
    const { account_id, folder = 'inbox', limit = 50, unread_only = false, offset = 0 } = req.query;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }

    const db = getDatabase();

    // Get account to find email
    const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Create service instance and get emails from local database
    const GoogleAccountService = require('../../services/googleAccountService.cjs');
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const emails = await service.getEmails(account_id, {
      folder,
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unread_only === 'true' || unread_only === true
    });

    res.json({
      success: true,
      data: emails
    });
  } catch (err) {
    console.error('[API Server] GET /api/emails error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get single email with full body
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.query;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }

    const db = getDatabase();

    // Get account
    const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const GoogleAccountService = require('../../services/googleAccountService.cjs');
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const email = await service.getEmail(account_id, id);

    res.json({
      success: true,
      data: email
    });
  } catch (err) {
    console.error('[API Server] GET /api/emails/:id error:', err.message);
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Send email via Gmail API
router.post('/send', async (req, res) => {
  try {
    const { account_id, to, cc, bcc, subject, body, html } = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'to (recipient) is required'
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        error: 'subject is required'
      });
    }

    if (!body && !html) {
      return res.status(400).json({
        success: false,
        error: 'body or html content is required'
      });
    }

    const db = getDatabase();

    // Get account
    const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const GoogleAccountService = require('../../services/googleAccountService.cjs');
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.sendEmail(account_id, {
      to,
      cc,
      bcc,
      subject,
      body: body || '',
      html
    });

    res.json({
      success: true,
      data: {
        id: result.id,
        threadId: result.threadId
      }
    });
  } catch (err) {
    console.error('[API Server] POST /api/emails/send error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Search emails using Gmail query operators
router.post('/search', async (req, res) => {
  try {
    const { account_id, query, limit = 20 } = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }

    const db = getDatabase();

    // Get account
    const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Search in local database using simple LIKE queries
    const searchQuery = `
      SELECT * FROM account_emails
      WHERE account_id = ?
      AND (
        subject LIKE ?
        OR from_email LIKE ?
        OR from_name LIKE ?
        OR body_text LIKE ?
        OR snippet LIKE ?
      )
      ORDER BY date DESC
      LIMIT ?
    `;

    const searchTerm = `%${query}%`;
    const emails = db.prepare(searchQuery).all(
      account_id,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      parseInt(limit)
    );

    // Strip raw_data for response
    const results = emails.map(email => ({
      ...email,
      raw_data: null
    }));

    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    console.error('[API Server] POST /api/emails/search error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Batch operations on emails
router.post('/batch', async (req, res) => {
  try {
    const { account_id, email_ids, action } = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }

    if (!email_ids || !Array.isArray(email_ids) || email_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'email_ids array is required and must not be empty'
      });
    }

    const validActions = ['mark_read', 'mark_unread', 'star', 'unstar', 'trash', 'delete'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `action must be one of: ${validActions.join(', ')}`
      });
    }

    const db = getDatabase();

    // Get account
    const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const GoogleAccountService = require('../../services/googleAccountService.cjs');
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    let modifiedCount = 0;
    const errors = [];

    for (const emailId of email_ids) {
      try {
        switch (action) {
          case 'mark_read':
            await service.markAsRead(account_id, emailId, true);
            break;
          case 'mark_unread':
            await service.markAsRead(account_id, emailId, false);
            break;
          case 'star':
            await service.toggleStar(account_id, emailId, true);
            break;
          case 'unstar':
            await service.toggleStar(account_id, emailId, false);
            break;
          case 'trash':
            await service.trashEmail(account_id, emailId);
            break;
          case 'delete':
            await service.deleteEmail(account_id, emailId);
            break;
        }
        modifiedCount++;
      } catch (err) {
        errors.push({ emailId, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        modified: modifiedCount,
        total: email_ids.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (err) {
    console.error('[API Server] POST /api/emails/batch error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Reply to an email
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id, body } = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }

    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'body is required'
      });
    }

    const db = getDatabase();

    // Get account
    const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const GoogleAccountService = require('../../services/googleAccountService.cjs');
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.replyToEmail(account_id, id, { body });

    res.json({
      success: true,
      data: {
        id: result.id,
        threadId: result.threadId
      }
    });
  } catch (err) {
    console.error('[API Server] POST /api/emails/:id/reply error:', err.message);
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Forward an email
router.post('/:id/forward', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id, to, body } = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required'
      });
    }

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'to (recipient) is required'
      });
    }

    const db = getDatabase();

    // Get account
    const account = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(account_id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const GoogleAccountService = require('../../services/googleAccountService.cjs');
    const service = new GoogleAccountService(db, account.email);
    await service.initialize();

    const result = await service.forwardEmail(account_id, id, { to, body: body || '' });

    res.json({
      success: true,
      data: {
        id: result.id,
        threadId: result.threadId
      }
    });
  } catch (err) {
    console.error('[API Server] POST /api/emails/:id/forward error:', err.message);
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
