/**
 * Chain Runner Service
 * Backend service for running multi-agent AI chains programmatically
 *
 * This service handles:
 * - Chain execution with multiple AI providers (Anthropic, OpenAI, HuggingFace, Ollama)
 * - Prompt generation using AI
 * - Quality validation of outputs
 * - Session logging and state management
 */

const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger.cjs');

// Import functions from Chain Runner modules (adapted for Node.js)
const { generatePrompts, loadExistingRAGTopics } = require('./chainRunnerHelpers.cjs');

class ChainRunnerService {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.configsPath = path.join(userDataPath, 'chain-configs');
    this.promptListsPath = path.join(userDataPath, 'prompt-lists');
    this.sessionsPath = path.join(userDataPath, 'sessions');
    this.ragOutputsPath = path.join(userDataPath, 'rag-outputs');

    // Execution state
    this.currentRun = null;
    this.aborted = false;
  }

  /**
   * Ensure all directories exist
   */
  async initialize() {
    const dirs = [this.configsPath, this.promptListsPath, this.sessionsPath, this.ragOutputsPath];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (err) {
        logger.error('Failed to create directory', { dir, error: err.message });
      }
    }
  }

  // =========================================================================
  // CONFIGURATION MANAGEMENT
  // =========================================================================

  /**
   * List all saved configurations
   */
  async listConfigs() {
    try {
      const files = await fs.readdir(this.configsPath);
      const configs = [];

      for (const filename of files.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(this.configsPath, filename);
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          configs.push({ filename, ...data });
        } catch (err) {
          logger.error('Failed to load config', { filename, error: err.message });
        }
      }

      // Sort by date, newest first
      configs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return { success: true, configs };
    } catch (err) {
      logger.error('listConfigs error', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Get a specific configuration by name
   */
  async getConfig(name) {
    try {
      const files = await fs.readdir(this.configsPath);
      const matchingFile = files.find(f => f.startsWith(name) || f === name);

      if (!matchingFile) {
        return { success: false, error: 'Configuration not found' };
      }

      const filePath = path.join(this.configsPath, matchingFile);
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);

      return { success: true, config, filename: matchingFile };
    } catch (err) {
      logger.error('getConfig error', { name, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Save a new configuration
   */
  async saveConfig(config, name) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const sanitizedName = name.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${sanitizedName}_${timestamp}.json`;

      const configData = {
        name,
        createdAt: new Date().toISOString(),
        ...config
      };

      const filePath = path.join(this.configsPath, filename);
      await fs.writeFile(filePath, JSON.stringify(configData, null, 2), 'utf8');

      logger.info('Saved chain config', { filename });

      return { success: true, filename };
    } catch (err) {
      logger.error('saveConfig error', { name, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a configuration
   */
  async deleteConfig(name) {
    try {
      const files = await fs.readdir(this.configsPath);
      const matchingFile = files.find(f => f.startsWith(name) || f === name);

      if (!matchingFile) {
        return { success: false, error: 'Configuration not found' };
      }

      const filePath = path.join(this.configsPath, matchingFile);
      await fs.unlink(filePath);

      logger.info('Deleted chain config', { filename: matchingFile });

      return { success: true, deleted: matchingFile };
    } catch (err) {
      logger.error('deleteConfig error', { name, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // =========================================================================
  // PROMPT LIST MANAGEMENT
  // =========================================================================

  /**
   * List all saved prompt lists
   */
  async listPromptLists() {
    try {
      const files = await fs.readdir(this.promptListsPath);
      const lists = [];

      for (const filename of files.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(this.promptListsPath, filename);
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          lists.push({ filename, ...data });
        } catch (err) {
          logger.error('Failed to load prompt list', { filename, error: err.message });
        }
      }

      // Sort by timestamp, newest first
      lists.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return { success: true, lists };
    } catch (err) {
      logger.error('listPromptLists error', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Get a specific prompt list by name
   */
  async getPromptList(name) {
    try {
      const files = await fs.readdir(this.promptListsPath);
      const matchingFile = files.find(f => f.startsWith('prompts_' + name) || f === name);

      if (!matchingFile) {
        return { success: false, error: 'Prompt list not found' };
      }

      const filePath = path.join(this.promptListsPath, matchingFile);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      return { success: true, data, filename: matchingFile };
    } catch (err) {
      logger.error('getPromptList error', { name, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Save a prompt list
   */
  async savePromptList(promptList, topic) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const safeTopic = topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `prompts_${safeTopic}_${timestamp}.json`;

      const data = {
        topic,
        timestamp: new Date().toISOString(),
        count: promptList.length,
        prompts: promptList,
        metadata: {
          generator: 'chain-runner-api',
          version: '1.0'
        }
      };

      const filePath = path.join(this.promptListsPath, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

      logger.info('Saved prompt list', { filename, count: promptList.length });

      return { success: true, filename, count: promptList.length };
    } catch (err) {
      logger.error('savePromptList error', { topic, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate prompts using AI
   */
  async generatePrompts(options) {
    try {
      const { topic, category = 'general', count = 10, provider, model, apiKey, ollamaUrl } = options;

      // Load existing RAG topics to avoid duplicates
      const existingTopics = await this.loadExistingRAGTopics();

      const result = await generatePrompts({
        topic,
        category,
        count,
        provider,
        model,
        apiKey,
        existingTopics,
        ollamaUrl: ollamaUrl || 'http://localhost:11434'
      });

      if (result.success) {
        logger.info('Generated prompts', { count: result.prompts.length, topic });
      }

      return result;
    } catch (err) {
      logger.error('generatePrompts error', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Load existing RAG topics from JSONL files
   */
  async loadExistingRAGTopics() {
    try {
      const files = await fs.readdir(this.ragOutputsPath);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
      const allQuestions = [];

      for (const filename of jsonlFiles) {
        const filePath = path.join(this.ragOutputsPath, filename);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            if (record.question) {
              allQuestions.push(record.question.trim());
            }
          } catch (parseErr) {
            // Skip invalid lines
          }
        }
      }

      const uniqueQuestions = [...new Set(allQuestions)];
      logger.debug('Loaded existing RAG topics', { count: uniqueQuestions.length });

      return uniqueQuestions;
    } catch (err) {
      logger.error('loadExistingRAGTopics error', { error: err.message });
      return [];
    }
  }

  // =========================================================================
  // CHAIN EXECUTION
  // =========================================================================

  /**
   * Run a chain with the given configuration
   */
  async runChain(config, prompts, apiKeys) {
    try {
      const {
        agents,
        iterations = 1,
        runMode = 'once',
        enableTypewriter = false,
        enableValidator = false,
        validatorProvider,
        validatorModel,
        qualityThreshold = 0.7
      } = config;

      if (!agents || agents.length === 0) {
        return { success: false, error: 'At least one agent is required' };
      }

      if (!prompts || prompts.length === 0) {
        return { success: false, error: 'At least one prompt is required' };
      }

      // Initialize run state
      const runId = this.generateRunId();
      this.currentRun = {
        id: runId,
        status: 'running',
        startTime: new Date().toISOString(),
        agents,
        prompts,
        iterations: prompts.length,
        currentIteration: 0,
        outputs: [],
        errors: []
      };
      this.aborted = false;

      logger.info('Starting chain run', { runId, agents: agents.length, prompts: prompts.length });

      // Execute chain for each prompt
      for (let i = 0; i < prompts.length; i++) {
        if (this.aborted) {
          logger.info('Chain run aborted', { runId, completedIterations: i });
          break;
        }

        this.currentRun.currentIteration = i + 1;
        const prompt = prompts[i];

        logger.debug('Processing iteration', { runId, iteration: i + 1, prompt });

        let input = prompt;

        // Execute each agent in sequence
        for (let agentIndex = 0; agentIndex < agents.length; agentIndex++) {
          if (this.aborted) break;

          const agent = agents[agentIndex];
          logger.debug('Calling agent', { runId, iteration: i + 1, agentIndex, provider: agent.provider });

          try {
            const output = await this.callApi(agent, input, apiKeys);

            this.currentRun.outputs.push({
              iteration: i + 1,
              promptIndex: i,
              promptText: prompt,
              agentIndex,
              input,
              output,
              timestamp: new Date().toISOString()
            });

            input = output; // Next agent receives previous output
          } catch (err) {
            logger.error('Agent call failed', {
              runId,
              iteration: i + 1,
              agentIndex,
              error: err.message
            });

            this.currentRun.errors.push({
              iteration: i + 1,
              agentIndex,
              error: err.message
            });

            // Stop on error
            this.currentRun.status = 'failed';
            this.currentRun.endTime = new Date().toISOString();
            await this.saveSessionLog(this.currentRun);
            return { success: false, error: err.message, runId };
          }
        }
      }

      // Quality validation if enabled
      if (enableValidator && !this.aborted && this.currentRun.outputs.length > 0) {
        logger.info('Running quality validation', { runId });
        await this.runQualityValidation(validatorProvider, validatorModel, apiKeys, qualityThreshold);
      }

      // Finalize run
      this.currentRun.status = this.aborted ? 'aborted' : 'completed';
      this.currentRun.endTime = new Date().toISOString();

      const sessionLog = await this.saveSessionLog(this.currentRun);

      logger.info('Chain run completed', {
        runId,
        status: this.currentRun.status,
        outputs: this.currentRun.outputs.length,
        errors: this.currentRun.errors.length
      });

      const result = {
        success: true,
        runId,
        status: this.currentRun.status,
        outputCount: this.currentRun.outputs.length,
        sessionFile: sessionLog.filename
      };

      // Clear current run state
      this.currentRun = null;
      this.aborted = false;

      return result;
    } catch (err) {
      logger.error('runChain error', { error: err.message, stack: err.stack });
      this.currentRun = null;
      this.aborted = false;
      return { success: false, error: err.message };
    }
  }

  /**
   * Call AI API for a single agent
   */
  async callApi(agent, input, apiKeys) {
    const { provider, model, taskSpec } = agent;

    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: taskSpec,
          messages: [{ role: 'user', content: input }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text || 'No response';
    }

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: taskSpec },
            { role: 'user', content: input }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response';
    }

    if (provider === 'huggingface') {
      const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.HF_TOKEN}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: taskSpec },
            { role: 'user', content: input }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response';
    }

    if (provider === 'ollama') {
      const ollamaUrl = apiKeys.OLLAMA_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: taskSpec },
            { role: 'user', content: input }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.message?.content || 'No response';
    }

    throw new Error(`Unknown provider: ${provider}`);
  }

  /**
   * Run quality validation on outputs
   */
  async runQualityValidation(provider, model, apiKeys, threshold) {
    // Group outputs by iteration
    const iterations = {};
    this.currentRun.outputs.forEach((output) => {
      const iter = output.iteration || 1;
      if (!iterations[iter]) {
        iterations[iter] = [];
      }
      iterations[iter].push(output);
    });

    for (const [iterNum, outputs] of Object.entries(iterations)) {
      if (this.aborted) break;

      const question = outputs[0].promptText || outputs[0].input || 'Unknown question';
      const lastOutput = outputs[outputs.length - 1];
      const answer = lastOutput.output;

      try {
        const scores = await this.validateQAPair(question, answer, provider, model, apiKeys);

        if (scores.overall >= threshold) {
          logger.debug('Q&A pair passed validation', { iteration: iterNum, score: scores.overall });
        } else {
          logger.warn('Q&A pair below quality threshold', {
            iteration: iterNum,
            score: scores.overall,
            threshold
          });
        }

        // Attach scores to output
        const outputIndex = this.currentRun.outputs.findIndex(
          o => o.iteration === parseInt(iterNum) && o.agentIndex === lastOutput.agentIndex
        );
        if (outputIndex !== -1) {
          this.currentRun.outputs[outputIndex].qualityScore = scores;
        }
      } catch (err) {
        logger.error('Quality validation failed', { iteration: iterNum, error: err.message });
      }
    }
  }

  /**
   * Validate a single Q&A pair
   */
  async validateQAPair(question, answer, provider, model, apiKeys) {
    const systemPrompt = `You are a quality evaluator for AI-generated Q&A pairs. Score the answer on four dimensions:

1. Correctness: Is the answer factually accurate? (0-1)
2. Completeness: Does it fully address the question? (0-1)
3. Clarity: Is it easy to understand? (0-1)
4. Relevance: Does it stay on topic? (0-1)

Return ONLY a JSON object with these scores:
{"correctness": 0.9, "completeness": 0.85, "clarity": 0.95, "relevance": 1.0}`;

    const userPrompt = `Question: ${question}\n\nAnswer: ${answer}`;

    try {
      const response = await this.callApi(
        { provider, model, taskSpec: systemPrompt },
        userPrompt,
        apiKeys
      );

      // Parse JSON response
      let jsonText = response.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const scores = JSON.parse(jsonText);

      // Calculate overall score
      const overall = (scores.correctness + scores.completeness + scores.clarity + scores.relevance) / 4;

      return {
        correctness: scores.correctness || 0,
        completeness: scores.completeness || 0,
        clarity: scores.clarity || 0,
        relevance: scores.relevance || 0,
        overall
      };
    } catch (err) {
      logger.error('validateQAPair error', { error: err.message });
      throw err;
    }
  }

  /**
   * Get current run status
   */
  getStatus() {
    if (!this.currentRun) {
      return {
        success: true,
        status: 'idle',
        message: 'No active chain run'
      };
    }

    return {
      success: true,
      status: this.currentRun.status,
      runId: this.currentRun.id,
      currentIteration: this.currentRun.currentIteration,
      totalIterations: this.currentRun.iterations,
      outputCount: this.currentRun.outputs.length,
      errorCount: this.currentRun.errors.length,
      startTime: this.currentRun.startTime
    };
  }

  /**
   * Stop the current chain run
   */
  stopChain() {
    if (!this.currentRun || this.currentRun.status !== 'running') {
      return { success: false, error: 'No active chain run to stop' };
    }

    this.aborted = true;
    logger.info('Chain run stop requested', { runId: this.currentRun.id });

    return { success: true, message: 'Chain run will stop after current agent completes' };
  }

  // =========================================================================
  // SESSION MANAGEMENT
  // =========================================================================

  /**
   * Save session log to disk
   */
  async saveSessionLog(sessionData) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const filename = `session_${timestamp}.json`;
      const filePath = path.join(this.sessionsPath, filename);

      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), 'utf8');

      logger.info('Saved session log', { filename, outputs: sessionData.outputs.length });

      return { success: true, filename, filePath };
    } catch (err) {
      logger.error('saveSessionLog error', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * List all sessions
   */
  async listSessions() {
    try {
      const files = await fs.readdir(this.sessionsPath);
      const sessions = [];

      for (const filename of files.filter(f => f.endsWith('.json'))) {
        try {
          const filePath = path.join(this.sessionsPath, filename);
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);

          sessions.push({
            filename,
            id: data.id,
            startTime: data.startTime,
            endTime: data.endTime,
            status: data.status,
            outputCount: data.outputs?.length || 0,
            errorCount: data.errors?.length || 0
          });
        } catch (err) {
          logger.error('Failed to load session', { filename, error: err.message });
        }
      }

      // Sort by start time, newest first
      sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

      return { success: true, sessions };
    } catch (err) {
      logger.error('listSessions error', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSession(id) {
    try {
      const files = await fs.readdir(this.sessionsPath);
      let sessionData = null;

      for (const filename of files.filter(f => f.endsWith('.json'))) {
        const filePath = path.join(this.sessionsPath, filename);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        if (data.id === id || filename.includes(id)) {
          sessionData = data;
          break;
        }
      }

      if (!sessionData) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true, session: sessionData };
    } catch (err) {
      logger.error('getSession error', { id, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Export a session as RAG training data
   */
  async exportSession(id, format = 'jsonl', category = 'general', tags = []) {
    try {
      const sessionResult = await this.getSession(id);
      if (!sessionResult.success) {
        return sessionResult;
      }

      const session = sessionResult.session;

      // Use existing ragExporter logic (adapted)
      const { parseChainOutputs, formatAsJSONL, formatAsMarkdown, formatAsText } = require('./chainRunnerHelpers.cjs');

      const pairs = parseChainOutputs(session);

      if (pairs.length === 0) {
        return { success: false, error: 'No Q&A pairs found in session' };
      }

      let content;
      let extension;

      switch (format) {
        case 'jsonl':
          content = formatAsJSONL(pairs, { category, tags });
          extension = '.jsonl';
          break;
        case 'markdown':
          content = formatAsMarkdown(pairs, { category, tags });
          extension = '.md';
          break;
        case 'txt':
        default:
          content = formatAsText(pairs, { category, tags });
          extension = '.txt';
      }

      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const filename = `${category}_${timestamp}${extension}`;
      const filePath = path.join(this.ragOutputsPath, filename);

      await fs.writeFile(filePath, content, 'utf8');

      logger.info('Exported session as RAG training data', { id, filename, pairCount: pairs.length });

      return {
        success: true,
        filePath,
        filename,
        pairCount: pairs.length
      };
    } catch (err) {
      logger.error('exportSession error', { id, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // =========================================================================
  // UTILITY
  // =========================================================================

  /**
   * Generate a unique run ID
   */
  generateRunId() {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = ChainRunnerService;
