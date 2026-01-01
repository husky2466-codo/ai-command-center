/**
 * HTTP API Server for AI Command Center
 * Allows external tools (like Claude Code) to control the app programmatically
 *
 * Security:
 * - Localhost only (127.0.0.1)
 * - Optional API key authentication
 * - All requests logged
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const logger = require('../utils/logger.cjs');
const requestLogger = require('../middleware/requestLogger.cjs');
const { getDatabase } = require('../database/db.cjs');
const dgxManager = require('./dgxManager.cjs');

// Use Node.js built-in UUID generator
const uuidv4 = () => crypto.randomUUID();

let server = null;
let app = null;

// Configuration
const DEFAULT_PORT = 3939;
const API_KEY = process.env.API_SERVER_KEY || null; // Optional API key from .env

/**
 * Middleware for API key authentication (if configured)
 */
function authenticateApiKey(req, res, next) {
  if (!API_KEY) {
    // No API key configured, allow all requests
    return next();
  }

  const providedKey = req.headers['x-api-key'];
  if (providedKey === API_KEY) {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid or missing API key'
    });
  }
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  logger.error('API Server error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({
    success: false,
    error: err.message
  });
}

/**
 * Start the HTTP API server
 * @param {number} port - Port to listen on (default: 3939)
 * @returns {Promise<void>}
 */
async function startApiServer(port = DEFAULT_PORT) {
  if (server) {
    logger.warn('API Server already running', { port });
    return;
  }

  app = express();

  // Middleware
  app.use(cors({ origin: 'http://localhost:*' })); // Allow CORS for local development
  app.use(express.json());
  app.use(requestLogger); // Winston-based request logging
  app.use(authenticateApiKey);

  // Mount all modular routes from the routes aggregator
  // This includes: files, terminal, reminders, contacts, knowledge, calendar, dgx, chainrunner, etc.
  const routesAggregator = require('../api/routes/index.cjs');
  app.use('/api', routesAggregator);

  // =========================================================================
  // SYSTEM ENDPOINTS (Legacy inline routes - kept for backwards compatibility)
  // =========================================================================

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
  });

  app.get('/api/status', async (req, res) => {
    try {
      const db = getDatabase();

      // Get table counts
      const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
      const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
      const reminderCount = db.prepare("SELECT COUNT(*) as count FROM reminders WHERE status != 'completed'").get().count;
      const contactCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
      const knowledgeCount = db.prepare('SELECT COUNT(*) as count FROM knowledge_articles').get().count;

      res.json({
        success: true,
        data: {
          database: 'connected',
          projects: projectCount,
          tasks: taskCount,
          activeReminders: reminderCount,
          contacts: contactCount,
          knowledgeArticles: knowledgeCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // =========================================================================
  // PROJECTS ENDPOINTS
  // =========================================================================

  app.get('/api/projects', async (req, res) => {
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

  app.get('/api/projects/:id', async (req, res) => {
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

  app.post('/api/projects', async (req, res) => {
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

  app.put('/api/projects/:id', async (req, res) => {
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

  app.delete('/api/projects/:id', async (req, res) => {
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

  // =========================================================================
  // TASKS ENDPOINTS
  // =========================================================================

  app.get('/api/tasks', async (req, res) => {
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

  app.post('/api/tasks', async (req, res) => {
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

  app.put('/api/tasks/:id', async (req, res) => {
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

  // =========================================================================
  // REMINDERS ENDPOINTS
  // =========================================================================

  app.get('/api/reminders', async (req, res) => {
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

  app.post('/api/reminders', async (req, res) => {
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

  app.put('/api/reminders/:id', async (req, res) => {
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

  // =========================================================================
  // KNOWLEDGE ENDPOINTS
  // =========================================================================

  app.get('/api/knowledge/folders', async (req, res) => {
    try {
      const db = getDatabase();
      const folders = db.prepare('SELECT * FROM knowledge_folders ORDER BY sort_order ASC').all();

      res.json({
        success: true,
        data: folders
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  app.get('/api/knowledge/articles', async (req, res) => {
    try {
      const db = getDatabase();
      const { folder_id, limit = 100 } = req.query;

      let sql = 'SELECT id, folder_id, title, source_url, tags, is_spark, created_at, updated_at FROM knowledge_articles WHERE 1=1';
      const params = [];

      if (folder_id) {
        sql += ' AND folder_id = ?';
        params.push(folder_id);
      }

      sql += ' ORDER BY updated_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const articles = db.prepare(sql).all(...params);

      res.json({
        success: true,
        data: articles
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  app.get('/api/knowledge/articles/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const article = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id);

      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }

      res.json({
        success: true,
        data: article
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  app.post('/api/knowledge/search', async (req, res) => {
    try {
      const db = getDatabase();
      const { query, limit = 20 } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Simple text search (full-text search would require FTS5 setup)
      const articles = db.prepare(`
        SELECT id, folder_id, title, source_url, tags, is_spark, created_at, updated_at
        FROM knowledge_articles
        WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(`%${query}%`, `%${query}%`, `%${query}%`, limit);

      res.json({
        success: true,
        data: articles
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // =========================================================================
  // CONTACTS ENDPOINTS
  // =========================================================================

  app.get('/api/contacts', async (req, res) => {
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

  app.get('/api/contacts/:id', async (req, res) => {
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

  app.post('/api/contacts', async (req, res) => {
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

  // =========================================================================
  // CALENDAR & EMAIL (Placeholder for Google integration)
  // =========================================================================

  app.get('/api/calendar/events', async (req, res) => {
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

  app.post('/api/calendar/events', async (req, res) => {
    res.status(501).json({
      success: false,
      error: 'Calendar event creation requires Google account connection (not yet implemented)'
    });
  });

  // =========================================================================
  // EMAIL ENDPOINTS (Google Gmail Integration)
  // =========================================================================

  /**
   * List emails from a connected Google account
   * GET /api/emails?account_id=...&folder=inbox&limit=50&unread_only=true
   */
  app.get('/api/emails', async (req, res) => {
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
      const GoogleAccountService = require('./googleAccountService.cjs');
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
      logger.error('GET /api/emails error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * Get single email with full body
   * GET /api/emails/:id?account_id=...
   */
  app.get('/api/emails/:id', async (req, res) => {
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

      const GoogleAccountService = require('./googleAccountService.cjs');
      const service = new GoogleAccountService(db, account.email);
      await service.initialize();

      const email = await service.getEmail(account_id, id);

      res.json({
        success: true,
        data: email
      });
    } catch (err) {
      logger.error('GET /api/emails/:id error', { error: err.message });
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

  /**
   * Send email via Gmail API
   * POST /api/emails/send
   * Body: { account_id, to, cc, bcc, subject, body, html }
   */
  app.post('/api/emails/send', async (req, res) => {
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

      const GoogleAccountService = require('./googleAccountService.cjs');
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
      logger.error('POST /api/emails/send error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * Search emails using Gmail query operators
   * POST /api/emails/search
   * Body: { account_id, query, limit }
   * Query uses Gmail operators: "from:user@example.com has:attachment after:2024/01/01"
   */
  app.post('/api/emails/search', async (req, res) => {
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
      // For full Gmail search, we'd need to call the Gmail API directly
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
      logger.error('POST /api/emails/search error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * Batch operations on emails
   * POST /api/emails/batch
   * Body: { account_id, email_ids: [], action: "mark_read" | "mark_unread" | "star" | "unstar" | "trash" | "delete" }
   */
  app.post('/api/emails/batch', async (req, res) => {
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

      const GoogleAccountService = require('./googleAccountService.cjs');
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
      logger.error('POST /api/emails/batch error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  /**
   * Reply to an email
   * POST /api/emails/:id/reply
   * Body: { account_id, body }
   */
  app.post('/api/emails/:id/reply', async (req, res) => {
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

      const GoogleAccountService = require('./googleAccountService.cjs');
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
      logger.error('POST /api/emails/:id/reply error', { error: err.message });
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

  /**
   * Forward an email
   * POST /api/emails/:id/forward
   * Body: { account_id, to, body }
   */
  app.post('/api/emails/:id/forward', async (req, res) => {
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

      const GoogleAccountService = require('./googleAccountService.cjs');
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
      logger.error('POST /api/emails/:id/forward error', { error: err.message });
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

  // =========================================================================
  // SPACES ENDPOINTS
  // =========================================================================

  app.get('/api/spaces', async (req, res) => {
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

  app.post('/api/spaces', async (req, res) => {
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

  // =========================================================================
  // MEMORIES ENDPOINTS
  // =========================================================================

  app.get('/api/memories', async (req, res) => {
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

  app.post('/api/memories', async (req, res) => {
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

  // =========================================================================
  // DGX SPARK ENDPOINTS
  // =========================================================================

  // List all DGX connections
  app.get('/api/dgx/connections', async (req, res) => {
    try {
      const db = getDatabase();
      const { limit = 100 } = req.query;

      const connections = db.prepare('SELECT * FROM dgx_connections ORDER BY updated_at DESC LIMIT ?').all(limit);

      res.json({
        success: true,
        data: connections
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get specific DGX connection
  app.get('/api/dgx/connections/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found'
        });
      }

      res.json({
        success: true,
        data: connection
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Create new DGX connection
  app.post('/api/dgx/connections', async (req, res) => {
    try {
      const db = getDatabase();
      const {
        name,
        hostname,
        username,
        ssh_key_path,
        port = 22
      } = req.body;

      if (!name || !hostname || !username || !ssh_key_path) {
        return res.status(400).json({
          success: false,
          error: 'Name, hostname, username, and ssh_key_path are required'
        });
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO dgx_connections (id, name, hostname, username, ssh_key_path, port, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, hostname, username, ssh_key_path, port, now, now);

      const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

      res.json({
        success: true,
        data: connection
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Update DGX connection
  app.put('/api/dgx/connections/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const updates = req.body;

      const existing = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found'
        });
      }

      const allowedFields = ['name', 'hostname', 'username', 'ssh_key_path', 'port'];
      const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = [...fields.map(f => updates[f]), new Date().toISOString(), id];

      db.prepare(`UPDATE dgx_connections SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values);

      const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

      res.json({
        success: true,
        data: connection
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Delete DGX connection
  app.delete('/api/dgx/connections/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      // Disconnect if active
      await dgxManager.disconnectFromDGX(id);

      const result = db.prepare('DELETE FROM dgx_connections WHERE id = ?').run(id);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found'
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

  // Connect to DGX
  app.post('/api/dgx/connect/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const connection = db.prepare('SELECT * FROM dgx_connections WHERE id = ?').get(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found'
        });
      }

      const result = await dgxManager.connectToDGX({
        id: connection.id,
        hostname: connection.hostname,
        username: connection.username,
        sshKeyPath: connection.ssh_key_path,
        port: connection.port
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Disconnect from DGX
  app.post('/api/dgx/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dgxManager.disconnectFromDGX(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get connection status (specific ID)
  app.get('/api/dgx/status/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = dgxManager.getConnectionStatus(id);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get active connection status
  app.get('/api/dgx/status', async (req, res) => {
    try {
      const result = dgxManager.getConnectionStatus();
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get GPU metrics
  app.get('/api/dgx/metrics/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dgxManager.getGPUMetrics(id);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get metrics history
  app.get('/api/dgx/metrics/:id/history', async (req, res) => {
    try {
      const { id } = req.params;
      const { hours = 24 } = req.query;

      const result = dgxManager.getMetricsHistory(id, parseInt(hours));

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Execute command on DGX
  app.post('/api/dgx/exec/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { command } = req.body;

      if (!command) {
        return res.status(400).json({
          success: false,
          error: 'Command is required'
        });
      }

      const result = await dgxManager.executeCommand(id, command);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // =========================================================================
  // DGX PROJECTS ENDPOINTS
  // =========================================================================

  // List DGX projects
  app.get('/api/dgx/projects', async (req, res) => {
    try {
      const db = getDatabase();
      const { connection_id, limit = 100 } = req.query;

      let sql = 'SELECT * FROM dgx_projects WHERE 1=1';
      const params = [];

      if (connection_id) {
        sql += ' AND connection_id = ?';
        params.push(connection_id);
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

  // Get specific DGX project
  app.get('/api/dgx/projects/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const project = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Get associated training jobs
      const jobs = db.prepare('SELECT * FROM dgx_training_jobs WHERE project_id = ? ORDER BY created_at DESC').all(id);

      res.json({
        success: true,
        data: {
          ...project,
          jobs
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Create DGX project
  app.post('/api/dgx/projects', async (req, res) => {
    try {
      const db = getDatabase();
      const {
        connection_id,
        name,
        description,
        project_type,
        remote_path,
        status = 'active',
        config
      } = req.body;

      if (!name || !connection_id) {
        return res.status(400).json({
          success: false,
          error: 'Name and connection_id are required'
        });
      }

      const id = uuidv4();
      const now = new Date().toISOString();
      const configStr = config ? JSON.stringify(config) : null;

      db.prepare(`
        INSERT INTO dgx_projects (id, connection_id, name, description, project_type, remote_path, status, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, connection_id, name, description, project_type, remote_path, status, configStr, now, now);

      const project = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);

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

  // Update DGX project
  app.put('/api/dgx/projects/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const updates = req.body;

      const existing = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const allowedFields = ['name', 'description', 'project_type', 'remote_path', 'status', 'config'];
      const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      // Handle config JSON serialization
      const values = fields.map(f => {
        if (f === 'config' && typeof updates[f] === 'object') {
          return JSON.stringify(updates[f]);
        }
        return updates[f];
      });

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      values.push(new Date().toISOString());
      values.push(id);

      db.prepare(`UPDATE dgx_projects SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values);

      const project = db.prepare('SELECT * FROM dgx_projects WHERE id = ?').get(id);

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

  // Delete DGX project
  app.delete('/api/dgx/projects/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const result = db.prepare('DELETE FROM dgx_projects WHERE id = ?').run(id);

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

  // =========================================================================
  // DGX TRAINING JOBS ENDPOINTS
  // =========================================================================

  // List training jobs
  app.get('/api/dgx/jobs', async (req, res) => {
    try {
      const db = getDatabase();
      const { project_id, limit = 100 } = req.query;

      let sql = 'SELECT * FROM dgx_training_jobs WHERE 1=1';
      const params = [];

      if (project_id) {
        sql += ' AND project_id = ?';
        params.push(project_id);
      }

      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const jobs = db.prepare(sql).all(...params);

      res.json({
        success: true,
        data: jobs
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get specific training job
  app.get('/api/dgx/jobs/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const job = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: job
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Create training job
  app.post('/api/dgx/jobs', async (req, res) => {
    try {
      const db = getDatabase();
      const {
        project_id,
        name,
        model_name,
        status = 'pending',
        config,
        metrics,
        container_id
      } = req.body;

      if (!name || !project_id) {
        return res.status(400).json({
          success: false,
          error: 'Name and project_id are required'
        });
      }

      const id = uuidv4();
      const now = new Date().toISOString();
      const configStr = config ? JSON.stringify(config) : null;
      const metricsStr = metrics ? JSON.stringify(metrics) : null;

      db.prepare(`
        INSERT INTO dgx_training_jobs (id, project_id, name, model_name, status, config, metrics, container_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, project_id, name, model_name, status, configStr, metricsStr, container_id, now);

      const job = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);

      res.json({
        success: true,
        data: job
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Update training job (for status and metrics updates)
  app.put('/api/dgx/jobs/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const updates = req.body;

      const existing = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const allowedFields = ['name', 'model_name', 'status', 'config', 'metrics', 'container_id'];
      const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      // Handle JSON serialization and status timestamps
      let extraFields = '';
      let extraValues = [];

      if (updates.status === 'running' && existing.status !== 'running') {
        extraFields = ', started_at = ?';
        extraValues.push(new Date().toISOString());
      } else if (updates.status === 'completed' && existing.status !== 'completed') {
        extraFields = ', completed_at = ?';
        extraValues.push(new Date().toISOString());
      }

      const values = fields.map(f => {
        if ((f === 'config' || f === 'metrics') && typeof updates[f] === 'object') {
          return JSON.stringify(updates[f]);
        }
        return updates[f];
      });

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const allValues = [...values, ...extraValues, id];

      db.prepare(`UPDATE dgx_training_jobs SET ${setClause}${extraFields} WHERE id = ?`).run(...allValues);

      const job = db.prepare('SELECT * FROM dgx_training_jobs WHERE id = ?').get(id);

      res.json({
        success: true,
        data: job
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Delete training job
  app.delete('/api/dgx/jobs/:id', async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const result = db.prepare('DELETE FROM dgx_training_jobs WHERE id = ?').run(id);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
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

  // =========================================================================
  // CHAIN RUNNER ENDPOINTS
  // =========================================================================
  // NOTE: Chain Runner routes are now in electron/api/routes/chainrunner.cjs
  // This section is deprecated and kept for reference only.

  // Initialize Chain Runner service
  const ChainRunnerService = require('./chainRunnerService.cjs');
  let chainRunnerService = null;

  // Lazy initialization
  async function getChainRunnerService() {
    if (!chainRunnerService) {
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      chainRunnerService = new ChainRunnerService(userDataPath);
      await chainRunnerService.initialize();
    }
    return chainRunnerService;
  }

  // List saved chain configurations
  app.get('/api/chainrunner/configs', async (req, res) => {
    try {
      const service = await getChainRunnerService();
      const result = await service.listConfigs();

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/configs error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get specific chain configuration
  app.get('/api/chainrunner/configs/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const service = await getChainRunnerService();
      const result = await service.getConfig(name);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/configs/:name error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Save a chain configuration
  app.post('/api/chainrunner/configs', async (req, res) => {
    try {
      const { config, name } = req.body;

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'config is required'
        });
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'name is required'
        });
      }

      const service = await getChainRunnerService();
      const result = await service.saveConfig(config, name);

      res.json(result);
    } catch (err) {
      logger.error('POST /api/chainrunner/configs error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Delete a chain configuration
  app.delete('/api/chainrunner/configs/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const service = await getChainRunnerService();
      const result = await service.deleteConfig(name);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      logger.error('DELETE /api/chainrunner/configs/:name error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // List saved prompt lists
  app.get('/api/chainrunner/prompts', async (req, res) => {
    try {
      const service = await getChainRunnerService();
      const result = await service.listPromptLists();

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/prompts error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get specific prompt list
  app.get('/api/chainrunner/prompts/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const service = await getChainRunnerService();
      const result = await service.getPromptList(name);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/prompts/:name error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Save a prompt list
  app.post('/api/chainrunner/prompts', async (req, res) => {
    try {
      const { prompts, topic } = req.body;

      if (!prompts || !Array.isArray(prompts)) {
        return res.status(400).json({
          success: false,
          error: 'prompts array is required'
        });
      }

      if (!topic) {
        return res.status(400).json({
          success: false,
          error: 'topic is required'
        });
      }

      const service = await getChainRunnerService();
      const result = await service.savePromptList(prompts, topic);

      res.json(result);
    } catch (err) {
      logger.error('POST /api/chainrunner/prompts error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Generate prompts using AI
  app.post('/api/chainrunner/prompts/generate', async (req, res) => {
    try {
      const { provider, model, topic, count, category, apiKey, ollamaUrl } = req.body;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: 'provider is required (anthropic, openai, ollama)'
        });
      }

      if (!topic) {
        return res.status(400).json({
          success: false,
          error: 'topic is required'
        });
      }

      if (!count || count < 1 || count > 100) {
        return res.status(400).json({
          success: false,
          error: 'count must be between 1 and 100'
        });
      }

      if (provider !== 'ollama' && !apiKey) {
        return res.status(400).json({
          success: false,
          error: 'apiKey is required for non-Ollama providers'
        });
      }

      const service = await getChainRunnerService();
      const result = await service.generatePrompts({
        provider,
        model: model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : provider === 'openai' ? 'gpt-4o' : 'mistral'),
        topic,
        count: parseInt(count),
        category: category || 'general',
        apiKey,
        ollamaUrl
      });

      res.json(result);
    } catch (err) {
      logger.error('POST /api/chainrunner/prompts/generate error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Start a chain run
  app.post('/api/chainrunner/run', async (req, res) => {
    try {
      const { config, prompts, apiKeys } = req.body;

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'config is required'
        });
      }

      if (!config.agents || !Array.isArray(config.agents) || config.agents.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'config.agents array is required and must not be empty'
        });
      }

      if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'prompts array is required and must not be empty'
        });
      }

      if (!apiKeys || typeof apiKeys !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'apiKeys object is required (e.g., { ANTHROPIC_API_KEY: "...", OPENAI_API_KEY: "..." })'
        });
      }

      const service = await getChainRunnerService();

      // Check if already running
      const status = service.getStatus();
      if (status.status === 'running') {
        return res.status(409).json({
          success: false,
          error: 'A chain run is already in progress. Stop it first or wait for it to complete.'
        });
      }

      // Start chain run asynchronously (don't await)
      service.runChain(config, prompts, apiKeys).catch(err => {
        logger.error('Chain run failed', { error: err.message });
      });

      // Return immediately with run ID
      const currentStatus = service.getStatus();

      res.json({
        success: true,
        message: 'Chain run started',
        runId: currentStatus.runId,
        status: currentStatus.status
      });
    } catch (err) {
      logger.error('POST /api/chainrunner/run error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get current run status
  app.get('/api/chainrunner/status', async (req, res) => {
    try {
      const service = await getChainRunnerService();
      const result = service.getStatus();

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/status error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Stop current run
  app.post('/api/chainrunner/stop', async (req, res) => {
    try {
      const service = await getChainRunnerService();
      const result = service.stopChain();

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      logger.error('POST /api/chainrunner/stop error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // List sessions
  app.get('/api/chainrunner/sessions', async (req, res) => {
    try {
      const service = await getChainRunnerService();
      const result = await service.listSessions();

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/sessions error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get specific session
  app.get('/api/chainrunner/sessions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const service = await getChainRunnerService();
      const result = await service.getSession(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/sessions/:id error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Export session as RAG training data
  app.get('/api/chainrunner/sessions/:id/export', async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'jsonl', category = 'general', tags } = req.query;

      const service = await getChainRunnerService();

      // Parse tags if provided
      let tagArray = [];
      if (tags) {
        tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      }

      const result = await service.exportSession(id, format, category, tagArray);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (err) {
      logger.error('GET /api/chainrunner/sessions/:id/export error', { error: err.message });
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Error handler
  app.use(errorHandler);

  // Start listening (localhost only)
  return new Promise((resolve, reject) => {
    server = app.listen(port, '127.0.0.1', () => {
      logger.info('API Server started', {
        url: `http://127.0.0.1:${port}`,
        apiKeyAuth: API_KEY ? 'enabled' : 'disabled'
      });
      resolve();
    });

    server.on('error', (err) => {
      logger.error('API Server failed to start', { error: err.message, port });
      reject(err);
    });
  });
}

/**
 * Stop the HTTP API server
 * @returns {Promise<void>}
 */
async function stopApiServer() {
  if (!server) {
    logger.debug('No API server to stop');
    return;
  }

  return new Promise((resolve) => {
    server.close(() => {
      logger.info('API Server stopped');
      server = null;
      app = null;
      resolve();
    });
  });
}

/**
 * Get server status
 * @returns {object} Server status
 */
function getServerStatus() {
  return {
    running: server !== null,
    port: server ? server.address()?.port : null,
    address: server ? server.address()?.address : null
  };
}

module.exports = {
  startApiServer,
  stopApiServer,
  getServerStatus
};
