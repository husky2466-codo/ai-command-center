/**
 * Health and Status Routes
 * GET /api/health - Health check
 * GET /api/status - App status with database counts
 */

const express = require('express');
const { getDatabase } = require('../../database/db.cjs');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }
  });
});

// App status
router.get('/status', async (req, res) => {
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

module.exports = router;
