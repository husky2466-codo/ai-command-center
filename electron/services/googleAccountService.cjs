/**
 * GoogleAccountService - Handles Gmail, Calendar, and Contacts synchronization
 * Integrates with googleapis package and uses OAuth2 from googleAuth.cjs
 */

const { google } = require('googleapis');
const crypto = require('crypto');
const { loadTokens } = require('./tokenStorage.cjs');

// Use crypto.randomUUID for generating unique IDs
const uuidv4 = () => crypto.randomUUID();
const { loadStoredTokens, refreshTokens } = require('./googleAuth.cjs');

/**
 * Parse Gmail message to extract relevant fields
 * @param {Object} message - Raw Gmail message object
 * @returns {Object} Parsed email data
 */
function parseGmailMessage(message) {
  const headers = message.payload?.headers || [];

  const getHeader = (name) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  };

  const parseAddress = (addressString) => {
    if (!addressString) return { email: null, name: null };
    const match = addressString.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() };
    }
    return { email: addressString.trim(), name: null };
  };

  const fromParsed = parseAddress(getHeader('From'));
  const toRaw = getHeader('To') || '';
  const ccRaw = getHeader('Cc') || '';

  // Extract body (text or HTML)
  let bodyText = '';
  let bodyHtml = '';

  const extractBody = (part) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      part.parts.forEach(extractBody);
    }
  };

  if (message.payload) {
    extractBody(message.payload);
  }

  return {
    id: message.id,
    threadId: message.threadId,
    messageId: getHeader('Message-ID'),
    subject: getHeader('Subject'),
    snippet: message.snippet,
    fromEmail: fromParsed.email,
    fromName: fromParsed.name,
    toEmails: toRaw,
    ccEmails: ccRaw,
    date: message.internalDate ? parseInt(message.internalDate) : null,
    bodyText,
    bodyHtml,
    labels: (message.labelIds || []).join(','),
    isRead: !(message.labelIds || []).includes('UNREAD'),
    isStarred: (message.labelIds || []).includes('STARRED'),
    hasAttachments: message.payload?.parts?.some(part => part.filename) ? 1 : 0,
    rawData: JSON.stringify(message)
  };
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
 * Sleep helper for rate limiting
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff helper
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
 * GoogleAccountService - Main service class
 */
class GoogleAccountService {
  constructor(db, email) {
    this.db = db;
    this.email = email;
    this.oauth2Client = null;
    this.gmail = null;
    this.calendar = null;
    this.people = null;
  }

  /**
   * Initialize OAuth2 client and API clients
   */
  async initialize() {
    const { getOAuth2Client } = require('./googleAuth.cjs');

    // Load tokens for this email
    await loadStoredTokens(this.email);
    this.oauth2Client = getOAuth2Client();

    // Initialize API clients
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.people = google.people({ version: 'v1', auth: this.oauth2Client });

    console.log(`[GoogleService] Initialized for ${this.email}`);
  }

  /**
   * Refresh access token if expired
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

  // =========================================================================
  // ACCOUNT MANAGEMENT
  // =========================================================================

  /**
   * Add account to database
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
   * List all connected accounts
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

  // =========================================================================
  // GMAIL SYNC
  // =========================================================================

  /**
   * Sync emails (full or incremental)
   * @param {string} accountId - Account ID
   * @param {Object} options - Sync options
   * @param {boolean} options.full - Force full sync (default: false)
   * @param {number} options.maxResults - Max emails to fetch (default: 100)
   * @returns {Promise<Object>} Sync results
   */
  async syncEmails(accountId, options = {}) {
    await this.ensureValidToken();

    const { full = false, maxResults = 100 } = options;

    console.log(`[GoogleService] Syncing emails for ${this.email} (${full ? 'full' : 'incremental'})`);

    try {
      // Get last sync state
      const syncState = this.db.prepare(
        'SELECT last_history_id FROM account_sync_state WHERE account_id = ? AND sync_type = ?'
      ).get(accountId, 'gmail');

      const lastHistoryId = syncState?.last_history_id;

      if (!full && lastHistoryId) {
        // Incremental sync using history API
        return await this._incrementalEmailSync(accountId, lastHistoryId);
      } else {
        // Full sync
        return await this._fullEmailSync(accountId, maxResults);
      }
    } catch (error) {
      console.error(`[GoogleService] Email sync failed:`, error.message);
      throw error;
    }
  }

  /**
   * Full email sync
   * @private
   */
  async _fullEmailSync(accountId, maxResults) {
    let totalSynced = 0;
    let pageToken = null;

    do {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.list({
          userId: 'me',
          maxResults: Math.min(maxResults - totalSynced, 100),
          pageToken
        });
      });

      const messages = response.data.messages || [];

      for (const msg of messages) {
        // Fetch full message details
        const fullMessage = await withExponentialBackoff(async () => {
          return await this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
          });
        });

        const parsed = parseGmailMessage(fullMessage.data);

        // Insert into database
        this._upsertEmail(accountId, parsed);
        totalSynced++;

        if (totalSynced % 10 === 0) {
          console.log(`[GoogleService] Synced ${totalSynced} emails...`);
        }
      }

      pageToken = response.data.nextPageToken;

      if (totalSynced >= maxResults) break;

    } while (pageToken);

    // Update sync state with current historyId
    const profile = await this.gmail.users.getProfile({ userId: 'me' });
    this._updateSyncState(accountId, 'gmail', profile.data.historyId);

    console.log(`[GoogleService] Full sync complete: ${totalSynced} emails`);
    return { synced: totalSynced, type: 'full' };
  }

  /**
   * Incremental email sync using history API
   * @private
   */
  async _incrementalEmailSync(accountId, startHistoryId) {
    let changedCount = 0;

    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId
      });
    });

    const history = response.data.history || [];

    for (const record of history) {
      // Process added messages
      if (record.messagesAdded) {
        for (const added of record.messagesAdded) {
          const fullMessage = await withExponentialBackoff(async () => {
            return await this.gmail.users.messages.get({
              userId: 'me',
              id: added.message.id,
              format: 'full'
            });
          });

          const parsed = parseGmailMessage(fullMessage.data);
          this._upsertEmail(accountId, parsed);
          changedCount++;
        }
      }

      // Process deleted messages
      if (record.messagesDeleted) {
        for (const deleted of record.messagesDeleted) {
          this._deleteEmail(deleted.message.id);
          changedCount++;
        }
      }

      // Process label changes (for read/starred status)
      if (record.labelsAdded || record.labelsRemoved) {
        for (const labelChange of [...(record.labelsAdded || []), ...(record.labelsRemoved || [])]) {
          const fullMessage = await withExponentialBackoff(async () => {
            return await this.gmail.users.messages.get({
              userId: 'me',
              id: labelChange.message.id,
              format: 'metadata'
            });
          });

          const parsed = parseGmailMessage(fullMessage.data);
          this._updateEmailLabels(parsed.id, parsed.labels, parsed.isRead, parsed.isStarred);
          changedCount++;
        }
      }
    }

    // Update sync state
    if (response.data.historyId) {
      this._updateSyncState(accountId, 'gmail', response.data.historyId);
    }

    console.log(`[GoogleService] Incremental sync complete: ${changedCount} changes`);
    return { synced: changedCount, type: 'incremental' };
  }

  /**
   * Upsert email into database
   * @private
   */
  _upsertEmail(accountId, emailData) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO account_emails (
        id, account_id, thread_id, message_id, subject, snippet,
        from_email, from_name, to_emails, cc_emails, date,
        body_text, body_html, labels, is_read, is_starred, has_attachments,
        raw_data, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Serialize arrays/objects to JSON strings for SQLite
    const toEmailsStr = Array.isArray(emailData.toEmails) ? JSON.stringify(emailData.toEmails) : (emailData.toEmails || null);
    const ccEmailsStr = Array.isArray(emailData.ccEmails) ? JSON.stringify(emailData.ccEmails) : (emailData.ccEmails || null);
    const labelsStr = Array.isArray(emailData.labels) ? JSON.stringify(emailData.labels) : (emailData.labels || null);
    const rawDataStr = typeof emailData.rawData === 'object' ? JSON.stringify(emailData.rawData) : (emailData.rawData || null);

    stmt.run(
      emailData.id,
      accountId,
      emailData.threadId,
      emailData.messageId,
      emailData.subject,
      emailData.snippet,
      emailData.fromEmail,
      emailData.fromName,
      toEmailsStr,
      ccEmailsStr,
      emailData.date,
      emailData.bodyText,
      emailData.bodyHtml,
      labelsStr,
      emailData.isRead ? 1 : 0,
      emailData.isStarred ? 1 : 0,
      emailData.hasAttachments ? 1 : 0,
      rawDataStr,
      Date.now()
    );
  }

  /**
   * Update email labels
   * @private
   */
  _updateEmailLabels(emailId, labels, isRead, isStarred) {
    const stmt = this.db.prepare(`
      UPDATE account_emails
      SET labels = ?, is_read = ?, is_starred = ?, synced_at = ?
      WHERE id = ?
    `);

    // Serialize labels array to JSON string for SQLite
    const labelsStr = Array.isArray(labels) ? JSON.stringify(labels) : (labels || null);
    stmt.run(labelsStr, isRead ? 1 : 0, isStarred ? 1 : 0, Date.now(), emailId);
  }

  /**
   * Delete email from database
   * @private
   */
  _deleteEmail(emailId) {
    const stmt = this.db.prepare('DELETE FROM account_emails WHERE id = ?');
    stmt.run(emailId);
  }

  /**
   * Update sync state
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
   * Get emails from local database
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Max results (default: 50)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {string} options.labels - Filter by labels (comma-separated)
   * @param {boolean} options.unreadOnly - Show unread only (default: false)
   * @returns {Promise<Array>} List of emails
   */
  async getEmails(accountId, options = {}) {
    const { limit = 50, offset = 0, labels = null, folder = null, unreadOnly = false, maxResults = null } = options;

    // Map folder names to Gmail labels
    const folderToLabel = {
      inbox: 'INBOX',
      sent: 'SENT',
      starred: 'STARRED',
      trash: 'TRASH',
      drafts: 'DRAFT',
      spam: 'SPAM',
      important: 'IMPORTANT'
    };

    let query = 'SELECT * FROM account_emails WHERE account_id = ?';
    const params = [accountId];

    // Handle folder or labels parameter
    const lowerFolder = folder?.toLowerCase();

    // Special handling for starred - use is_starred column for reliability
    if (lowerFolder === 'starred') {
      query += ' AND is_starred = 1';
    } else {
      const labelFilter = folder ? folderToLabel[lowerFolder] : labels;
      if (labelFilter) {
        query += ' AND labels LIKE ?';
        params.push(`%${labelFilter}%`);
      }
    }

    if (unreadOnly) {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(maxResults || limit, offset);

    const stmt = this.db.prepare(query);
    const emails = stmt.all(...params);

    return emails.map(email => ({
      ...email,
      raw_data: null // Don't return full raw data for list
    }));
  }

  /**
   * Get single email with full body
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @returns {Promise<Object>} Email details
   */
  async getEmail(accountId, emailId) {
    const stmt = this.db.prepare('SELECT * FROM account_emails WHERE account_id = ? AND id = ?');
    const email = stmt.get(accountId, emailId);

    if (!email) {
      throw new Error(`Email not found: ${emailId}`);
    }

    return {
      ...email,
      raw_data: JSON.parse(email.raw_data)
    };
  }

  /**
   * Send email via Gmail API
   * @param {string} accountId - Account ID
   * @param {Object} message - Email message
   * @param {string} message.to - Recipient email
   * @param {string} message.subject - Email subject
   * @param {string} message.body - Email body (text)
   * @param {string} message.html - Email body (HTML, optional)
   * @param {Array} message.attachments - Optional attachments array
   * @param {string} message.attachments[].filename - Attachment filename
   * @param {string} message.attachments[].mimeType - MIME type
   * @param {string} message.attachments[].content - Base64 encoded content
   * @returns {Promise<Object>} Sent message details
   */
  async sendEmail(accountId, message) {
    await this.ensureValidToken();

    const { to, subject, body, html, attachments = [] } = message;

    let rawMessage;

    if (attachments.length === 0) {
      // Simple text email without attachments
      const messageParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ];
      rawMessage = messageParts.join('\n');
    } else {
      // Multipart message with attachments
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const headerParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        body
      ];

      // Add each attachment
      const attachmentParts = [];
      for (const attachment of attachments) {
        attachmentParts.push(`--${boundary}`);
        attachmentParts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
        attachmentParts.push('Content-Transfer-Encoding: base64');
        attachmentParts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        attachmentParts.push('');
        // Content is already base64 encoded, just add it with proper line breaks
        // Gmail expects base64 content with line breaks every 76 characters
        const base64Content = attachment.content.replace(/(.{76})/g, '$1\n');
        attachmentParts.push(base64Content);
      }

      // Close the multipart message
      attachmentParts.push(`--${boundary}--`);

      rawMessage = [...headerParts, ...attachmentParts].join('\n');
    }

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });
    });

    console.log(`[GoogleService] Email sent: ${response.data.id}${attachments.length > 0 ? ` with ${attachments.length} attachment(s)` : ''}`);
    return response.data;
  }

  /**
   * Move email to trash
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID to trash
   * @returns {Promise<Object>} Success response
   */
  async trashEmail(accountId, emailId) {
    await this.ensureValidToken();

    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.trash({
        userId: 'me',
        id: emailId
      });
    });

    // Update local database labels to include TRASH
    const email = await this.getEmail(accountId, emailId);
    const labels = email.labels ? JSON.parse(email.labels) : [];
    if (!labels.includes('TRASH')) {
      labels.push('TRASH');
    }
    this._updateEmailLabels(emailId, labels, email.is_read, email.is_starred);

    console.log(`[GoogleService] Email trashed: ${emailId}`);
    return { success: true };
  }

  /**
   * Permanently delete email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID to delete
   * @returns {Promise<Object>} Success response
   */
  async deleteEmail(accountId, emailId) {
    await this.ensureValidToken();

    await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.delete({
        userId: 'me',
        id: emailId
      });
    });

    // Remove from local database
    this._deleteEmail(emailId);

    console.log(`[GoogleService] Email deleted: ${emailId}`);
    return { success: true };
  }

  /**
   * Mark email as read or unread
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @param {boolean} isRead - True to mark as read, false for unread
   * @returns {Promise<Object>} Success response
   */
  async markAsRead(accountId, emailId, isRead) {
    await this.ensureValidToken();

    const modifyRequest = isRead
      ? { removeLabelIds: ['UNREAD'] }
      : { addLabelIds: ['UNREAD'] };

    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: modifyRequest
      });
    });

    // Update local database
    const email = await this.getEmail(accountId, emailId);
    this._updateEmailLabels(emailId, email.labels, isRead, email.is_starred);

    console.log(`[GoogleService] Email marked as ${isRead ? 'read' : 'unread'}: ${emailId}`);
    return { success: true };
  }

  /**
   * Toggle star status on email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @param {boolean} isStarred - True to star, false to unstar
   * @returns {Promise<Object>} Success response
   */
  async toggleStar(accountId, emailId, isStarred) {
    await this.ensureValidToken();

    const modifyRequest = isStarred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] };

    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: modifyRequest
      });
    });

    // Update local database
    const email = await this.getEmail(accountId, emailId);
    this._updateEmailLabels(emailId, email.labels, email.is_read, isStarred);

    console.log(`[GoogleService] Email ${isStarred ? 'starred' : 'unstarred'}: ${emailId}`);
    return { success: true };
  }

  /**
   * Reply to an email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID to reply to
   * @param {Object} message - Reply message
   * @param {string} message.body - Reply body text
   * @param {string} message.html - Reply body HTML (optional)
   * @returns {Promise<Object>} Sent message details
   */
  async replyToEmail(accountId, emailId, message) {
    await this.ensureValidToken();

    // Get original email for threading
    const originalEmail = await this.getEmail(accountId, emailId);
    const rawData = JSON.parse(originalEmail.raw_data);

    const originalMessageId = rawData.payload?.headers?.find(
      h => h.name.toLowerCase() === 'message-id'
    )?.value;

    const originalReferences = rawData.payload?.headers?.find(
      h => h.name.toLowerCase() === 'references'
    )?.value || '';

    // Build references header (chain of message IDs)
    const references = originalReferences
      ? `${originalReferences} ${originalMessageId}`
      : originalMessageId;

    // Create MIME reply message
    const messageParts = [
      `To: ${originalEmail.from_email}`,
      `Subject: Re: ${originalEmail.subject}`,
      `In-Reply-To: ${originalMessageId}`,
      `References: ${references}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      message.body
    ];

    const rawMessage = messageParts.join('\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: originalEmail.thread_id
        }
      });
    });

    console.log(`[GoogleService] Reply sent: ${response.data.id}`);
    return response.data;
  }

  // =========================================================================
  // BATCH EMAIL OPERATIONS
  // =========================================================================

  /**
   * Batch modify emails (add/remove labels, mark read/unread)
   * @param {string} accountId - Account ID
   * @param {Array<string>} emailIds - Array of email IDs to modify
   * @param {Object} modifications - Modifications to apply
   * @param {Array<string>} modifications.addLabels - Labels to add
   * @param {Array<string>} modifications.removeLabels - Labels to remove
   * @param {boolean} modifications.markRead - Mark as read
   * @param {boolean} modifications.markUnread - Mark as unread
   * @param {boolean} modifications.star - Add star
   * @param {boolean} modifications.unstar - Remove star
   * @returns {Promise<Object>} Result with modified count
   */
  async batchModifyEmails(accountId, emailIds, modifications) {
    await this.ensureValidToken();

    if (!emailIds || emailIds.length === 0) {
      return { success: true, modified: 0 };
    }

    console.log(`[GoogleService] Batch modifying ${emailIds.length} emails`);

    const { addLabels = [], removeLabels = [], markRead, markUnread, star, unstar } = modifications;

    // Build label modification arrays
    const addLabelIds = [...addLabels];
    const removeLabelIds = [...removeLabels];

    if (markRead) {
      removeLabelIds.push('UNREAD');
    }
    if (markUnread) {
      addLabelIds.push('UNREAD');
    }
    if (star) {
      addLabelIds.push('STARRED');
    }
    if (unstar) {
      removeLabelIds.push('STARRED');
    }

    // Use Gmail batch modify API if available, otherwise process individually
    let modifiedCount = 0;
    const batchSize = 100; // Gmail API limit for batchModify

    // Process in batches
    for (let i = 0; i < emailIds.length; i += batchSize) {
      const batch = emailIds.slice(i, i + batchSize);

      try {
        // Gmail's batchModify endpoint
        await withExponentialBackoff(async () => {
          return await this.gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
              ids: batch,
              addLabelIds: addLabelIds.length > 0 ? addLabelIds : undefined,
              removeLabelIds: removeLabelIds.length > 0 ? removeLabelIds : undefined
            }
          });
        });

        modifiedCount += batch.length;

        // Update local database for each email
        for (const emailId of batch) {
          try {
            const email = this.db.prepare('SELECT * FROM account_emails WHERE id = ?').get(emailId);
            if (email) {
              let labels = email.labels ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : [];

              // Add labels
              for (const label of addLabelIds) {
                if (!labels.includes(label)) {
                  labels.push(label);
                }
              }

              // Remove labels
              labels = labels.filter(l => !removeLabelIds.includes(l));

              const isRead = !labels.includes('UNREAD');
              const isStarred = labels.includes('STARRED');

              this._updateEmailLabels(emailId, labels, isRead, isStarred);
            }
          } catch (dbError) {
            console.warn(`[GoogleService] Failed to update local DB for email ${emailId}:`, dbError.message);
          }
        }
      } catch (error) {
        console.error(`[GoogleService] Batch modify failed for batch starting at ${i}:`, error.message);
        // Continue with remaining batches
      }
    }

    console.log(`[GoogleService] Batch modify complete: ${modifiedCount} emails modified`);
    return { success: true, modified: modifiedCount };
  }

  /**
   * Batch trash emails
   * @param {string} accountId - Account ID
   * @param {Array<string>} emailIds - Array of email IDs to trash
   * @returns {Promise<Object>} Result with trashed count
   */
  async batchTrashEmails(accountId, emailIds) {
    await this.ensureValidToken();

    if (!emailIds || emailIds.length === 0) {
      return { success: true, trashed: 0 };
    }

    console.log(`[GoogleService] Batch trashing ${emailIds.length} emails`);

    let trashedCount = 0;

    // Process in parallel with concurrency limit
    const concurrency = 5;
    const results = [];

    for (let i = 0; i < emailIds.length; i += concurrency) {
      const batch = emailIds.slice(i, i + concurrency);
      const promises = batch.map(async (emailId) => {
        try {
          await withExponentialBackoff(async () => {
            return await this.gmail.users.messages.trash({
              userId: 'me',
              id: emailId
            });
          });

          // Update local database
          try {
            const email = this.db.prepare('SELECT labels, is_read, is_starred FROM account_emails WHERE id = ?').get(emailId);
            if (email) {
              let labels = email.labels ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : [];
              if (!labels.includes('TRASH')) {
                labels.push('TRASH');
              }
              this._updateEmailLabels(emailId, labels, email.is_read, email.is_starred);
            }
          } catch (dbError) {
            console.warn(`[GoogleService] Failed to update local DB for trashed email ${emailId}:`, dbError.message);
          }

          return { success: true, emailId };
        } catch (error) {
          console.error(`[GoogleService] Failed to trash email ${emailId}:`, error.message);
          return { success: false, emailId, error: error.message };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      trashedCount += batchResults.filter(r => r.success).length;
    }

    console.log(`[GoogleService] Batch trash complete: ${trashedCount} emails trashed`);
    return { success: true, trashed: trashedCount, results };
  }

  /**
   * Batch permanently delete emails
   * @param {string} accountId - Account ID
   * @param {Array<string>} emailIds - Array of email IDs to delete
   * @returns {Promise<Object>} Result with deleted count
   */
  async batchDeleteEmails(accountId, emailIds) {
    await this.ensureValidToken();

    if (!emailIds || emailIds.length === 0) {
      return { success: true, deleted: 0 };
    }

    console.log(`[GoogleService] Batch deleting ${emailIds.length} emails (permanent)`);

    let deletedCount = 0;

    // Process in parallel with concurrency limit
    const concurrency = 5;
    const results = [];

    for (let i = 0; i < emailIds.length; i += concurrency) {
      const batch = emailIds.slice(i, i + concurrency);
      const promises = batch.map(async (emailId) => {
        try {
          await withExponentialBackoff(async () => {
            return await this.gmail.users.messages.delete({
              userId: 'me',
              id: emailId
            });
          });

          // Remove from local database
          this._deleteEmail(emailId);

          return { success: true, emailId };
        } catch (error) {
          console.error(`[GoogleService] Failed to delete email ${emailId}:`, error.message);
          return { success: false, emailId, error: error.message };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      deletedCount += batchResults.filter(r => r.success).length;
    }

    console.log(`[GoogleService] Batch delete complete: ${deletedCount} emails permanently deleted`);
    return { success: true, deleted: deletedCount, results };
  }

  /**
   * Forward an email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID to forward
   * @param {Object} message - Forward message
   * @param {string} message.to - Recipient email
   * @param {string} message.body - Optional message to prepend
   * @returns {Promise<Object>} Sent message details
   */
  async forwardEmail(accountId, emailId, message) {
    await this.ensureValidToken();

    // Get original email content
    const originalEmail = await this.getEmail(accountId, emailId);

    // Build forward body with quoted original
    const forwardedContent = [
      message.body || '',
      '',
      '---------- Forwarded message ---------',
      `From: ${originalEmail.from_name || originalEmail.from_email} <${originalEmail.from_email}>`,
      `Date: ${new Date(originalEmail.date).toLocaleString()}`,
      `Subject: ${originalEmail.subject}`,
      `To: ${originalEmail.to_emails}`,
      '',
      originalEmail.body_text || originalEmail.snippet
    ].join('\n');

    // Create MIME forward message
    const messageParts = [
      `To: ${message.to}`,
      `Subject: Fwd: ${originalEmail.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      forwardedContent
    ];

    const rawMessage = messageParts.join('\n');
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });
    });

    console.log(`[GoogleService] Email forwarded: ${response.data.id}`);
    return response.data;
  }

  // =========================================================================
  // CALENDAR SYNC
  // =========================================================================

  /**
   * Sync calendar events
   * @param {string} accountId - Account ID
   * @param {Object} options - Sync options
   * @param {string} options.calendarId - Calendar ID (default: 'primary')
   * @param {number} options.maxResults - Max events to fetch (default: 250)
   * @param {string} options.timeMin - Start time (ISO string, default: 6 months ago)
   * @param {string} options.timeMax - End time (ISO string, default: 1 year from now)
   * @returns {Promise<Object>} Sync results
   */
  async syncCalendar(accountId, options = {}) {
    await this.ensureValidToken();

    const {
      calendarId = 'primary',
      maxResults = 250,
      timeMin = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
      timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
    } = options;

    console.log(`[GoogleService] Syncing calendar for ${this.email} (${timeMin} to ${timeMax})`);

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime'
        });
      });

      const events = response.data.items || [];
      let syncedCount = 0;

      for (const event of events) {
        this._upsertCalendarEvent(accountId, calendarId, event);
        syncedCount++;
      }

      console.log(`[GoogleService] Calendar sync complete: ${syncedCount} events`);
      return { synced: syncedCount };
    } catch (error) {
      console.error(`[GoogleService] Calendar sync failed:`, error.message);
      throw error;
    }
  }

  /**
   * Upsert calendar event into database
   * @private
   */
  _upsertCalendarEvent(accountId, calendarId, event) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO account_calendar_events (
        id, account_id, calendar_id, summary, description, location,
        start_time, end_time, all_day, status, attendees, organizer_email,
        recurrence, reminders, raw_data, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const startTime = isoToTimestamp(event.start?.dateTime || event.start?.date);
    const endTime = isoToTimestamp(event.end?.dateTime || event.end?.date);
    const allDay = !event.start?.dateTime; // If no dateTime, it's all-day

    stmt.run(
      event.id,
      accountId,
      calendarId,
      event.summary,
      event.description,
      event.location,
      startTime,
      endTime,
      allDay ? 1 : 0,
      event.status,
      JSON.stringify(event.attendees || []),
      event.organizer?.email,
      JSON.stringify(event.recurrence || []),
      JSON.stringify(event.reminders || {}),
      JSON.stringify(event),
      Date.now()
    );
  }

  /**
   * Get calendar events from local database OR fetch from Google Calendar
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {string} options.timeMin - Start time (ISO string) - for live fetch
   * @param {string} options.timeMax - End time (ISO string) - for live fetch
   * @param {number} options.startTime - Start time (Unix timestamp) - for DB query
   * @param {number} options.endTime - End time (Unix timestamp) - for DB query
   * @param {number} options.limit - Max results (default: 100)
   * @param {number} options.maxResults - Max results (alias for Google API)
   * @param {boolean} options.useLiveData - Fetch from Google instead of DB (default: true)
   * @returns {Promise<Array>} List of events
   */
  async getEvents(accountId, options = {}) {
    // Support both DB query (startTime/endTime timestamps) and Google API (timeMin/timeMax ISO strings)
    const {
      timeMin,
      timeMax,
      startTime,
      endTime,
      limit = 100,
      maxResults = 250,
      useLiveData = true
    } = options;

    // If timeMin/timeMax provided (ISO strings), fetch live from Google Calendar
    if (useLiveData && (timeMin || timeMax)) {
      console.log(`[GoogleService] Fetching live calendar events for ${this.email}`);
      await this.ensureValidToken();

      try {
        const response = await withExponentialBackoff(async () => {
          return await this.calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax,
            maxResults: maxResults || limit,
            singleEvents: true,
            orderBy: 'startTime'
          });
        });

        const events = response.data.items || [];
        console.log(`[GoogleService] Fetched ${events.length} live calendar events`);

        // Transform events to match frontend expectations
        return events.map(event => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start, // Keep original structure { dateTime, date, timeZone }
          end: event.end,
          status: event.status,
          attendees: event.attendees || [],
          organizer: event.organizer,
          htmlLink: event.htmlLink,
          hangoutLink: event.hangoutLink,
          created: event.created,
          updated: event.updated,
          recurringEventId: event.recurringEventId,
          recurrence: event.recurrence
        }));
      } catch (error) {
        console.error(`[GoogleService] Failed to fetch live calendar events:`, error.message);
        // Fall back to DB query
        console.log(`[GoogleService] Falling back to local DB`);
      }
    }

    // Fall back to local database query
    const queryStartTime = startTime || (timeMin ? new Date(timeMin).getTime() : Date.now());
    const queryEndTime = endTime || (timeMax ? new Date(timeMax).getTime() : null);

    let query = 'SELECT * FROM account_calendar_events WHERE account_id = ? AND start_time >= ?';
    const params = [accountId, queryStartTime];

    if (queryEndTime) {
      query += ' AND start_time <= ?';
      params.push(queryEndTime);
    }

    query += ' ORDER BY start_time ASC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const events = stmt.all(...params);

    console.log(`[GoogleService] Retrieved ${events.length} events from local DB`);

    // Transform DB events to match Google Calendar API format
    return events.map(event => {
      const rawData = event.raw_data ? JSON.parse(event.raw_data) : null;
      return {
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: rawData?.start || {
          dateTime: event.all_day ? null : new Date(event.start_time).toISOString(),
          date: event.all_day ? new Date(event.start_time).toISOString().split('T')[0] : null
        },
        end: rawData?.end || {
          dateTime: event.all_day ? null : new Date(event.end_time).toISOString(),
          date: event.all_day ? new Date(event.end_time).toISOString().split('T')[0] : null
        },
        status: event.status,
        attendees: JSON.parse(event.attendees || '[]'),
        organizer: rawData?.organizer || { email: event.organizer_email },
        htmlLink: rawData?.htmlLink,
        hangoutLink: rawData?.hangoutLink,
        created: rawData?.created,
        updated: rawData?.updated,
        recurringEventId: rawData?.recurringEventId,
        recurrence: JSON.parse(event.recurrence || '[]')
      };
    });
  }

  /**
   * Create calendar event
   * @param {string} accountId - Account ID
   * @param {Object} event - Event details
   * @returns {Promise<Object>} Created event
   */
  async createEvent(accountId, event) {
    await this.ensureValidToken();

    const response = await withExponentialBackoff(async () => {
      return await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });
    });

    // Save to local DB
    this._upsertCalendarEvent(accountId, 'primary', response.data);

    console.log(`[GoogleService] Event created: ${response.data.id}`);
    return response.data;
  }

  /**
   * Update calendar event
   * @param {string} accountId - Account ID
   * @param {string} eventId - Event ID
   * @param {Object} updates - Event updates
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(accountId, eventId, updates) {
    await this.ensureValidToken();

    const response = await withExponentialBackoff(async () => {
      return await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: updates
      });
    });

    // Update local DB
    this._upsertCalendarEvent(accountId, 'primary', response.data);

    console.log(`[GoogleService] Event updated: ${eventId}`);
    return response.data;
  }

  /**
   * Delete calendar event
   * @param {string} accountId - Account ID
   * @param {string} eventId - Event ID
   * @returns {Promise<void>}
   */
  async deleteEvent(accountId, eventId) {
    await this.ensureValidToken();

    await withExponentialBackoff(async () => {
      return await this.calendar.events.delete({
        calendarId: 'primary',
        eventId
      });
    });

    // Delete from local DB
    const stmt = this.db.prepare('DELETE FROM account_calendar_events WHERE id = ?');
    stmt.run(eventId);

    console.log(`[GoogleService] Event deleted: ${eventId}`);
  }

  // =========================================================================
  // CONTACTS SYNC
  // =========================================================================

  /**
   * Sync contacts via People API
   * @param {string} accountId - Account ID
   * @param {Object} options - Sync options
   * @param {number} options.pageSize - Page size (default: 500)
   * @returns {Promise<Object>} Sync results
   */
  async syncContacts(accountId, options = {}) {
    await this.ensureValidToken();

    const { pageSize = 500 } = options;

    console.log(`[GoogleService] Syncing contacts for ${this.email}`);

    try {
      let syncedCount = 0;
      let pageToken = null;

      do {
        const response = await withExponentialBackoff(async () => {
          return await this.people.people.connections.list({
            resourceName: 'people/me',
            pageSize,
            pageToken,
            personFields: 'names,emailAddresses,phoneNumbers,organizations,photos'
          });
        });

        const connections = response.data.connections || [];
        console.log(`[GoogleService] Fetched ${connections.length} contacts from Google API (page ${pageToken ? 'continuation' : 'first'})`);

        for (const contact of connections) {
          this._upsertContact(accountId, contact);
          syncedCount++;
        }

        pageToken = response.data.nextPageToken;

      } while (pageToken);

      console.log(`[GoogleService] Contacts sync complete: ${syncedCount} contacts total synced to database`);
      return { synced: syncedCount };
    } catch (error) {
      console.error(`[GoogleService] Contacts sync failed:`, error.message);
      throw error;
    }
  }

  /**
   * Upsert contact into database
   * @private
   */
  _upsertContact(accountId, contact) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO account_contacts (
        id, account_id, resource_name, display_name, given_name, family_name,
        email, phone, company, job_title, photo_url, raw_data, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const name = contact.names?.[0];
    const email = contact.emailAddresses?.[0]?.value;
    const phone = contact.phoneNumbers?.[0]?.value;
    const org = contact.organizations?.[0];
    const photo = contact.photos?.[0]?.url;

    stmt.run(
      contact.resourceName.replace('people/', ''),
      accountId,
      contact.resourceName,
      name?.displayName,
      name?.givenName,
      name?.familyName,
      email,
      phone,
      org?.name,
      org?.title,
      photo,
      JSON.stringify(contact),
      Date.now()
    );
  }

  /**
   * Get contacts from local database
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {string} options.search - Search query (name or email)
   * @param {number} options.limit - Max results (default: 100)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @returns {Promise<Array>} List of contacts in Google People API format
   */
  async getContacts(accountId, options = {}) {
    const { search = null, limit = 100, offset = 0 } = options;

    let query = 'SELECT * FROM account_contacts WHERE account_id = ?';
    const params = [accountId];

    if (search) {
      query += ' AND (display_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY display_name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    const contacts = stmt.all(...params);

    console.log(`[GoogleService] getContacts: Found ${contacts.length} contacts in database for account ${accountId}`);

    // Return contacts in Google People API format by parsing raw_data
    return contacts.map(contact => {
      try {
        // Parse raw_data to get the original Google API format
        const rawContact = JSON.parse(contact.raw_data);
        return rawContact;
      } catch (error) {
        console.error(`[GoogleService] Error parsing contact raw_data for ${contact.id}:`, error.message);
        // Fallback: construct minimal format from flattened data
        return {
          resourceName: contact.resource_name,
          names: contact.display_name ? [{ displayName: contact.display_name }] : [],
          emailAddresses: contact.email ? [{ value: contact.email }] : [],
          phoneNumbers: contact.phone ? [{ value: contact.phone }] : [],
          organizations: contact.company || contact.job_title ? [{
            name: contact.company,
            title: contact.job_title
          }] : [],
          photos: contact.photo_url ? [{ url: contact.photo_url }] : []
        };
      }
    });
  }

  /**
   * Get single contact
   * @param {string} accountId - Account ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Contact details
   */
  async getContact(accountId, contactId) {
    const stmt = this.db.prepare('SELECT * FROM account_contacts WHERE account_id = ? AND id = ?');
    const contact = stmt.get(accountId, contactId);

    if (!contact) {
      throw new Error(`Contact not found: ${contactId}`);
    }

    return {
      ...contact,
      raw_data: JSON.parse(contact.raw_data)
    };
  }

  // =========================================================================
  // ATTACHMENTS
  // =========================================================================

  /**
   * Download an email attachment
   * @param {string} accountId - Account ID
   * @param {string} messageId - Gmail message ID
   * @param {string} attachmentId - Attachment ID from Gmail API
   * @param {string} filename - Original filename for saving
   * @returns {Promise<Object>} Download result with base64 data
   */
  async downloadAttachment(accountId, messageId, attachmentId, filename) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Downloading attachment: ${filename} from message ${messageId}`);

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: attachmentId
        });
      });

      // Gmail API returns base64 URL-safe encoded data
      const base64Data = response.data.data;
      const size = response.data.size;

      console.log(`[GoogleService] Attachment downloaded: ${filename} (${size} bytes)`);

      return {
        success: true,
        data: base64Data,
        size: size,
        filename: filename
      };
    } catch (error) {
      console.error(`[GoogleService] Failed to download attachment:`, error.message);
      throw error;
    }
  }

  /**
   * Get attachments info from a message
   * @param {string} accountId - Account ID
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<Array>} List of attachment metadata
   */
  async getAttachments(accountId, messageId) {
    await this.ensureValidToken();

    try {
      // Fetch the full message to get attachment details
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full'
        });
      });

      const attachments = [];
      const extractAttachments = (part) => {
        if (part.filename && part.filename.length > 0 && part.body) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0
          });
        }
        if (part.parts) {
          part.parts.forEach(extractAttachments);
        }
      };

      if (response.data.payload) {
        extractAttachments(response.data.payload);
      }

      return attachments;
    } catch (error) {
      console.error(`[GoogleService] Failed to get attachments:`, error.message);
      throw error;
    }
  }

  /**
   * Get inline images (CID attachments) from an email with their data
   * These are images embedded in the email HTML with src="cid:..." references
   * @param {string} accountId - Account ID
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<Array>} List of inline images with base64 data
   */
  async getInlineImages(accountId, messageId) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Getting inline images for message ${messageId}`);

    try {
      // Fetch the full message to get inline attachment details
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full'
        });
      });

      const inlineImages = [];

      // Extract inline attachments (those with Content-ID headers)
      const extractInlineImages = (part) => {
        // Check if this part has a Content-ID header (indicates inline attachment)
        const contentIdHeader = part.headers?.find(
          h => h.name.toLowerCase() === 'content-id'
        );

        // Also check Content-Disposition for 'inline'
        const contentDispositionHeader = part.headers?.find(
          h => h.name.toLowerCase() === 'content-disposition'
        );
        const isInline = contentDispositionHeader?.value?.toLowerCase().includes('inline');

        // It's an inline image if it has Content-ID and is an image type
        if (contentIdHeader && part.mimeType?.startsWith('image/')) {
          inlineImages.push({
            contentId: contentIdHeader.value,
            mimeType: part.mimeType,
            filename: part.filename || 'inline-image',
            attachmentId: part.body?.attachmentId,
            size: part.body?.size || 0,
            // If data is embedded directly (small images), it's in part.body.data
            embeddedData: part.body?.data || null
          });
        }

        // Recurse into sub-parts
        if (part.parts) {
          part.parts.forEach(extractInlineImages);
        }
      };

      if (response.data.payload) {
        extractInlineImages(response.data.payload);
      }

      console.log(`[GoogleService] Found ${inlineImages.length} inline images`);

      // Fetch the actual image data for each inline image
      const imagesWithData = await Promise.all(
        inlineImages.map(async (img) => {
          try {
            let imageData = img.embeddedData;

            // If data wasn't embedded, fetch it via attachment API
            if (!imageData && img.attachmentId) {
              const attachmentResponse = await withExponentialBackoff(async () => {
                return await this.gmail.users.messages.attachments.get({
                  userId: 'me',
                  messageId: messageId,
                  id: img.attachmentId
                });
              });
              imageData = attachmentResponse.data.data;
            }

            return {
              contentId: img.contentId,
              mimeType: img.mimeType,
              filename: img.filename,
              size: img.size,
              data: imageData
            };
          } catch (error) {
            console.error(`[GoogleService] Failed to fetch inline image ${img.contentId}:`, error.message);
            return {
              contentId: img.contentId,
              mimeType: img.mimeType,
              filename: img.filename,
              size: img.size,
              data: null,
              error: error.message
            };
          }
        })
      );

      return imagesWithData.filter(img => img.data !== null);
    } catch (error) {
      console.error(`[GoogleService] Failed to get inline images:`, error.message);
      throw error;
    }
  }

  // =========================================================================
  // GMAIL LABELS
  // =========================================================================

  /**
   * Get all Gmail labels (system + user labels)
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} List of labels
   */
  async getLabels(accountId) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Getting labels for ${this.email}`);

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.list({
          userId: 'me'
        });
      });

      const labels = response.data.labels || [];

      // Sort labels: system labels first, then user labels alphabetically
      const systemLabels = labels.filter(l => l.type === 'system');
      const userLabels = labels.filter(l => l.type === 'user');

      // Sort user labels by name
      userLabels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      console.log(`[GoogleService] Found ${labels.length} labels (${systemLabels.length} system, ${userLabels.length} user)`);

      return [...systemLabels, ...userLabels];
    } catch (error) {
      console.error(`[GoogleService] Failed to get labels:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new Gmail label
   * @param {string} accountId - Account ID
   * @param {string} name - Label name
   * @param {Object} options - Label options
   * @param {Object} options.color - Color settings { backgroundColor, textColor }
   * @returns {Promise<Object>} Created label
   */
  async createLabel(accountId, name, options = {}) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Creating label: ${name}`);

    try {
      const labelBody = {
        name: name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show'
      };

      // Add color if provided
      if (options.color) {
        labelBody.color = {
          backgroundColor: options.color.backgroundColor,
          textColor: options.color.textColor
        };
      }

      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: labelBody
        });
      });

      console.log(`[GoogleService] Label created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error(`[GoogleService] Failed to create label:`, error.message);
      throw error;
    }
  }

  /**
   * Update a Gmail label
   * @param {string} accountId - Account ID
   * @param {string} labelId - Label ID
   * @param {Object} updates - Label updates
   * @param {string} updates.name - New label name
   * @param {Object} updates.color - Color settings { backgroundColor, textColor }
   * @returns {Promise<Object>} Updated label
   */
  async updateLabel(accountId, labelId, updates) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Updating label: ${labelId}`);

    try {
      const labelBody = {};

      if (updates.name) {
        labelBody.name = updates.name;
      }

      if (updates.color) {
        labelBody.color = {
          backgroundColor: updates.color.backgroundColor,
          textColor: updates.color.textColor
        };
      }

      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.patch({
          userId: 'me',
          id: labelId,
          requestBody: labelBody
        });
      });

      console.log(`[GoogleService] Label updated: ${labelId}`);
      return response.data;
    } catch (error) {
      console.error(`[GoogleService] Failed to update label:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a Gmail label (user labels only)
   * @param {string} accountId - Account ID
   * @param {string} labelId - Label ID to delete
   * @returns {Promise<Object>} Success response
   */
  async deleteLabel(accountId, labelId) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Deleting label: ${labelId}`);

    try {
      await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.delete({
          userId: 'me',
          id: labelId
        });
      });

      console.log(`[GoogleService] Label deleted: ${labelId}`);
      return { success: true };
    } catch (error) {
      console.error(`[GoogleService] Failed to delete label:`, error.message);
      throw error;
    }
  }

  /**
   * Apply a label to an email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @param {string} labelId - Label ID to apply
   * @returns {Promise<Object>} Success response
   */
  async applyLabel(accountId, emailId, labelId) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Applying label ${labelId} to email ${emailId}`);

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            addLabelIds: [labelId]
          }
        });
      });

      // Update local database
      try {
        const email = this.db.prepare('SELECT labels, is_read, is_starred FROM account_emails WHERE id = ?').get(emailId);
        if (email) {
          let labels = email.labels ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : [];
          if (!labels.includes(labelId)) {
            labels.push(labelId);
          }
          this._updateEmailLabels(emailId, labels, email.is_read, email.is_starred);
        }
      } catch (dbError) {
        console.warn(`[GoogleService] Failed to update local DB after applying label:`, dbError.message);
      }

      console.log(`[GoogleService] Label applied successfully`);
      return { success: true };
    } catch (error) {
      console.error(`[GoogleService] Failed to apply label:`, error.message);
      throw error;
    }
  }

  /**
   * Remove a label from an email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @param {string} labelId - Label ID to remove
   * @returns {Promise<Object>} Success response
   */
  async removeLabel(accountId, emailId, labelId) {
    await this.ensureValidToken();

    console.log(`[GoogleService] Removing label ${labelId} from email ${emailId}`);

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            removeLabelIds: [labelId]
          }
        });
      });

      // Update local database
      try {
        const email = this.db.prepare('SELECT labels, is_read, is_starred FROM account_emails WHERE id = ?').get(emailId);
        if (email) {
          let labels = email.labels ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : [];
          labels = labels.filter(l => l !== labelId);
          this._updateEmailLabels(emailId, labels, email.is_read, email.is_starred);
        }
      } catch (dbError) {
        console.warn(`[GoogleService] Failed to update local DB after removing label:`, dbError.message);
      }

      console.log(`[GoogleService] Label removed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`[GoogleService] Failed to remove label:`, error.message);
      throw error;
    }
  }

  /**
   * Get a single label by ID with full details
   * @param {string} accountId - Account ID
   * @param {string} labelId - Label ID
   * @returns {Promise<Object>} Label details
   */
  async getLabel(accountId, labelId) {
    await this.ensureValidToken();

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.get({
          userId: 'me',
          id: labelId
        });
      });

      return response.data;
    } catch (error) {
      console.error(`[GoogleService] Failed to get label:`, error.message);
      throw error;
    }
  }

  // =========================================================================
  // EMAIL TEMPLATES
  // =========================================================================

  /**
   * Get email templates (account-specific + global templates)
   * @param {string} accountId - Account ID (optional, for account-specific templates)
   * @returns {Promise<Array>} List of templates sorted by favorites first, then usage count
   */
  static getTemplates(db, accountId = null) {
    console.log(`[GoogleService] Getting email templates for account: ${accountId || 'all'}`);

    // Query that gets both account-specific and global (null account_id) templates
    let query = `
      SELECT * FROM email_templates
      WHERE account_id IS NULL
    `;
    const params = [];

    if (accountId) {
      query = `
        SELECT * FROM email_templates
        WHERE account_id IS NULL OR account_id = ?
      `;
      params.push(accountId);
    }

    query += ' ORDER BY is_favorite DESC, usage_count DESC, updated_at DESC';

    try {
      const stmt = db.prepare(query);
      const templates = stmt.all(...params);
      console.log(`[GoogleService] Found ${templates.length} templates`);
      return templates;
    } catch (error) {
      console.error(`[GoogleService] Failed to get templates:`, error.message);
      throw error;
    }
  }

  /**
   * Get a single email template by ID
   * @param {string} templateId - Template ID
   * @returns {Object} Template details
   */
  static getTemplate(db, templateId) {
    console.log(`[GoogleService] Getting template: ${templateId}`);

    try {
      const stmt = db.prepare('SELECT * FROM email_templates WHERE id = ?');
      const template = stmt.get(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      return template;
    } catch (error) {
      console.error(`[GoogleService] Failed to get template:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new email template
   * @param {Object} data - Template data
   * @param {string} data.name - Template name
   * @param {string} data.subject - Pre-filled subject
   * @param {string} data.body - HTML body content
   * @param {string} data.category - Category (e.g., "Sales", "Support")
   * @param {string} data.account_id - Account ID (null for global template)
   * @param {boolean} data.is_favorite - Whether template is favorited
   * @returns {Object} Created template
   */
  static createTemplate(db, data) {
    console.log(`[GoogleService] Creating template: ${data.name}`);

    const templateId = uuidv4();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO email_templates (
          id, account_id, name, subject, body, category, is_favorite, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        templateId,
        data.account_id || null,
        data.name,
        data.subject || '',
        data.body || '',
        data.category || null,
        data.is_favorite ? 1 : 0,
        0,
        now,
        now
      );

      console.log(`[GoogleService] Template created: ${templateId}`);
      return GoogleAccountService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to create template:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing email template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated template
   */
  static updateTemplate(db, templateId, updates) {
    console.log(`[GoogleService] Updating template: ${templateId}`);

    try {
      // Build dynamic update query
      const updateFields = [];
      const params = [];

      const allowedFields = ['name', 'subject', 'body', 'category', 'is_favorite', 'account_id'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          if (field === 'is_favorite') {
            params.push(updates[field] ? 1 : 0);
          } else {
            params.push(updates[field]);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Always update the updated_at timestamp
      updateFields.push('updated_at = ?');
      params.push(Date.now());

      // Add templateId as last parameter
      params.push(templateId);

      const query = `UPDATE email_templates SET ${updateFields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      stmt.run(...params);

      console.log(`[GoogleService] Template updated: ${templateId}`);
      return GoogleAccountService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to update template:`, error.message);
      throw error;
    }
  }

  /**
   * Delete an email template
   * @param {string} templateId - Template ID
   * @returns {Object} Success response
   */
  static deleteTemplate(db, templateId) {
    console.log(`[GoogleService] Deleting template: ${templateId}`);

    try {
      const stmt = db.prepare('DELETE FROM email_templates WHERE id = ?');
      const result = stmt.run(templateId);

      if (result.changes === 0) {
        throw new Error(`Template not found: ${templateId}`);
      }

      console.log(`[GoogleService] Template deleted: ${templateId}`);
      return { success: true };
    } catch (error) {
      console.error(`[GoogleService] Failed to delete template:`, error.message);
      throw error;
    }
  }

  /**
   * Increment template usage count (called when template is used)
   * @param {string} templateId - Template ID
   * @returns {Object} Updated template
   */
  static incrementTemplateUsage(db, templateId) {
    console.log(`[GoogleService] Incrementing usage for template: ${templateId}`);

    try {
      const stmt = db.prepare(`
        UPDATE email_templates
        SET usage_count = usage_count + 1, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(Date.now(), templateId);

      return GoogleAccountService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to increment template usage:`, error.message);
      throw error;
    }
  }

  /**
   * Toggle template favorite status
   * @param {string} templateId - Template ID
   * @returns {Object} Updated template
   */
  static toggleTemplateFavorite(db, templateId) {
    console.log(`[GoogleService] Toggling favorite for template: ${templateId}`);

    try {
      const stmt = db.prepare(`
        UPDATE email_templates
        SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(Date.now(), templateId);

      return GoogleAccountService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to toggle template favorite:`, error.message);
      throw error;
    }
  }

  /**
   * Get all unique template categories
   * @param {string} accountId - Account ID (optional)
   * @returns {Array} List of unique categories
   */
  static getTemplateCategories(db, accountId = null) {
    console.log(`[GoogleService] Getting template categories`);

    try {
      let query = `
        SELECT DISTINCT category FROM email_templates
        WHERE category IS NOT NULL AND category != ''
      `;
      const params = [];

      if (accountId) {
        query = `
          SELECT DISTINCT category FROM email_templates
          WHERE category IS NOT NULL AND category != ''
          AND (account_id IS NULL OR account_id = ?)
        `;
        params.push(accountId);
      }

      query += ' ORDER BY category ASC';

      const stmt = db.prepare(query);
      const rows = stmt.all(...params);
      return rows.map(row => row.category);
    } catch (error) {
      console.error(`[GoogleService] Failed to get template categories:`, error.message);
      throw error;
    }
  }

// =========================================================================
  // EMAIL SIGNATURES
  // =========================================================================

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

  // =========================================================================
  // ADVANCED EMAIL SEARCH
  // =========================================================================

  /**
   * Parse Gmail-style search query into SQL conditions
   * Supports operators: from:, to:, subject:, has:attachment, is:unread, is:starred,
   * after:, before:, older_than:, newer_than:, larger:, smaller:, label:
   * @param {string} query - Gmail-style search query
   * @returns {Object} Parsed query with SQL conditions and params
   */
  _parseGmailQuery(query) {
    const conditions = [];
    const params = [];
    let remainingQuery = query.trim();

    // Define operator patterns
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
      'has:attachment': () => {
        conditions.push('has_attachments = 1');
      },
      'is:unread': () => {
        conditions.push('is_read = 0');
      },
      'is:read': () => {
        conditions.push('is_read = 1');
      },
      'is:starred': () => {
        conditions.push('is_starred = 1');
      },
      'after:': (value) => {
        const date = this._parseSearchDate(value);
        if (date) {
          conditions.push('date >= ?');
          params.push(date.getTime());
        }
      },
      'before:': (value) => {
        const date = this._parseSearchDate(value);
        if (date) {
          conditions.push('date <= ?');
          params.push(date.getTime());
        }
      },
      'older_than:': (value) => {
        const ms = this._parseRelativeTime(value);
        if (ms) {
          conditions.push('date < ?');
          params.push(Date.now() - ms);
        }
      },
      'newer_than:': (value) => {
        const ms = this._parseRelativeTime(value);
        if (ms) {
          conditions.push('date > ?');
          params.push(Date.now() - ms);
        }
      },
      'larger:': (value) => {
        const bytes = this._parseSize(value);
        if (bytes) {
          conditions.push('LENGTH(body_text) > ?');
          params.push(bytes);
        }
      },
      'smaller:': (value) => {
        const bytes = this._parseSize(value);
        if (bytes) {
          conditions.push('LENGTH(body_text) < ?');
          params.push(bytes);
        }
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

    // Process operators in order
    for (const [op, handler] of Object.entries(operators)) {
      const regex = new RegExp(`${op.replace(':', '\\:')}(\\S+|"[^"]+")`, 'gi');
      let match;

      while ((match = regex.exec(remainingQuery)) !== null) {
        let value = match[1];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        if (op.endsWith(':') && value) {
          handler(value);
        } else if (!op.endsWith(':')) {
          handler();
        }

        remainingQuery = remainingQuery.replace(match[0], '').trim();
      }
    }

    // Handle boolean operators
    remainingQuery = remainingQuery.replace(/\bAND\b/gi, ' ').replace(/\bOR\b/gi, ' ');

    // Handle NOT operator
    const notMatches = remainingQuery.match(/\bNOT\s+(\S+)/gi);
    if (notMatches) {
      for (const notMatch of notMatches) {
        const term = notMatch.replace(/\bNOT\s+/i, '');
        conditions.push('NOT (subject LIKE ? OR snippet LIKE ? OR from_email LIKE ?)');
        params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        remainingQuery = remainingQuery.replace(notMatch, '').trim();
      }
    }

    // Remaining text is general search term
    remainingQuery = remainingQuery.replace(/\s+/g, ' ').trim();
    if (remainingQuery) {
      const searchTerms = remainingQuery.split(' ').filter(t => t.length > 0);
      for (const term of searchTerms) {
        conditions.push('(subject LIKE ? OR snippet LIKE ? OR from_email LIKE ? OR from_name LIKE ? OR body_text LIKE ?)');
        params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
      }
    }

    return { conditions, params };
  }

  _parseSearchDate(dateStr) {
    try {
      const normalized = dateStr.replace(/\//g, '-');
      const date = new Date(normalized);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  _parseRelativeTime(timeStr) {
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
  }

  _parseSize(sizeStr) {
    const match = sizeStr.match(/^(\d+)([KMG])?$/i);
    if (!match) return null;

    const num = parseInt(match[1], 10);
    const unit = (match[2] || '').toUpperCase();

    const multipliers = { '': 1, 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024 };
    return num * (multipliers[unit] || 1);
  }

  /**
   * Search emails using Gmail-style query syntax
   * @param {string} accountId - Account ID
   * @param {string} query - Gmail-style search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with emails and metadata
   */
  async searchEmails(accountId, query, options = {}) {
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
              userId: 'me',
              q: query,
              maxResults: limit
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
                    userId: 'me',
                    id: msgId,
                    format: 'full'
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
  }

  // =========================================================================
  // SAVED SEARCHES
  // =========================================================================

  async saveSearch(accountId, name, query, isFavorite = false) {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO saved_searches (id, account_id, name, query, is_favorite, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, accountId, name, query, isFavorite ? 1 : 0, now);
    console.log(`[GoogleService] Saved search created: "${name}" (${id})`);

    return { id, account_id: accountId, name, query, is_favorite: isFavorite, use_count: 0, last_used_at: null, created_at: now };
  }

  async getSavedSearches(accountId, options = {}) {
    const { favoritesOnly = false, limit = 50 } = options;

    let sql = 'SELECT * FROM saved_searches WHERE account_id = ?';
    const params = [accountId];

    if (favoritesOnly) {
      sql += ' AND is_favorite = 1';
    }

    sql += ' ORDER BY is_favorite DESC, use_count DESC, last_used_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async updateSavedSearch(searchId, updates) {
    const allowedFields = ['name', 'query', 'is_favorite'];
    const setClause = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = ?`);
        params.push(field === 'is_favorite' ? (updates[field] ? 1 : 0) : updates[field]);
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(searchId);
    const sql = `UPDATE saved_searches SET ${setClause.join(', ')} WHERE id = ?`;

    const stmt = this.db.prepare(sql);
    stmt.run(...params);

    const getStmt = this.db.prepare('SELECT * FROM saved_searches WHERE id = ?');
    return getStmt.get(searchId);
  }

  async deleteSavedSearch(searchId) {
    const stmt = this.db.prepare('DELETE FROM saved_searches WHERE id = ?');
    const result = stmt.run(searchId);
    console.log(`[GoogleService] Saved search deleted: ${searchId}`);
    return result.changes > 0;
  }

  async recordSearchUsage(searchId) {
    const stmt = this.db.prepare(`
      UPDATE saved_searches SET use_count = use_count + 1, last_used_at = ? WHERE id = ?
    `);
    stmt.run(Date.now(), searchId);
  }

  async getRecentSearches(accountId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM saved_searches
      WHERE account_id = ? AND last_used_at IS NOT NULL
      ORDER BY last_used_at DESC LIMIT ?
    `);
    return stmt.all(accountId, limit);
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  /**
   * Get sync status for all types
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Sync status for each type
   */
  async getSyncStatus(accountId) {
    const stmt = this.db.prepare('SELECT * FROM account_sync_state WHERE account_id = ?');
    const states = stmt.all(accountId);

    const status = {
      gmail: null,
      calendar: null,
      contacts: null
    };

    for (const state of states) {
      status[state.sync_type] = {
        lastSyncAt: state.last_sync_at,
        lastHistoryId: state.last_history_id,
        lastSyncToken: state.last_sync_token
      };
    }

    return status;
  }

  /**
   * Sync all types (emails, calendar, contacts)
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Combined sync results
   */
  async syncAll(accountId) {
    console.log(`[GoogleService] Syncing all data for ${this.email}`);

    const results = await Promise.allSettled([
      this.syncEmails(accountId),
      this.syncCalendar(accountId),
      this.syncContacts(accountId)
    ]);

    const [emailResult, calendarResult, contactsResult] = results;

    return {
      emails: emailResult.status === 'fulfilled' ? emailResult.value : { error: emailResult.reason.message },
      calendar: calendarResult.status === 'fulfilled' ? calendarResult.value : { error: calendarResult.reason.message },
      contacts: contactsResult.status === 'fulfilled' ? contactsResult.value : { error: contactsResult.reason.message }
    };
  }
}

module.exports = GoogleAccountService;
