/**
 * sessionService.js - Domain service for chat_sessions table
 * Manages Claude Code session tracking and metadata
 */

import { BaseService } from './BaseService.js';
import { dataService } from './DataService.js';

/**
 * Service for managing Claude Code sessions
 * Tracks session metadata, messages, and links to memories
 */
class SessionService extends BaseService {
  constructor() {
    super('chat_sessions');
  }

  /**
   * Create a new session with validation
   * @param {Object} sessionData - Session data
   * @param {string} [sessionData.claude_session_id] - Claude session ID from .jsonl filename
   * @param {string} [sessionData.title] - Session title
   * @param {string} [sessionData.first_message] - First message content
   * @param {string} [sessionData.importance] - Importance level (low, medium, high)
   * @param {string} [sessionData.work_type] - Type of work performed
   * @returns {Promise<Object>} The created session
   */
  async createSession(sessionData) {
    // Validate importance if provided
    if (sessionData.importance) {
      const validImportance = ['low', 'medium', 'high'];
      if (!validImportance.includes(sessionData.importance)) {
        throw new Error(`Invalid importance level: ${sessionData.importance}`);
      }
    }

    // Set defaults
    const data = {
      message_count: 0,
      token_count: 0,
      ...sessionData
    };

    return this.create(data);
  }

  /**
   * Get session by Claude session ID
   * @param {string} claudeSessionId - Claude session ID
   * @returns {Promise<Object|null>}
   */
  async getByClaudeSessionId(claudeSessionId) {
    const result = await dataService.get(
      `SELECT * FROM ${this.tableName} WHERE claude_session_id = ?`,
      [claudeSessionId]
    );
    return result;
  }

  /**
   * Update session message count
   * @param {string} id - Session ID
   * @param {number} count - New message count
   * @returns {Promise<Object>}
   */
  async updateMessageCount(id, count) {
    return this.update(id, { message_count: count });
  }

  /**
   * Increment message count
   * @param {string} id - Session ID
   * @param {number} increment - Number to add (default: 1)
   * @returns {Promise<void>}
   */
  async incrementMessageCount(id, increment = 1) {
    await dataService.run(
      `UPDATE ${this.tableName}
       SET message_count = message_count + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [increment, id]
    );
  }

  /**
   * Update session token count
   * @param {string} id - Session ID
   * @param {number} count - New token count
   * @returns {Promise<Object>}
   */
  async updateTokenCount(id, count) {
    return this.update(id, { token_count: count });
  }

  /**
   * Add tokens to session
   * @param {string} id - Session ID
   * @param {number} tokens - Number of tokens to add
   * @returns {Promise<void>}
   */
  async addTokens(id, tokens) {
    await dataService.run(
      `UPDATE ${this.tableName}
       SET token_count = token_count + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [tokens, id]
    );
  }

  /**
   * Update last message in session
   * @param {string} id - Session ID
   * @param {string} lastMessage - Last message content
   * @returns {Promise<Object>}
   */
  async updateLastMessage(id, lastMessage) {
    return this.update(id, { last_message: lastMessage });
  }

  /**
   * Set session importance
   * @param {string} id - Session ID
   * @param {string} importance - Importance level (low, medium, high)
   * @returns {Promise<Object>}
   */
  async setImportance(id, importance) {
    const validImportance = ['low', 'medium', 'high'];
    if (!validImportance.includes(importance)) {
      throw new Error(`Invalid importance level: ${importance}`);
    }
    return this.update(id, { importance });
  }

  /**
   * Get sessions by importance
   * @param {string} importance - Importance level
   * @param {number} [limit] - Maximum number of results
   * @returns {Promise<Array>}
   */
  async getByImportance(importance, limit = 50) {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE importance = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [importance, limit]
    );
    return result;
  }

  /**
   * Get sessions by work type
   * @param {string} workType - Type of work
   * @returns {Promise<Array>}
   */
  async getByWorkType(workType) {
    return this.query('work_type = ? ORDER BY created_at DESC', [workType]);
  }

  /**
   * Get sessions within a date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Array>}
   */
  async getByDateRange(startDate, endDate) {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC`,
      [startDate, endDate]
    );
    return result;
  }

  /**
   * Get recent sessions
   * @param {number} days - Number of days to look back
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>}
   */
  async getRecent(days = 7, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE created_at >= ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [cutoffDate.toISOString(), limit]
    );
    return result;
  }

  /**
   * Get most active sessions (by message count)
   * @param {number} limit - Number of results
   * @returns {Promise<Array>}
   */
  async getMostActive(limit = 10) {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE message_count > 0
       ORDER BY message_count DESC, created_at DESC
       LIMIT ?`,
      [limit]
    );
    return result;
  }

  /**
   * Get sessions that touched specific files
   * @param {string} filePath - File path to search for
   * @returns {Promise<Array>}
   */
  async getByFilesTouched(filePath) {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE files_touched LIKE ?
       ORDER BY created_at DESC`,
      [`%${filePath}%`]
    );
    return result;
  }

  /**
   * Search sessions by title or message content
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>}
   */
  async search(searchTerm) {
    const pattern = `%${searchTerm}%`;
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE title LIKE ? OR first_message LIKE ? OR last_message LIKE ?
       ORDER BY created_at DESC`,
      [pattern, pattern, pattern]
    );
    return result;
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    // Total count
    const totalCount = await this.count();

    // Sessions by importance
    const importanceStats = await dataService.query(
      `SELECT importance, COUNT(*) as count
       FROM ${this.tableName}
       GROUP BY importance
       ORDER BY
         CASE importance
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 3
         END`
    );

    // Sessions by work type
    const workTypeStats = await dataService.query(
      `SELECT work_type, COUNT(*) as count
       FROM ${this.tableName}
       WHERE work_type IS NOT NULL
       GROUP BY work_type
       ORDER BY count DESC`
    );

    // Message stats
    const messageStats = await dataService.get(
      `SELECT
         SUM(message_count) as total_messages,
         AVG(message_count) as avg_messages_per_session,
         MAX(message_count) as max_messages
       FROM ${this.tableName}`
    );

    // Token stats
    const tokenStats = await dataService.get(
      `SELECT
         SUM(token_count) as total_tokens,
         AVG(token_count) as avg_tokens_per_session,
         MAX(token_count) as max_tokens
       FROM ${this.tableName}`
    );

    // Activity over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCount = await this.count(
      'created_at >= ?',
      [thirtyDaysAgo.toISOString()]
    );

    return {
      totalCount,
      importanceStats,
      workTypeStats,
      messageStats,
      tokenStats,
      recentCount
    };
  }

  /**
   * Get memories linked to a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Array of memories
   */
  async getLinkedMemories(sessionId) {
    const result = await dataService.query(
      `SELECT m.*
       FROM memories m
       WHERE m.source_chunk LIKE ?
       ORDER BY m.confidence_score DESC, m.created_at DESC`,
      [`%${sessionId}%`]
    );
    return result;
  }

  /**
   * Get session recalls (memories recalled during this session)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Array of session recalls
   */
  async getSessionRecalls(sessionId) {
    const result = await dataService.query(
      `SELECT sr.*, m.title, m.content, m.type
       FROM session_recalls sr
       LEFT JOIN memories m ON sr.memory_id = m.id
       WHERE sr.session_id = ?
       ORDER BY sr.recalled_at DESC`,
      [sessionId]
    );
    return result;
  }

  /**
   * Link a session to files it touched
   * @param {string} id - Session ID
   * @param {string[]} filePaths - Array of file paths
   * @returns {Promise<Object>}
   */
  async linkFiles(id, filePaths) {
    if (!Array.isArray(filePaths)) {
      throw new Error('filePaths must be an array');
    }

    // Store as JSON string
    const filesJson = JSON.stringify(filePaths);
    return this.update(id, { files_touched: filesJson });
  }

  /**
   * Add a file to session's touched files
   * @param {string} id - Session ID
   * @param {string} filePath - File path to add
   * @returns {Promise<void>}
   */
  async addTouchedFile(id, filePath) {
    const session = await this.getById(id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    let files = [];
    if (session.files_touched) {
      try {
        files = JSON.parse(session.files_touched);
      } catch (e) {
        // If parsing fails, treat as empty array
        files = [];
      }
    }

    // Add file if not already present
    if (!files.includes(filePath)) {
      files.push(filePath);
      await this.update(id, { files_touched: JSON.stringify(files) });
    }
  }

  /**
   * Delete old sessions and related data
   * @param {number} days - Age threshold in days
   * @param {string} [minImportance] - Don't delete sessions with importance >= this level
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanupOld(days = 180, minImportance = 'medium') {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.setDate() - days);

    const importanceLevels = {
      'low': 0,
      'medium': 1,
      'high': 2
    };

    const minLevel = importanceLevels[minImportance] || 1;

    // Build WHERE clause
    let whereClause = 'created_at < ?';
    const params = [cutoffDate.toISOString()];

    if (minLevel > 0) {
      whereClause += ' AND (importance IS NULL';
      if (minLevel > importanceLevels['low']) {
        whereClause += " OR importance = 'low'";
      }
      if (minLevel > importanceLevels['medium']) {
        whereClause += " OR importance = 'medium'";
      }
      whereClause += ')';
    }

    const result = await dataService.run(
      `DELETE FROM ${this.tableName} WHERE ${whereClause}`,
      params
    );

    return result.changes;
  }
}

// Export singleton instance
export const sessionService = new SessionService();
