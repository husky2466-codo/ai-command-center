/**
 * Gmail Search Mixin - Adds search methods to GmailService.prototype
 * Handles email search (hybrid local DB + Gmail API), Gmail-style query parsing,
 * and saved search management.
 *
 * Search methods: searchEmails, _parseGmailQuery, _parseSearchDate,
 *                 _parseRelativeTime, _parseSize
 * Saved search methods: saveSearch, getSavedSearches, updateSavedSearch,
 *                       deleteSavedSearch, recordSearchUsage, getRecentSearches
 */

const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const { withExponentialBackoff, parseGmailMessage } = require('./base.cjs');

/**
 * Apply search methods to GmailService prototype
 * @param {Function} GmailService - GmailService class to extend
 */
function applySearchMixin(GmailService) {

  // =========================================================================
  // EMAIL SEARCH
  // =========================================================================

  /**
   * Search emails using Gmail-style query operators
   * Supports hybrid search: local DB first, optionally falling back to Gmail API
   * @param {string} accountId - Account ID
   * @param {string} query - Gmail-style search query (e.g., "from:user@example.com is:unread")
   * @param {Object} options - Search options
   * @param {number} options.limit - Max results (default: 50)
   * @param {number} options.offset - Pagination offset (default: 0)
   * @param {boolean} options.searchGmail - Also search Gmail API for missing results (default: false)
   * @returns {Promise<Object>} { emails, total, source, query, gmailTotal?, gmailError? }
   */
  GmailService.prototype.searchEmails = async function(accountId, query, options = {}) {
    const { limit = 50, offset = 0, searchGmail = false } = options;
    console.log(`[GoogleService] Searching emails for ${this.email}: "${query}"`);
    try {
      const { conditions, params } = this._parseGmailQuery(query);
      let sql = 'SELECT * FROM account_emails WHERE account_id = ?';
      const sqlParams = [accountId];
      if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
        sqlParams.push(...params);
      }
      sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
      sqlParams.push(limit, offset);
      const stmt = this.db.prepare(sql);
      const localResults = stmt.all(...sqlParams);
      let countSql = 'SELECT COUNT(*) as count FROM account_emails WHERE account_id = ?';
      const countParams = [accountId];
      if (conditions.length > 0) {
        countSql += ' AND ' + conditions.join(' AND ');
        countParams.push(...params);
      }
      const countStmt = this.db.prepare(countSql);
      const { count } = countStmt.get(...countParams);
      const result = {
        emails: localResults.map(email => ({ ...email, raw_data: null })),
        total: count,
        source: 'local',
        query: query
      };
      if (searchGmail) {
        await this.ensureValidToken();
        try {
          const gmailResponse = await withExponentialBackoff(async () => {
            return await this.gmail.users.messages.list({
              userId: 'me', q: query, maxResults: limit
            });
          });
          const gmailMessages = gmailResponse.data.messages || [];
          const gmailIds = new Set(gmailMessages.map(m => m.id));
          const localIds = new Set(localResults.map(e => e.id));
          const missingIds = [...gmailIds].filter(id => !localIds.has(id));
          if (missingIds.length > 0) {
            console.log(`[GoogleService] Found ${missingIds.length} emails in Gmail not in local DB`);
            for (const msgId of missingIds.slice(0, 10)) {
              try {
                const fullMessage = await withExponentialBackoff(async () => {
                  return await this.gmail.users.messages.get({
                    userId: 'me', id: msgId, format: 'full'
                  });
                });
                const parsed = parseGmailMessage(fullMessage.data);
                this._upsertEmail(accountId, parsed);
                result.emails.push({ ...parsed, raw_data: null, _syncedFromGmail: true });
              } catch (fetchError) {
                console.warn(`[GoogleService] Failed to fetch message ${msgId}:`, fetchError.message);
              }
            }
            result.gmailTotal = gmailResponse.data.resultSizeEstimate || gmailMessages.length;
            result.source = 'hybrid';
          }
        } catch (gmailError) {
          console.warn(`[GoogleService] Gmail API search failed:`, gmailError.message);
          result.gmailError = gmailError.message;
        }
      }
      console.log(`[GoogleService] Search returned ${result.emails.length} results (${result.source})`);
      return result;
    } catch (error) {
      console.error(`[GoogleService] Search failed:`, error.message);
      throw error;
    }
  };

  // =========================================================================
  // QUERY PARSING
  // =========================================================================

  /**
   * Parse Gmail-style query operators into SQL conditions
   * Supported operators: from:, to:, subject:, has:attachment, is:unread, is:read,
   *   is:starred, after:, before:, older_than:, newer_than:, larger:, smaller:,
   *   label:, filename:, NOT
   * @param {string} query - Gmail-style query string
   * @returns {Object} { conditions: string[], params: any[] }
   * @private
   */
  GmailService.prototype._parseGmailQuery = function(query) {
    const conditions = [];
    const params = [];
    let remainingQuery = query.trim();
    const operators = {
      'from:': (value) => {
        conditions.push('(from_email LIKE ? OR from_name LIKE ?)');
        params.push(`%${value}%`, `%${value}%`);
      },
      'to:': (value) => {
        conditions.push('to_emails LIKE ?');
        params.push(`%${value}%`);
      },
      'subject:': (value) => {
        conditions.push('subject LIKE ?');
        params.push(`%${value}%`);
      },
      'has:attachment': () => { conditions.push('has_attachments = 1'); },
      'is:unread': () => { conditions.push('is_read = 0'); },
      'is:read': () => { conditions.push('is_read = 1'); },
      'is:starred': () => { conditions.push('is_starred = 1'); },
      'after:': (value) => {
        const date = this._parseSearchDate(value);
        if (date) { conditions.push('date >= ?'); params.push(date.getTime()); }
      },
      'before:': (value) => {
        const date = this._parseSearchDate(value);
        if (date) { conditions.push('date <= ?'); params.push(date.getTime()); }
      },
      'older_than:': (value) => {
        const ms = this._parseRelativeTime(value);
        if (ms) { conditions.push('date < ?'); params.push(Date.now() - ms); }
      },
      'newer_than:': (value) => {
        const ms = this._parseRelativeTime(value);
        if (ms) { conditions.push('date > ?'); params.push(Date.now() - ms); }
      },
      'larger:': (value) => {
        const bytes = this._parseSize(value);
        if (bytes) { conditions.push('LENGTH(body_text) > ?'); params.push(bytes); }
      },
      'smaller:': (value) => {
        const bytes = this._parseSize(value);
        if (bytes) { conditions.push('LENGTH(body_text) < ?'); params.push(bytes); }
      },
      'label:': (value) => {
        conditions.push('labels LIKE ?');
        params.push(`%${value.toUpperCase()}%`);
      },
      'filename:': (value) => {
        conditions.push('(has_attachments = 1 AND raw_data LIKE ?)');
        params.push(`%"filename":"${value}%`);
      }
    };
    for (const [op, handler] of Object.entries(operators)) {
      const regex = new RegExp(`${op.replace(':', '\\:')}(\\S+|"[^"]+")`, 'gi');
      let match;
      while ((match = regex.exec(remainingQuery)) !== null) {
        let value = match[1];
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (op.endsWith(':') && value) handler(value);
        else if (!op.endsWith(':')) handler();
        remainingQuery = remainingQuery.replace(match[0], '').trim();
      }
    }
    remainingQuery = remainingQuery.replace(/\bAND\b/gi, ' ').replace(/\bOR\b/gi, ' ');
    const notMatches = remainingQuery.match(/\bNOT\s+(\S+)/gi);
    if (notMatches) {
      for (const notMatch of notMatches) {
        const term = notMatch.replace(/\bNOT\s+/i, '');
        conditions.push('NOT (subject LIKE ? OR snippet LIKE ? OR from_email LIKE ?)');
        params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        remainingQuery = remainingQuery.replace(notMatch, '').trim();
      }
    }
    remainingQuery = remainingQuery.replace(/\s+/g, ' ').trim();
    if (remainingQuery) {
      const searchTerms = remainingQuery.split(' ').filter(t => t.length > 0);
      for (const term of searchTerms) {
        conditions.push('(subject LIKE ? OR snippet LIKE ? OR from_email LIKE ? OR from_name LIKE ? OR body_text LIKE ?)');
        params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
      }
    }
    return { conditions, params };
  };

  /**
   * Parse a date string for search operators (after:, before:)
   * Accepts YYYY/MM/DD or YYYY-MM-DD format
   * @param {string} dateStr - Date string
   * @returns {Date|null} Parsed date or null if invalid
   * @private
   */
  GmailService.prototype._parseSearchDate = function(dateStr) {
    try {
      const normalized = dateStr.replace(/\//g, '-');
      const date = new Date(normalized);
      return isNaN(date.getTime()) ? null : date;
    } catch { return null; }
  };

  /**
   * Parse relative time string for search operators (older_than:, newer_than:)
   * Accepts format: <number><unit> where unit is d(ays), w(eeks), m(onths), y(ears)
   * @param {string} timeStr - Relative time string (e.g., "1d", "2w", "3m", "1y")
   * @returns {number|null} Milliseconds or null if invalid
   * @private
   */
  GmailService.prototype._parseRelativeTime = function(timeStr) {
    const match = timeStr.match(/^(\d+)([dwmy])$/i);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const msPerUnit = {
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000,
      'y': 365 * 24 * 60 * 60 * 1000
    };
    return num * (msPerUnit[unit] || 0);
  };

  /**
   * Parse size string for search operators (larger:, smaller:)
   * Accepts format: <number>[K|M|G] (e.g., "100K", "5M", "1G")
   * @param {string} sizeStr - Size string
   * @returns {number|null} Size in bytes or null if invalid
   * @private
   */
  GmailService.prototype._parseSize = function(sizeStr) {
    const match = sizeStr.match(/^(\d+)([KMG])?$/i);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    const unit = (match[2] || '').toUpperCase();
    const multipliers = { '': 1, 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024 };
    return num * (multipliers[unit] || 1);
  };

  // =========================================================================
  // SAVED SEARCHES
  // =========================================================================

  /**
   * Save a search query for later reuse
   * @param {string} accountId - Account ID
   * @param {string} name - Display name for the saved search
   * @param {string} query - Gmail-style search query
   * @param {boolean} isFavorite - Whether to mark as favorite (default: false)
   * @returns {Promise<Object>} Saved search record
   */
  GmailService.prototype.saveSearch = async function(accountId, name, query, isFavorite = false) {
    const id = uuidv4();
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO saved_searches (id, account_id, name, query, is_favorite, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, accountId, name, query, isFavorite ? 1 : 0, now);
    console.log(`[GoogleService] Saved search created: "${name}" (${id})`);
    return { id, account_id: accountId, name, query, is_favorite: isFavorite, use_count: 0, last_used_at: null, created_at: now };
  };

  /**
   * Get saved searches for an account
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {boolean} options.favoritesOnly - Only return favorites (default: false)
   * @param {number} options.limit - Max results (default: 50)
   * @returns {Promise<Array>} List of saved searches
   */
  GmailService.prototype.getSavedSearches = async function(accountId, options = {}) {
    const { favoritesOnly = false, limit = 50 } = options;
    let sql = 'SELECT * FROM saved_searches WHERE account_id = ?';
    const params = [accountId];
    if (favoritesOnly) sql += ' AND is_favorite = 1';
    sql += ' ORDER BY is_favorite DESC, use_count DESC, last_used_at DESC LIMIT ?';
    params.push(limit);
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  };

  /**
   * Update a saved search
   * @param {string} searchId - Saved search ID
   * @param {Object} updates - Fields to update { name?, query?, is_favorite? }
   * @returns {Promise<Object>} Updated saved search record
   * @throws {Error} If no valid fields to update
   */
  GmailService.prototype.updateSavedSearch = async function(searchId, updates) {
    const allowedFields = ['name', 'query', 'is_favorite'];
    const setClause = [];
    const params = [];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`);
        params.push(field === 'is_favorite' ? (updates[field] ? 1 : 0) : updates[field]);
      }
    }
    if (setClause.length === 0) throw new Error('No valid fields to update');
    params.push(searchId);
    const sql = `UPDATE saved_searches SET ${setClause.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...params);
    const getStmt = this.db.prepare('SELECT * FROM saved_searches WHERE id = ?');
    return getStmt.get(searchId);
  };

  /**
   * Delete a saved search
   * @param {string} searchId - Saved search ID
   * @returns {Promise<boolean>} true if deleted, false if not found
   */
  GmailService.prototype.deleteSavedSearch = async function(searchId) {
    const stmt = this.db.prepare('DELETE FROM saved_searches WHERE id = ?');
    const result = stmt.run(searchId);
    console.log(`[GoogleService] Saved search deleted: ${searchId}`);
    return result.changes > 0;
  };

  /**
   * Record that a saved search was used (increments use_count, updates last_used_at)
   * @param {string} searchId - Saved search ID
   * @returns {Promise<void>}
   */
  GmailService.prototype.recordSearchUsage = async function(searchId) {
    const stmt = this.db.prepare(`
      UPDATE saved_searches SET use_count = use_count + 1, last_used_at = ? WHERE id = ?
    `);
    stmt.run(Date.now(), searchId);
  };

  /**
   * Get recently used saved searches
   * @param {string} accountId - Account ID
   * @param {number} limit - Max results (default: 10)
   * @returns {Promise<Array>} List of recently used saved searches
   */
  GmailService.prototype.getRecentSearches = async function(accountId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM saved_searches
      WHERE account_id = ? AND last_used_at IS NOT NULL
      ORDER BY last_used_at DESC LIMIT ?
    `);
    return stmt.all(accountId, limit);
  };
}

module.exports = { applySearchMixin };
