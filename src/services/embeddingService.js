/**
 * embeddingService.js - Ollama integration for embedding generation
 * Provides vector embeddings for semantic search
 *
 * NOTE: Wave 3 Implementation - Returns mock embeddings for now
 * Full Ollama integration will be implemented in Wave 4
 */

/**
 * Embedding service configuration
 */
const OLLAMA_CONFIG = {
  baseUrl: 'http://localhost:11434',
  embedUrl: 'http://localhost:11434/api/embed',
  model: 'mxbai-embed-large',
  dimensions: 1024,
  timeout: 30000 // 30 seconds
};

/**
 * Service for generating and managing embeddings
 */
class EmbeddingService {
  constructor() {
    this.ollamaAvailable = null;
    this.lastHealthCheck = null;
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Check if Ollama is running and model is available
   * @returns {Promise<Object>} { available: boolean, model: string, error?: string }
   */
  async checkOllamaStatus() {
    try {
      // Check if we have a recent health check cached
      const now = Date.now();
      if (this.lastHealthCheck && (now - this.lastHealthCheck) < this.healthCheckInterval) {
        return {
          available: this.ollamaAvailable,
          model: OLLAMA_CONFIG.model
        };
      }

      // Try to connect to Ollama
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/tags`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }

      const data = await response.json();
      const hasModel = data.models?.some(m => m.name.includes('mxbai-embed-large'));

      this.ollamaAvailable = hasModel;
      this.lastHealthCheck = now;

      return {
        available: hasModel,
        model: OLLAMA_CONFIG.model,
        error: hasModel ? null : 'Model mxbai-embed-large not found. Run: ollama pull mxbai-embed-large'
      };
    } catch (error) {
      this.ollamaAvailable = false;
      this.lastHealthCheck = Date.now();

      return {
        available: false,
        model: OLLAMA_CONFIG.model,
        error: error.name === 'AbortError'
          ? 'Ollama not responding (timeout)'
          : `Ollama not available: ${error.message}`
      };
    }
  }

  /**
   * Generate embedding for a single text
   * WAVE 4: Full Ollama integration with graceful fallback
   *
   * @param {string} text - Text to embed
   * @returns {Promise<Float32Array>} 1024-dimensional embedding vector
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Check if Ollama is available
    const status = await this.checkOllamaStatus();

    if (!status.available) {
      console.warn('Ollama not available, using mock embeddings:', status.error);
      return this._generateMockEmbedding(text);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OLLAMA_CONFIG.timeout);

      const response = await fetch(OLLAMA_CONFIG.embedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_CONFIG.model,
          input: text
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.status}`);
      }

      const data = await response.json();

      // Ollama returns { embeddings: [[...]] }
      if (!data.embeddings || !data.embeddings[0]) {
        throw new Error('Invalid response format from Ollama');
      }

      // Convert to Float32Array for storage efficiency
      return new Float32Array(data.embeddings[0]);

    } catch (error) {
      console.error('Embedding generation failed, falling back to mock:', error);
      // Graceful fallback to mock embeddings
      return this._generateMockEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts in a batch
   * WAVE 4: Full Ollama integration with progress tracking
   *
   * @param {string[]} texts - Array of texts to embed
   * @param {Function} onProgress - Optional callback for progress updates (current, total)
   * @returns {Promise<Float32Array[]>} Array of 1024-dimensional embeddings
   */
  async generateBatchEmbeddings(texts, onProgress = null) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    // Validate all texts
    if (!texts.every(t => t && typeof t === 'string')) {
      throw new Error('All texts must be non-empty strings');
    }

    // Check if Ollama is available
    const status = await this.checkOllamaStatus();

    if (!status.available) {
      console.warn('Ollama not available, using mock embeddings:', status.error);
      const results = [];
      for (let i = 0; i < texts.length; i++) {
        results.push(await this._generateMockEmbedding(texts[i]));
        if (onProgress) onProgress(i + 1, texts.length);
      }
      return results;
    }

    // Process in chunks of 100 for performance
    const CHUNK_SIZE = 100;
    const results = [];

    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
      const chunk = texts.slice(i, i + CHUNK_SIZE);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_CONFIG.timeout);

        const response = await fetch(OLLAMA_CONFIG.embedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_CONFIG.model,
            input: chunk
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama batch embedding failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.embeddings || !Array.isArray(data.embeddings)) {
          throw new Error('Invalid response format from Ollama');
        }

        // Convert each embedding to Float32Array
        const embeddings = data.embeddings.map(e => new Float32Array(e));
        results.push(...embeddings);

        // Report progress
        if (onProgress) {
          onProgress(Math.min(i + CHUNK_SIZE, texts.length), texts.length);
        }

      } catch (error) {
        console.error(`Batch embedding failed for chunk ${i / CHUNK_SIZE}, falling back to mock:`, error);

        // Fallback to mock embeddings for this chunk
        for (const text of chunk) {
          results.push(await this._generateMockEmbedding(text));
        }

        if (onProgress) {
          onProgress(Math.min(i + CHUNK_SIZE, texts.length), texts.length);
        }
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Float32Array} a - First embedding
   * @param {Float32Array} b - Second embedding
   * @returns {number} Similarity score between -1 and 1
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) {
      throw new Error('Embeddings must be same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    // Handle zero vectors
    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Convert embedding to BLOB for SQLite storage
   * @param {Float32Array} embedding - Embedding vector
   * @returns {Buffer} Binary buffer for SQLite BLOB
   */
  embeddingToBlob(embedding) {
    if (!(embedding instanceof Float32Array)) {
      throw new Error('Embedding must be a Float32Array');
    }

    return Buffer.from(embedding.buffer);
  }

  /**
   * Convert BLOB from SQLite back to embedding
   * @param {Buffer} blob - Binary buffer from SQLite
   * @returns {Float32Array} Embedding vector
   */
  blobToEmbedding(blob) {
    if (!blob || !Buffer.isBuffer(blob)) {
      throw new Error('Blob must be a Buffer');
    }

    // Create Float32Array from buffer
    return new Float32Array(blob.buffer, blob.byteOffset, blob.length / 4);
  }

  /**
   * Find similar embeddings using brute-force cosine similarity
   * NOTE: This is for initial implementation. sqlite-vss will accelerate this in Wave 4.
   *
   * @param {Float32Array} queryEmbedding - Query embedding
   * @param {Array} candidates - Array of {id, embedding: Buffer, ...data}
   * @param {number} threshold - Minimum similarity threshold (0-1)
   * @param {number} limit - Maximum number of results
   * @returns {Array} Sorted results with similarity scores
   */
  findSimilar(queryEmbedding, candidates, threshold = 0.7, limit = 10) {
    if (!(queryEmbedding instanceof Float32Array)) {
      throw new Error('Query embedding must be a Float32Array');
    }

    if (!Array.isArray(candidates)) {
      throw new Error('Candidates must be an array');
    }

    const results = [];

    for (const candidate of candidates) {
      // Convert BLOB to embedding if needed
      const candidateEmbedding = Buffer.isBuffer(candidate.embedding)
        ? this.blobToEmbedding(candidate.embedding)
        : candidate.embedding;

      // Calculate similarity
      const similarity = this.cosineSimilarity(queryEmbedding, candidateEmbedding);

      // Filter by threshold
      if (similarity >= threshold) {
        results.push({
          ...candidate,
          similarity
        });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    return results.slice(0, limit);
  }

  /**
   * WAVE 3 STUB: Generate deterministic mock embedding from text
   * This allows testing the entire pipeline without Ollama
   *
   * @param {string} text - Text to embed
   * @returns {Promise<Float32Array>} Mock 1024-dimensional embedding
   * @private
   */
  async _generateMockEmbedding(text) {
    // Create a simple deterministic hash-based embedding
    // Same text will always produce same embedding
    const embedding = new Float32Array(OLLAMA_CONFIG.dimensions);

    // Use text characteristics to seed the embedding
    const hash = this._simpleHash(text);

    for (let i = 0; i < OLLAMA_CONFIG.dimensions; i++) {
      // Generate pseudo-random values based on text hash and position
      const seed = (hash * (i + 1)) % 1000000;
      embedding[i] = (Math.sin(seed) + Math.cos(seed * 2)) / 2;
    }

    // Normalize to unit length (like real embeddings)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm;
    }

    return embedding;
  }

  /**
   * Simple hash function for deterministic mock embeddings
   * @param {string} str - String to hash
   * @returns {number} Hash value
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get embedding configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {
      ...OLLAMA_CONFIG,
      available: this.ollamaAvailable,
      mode: this.ollamaAvailable ? 'ollama' : 'mock'
    };
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
