/**
 * adminService.js - Service for admin panel operations
 * Handles system health, token usage, data management, and settings
 */

import { dataService } from './DataService.js';

/**
 * Service for admin panel functionality
 */
class AdminService {
  constructor() {
    this.tokenUsageCache = null;
    this.systemHealthCache = null;
    this.cacheTimeout = 30000; // 30 seconds
    this.lastCacheUpdate = 0;
  }

  /**
   * Get overview statistics for the admin dashboard
   * @returns {Promise<Object>} Overview stats
   */
  async getOverviewStats() {
    try {
      // Get memory count
      const memoryResult = await dataService.get(
        'SELECT COUNT(*) as count FROM memories'
      );
      const memoryCount = memoryResult?.count || 0;

      // Get session count
      const sessionResult = await dataService.get(
        'SELECT COUNT(*) as count FROM chat_sessions'
      );
      const sessionCount = sessionResult?.count || 0;

      // Get total tokens (from token_usage table if exists, else 0)
      let totalTokens = 0;
      try {
        const tokenResult = await dataService.get(
          'SELECT SUM(input_tokens + output_tokens) as total FROM token_usage'
        );
        totalTokens = tokenResult?.total || 0;
      } catch (e) {
        // token_usage table might not exist yet
        console.log('Token usage table not available');
      }

      // Get database size
      const dbSize = await this.getDatabaseSize();

      // Get service health
      const serviceHealth = await this.checkServiceHealth();

      return {
        memoryCount,
        sessionCount,
        totalTokens,
        dbSize,
        serviceHealth,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting overview stats:', error);
      return {
        memoryCount: 0,
        sessionCount: 0,
        totalTokens: 0,
        dbSize: '0 KB',
        serviceHealth: { database: 'error', ollama: 'unknown' },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get database size in human-readable format
   * @returns {Promise<string>}
   */
  async getDatabaseSize() {
    try {
      if (window.electronAPI && window.electronAPI.getDatabaseSize) {
        const result = await window.electronAPI.getDatabaseSize();
        return result.success ? result.size : '0 KB';
      }
      return 'N/A';
    } catch (error) {
      console.error('Error getting database size:', error);
      return 'Error';
    }
  }

  /**
   * Check health of various services
   * @returns {Promise<Object>}
   */
  async checkServiceHealth() {
    const health = {
      database: 'unknown',
      ollama: 'unknown',
      embeddings: 'unknown'
    };

    // Check database
    try {
      await dataService.get('SELECT 1');
      health.database = 'healthy';
    } catch (error) {
      health.database = 'error';
    }

    // Check Ollama
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        health.ollama = 'healthy';
        health.embeddings = 'healthy';
      } else {
        health.ollama = 'error';
        health.embeddings = 'error';
      }
    } catch (error) {
      health.ollama = 'offline';
      health.embeddings = 'offline';
    }

    return health;
  }

  /**
   * Get token usage statistics
   * @param {string} period - Time period ('7d', '30d', 'all')
   * @param {string} provider - Filter by provider (optional)
   * @returns {Promise<Object>}
   */
  async getTokenUsage(period = '30d', provider = null) {
    try {
      // Build date filter
      let dateFilter = '';
      if (period === '7d') {
        dateFilter = "AND created_at >= datetime('now', '-7 days')";
      } else if (period === '30d') {
        dateFilter = "AND created_at >= datetime('now', '-30 days')";
      }

      // Build provider filter
      const providerFilter = provider ? `AND provider = ?` : '';
      const params = provider ? [provider] : [];

      // Get usage data
      const usageData = await dataService.query(
        `SELECT
          DATE(created_at) as date,
          provider,
          SUM(input_tokens + output_tokens) as tokens,
          SUM(estimated_cost) as cost
         FROM token_usage
         WHERE 1=1 ${dateFilter} ${providerFilter}
         GROUP BY DATE(created_at), provider
         ORDER BY date DESC`,
        params
      );

      // Get totals
      const totals = await dataService.get(
        `SELECT
          SUM(input_tokens + output_tokens) as total_tokens,
          SUM(estimated_cost) as total_cost,
          COUNT(DISTINCT provider) as provider_count
         FROM token_usage
         WHERE 1=1 ${dateFilter} ${providerFilter}`,
        params
      );

      // Get breakdown by provider
      const byProvider = await dataService.query(
        `SELECT
          provider,
          SUM(input_tokens + output_tokens) as tokens,
          SUM(estimated_cost) as cost
         FROM token_usage
         WHERE 1=1 ${dateFilter}
         GROUP BY provider
         ORDER BY tokens DESC`
      );

      return {
        usage: usageData || [],
        totals: totals || { total_tokens: 0, total_cost: 0, provider_count: 0 },
        byProvider: byProvider || [],
        period,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting token usage:', error);
      // Return empty data structure
      return {
        usage: [],
        totals: { total_tokens: 0, total_cost: 0, provider_count: 0 },
        byProvider: [],
        period,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Track token usage for an API call
   * @param {string} provider - API provider (anthropic, openai, etc.)
   * @param {string} model - Model used
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<void>}
   */
  async trackTokenUsage(provider, model, inputTokens, outputTokens, sessionId = null) {
    try {
      const id = crypto.randomUUID();
      const totalTokens = inputTokens + outputTokens;

      // Calculate estimated cost based on provider and model
      const estimatedCost = this.calculateCost(provider, model, inputTokens, outputTokens);

      // Insert usage record
      await dataService.run(
        `INSERT INTO token_usage (id, session_id, provider, model, input_tokens, output_tokens, estimated_cost, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, sessionId, provider, model, inputTokens, outputTokens, estimatedCost]
      );

      // Clear cache to force refresh
      this.tokenUsageCache = null;
    } catch (error) {
      console.error('Error tracking token usage:', error);
      // Don't throw - token tracking is non-critical
    }
  }

  /**
   * Calculate estimated cost for token usage
   * @param {string} provider - API provider
   * @param {string} model - Model identifier
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @returns {number} Estimated cost in USD
   */
  calculateCost(provider, model, inputTokens, outputTokens) {
    // Pricing per 1M tokens (as of Dec 2024)
    const pricing = {
      anthropic: {
        'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
        'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
        'claude-3-opus-20240229': { input: 15.00, output: 75.00 }
      },
      openai: {
        'gpt-4o': { input: 2.50, output: 10.00 },
        'gpt-4o-mini': { input: 0.15, output: 0.60 },
        'gpt-4-turbo': { input: 10.00, output: 30.00 },
        'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
      }
    };

    // Get pricing for model
    const modelPricing = pricing[provider]?.[model];
    if (!modelPricing) {
      return 0; // Unknown model, estimate $0
    }

    const inputCost = (inputTokens / 1000000) * modelPricing.input;
    const outputCost = (outputTokens / 1000000) * modelPricing.output;
    return inputCost + outputCost;
  }

  /**
   * Get all memories with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>}
   */
  async getMemories(filters = {}) {
    try {
      let whereClause = '1=1';
      const params = [];

      if (filters.type) {
        whereClause += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters.category) {
        whereClause += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.search) {
        whereClause += ' AND (title LIKE ? OR content LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      const memories = await dataService.query(
        `SELECT * FROM memories
         WHERE ${whereClause}
         ORDER BY formed_at DESC
         LIMIT ${filters.limit || 100}`,
        params
      );

      return memories || [];
    } catch (error) {
      console.error('Error getting memories:', error);
      return [];
    }
  }

  /**
   * Delete a memory by ID
   * @param {string} id - Memory ID
   * @returns {Promise<void>}
   */
  async deleteMemory(id) {
    try {
      await dataService.run('DELETE FROM memories WHERE id = ?', [id]);

      // Also delete associated data
      await dataService.run('DELETE FROM memory_chunks WHERE memory_id = ?', [id]);
      await dataService.run('DELETE FROM memory_entities WHERE memory_id = ?', [id]);
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }

  /**
   * Get all chat sessions
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>}
   */
  async getSessions(filters = {}) {
    try {
      let whereClause = '1=1';
      const params = [];

      if (filters.search) {
        whereClause += ' AND (title LIKE ? OR last_message LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      const sessions = await dataService.query(
        `SELECT * FROM chat_sessions
         WHERE ${whereClause}
         ORDER BY updated_at DESC
         LIMIT ${filters.limit || 100}`,
        params
      );

      return sessions || [];
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  /**
   * Get session details with messages
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>}
   */
  async getSessionDetail(sessionId) {
    try {
      const session = await dataService.get(
        'SELECT * FROM chat_sessions WHERE id = ?',
        [sessionId]
      );

      const messages = await dataService.query(
        'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId]
      );

      return {
        session: session || null,
        messages: messages || []
      };
    } catch (error) {
      console.error('Error getting session detail:', error);
      return { session: null, messages: [] };
    }
  }

  /**
   * Delete a session and all its messages
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    try {
      await dataService.run('DELETE FROM chat_messages WHERE session_id = ?', [sessionId]);
      await dataService.run('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Export all data as JSON backup
   * @returns {Promise<Object>}
   */
  async exportData() {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        memories: await dataService.query('SELECT * FROM memories'),
        sessions: await dataService.query('SELECT * FROM chat_sessions'),
        messages: await dataService.query('SELECT * FROM chat_messages'),
        entities: await dataService.query('SELECT * FROM entities'),
        projects: await dataService.query('SELECT * FROM projects'),
        reminders: await dataService.query('SELECT * FROM reminders')
      };

      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON backup
   * @param {Object} data - Exported data object
   * @returns {Promise<void>}
   */
  async importData(data) {
    try {
      // This would require transaction support
      // For now, just insert records one by one
      // TODO: Implement proper transaction handling

      console.log('Import functionality not yet implemented');
      throw new Error('Import not yet implemented');
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  /**
   * Clear old data based on age
   * @param {number} daysOld - Delete data older than this many days
   * @returns {Promise<Object>} Count of deleted records
   */
  async clearOldData(daysOld) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoff = cutoffDate.toISOString();

      const deletedMemories = await dataService.run(
        "DELETE FROM memories WHERE formed_at < ?",
        [cutoff]
      );

      const deletedSessions = await dataService.run(
        "DELETE FROM chat_sessions WHERE created_at < ?",
        [cutoff]
      );

      return {
        memories: deletedMemories?.changes || 0,
        sessions: deletedSessions?.changes || 0
      };
    } catch (error) {
      console.error('Error clearing old data:', error);
      throw error;
    }
  }

  /**
   * Optimize database (VACUUM)
   * @returns {Promise<void>}
   */
  async optimizeDatabase() {
    try {
      if (window.electronAPI && window.electronAPI.vacuumDatabase) {
        await window.electronAPI.vacuumDatabase();
      } else {
        console.warn('Database optimization not available');
      }
    } catch (error) {
      console.error('Error optimizing database:', error);
      throw error;
    }
  }

  /**
   * Get environment variables (masked)
   * @returns {Promise<Object>}
   */
  async getEnvironment() {
    try {
      const env = {
        anthropicKey: this.maskApiKey(window.electronAPI?.anthropicKey || ''),
        openaiKey: this.maskApiKey(window.electronAPI?.openaiKey || ''),
        hfToken: this.maskApiKey(window.electronAPI?.hfToken || ''),
        ollamaStatus: 'checking...',
        appVersion: '1.0.0', // TODO: Get from package.json
        storagePath: await this.getStoragePath()
      };

      // Check Ollama
      try {
        const response = await fetch('http://localhost:11434/api/tags', {
          signal: AbortSignal.timeout(2000)
        });
        env.ollamaStatus = response.ok ? 'connected' : 'error';
      } catch (e) {
        env.ollamaStatus = 'offline';
      }

      return env;
    } catch (error) {
      console.error('Error getting environment:', error);
      return {};
    }
  }

  /**
   * Mask API key (show only last 4 characters)
   * @param {string} key - API key to mask
   * @returns {string}
   */
  maskApiKey(key) {
    if (!key || key.length < 4) return '••••';
    return '••••' + key.slice(-4);
  }

  /**
   * Get storage path
   * @returns {Promise<string>}
   */
  async getStoragePath() {
    try {
      if (window.electronAPI && window.electronAPI.getUserDataPath) {
        const result = await window.electronAPI.getUserDataPath();
        return typeof result === 'string' ? result : result?.path || 'Unknown';
      }
      return 'N/A';
    } catch (error) {
      console.error('Error getting storage path:', error);
      return 'Error';
    }
  }

  /**
   * Get database table info for debugging
   * @returns {Promise<Array>}
   */
  async getDatabaseTables() {
    try {
      const tables = await dataService.query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      return tables || [];
    } catch (error) {
      console.error('Error getting database tables:', error);
      return [];
    }
  }

  /**
   * Run a test query (for debugging)
   * @param {string} sql - SQL query to run
   * @returns {Promise<Array>}
   */
  async runTestQuery(sql) {
    try {
      // Only allow SELECT queries for safety
      if (!sql.trim().toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed in debug mode');
      }

      const result = await dataService.query(sql);
      return result || [];
    } catch (error) {
      console.error('Error running test query:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
