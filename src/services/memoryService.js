/**
 * memoryService.js - Domain service for memories table
 * Provides CRUD operations and specialized queries for memory management
 */

import { BaseService } from './BaseService.js';
import { dataService } from './DataService.js';

/**
 * Service for managing memories extracted from Claude Code sessions
 * Handles all memory-related database operations
 */
class MemoryService extends BaseService {
  constructor() {
    super('memories');
  }

  /**
   * Create a new memory with validation
   * @param {Object} memoryData - Memory data
   * @param {string} memoryData.type - Memory type (correction, decision, etc.)
   * @param {string} memoryData.title - Memory title
   * @param {string} memoryData.content - Memory content
   * @param {string} [memoryData.category] - Optional category
   * @param {string} [memoryData.source_chunk] - Source conversation chunk
   * @param {Buffer} [memoryData.embedding] - Optional embedding BLOB
   * @param {string} [memoryData.related_entities] - JSON string of related entities
   * @param {string} [memoryData.target_agents] - JSON string of target agents
   * @param {number} [memoryData.confidence_score] - Confidence score (0-1)
   * @param {string} [memoryData.reasoning] - AI reasoning for extraction
   * @param {string} [memoryData.evidence] - Evidence from conversation
   * @returns {Promise<Object>} The created memory
   */
  async createMemory(memoryData) {
    // Validate required fields
    if (!memoryData.type || !memoryData.title || !memoryData.content) {
      throw new Error('Memory must have type, title, and content');
    }

    // Validate memory type
    const validTypes = [
      'correction', 'decision', 'commitment', 'insight',
      'learning', 'confidence', 'pattern_seed', 'cross_agent',
      'workflow_note', 'gap'
    ];
    if (!validTypes.includes(memoryData.type)) {
      throw new Error(`Invalid memory type: ${memoryData.type}`);
    }

    // Validate confidence score if provided
    if (memoryData.confidence_score !== undefined) {
      if (memoryData.confidence_score < 0 || memoryData.confidence_score > 1) {
        throw new Error('Confidence score must be between 0 and 1');
      }
    }

    return this.create(memoryData);
  }

  /**
   * Get memories by type
   * @param {string} type - Memory type
   * @param {number} [limit] - Maximum number of results
   * @returns {Promise<Array>}
   */
  async getByType(type, limit = null) {
    let query = 'type = ? ORDER BY confidence_score DESC, created_at DESC';
    const params = [type];

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    return this.query(query, params);
  }

  /**
   * Get memories by category
   * @param {string} category - Memory category
   * @returns {Promise<Array>}
   */
  async getByCategory(category) {
    return this.query('category = ? ORDER BY created_at DESC', [category]);
  }

  /**
   * Get high-confidence memories
   * @param {number} minConfidence - Minimum confidence threshold (0-1)
   * @param {number} [limit] - Maximum number of results
   * @returns {Promise<Array>}
   */
  async getHighConfidence(minConfidence = 0.7, limit = 50) {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE confidence_score >= ?
       ORDER BY confidence_score DESC, created_at DESC
       LIMIT ?`,
      [minConfidence, limit]
    );
    return result;
  }

  /**
   * Get memories within a date range
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Array>}
   */
  async getByDateRange(startDate, endDate) {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE first_observed_at >= ? AND first_observed_at <= ?
       ORDER BY first_observed_at DESC`,
      [startDate, endDate]
    );
    return result;
  }

  /**
   * Get memories by session ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>}
   */
  async getBySession(sessionId) {
    // Parse source_chunk to extract session references
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE source_chunk LIKE ?
       ORDER BY created_at DESC`,
      [`%${sessionId}%`]
    );
    return result;
  }

  /**
   * Search memories by content
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>}
   */
  async search(searchTerm) {
    const pattern = `%${searchTerm}%`;
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE title LIKE ? OR content LIKE ? OR category LIKE ?
       ORDER BY confidence_score DESC, created_at DESC`,
      [pattern, pattern, pattern]
    );
    return result;
  }

  /**
   * Get memories with embeddings
   * @returns {Promise<Array>}
   */
  async getWithEmbeddings() {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE embedding IS NOT NULL
       ORDER BY created_at DESC`
    );
    return result;
  }

  /**
   * Get memories without embeddings
   * @returns {Promise<Array>}
   */
  async getWithoutEmbeddings() {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE embedding IS NULL
       ORDER BY created_at DESC`
    );
    return result;
  }

  /**
   * Update memory embedding
   * @param {string} id - Memory ID
   * @param {Buffer} embedding - Embedding BLOB
   * @returns {Promise<Object>}
   */
  async updateEmbedding(id, embedding) {
    return this.update(id, { embedding });
  }

  /**
   * Increment recall count for a memory
   * @param {string} id - Memory ID
   * @returns {Promise<void>}
   */
  async incrementRecallCount(id) {
    await dataService.run(
      `UPDATE ${this.tableName}
       SET recall_count = recall_count + 1
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * Add positive feedback to a memory
   * @param {string} id - Memory ID
   * @returns {Promise<void>}
   */
  async addPositiveFeedback(id) {
    await dataService.run(
      `UPDATE ${this.tableName}
       SET positive_feedback = positive_feedback + 1
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * Add negative feedback to a memory
   * @param {string} id - Memory ID
   * @returns {Promise<void>}
   */
  async addNegativeFeedback(id) {
    await dataService.run(
      `UPDATE ${this.tableName}
       SET negative_feedback = negative_feedback + 1
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * Increment times_observed for a memory (when similar memory detected)
   * @param {string} id - Memory ID
   * @returns {Promise<void>}
   */
  async incrementTimesObserved(id) {
    await dataService.run(
      `UPDATE ${this.tableName}
       SET times_observed = times_observed + 1,
           last_observed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get memory statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    // Total count
    const totalCount = await this.count();

    // Count by type
    const typeStats = await dataService.query(
      `SELECT type, COUNT(*) as count
       FROM ${this.tableName}
       GROUP BY type
       ORDER BY count DESC`
    );

    // Average confidence by type
    const confidenceStats = await dataService.query(
      `SELECT type, AVG(confidence_score) as avg_confidence
       FROM ${this.tableName}
       GROUP BY type
       ORDER BY avg_confidence DESC`
    );

    // Recall stats
    const recallStats = await dataService.get(
      `SELECT
         SUM(recall_count) as total_recalls,
         AVG(recall_count) as avg_recalls_per_memory,
         MAX(recall_count) as max_recalls
       FROM ${this.tableName}`
    );

    // Feedback stats
    const feedbackStats = await dataService.get(
      `SELECT
         SUM(positive_feedback) as total_positive,
         SUM(negative_feedback) as total_negative
       FROM ${this.tableName}`
    );

    // Embedding coverage
    const embeddingCount = await this.count('embedding IS NOT NULL');
    const embeddingCoverage = totalCount > 0 ? (embeddingCount / totalCount) * 100 : 0;

    return {
      totalCount,
      typeStats,
      confidenceStats,
      recallStats,
      feedbackStats,
      embeddingCoverage: Math.round(embeddingCoverage * 100) / 100
    };
  }

  /**
   * Get most recalled memories
   * @param {number} limit - Number of results
   * @returns {Promise<Array>}
   */
  async getMostRecalled(limit = 10) {
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE recall_count > 0
       ORDER BY recall_count DESC, confidence_score DESC
       LIMIT ?`,
      [limit]
    );
    return result;
  }

  /**
   * Get best-rated memories (by feedback ratio)
   * @param {number} limit - Number of results
   * @param {number} minFeedback - Minimum total feedback to be considered
   * @returns {Promise<Array>}
   */
  async getBestRated(limit = 10, minFeedback = 3) {
    const result = await dataService.query(
      `SELECT *,
        (positive_feedback + negative_feedback) as total_feedback,
        CASE
          WHEN (positive_feedback + negative_feedback) > 0
          THEN CAST(positive_feedback AS REAL) / (positive_feedback + negative_feedback)
          ELSE 0
        END as rating
       FROM ${this.tableName}
       WHERE (positive_feedback + negative_feedback) >= ?
       ORDER BY rating DESC, total_feedback DESC
       LIMIT ?`,
      [minFeedback, limit]
    );
    return result;
  }

  /**
   * Get recent memories
   * @param {number} days - Number of days to look back
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>}
   */
  async getRecent(days = 7, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE first_observed_at >= ?
       ORDER BY first_observed_at DESC
       LIMIT ?`,
      [cutoffDate.toISOString(), limit]
    );
    return result;
  }

  /**
   * Find similar memories by checking for duplicates
   * Used during deduplication process
   * @param {string} title - Memory title
   * @param {string} content - Memory content
   * @param {number} threshold - Similarity threshold for text matching
   * @returns {Promise<Array>}
   */
  async findSimilarByText(title, content) {
    // Simple text-based similarity for now
    // Full embedding similarity will be handled by embeddingService
    const titlePattern = `%${title.substring(0, 50)}%`;
    const contentPattern = `%${content.substring(0, 100)}%`;

    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE (title LIKE ? OR content LIKE ?)
       ORDER BY confidence_score DESC`,
      [titlePattern, contentPattern]
    );
    return result;
  }

  /**
   * Delete old low-confidence memories (cleanup)
   * @param {number} days - Age threshold in days
   * @param {number} maxConfidence - Maximum confidence to delete
   * @returns {Promise<number>} Number of deleted memories
   */
  async cleanupOld(days = 90, maxConfidence = 0.3) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await dataService.run(
      `DELETE FROM ${this.tableName}
       WHERE first_observed_at < ?
       AND confidence_score <= ?
       AND recall_count = 0`,
      [cutoffDate.toISOString(), maxConfidence]
    );

    return result.changes;
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
