/**
 * retrievalService.js - Dual retrieval system for memory recall
 * Combines entity-based and semantic search with multi-signal re-ranking
 *
 * Retrieval Modes:
 * - Entity-Based: Find memories mentioning specific entities
 * - Semantic Search: Vector similarity using embeddings
 * - Hybrid: Combine both with deduplication and re-ranking
 */

import { memoryService } from './memoryService.js';
import { entityService } from './entityService.js';
import { embeddingService } from './embeddingService.js';

/**
 * Re-ranking weights for multi-signal scoring
 */
const RANKING_WEIGHTS = {
  vectorSimilarity: 0.60,  // Primary relevance signal
  recency: 0.10,           // Recent memories more relevant
  confidence: 0.15,        // Higher confidence = more reliable
  observationCount: 0.10,  // Frequently observed = important
  typeBoost: 0.05          // Priority types get slight boost
};

/**
 * Query-aware type boosting keywords
 * Maps query patterns to memory types that should be boosted
 */
const TYPE_BOOST_KEYWORDS = {
  'mistake|wrong|error': ['correction', 'gap'],
  'decided|chose|decision': ['decision'],
  'always|usually|prefer': ['commitment', 'pattern_seed'],
  'learned|realized': ['learning', 'insight']
};

/**
 * High-priority memory types that get baseline boost
 */
const HIGH_PRIORITY_TYPES = ['correction', 'decision', 'commitment'];

/**
 * Service for retrieving memories using dual search strategy
 */
class RetrievalService {
  /**
   * Retrieve memories by entity references
   * @param {string[]} entityIds - Array of entity IDs or names
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Memories with entity match scores
   */
  async retrieveByEntities(entityIds, limit = 10) {
    if (!entityIds || entityIds.length === 0) {
      return [];
    }

    const results = [];

    // Search for each entity
    for (const entityId of entityIds) {
      // Find the entity first
      let entity = await entityService.getById(entityId);

      // If not found by ID, try by name
      if (!entity) {
        const entities = await entityService.getByName(entityId);
        entity = entities[0];
      }

      if (!entity) {
        continue;
      }

      // Get occurrences for this entity
      const occurrences = await entityService.getOccurrences(entity.id);

      // Get memories from occurrences
      for (const occurrence of occurrences) {
        const memory = await memoryService.getById(occurrence.memory_id);
        if (memory) {
          results.push({
            ...memory,
            entityMatchScore: 1.0, // Exact entity match
            matchedEntity: entity.name,
            retrievalMethod: 'entity'
          });
        }
      }
    }

    // Sort by confidence and limit
    results.sort((a, b) => b.confidence_score - a.confidence_score);
    return results.slice(0, limit);
  }

  /**
   * Retrieve memories by semantic similarity
   * @param {string} queryText - Query text to search for
   * @param {number} threshold - Minimum similarity threshold (0-1)
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Memories with similarity scores
   */
  async retrieveBySemantic(queryText, threshold = 0.4, limit = 10) {
    if (!queryText || typeof queryText !== 'string') {
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(queryText);

    // Get all memories with embeddings
    const memories = await memoryService.getWithEmbeddings();

    // Calculate similarities
    const results = [];

    for (const memory of memories) {
      // Convert BLOB to embedding
      const memoryEmbedding = embeddingService.blobToEmbedding(memory.embedding);

      // Calculate similarity
      const similarity = embeddingService.cosineSimilarity(queryEmbedding, memoryEmbedding);

      // Filter by threshold
      if (similarity >= threshold) {
        results.push({
          ...memory,
          similarity,
          retrievalMethod: 'semantic'
        });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  /**
   * Dual retrieval: Combine entity and semantic search
   * @param {string} queryText - Query text
   * @param {string[]} entityIds - Optional entity IDs/names
   * @param {Object} options - Retrieval options
   * @returns {Promise<Array>} Top K memories with final scores
   */
  async retrieveDual(queryText, entityIds = [], options = {}) {
    const {
      limit = 10,
      entityThreshold = 0.5,
      semanticThreshold = 0.4,
      includeMetadata = true
    } = options;

    // Run both searches in parallel
    const [entityResults, semanticResults] = await Promise.all([
      entityIds.length > 0 ? this.retrieveByEntities(entityIds, limit * 2) : Promise.resolve([]),
      this.retrieveBySemantic(queryText, semanticThreshold, limit * 2)
    ]);

    // Merge and deduplicate
    const merged = this._mergeResults(entityResults, semanticResults);

    // Generate query embedding for re-ranking
    const queryEmbedding = await embeddingService.generateEmbedding(queryText);

    // Re-rank all results
    const reranked = merged.map(memory => ({
      ...memory,
      finalScore: this.calculateFinalScore(memory, memory.similarity || 0, queryText, queryEmbedding)
    }));

    // Sort by final score and limit
    reranked.sort((a, b) => b.finalScore - a.finalScore);

    return reranked.slice(0, limit);
  }

  /**
   * Merge results from entity and semantic search, deduplicating by ID
   * @param {Array} entityResults - Results from entity search
   * @param {Array} semanticResults - Results from semantic search
   * @returns {Array} Merged and deduplicated results
   * @private
   */
  _mergeResults(entityResults, semanticResults) {
    const memoryMap = new Map();

    // Add entity results
    for (const result of entityResults) {
      memoryMap.set(result.id, {
        ...result,
        retrievalMethod: 'entity'
      });
    }

    // Add or merge semantic results
    for (const result of semanticResults) {
      const existing = memoryMap.get(result.id);

      if (existing) {
        // Memory found in both - mark as hybrid and keep higher score
        memoryMap.set(result.id, {
          ...existing,
          similarity: result.similarity,
          retrievalMethod: 'hybrid',
          entityMatchScore: existing.entityMatchScore || 0
        });
      } else {
        memoryMap.set(result.id, {
          ...result,
          retrievalMethod: 'semantic'
        });
      }
    }

    return Array.from(memoryMap.values());
  }

  /**
   * Calculate final score using multi-signal re-ranking algorithm
   * @param {Object} memory - Memory object
   * @param {number} similarity - Vector similarity score (0-1)
   * @param {string} query - Query text for type boosting
   * @param {Float32Array} queryEmbedding - Query embedding (optional)
   * @returns {number} Final score (0-1)
   */
  calculateFinalScore(memory, similarity, query, queryEmbedding = null) {
    let score = 0;

    // 1. Vector Similarity (60%)
    score += similarity * RANKING_WEIGHTS.vectorSimilarity;

    // 2. Recency (10%) - Exponential decay with 28-day half-life
    const daysSince = (Date.now() - new Date(memory.last_observed_at)) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-daysSince / 28);
    score += recencyScore * RANKING_WEIGHTS.recency;

    // 3. Confidence (15%)
    score += (memory.confidence_score || 0) * RANKING_WEIGHTS.confidence;

    // 4. Observation Count (10%) - Capped at 10
    const obsScore = Math.min((memory.times_observed || 1) / 10, 1);
    score += obsScore * RANKING_WEIGHTS.observationCount;

    // 5. Type Boost (5%) - High-priority types
    if (HIGH_PRIORITY_TYPES.includes(memory.type)) {
      score += RANKING_WEIGHTS.typeBoost;
    }

    // 6. Query-Aware Type Boosting (+15% for matching patterns)
    score = this._applyQueryTypeBoost(score, query, memory.type);

    // 7. Feedback Adjustment (+/- 5% per net vote)
    const netFeedback = (memory.positive_feedback || 0) - (memory.negative_feedback || 0);
    score += netFeedback * 0.05;

    // Clamp to [0, 1]
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Apply query-aware type boosting
   * @param {number} score - Current score
   * @param {string} query - Query text
   * @param {string} memoryType - Memory type
   * @returns {number} Boosted score
   * @private
   */
  _applyQueryTypeBoost(score, query, memoryType) {
    if (!query || !memoryType) {
      return score;
    }

    // Check each keyword pattern
    for (const [pattern, types] of Object.entries(TYPE_BOOST_KEYWORDS)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(query) && types.includes(memoryType)) {
        return score + 0.15;
      }
    }

    return score;
  }

  /**
   * Extract potential entity references from query text
   * Simple implementation - looks for capitalized words and known patterns
   * @param {string} queryText - Query text
   * @returns {Promise<string[]>} Array of potential entity names
   */
  async extractEntitiesFromQuery(queryText) {
    if (!queryText) {
      return [];
    }

    const entities = [];

    // Extract capitalized words (potential names)
    const capitalizedWords = queryText.match(/\b[A-Z][a-z]+\b/g) || [];
    entities.push(...capitalizedWords);

    // Extract quoted strings (potential specific references)
    const quotedStrings = queryText.match(/"([^"]+)"/g) || [];
    entities.push(...quotedStrings.map(s => s.replace(/"/g, '')));

    // Look for project/person indicators
    const projectMatch = queryText.match(/project[\s:]+"?([^"]+)"?/i);
    if (projectMatch) {
      entities.push(projectMatch[1].trim());
    }

    const personMatch = queryText.match(/person[\s:]+"?([^"]+)"?/i);
    if (personMatch) {
      entities.push(personMatch[1].trim());
    }

    // Remove duplicates
    return [...new Set(entities)];
  }

  /**
   * Log a retrieval to session_recalls table (for analytics)
   * @param {string} sessionId - Current session ID
   * @param {string} queryText - Query text
   * @param {Array} results - Retrieved memories with scores
   * @returns {Promise<void>}
   */
  async logRecall(sessionId, queryText, results) {
    // TODO: Implement session_recalls logging when sessions table is created
    // This will track which memories are retrieved for each query
    // Useful for feedback analysis and improving retrieval
    console.log('Recall logged:', {
      sessionId,
      queryText,
      memoryCount: results.length,
      topScores: results.slice(0, 3).map(r => r.finalScore)
    });
  }

  /**
   * Submit feedback for a recalled memory
   * @param {string} memoryId - Memory ID
   * @param {string} sessionId - Session ID
   * @param {string} feedbackType - 'positive' or 'negative'
   * @returns {Promise<void>}
   */
  async submitFeedback(memoryId, sessionId, feedbackType) {
    if (!memoryId || !feedbackType) {
      throw new Error('Memory ID and feedback type are required');
    }

    if (!['positive', 'negative'].includes(feedbackType)) {
      throw new Error('Feedback type must be "positive" or "negative"');
    }

    // Update memory feedback count
    if (feedbackType === 'positive') {
      await memoryService.addPositiveFeedback(memoryId);
    } else {
      await memoryService.addNegativeFeedback(memoryId);
    }

    // TODO: Log to memory_feedback table when created
    console.log('Feedback submitted:', {
      memoryId,
      sessionId,
      feedbackType
    });
  }

  /**
   * Get retrieval statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    // TODO: Implement when session_recalls table exists
    return {
      totalRecalls: 0,
      avgMemoriesPerQuery: 0,
      avgRelevanceScore: 0,
      feedbackRatio: 0
    };
  }
}

// Export singleton instance
export const retrievalService = new RetrievalService();
