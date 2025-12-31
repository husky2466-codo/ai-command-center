/**
 * Chain Runner Routes
 * API endpoints for controlling Chain Runner programmatically
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { app } = require('electron');

// Lazy-load the Chain Runner service
let ChainRunnerService;
let chainRunnerService = null;

async function getService() {
  if (!chainRunnerService) {
    if (!ChainRunnerService) {
      ChainRunnerService = require('../../services/chainRunnerService.cjs');
    }
    const userDataPath = app.getPath('userData');
    chainRunnerService = new ChainRunnerService(userDataPath);
    await chainRunnerService.initialize();
  }
  return chainRunnerService;
}

// =========================================================================
// CONFIGURATION MANAGEMENT
// =========================================================================

// List saved chain configurations
router.get('/configs', async (req, res) => {
  try {
    const service = await getService();
    const result = await service.listConfigs();
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] GET /configs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific chain configuration
router.get('/configs/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const service = await getService();
    const result = await service.getConfig(name);

    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] GET /configs/:name error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save chain configuration
router.post('/configs', async (req, res) => {
  try {
    const { config, name } = req.body;

    if (!config || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: config and name'
      });
    }

    const service = await getService();
    const result = await service.saveConfig(config, name);
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] POST /configs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete chain configuration
router.delete('/configs/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const service = await getService();
    const result = await service.deleteConfig(name);

    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] DELETE /configs/:name error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// PROMPT LISTS
// =========================================================================

// List saved prompt lists
router.get('/prompts', async (req, res) => {
  try {
    const service = await getService();
    const result = await service.listPromptLists();
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] GET /prompts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific prompt list
router.get('/prompts/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const service = await getService();
    const result = await service.getPromptList(name);

    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] GET /prompts/:name error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save prompt list
router.post('/prompts', async (req, res) => {
  try {
    const { promptList, topic } = req.body;

    if (!promptList || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: promptList and topic'
      });
    }

    const service = await getService();
    const result = await service.savePromptList(promptList, topic);
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] POST /prompts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate prompts using AI
router.post('/prompts/generate', async (req, res) => {
  try {
    const { provider, model, topic, count, category, apiKey } = req.body;

    if (!provider || !topic || !count) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: provider, topic, and count'
      });
    }

    // For non-Ollama providers, require API key
    if (provider !== 'ollama' && !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key required for this provider'
      });
    }

    const service = await getService();
    const result = await service.generatePrompts({
      provider,
      model,
      topic,
      count,
      category: category || 'general',
      apiKey
    });

    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] POST /prompts/generate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// EXECUTION CONTROL
// =========================================================================

// Start a chain run
router.post('/run', async (req, res) => {
  try {
    const { config, prompts, apiKeys } = req.body;

    if (!config || !config.agents || config.agents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid config: agents array required'
      });
    }

    if (!prompts || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one prompt required'
      });
    }

    const service = await getService();

    // Check if already running
    if (service.currentRun) {
      return res.status(409).json({
        success: false,
        error: 'A chain run is already in progress',
        runId: service.currentRun.id
      });
    }

    // Start run asynchronously
    const runPromise = service.runChain(config, prompts, apiKeys || {});

    // Return immediately with run ID
    res.json({
      success: true,
      message: 'Chain run started',
      runId: service.currentRun?.id,
      status: 'running'
    });

    // Let the run continue in background
    runPromise.catch(err => {
      console.error('[ChainRunner] Run error:', err.message);
    });
  } catch (err) {
    console.error('[ChainRunner] POST /run error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current run status
router.get('/status', async (req, res) => {
  try {
    const service = await getService();

    if (!service.currentRun) {
      return res.json({
        success: true,
        status: 'idle',
        currentRun: null
      });
    }

    res.json({
      success: true,
      status: 'running',
      currentRun: {
        id: service.currentRun.id,
        currentIteration: service.currentRun.currentIteration,
        totalIterations: service.currentRun.totalIterations,
        startedAt: service.currentRun.startedAt,
        outputs: service.currentRun.outputs?.length || 0
      }
    });
  } catch (err) {
    console.error('[ChainRunner] GET /status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stop current run
router.post('/stop', async (req, res) => {
  try {
    const service = await getService();

    if (!service.currentRun) {
      return res.json({
        success: true,
        message: 'No run in progress'
      });
    }

    service.aborted = true;
    res.json({
      success: true,
      message: 'Stop signal sent',
      runId: service.currentRun.id
    });
  } catch (err) {
    console.error('[ChainRunner] POST /stop error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// SESSIONS
// =========================================================================

// List all sessions
router.get('/sessions', async (req, res) => {
  try {
    const service = await getService();
    const result = await service.listSessions();
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] GET /sessions error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific session
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await getService();
    const result = await service.getSession(id);

    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('[ChainRunner] GET /sessions/:id error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export session as RAG training data
router.get('/sessions/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'jsonl', category = 'general', tags } = req.query;

    const service = await getService();

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
    console.error('[ChainRunner] GET /sessions/:id/export error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
