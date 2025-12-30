/**
 * GmailService - All Gmail/Email operations
 * Handles email sync, sending, labels, attachments, templates, and signatures
 */

const { google } = require('googleapis');
const { GoogleBaseService, withExponentialBackoff, uuidv4 } = require('./googleBaseService.cjs');

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
 * GmailService - Extends GoogleBaseService with email operations
 */
class GmailService extends GoogleBaseService {
  constructor(db, email) {
    super(db, email);
    this.gmail = null;
  }

  /**
   * Initialize Gmail API client
   * @returns {Promise<void>}
   */
  async initialize() {
    await super.initialize();
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    console.log(`[GmailService] Initialized for ${this.email}`);
  }

  // =========================================================================
  // EMAIL SYNC
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

    console.log(`[GmailService] Syncing emails for ${this.email} (${full ? 'full' : 'incremental'})`);

    try {
      // Get last sync state
      const syncState = this.getSyncState(accountId, 'gmail');
      const lastHistoryId = syncState?.last_history_id;

      if (!full && lastHistoryId) {
        // Incremental sync using history API
        return await this._incrementalEmailSync(accountId, lastHistoryId);
      } else {
        // Full sync
        return await this._fullEmailSync(accountId, maxResults);
      }
    } catch (error) {
      console.error(`[GmailService] Email sync failed:`, error.message);
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
          console.log(`[GmailService] Synced ${totalSynced} emails...`);
        }
      }

      pageToken = response.data.nextPageToken;

      if (totalSynced >= maxResults) break;

    } while (pageToken);

    // Update sync state with current historyId
    const profile = await this.gmail.users.getProfile({ userId: 'me' });
    this._updateSyncState(accountId, 'gmail', profile.data.historyId);

    console.log(`[GmailService] Full sync complete: ${totalSynced} emails`);
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

    console.log(`[GmailService] Incremental sync complete: ${changedCount} changes`);
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

  // =========================================================================
  // EMAIL RETRIEVAL
  // =========================================================================

  /**
   * Get emails from local database
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Max results (default: 50)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @param {string} options.labels - Filter by labels (comma-separated)
   * @param {string} options.folder - Filter by folder name
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
   * Search emails using Gmail query syntax
   * @param {string} accountId - Account ID
   * @param {string} query - Gmail search query
   * @param {Object} options - Search options
   * @param {number} options.maxResults - Max results (default: 50)
   * @returns {Promise<Array>} Matching emails
   */
  async searchEmails(accountId, query, options = {}) {
    await this.ensureValidToken();

    const { maxResults = 50 } = options;

    console.log(`[GmailService] Searching emails: "${query}"`);

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults
        });
      });

      const messages = response.data.messages || [];
      const results = [];

      // Fetch full details for each result
      for (const msg of messages) {
        const fullMessage = await withExponentialBackoff(async () => {
          return await this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
          });
        });

        const parsed = parseGmailMessage(fullMessage.data);

        // Also update/insert in local DB
        this._upsertEmail(accountId, parsed);

        results.push(parsed);
      }

      console.log(`[GmailService] Search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[GmailService] Search failed:`, error.message);
      throw error;
    }
  }

  // =========================================================================
  // EMAIL OPERATIONS
  // =========================================================================

  /**
   * Send email via Gmail API
   * @param {string} accountId - Account ID
   * @param {Object} message - Email message
   * @param {string} message.to - Recipient email
   * @param {string} message.subject - Email subject
   * @param {string} message.body - Email body (text)
   * @param {string} message.html - Email body (HTML, optional)
   * @param {Array} message.attachments - Optional attachments array
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

    console.log(`[GmailService] Email sent: ${response.data.id}${attachments.length > 0 ? ` with ${attachments.length} attachment(s)` : ''}`);
    return response.data;
  }

  /**
   * Reply to an email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID to reply to
   * @param {Object} message - Reply message
   * @param {string} message.body - Reply body text
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

    console.log(`[GmailService] Reply sent: ${response.data.id}`);
    return response.data;
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

    console.log(`[GmailService] Email forwarded: ${response.data.id}`);
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

    console.log(`[GmailService] Email trashed: ${emailId}`);
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

    console.log(`[GmailService] Email deleted: ${emailId}`);
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

    await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: modifyRequest
      });
    });

    // Update local database
    const email = await this.getEmail(accountId, emailId);
    this._updateEmailLabels(emailId, email.labels, isRead, email.is_starred);

    console.log(`[GmailService] Email marked as ${isRead ? 'read' : 'unread'}: ${emailId}`);
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

    await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: modifyRequest
      });
    });

    // Update local database
    const email = await this.getEmail(accountId, emailId);
    this._updateEmailLabels(emailId, email.labels, email.is_read, isStarred);

    console.log(`[GmailService] Email ${isStarred ? 'starred' : 'unstarred'}: ${emailId}`);
    return { success: true };
  }

  // ... (continued in next comment - file is getting long)
}

module.exports = GmailService;
