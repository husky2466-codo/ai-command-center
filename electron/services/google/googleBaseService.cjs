/**
 * GoogleBaseService - Shared OAuth, token handling, and common utilities
 * Base class for Gmail, Calendar, and Contacts services
 */

const { google } = require('googleapis');
const crypto = require('crypto');
const { loadStoredTokens, refreshTokens, getOAuth2Client } = require('../googleAuth.cjs');

// Use crypto.randomUUID for generating unique IDs
const uuidv4 = () => crypto.randomUUID();

/**
 * Sleep helper for rate limiting
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff helper for API calls
 * @param {Function} apiCall - Function that makes API call
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise} API call result
 */
async function withExponentialBackoff(apiCall, maxRetries = 5) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.code === 429 || error.code === 403) {
        retries++;
        if (retries >= maxRetries) throw error;

        const delay = Math.min(1000 * Math.pow(2, retries), 32000);
        console.log(`[GoogleService] Rate limited, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Convert ISO date to Unix timestamp (milliseconds)
 * @param {string} isoDate - ISO date string
 * @returns {number} Unix timestamp
 */
function isoToTimestamp(isoDate) {
  if (!isoDate) return null;
  return new Date(isoDate).getTime();
}

/**
 * GoogleBaseService - Base class for all Google services
 */
class GoogleBaseService {
  constructor(db, email) {
    this.db = db;
    this.email = email;
    this.oauth2Client = null;
  }

  /**
   * Initialize OAuth2 client
   * @returns {Promise<void>}
   */
  async initialize() {
    // Load tokens for this email
    await loadStoredTokens(this.email);
    this.oauth2Client = getOAuth2Client();

    console.log(`[GoogleService] Base initialized for ${this.email}`);
  }

  /**
   * Refresh access token if expired
   * @returns {Promise<boolean>}
   */
  async ensureValidToken() {
    try {
      const tokenInfo = await this.oauth2Client.getTokenInfo(
        this.oauth2Client.credentials.access_token
      );

      // Token is valid
      return true;
    } catch (error) {
      // Token expired, refresh it
      console.log(`[GoogleService] Token expired for ${this.email}, refreshing...`);
      await refreshTokens(this.email);
      return true;
    }
  }

  /**
   * Update sync state
   * @param {string} accountId - Account ID
   * @param {string} syncType - Type of sync ('gmail', 'calendar', 'contacts')
   * @param {string} historyId - History ID from API
   * @private
   */
  _updateSyncState(accountId, syncType, historyId) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO account_sync_state (account_id, sync_type, last_history_id, last_sync_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(accountId, syncType, historyId, Date.now());
  }

  /**
   * Get sync status for an account
   * @param {string} accountId - Account ID
   * @param {string} syncType - Type of sync ('gmail', 'calendar', 'contacts')
   * @returns {Object|null} Sync state or null if not found
   */
  getSyncState(accountId, syncType) {
    const stmt = this.db.prepare(
      'SELECT * FROM account_sync_state WHERE account_id = ? AND sync_type = ?'
    );
    return stmt.get(accountId, syncType);
  }

  // =========================================================================
  // STATIC ACCOUNT MANAGEMENT METHODS
  // =========================================================================

  /**
   * Add Google account to database
   * @param {Object} db - Database instance
   * @param {string} email - User email
   * @param {Object} oauth2Client - Initialized OAuth2 client
   * @returns {Promise<string>} Account ID
   */
  static async addAccount(db, email, oauth2Client) {
    const accountId = uuidv4();

    try {
      let displayName = email;
      let avatarUrl = null;

      // Try to get user profile for display name (optional - People API may not be enabled)
      try {
        const people = google.people({ version: 'v1', auth: oauth2Client });
        const profile = await people.people.get({
          resourceName: 'people/me',
          personFields: 'names,photos'
        });

        displayName = profile.data.names?.[0]?.displayName || email;
        avatarUrl = profile.data.photos?.[0]?.url || null;
      } catch (profileError) {
        console.warn(`[GoogleService] Could not fetch profile (People API may not be enabled): ${profileError.message}`);
        // Continue with just email as display name
      }

      // Insert into database
      const stmt = db.prepare(`
        INSERT INTO connected_accounts (id, provider, email, display_name, avatar_url, added_at, sync_enabled, scopes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        accountId,
        'google',
        email,
        displayName,
        avatarUrl,
        Date.now(),
        1,
        JSON.stringify(['gmail', 'calendar', 'contacts'])
      );

      console.log(`[GoogleService] Account added: ${email} (${accountId})`);
      return accountId;
    } catch (error) {
      console.error(`[GoogleService] Error adding account:`, error.message);
      throw error;
    }
  }

  /**
   * Remove account from database
   * @param {Object} db - Database instance
   * @param {string} accountId - Account ID to remove
   */
  static async removeAccount(db, accountId) {
    try {
      const stmt = db.prepare('DELETE FROM connected_accounts WHERE id = ?');
      stmt.run(accountId);

      console.log(`[GoogleService] Account removed: ${accountId}`);
    } catch (error) {
      console.error(`[GoogleService] Error removing account:`, error.message);
      throw error;
    }
  }

  /**
   * Get account details
   * @param {Object} db - Database instance
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Account details
   */
  static async getAccount(db, accountId) {
    const stmt = db.prepare('SELECT * FROM connected_accounts WHERE id = ?');
    const account = stmt.get(accountId);

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    return {
      ...account,
      scopes: JSON.parse(account.scopes || '[]')
    };
  }

  /**
   * List all connected Google accounts
   * @param {Object} db - Database instance
   * @returns {Promise<Array>} List of accounts
   */
  static async listAccounts(db) {
    const stmt = db.prepare('SELECT * FROM connected_accounts WHERE provider = ? ORDER BY added_at DESC');
    const accounts = stmt.all('google');

    return accounts.map(account => ({
      ...account,
      scopes: JSON.parse(account.scopes || '[]')
    }));
  }
}

// Export class and utilities
module.exports = {
  GoogleBaseService,
  withExponentialBackoff,
  isoToTimestamp,
  sleep,
  uuidv4
};
