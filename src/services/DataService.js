/**
 * DataService - Direct database access layer
 * Provides low-level database operations and utilities
 */

class DataService {
  constructor() {
    this.cache = new Map();
    this.vectorSearchAvailable = null;
  }

  /**
   * Execute a SELECT query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    const result = await window.electronAPI.dbQuery(sql, params);
    if (!result.success) {
      throw new Error(`Query failed: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Execute an INSERT/UPDATE/DELETE statement
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {Promise<Object>} { changes, lastInsertRowid }
   */
  async run(sql, params = []) {
    const result = await window.electronAPI.dbRun(sql, params);
    if (!result.success) {
      throw new Error(`Run failed: ${result.error}`);
    }
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  /**
   * Execute a SELECT query returning a single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>}
   */
  async get(sql, params = []) {
    const result = await window.electronAPI.dbGet(sql, params);
    if (!result.success) {
      throw new Error(`Get failed: ${result.error}`);
    }
    return result.data || null;
  }

  /**
   * Execute multiple operations in a transaction
   * @param {Array<{type: 'run'|'query', sql: string, params: Array}>} operations
   * @returns {Promise<Array>}
   */
  async transaction(operations) {
    const result = await window.electronAPI.dbTransaction(operations);
    if (!result.success) {
      throw new Error(`Transaction failed: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Check database health
   * @returns {Promise<{healthy: boolean, vectorSearchAvailable: boolean}>}
   */
  async checkHealth() {
    const result = await window.electronAPI.dbHealth();
    if (result.success) {
      this.vectorSearchAvailable = result.vectorSearchAvailable;
      return {
        healthy: result.healthy,
        vectorSearchAvailable: result.vectorSearchAvailable
      };
    }
    return { healthy: false, vectorSearchAvailable: false };
  }

  /**
   * Get list of all tables
   * @returns {Promise<Array<string>>}
   */
  async getTables() {
    const result = await window.electronAPI.dbTables();
    if (!result.success) {
      throw new Error(`Failed to get tables: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Get schema for a table
   * @param {string} tableName - Table name
   * @returns {Promise<Array>}
   */
  async getSchema(tableName) {
    const result = await window.electronAPI.dbSchema(tableName);
    if (!result.success) {
      throw new Error(`Failed to get schema for ${tableName}: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Perform vector similarity search
   * @param {string} table - Table name (e.g., 'memories', 'knowledge')
   * @param {Float32Array} embedding - Query embedding vector
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>}
   */
  async vectorSearch(table, embedding, limit = 10) {
    // Check if vector search is available
    if (this.vectorSearchAvailable === null) {
      await this.checkHealth();
    }

    if (!this.vectorSearchAvailable) {
      throw new Error('Vector search is not available (sqlite-vss extension not loaded)');
    }

    const result = await window.electronAPI.dbVectorSearch({ table, embedding, limit });
    if (!result.success) {
      throw new Error(`Vector search failed: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Cache a value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  setCache(key, value, ttl = 5 * 60 * 1000) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Get a cached value
   * @param {string} key - Cache key
   * @returns {*|null}
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Clear cache
   * @param {string} key - Cache key (optional, clears all if not provided)
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Build pagination query
   * @param {string} baseQuery - Base SQL query
   * @param {number} page - Page number (1-indexed)
   * @param {number} pageSize - Items per page
   * @returns {string}
   */
  paginate(baseQuery, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    return `${baseQuery} LIMIT ${pageSize} OFFSET ${offset}`;
  }
}

// Export singleton instance
export const dataService = new DataService();
