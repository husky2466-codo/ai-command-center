/**
 * Knowledge Routes
 * GET /api/knowledge/folders - List folders
 * GET /api/knowledge/articles - List articles
 * GET /api/knowledge/articles/:id - Get article with full content
 * POST /api/knowledge/search - Search articles
 */

const express = require('express');
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
