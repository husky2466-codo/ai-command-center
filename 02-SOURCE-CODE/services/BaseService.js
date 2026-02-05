/**
 * BaseService - Abstract base class for database services
 * Provides common CRUD operations for all database tables
 */

export class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Get all records from the table
   * @returns {Promise<Array>}
   */
  async getAll() {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
    );
    if (!result.success) {
      throw new Error(`Failed to get all ${this.tableName}: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Get a single record by ID
   * @param {string} id - The record ID
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const result = await window.electronAPI.dbGet(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    if (!result.success) {
      throw new Error(`Failed to get ${this.tableName} by ID: ${result.error}`);
    }
    return result.data || null;
  }

  /**
   * Create a new record
   * @param {Object} data - The record data (without id)
   * @returns {Promise<Object>} The created record
   */
  async create(data) {
    const id = this.generateId();
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?');
    const values = Object.values(data);

    const result = await window.electronAPI.dbRun(
      `INSERT INTO ${this.tableName} (id, ${columns.join(', ')}) VALUES (?, ${placeholders.join(', ')})`,
      [id, ...values]
    );

    if (!result.success) {
      throw new Error(`Failed to create ${this.tableName}: ${result.error}`);
    }

    return this.getById(id);
  }

  /**
   * Update a record by ID
   * @param {string} id - The record ID
   * @param {Object} data - The fields to update
   * @returns {Promise<Object>} The updated record
   */
  async update(id, data) {
    const columns = Object.keys(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const result = await window.electronAPI.dbRun(
      `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    if (!result.success) {
      throw new Error(`Failed to update ${this.tableName}: ${result.error}`);
    }

    return this.getById(id);
  }

  /**
   * Delete a record by ID
   * @param {string} id - The record ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    const result = await window.electronAPI.dbRun(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );

    if (!result.success) {
      throw new Error(`Failed to delete ${this.tableName}: ${result.error}`);
    }
  }

  /**
   * Query records with custom WHERE clause
   * @param {string} whereClause - SQL WHERE clause (without WHERE keyword)
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  async query(whereClause, params = []) {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      params
    );

    if (!result.success) {
      throw new Error(`Failed to query ${this.tableName}: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Count records matching a condition
   * @param {string} whereClause - SQL WHERE clause (without WHERE keyword)
   * @param {Array} params - Query parameters
   * @returns {Promise<number>}
   */
  async count(whereClause = '1=1', params = []) {
    const result = await window.electronAPI.dbGet(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`,
      params
    );

    if (!result.success) {
      throw new Error(`Failed to count ${this.tableName}: ${result.error}`);
    }

    return result.data?.count || 0;
  }

  /**
   * Generate a unique ID (UUID v4)
   * @returns {string}
   */
  generateId() {
    return crypto.randomUUID();
  }
}
