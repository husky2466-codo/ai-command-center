/**
 * EmailSignatureService - Email signature CRUD operations
 * Instance methods, DB-only operations (no OAuth required)
 */

const crypto = require('crypto');

// Use crypto.randomUUID for generating unique IDs
const uuidv4 = () => crypto.randomUUID();

/**
 * EmailSignatureService - Manages email signatures stored in the database
 */
class EmailSignatureService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all signatures for an account
   * @param {string} accountId - Account ID
   * @returns {Array} List of signatures
   */
  getSignatures(accountId) {
    const stmt = this.db.prepare(`
      SELECT * FROM email_signatures
      WHERE account_id = ?
      ORDER BY is_default DESC, created_at ASC
    `);
    return stmt.all(accountId);
  }

  /**
   * Get a single signature by ID
   * @param {string} signatureId - Signature ID
   * @returns {Object} Signature details
   */
  getSignature(signatureId) {
    const stmt = this.db.prepare('SELECT * FROM email_signatures WHERE id = ?');
    return stmt.get(signatureId);
  }

  /**
   * Create a new signature
   * @param {string} accountId - Account ID
   * @param {Object} data - Signature data
   * @param {string} data.name - Signature name
   * @param {string} data.content - Signature content (HTML)
   * @param {boolean} data.is_default - Whether this is the default signature
   * @param {boolean} data.use_for_new - Auto-insert for new emails
   * @param {boolean} data.use_for_reply - Auto-insert for replies
   * @returns {Object} Created signature
   */
  createSignature(accountId, data) {
    const signatureId = uuidv4();
    const now = Date.now();

    // If this is set as default, unset other defaults for this account
    if (data.is_default) {
      const unsetStmt = this.db.prepare(`
        UPDATE email_signatures SET is_default = 0 WHERE account_id = ?
      `);
      unsetStmt.run(accountId);
    }

    const stmt = this.db.prepare(`
      INSERT INTO email_signatures (
        id, account_id, name, content, is_default, use_for_new, use_for_reply, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      signatureId,
      accountId,
      data.name,
      data.content,
      data.is_default ? 1 : 0,
      data.use_for_new !== false ? 1 : 0,
      data.use_for_reply !== false ? 1 : 0,
      now,
      now
    );

    console.log(`[GoogleService] Signature created: ${data.name} (${signatureId})`);
    return this.getSignature(signatureId);
  }

  /**
   * Update an existing signature
   * @param {string} signatureId - Signature ID
   * @param {Object} data - Updated signature data
   * @returns {Object} Updated signature
   */
  updateSignature(signatureId, data) {
    const existing = this.getSignature(signatureId);
    if (!existing) {
      throw new Error(`Signature not found: ${signatureId}`);
    }

    // If this is being set as default, unset other defaults for this account
    if (data.is_default) {
      const unsetStmt = this.db.prepare(`
        UPDATE email_signatures SET is_default = 0 WHERE account_id = ?
      `);
      unsetStmt.run(existing.account_id);
    }

    const updates = [];
    const params = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      params.push(data.content);
    }
    if (data.is_default !== undefined) {
      updates.push('is_default = ?');
      params.push(data.is_default ? 1 : 0);
    }
    if (data.use_for_new !== undefined) {
      updates.push('use_for_new = ?');
      params.push(data.use_for_new ? 1 : 0);
    }
    if (data.use_for_reply !== undefined) {
      updates.push('use_for_reply = ?');
      params.push(data.use_for_reply ? 1 : 0);
    }

    updates.push('updated_at = ?');
    params.push(Date.now());

    params.push(signatureId);

    const stmt = this.db.prepare(`
      UPDATE email_signatures SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...params);

    console.log(`[GoogleService] Signature updated: ${signatureId}`);
    return this.getSignature(signatureId);
  }

  /**
   * Delete a signature
   * @param {string} signatureId - Signature ID
   */
  deleteSignature(signatureId) {
    const stmt = this.db.prepare('DELETE FROM email_signatures WHERE id = ?');
    stmt.run(signatureId);
    console.log(`[GoogleService] Signature deleted: ${signatureId}`);
  }

  /**
   * Get default signature for an account
   * @param {string} accountId - Account ID
   * @param {string} type - 'new' for new emails or 'reply' for replies
   * @returns {Object|null} Default signature or null
   */
  getDefaultSignature(accountId, type = 'new') {
    const column = type === 'reply' ? 'use_for_reply' : 'use_for_new';

    // First try to get the default signature that's enabled for this type
    let stmt = this.db.prepare(`
      SELECT * FROM email_signatures
      WHERE account_id = ? AND is_default = 1 AND ${column} = 1
      LIMIT 1
    `);
    let signature = stmt.get(accountId);

    // If no default found, try to get any signature enabled for this type
    if (!signature) {
      stmt = this.db.prepare(`
        SELECT * FROM email_signatures
        WHERE account_id = ? AND ${column} = 1
        ORDER BY created_at ASC
        LIMIT 1
      `);
      signature = stmt.get(accountId);
    }

    return signature || null;
  }

  /**
   * Set a signature as default
   * @param {string} accountId - Account ID
   * @param {string} signatureId - Signature ID to set as default
   * @returns {Object} Updated signature
   */
  setDefaultSignature(accountId, signatureId) {
    // Unset all defaults for this account
    const unsetStmt = this.db.prepare(`
      UPDATE email_signatures SET is_default = 0 WHERE account_id = ?
    `);
    unsetStmt.run(accountId);

    // Set the new default
    const setStmt = this.db.prepare(`
      UPDATE email_signatures SET is_default = 1, updated_at = ? WHERE id = ?
    `);
    setStmt.run(Date.now(), signatureId);

    console.log(`[GoogleService] Default signature set: ${signatureId}`);
    return this.getSignature(signatureId);
  }
}

module.exports = EmailSignatureService;
