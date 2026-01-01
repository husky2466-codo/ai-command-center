/**
 * Knowledge Routes
 *
 * Folders:
 * GET    /api/knowledge/folders     - List folders
 * POST   /api/knowledge/folders     - Create folder
 * PUT    /api/knowledge/folders/:id - Update folder
 * DELETE /api/knowledge/folders/:id - Delete folder
 *
 * Articles:
 * GET    /api/knowledge/articles     - List articles
 * GET    /api/knowledge/articles/:id - Get article with full content
 * POST   /api/knowledge/articles     - Create article
 * PUT    /api/knowledge/articles/:id - Update article
 * DELETE /api/knowledge/articles/:id - Delete article
 * POST   /api/knowledge/search       - Search articles
 */

const express = require('express');
const crypto = require('crypto');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();

// List knowledge folders
router.get('/folders', async (req, res) => {
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

// Create folder
router.post('/folders', (req, res) => {
  try {
    const db = getDatabase();
    const { name, parent_id, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    

    db.prepare(`
      INSERT INTO knowledge_folders (id, name, parent_id, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(id, name, parent_id || null, sort_order || 0);

    const folder = db.prepare('SELECT * FROM knowledge_folders WHERE id = ?').get(id);
    res.json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update folder
router.put('/folders/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { name, parent_id, sort_order } = req.body;

    const existing = db.prepare('SELECT id FROM knowledge_folders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (parent_id !== undefined) { updates.push('parent_id = ?'); values.push(parent_id); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE knowledge_folders SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const folder = db.prepare('SELECT * FROM knowledge_folders WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete folder
router.delete('/folders/:id', (req, res) => {
  try {
    const db = getDatabase();

    // Move articles to root (no folder)
    db.prepare('UPDATE knowledge_articles SET folder_id = NULL WHERE folder_id = ?').run(req.params.id);

    // Delete subfolder references
    db.prepare('UPDATE knowledge_folders SET parent_id = NULL WHERE parent_id = ?').run(req.params.id);

    const result = db.prepare('DELETE FROM knowledge_folders WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List articles
router.get('/articles', async (req, res) => {
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

// Get single article with full content
router.get('/articles/:id', async (req, res) => {
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

// Create article
router.post('/articles', (req, res) => {
  try {
    const db = getDatabase();
    const { title, content, folder_id, tags, is_spark } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    

    db.prepare(`
      INSERT INTO knowledge_articles (id, title, content, folder_id, tags, is_spark, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, content || '', folder_id || null, tags || '', is_spark ? 1 : 0, now, now);

    const article = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id);
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update article
router.put('/articles/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { title, content, folder_id, tags, is_spark } = req.body;

    const existing = db.prepare('SELECT id FROM knowledge_articles WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (folder_id !== undefined) { updates.push('folder_id = ?'); values.push(folder_id); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(tags); }
    if (is_spark !== undefined) { updates.push('is_spark = ?'); values.push(is_spark ? 1 : 0); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE knowledge_articles SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const article = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete article
router.delete('/articles/:id', (req, res) => {
  try {
    const db = getDatabase();

    const result = db.prepare('DELETE FROM knowledge_articles WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search articles
router.post('/search', async (req, res) => {
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

module.exports = router;
