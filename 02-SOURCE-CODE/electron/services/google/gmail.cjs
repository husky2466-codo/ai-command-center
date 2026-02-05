/**
 * GmailService - Gmail email operations
 * Handles email sync (full/incremental), CRUD, batch operations,
 * attachments, inline images, and label management.
 *
 * Sync methods: syncEmails, _fullEmailSync, _incrementalEmailSync
 * DB helpers: _upsertEmail, _updateEmailLabels, _deleteEmail
 * CRUD methods: getEmails, getEmail, sendEmail, trashEmail, deleteEmail,
 *               markAsRead, toggleStar, replyToEmail, forwardEmail
 * Batch methods: batchModifyEmails, batchTrashEmails, batchDeleteEmails
 * Attachment methods: downloadAttachment, getAttachments, getInlineImages
 * Label methods: getLabels, getLabel, createLabel, updateLabel, deleteLabel,
 *                applyLabel, removeLabel
 */

const { google } = require('googleapis');
const { GoogleBaseService, parseGmailMessage, withExponentialBackoff } = require('./base.cjs');

/**
 * GmailService - Extends GoogleBaseService with Gmail operations
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
   * Sync emails - full or incremental based on existing sync state
   * @param {string} accountId - Account ID
   * @param {Object} options - Sync options
   * @param {boolean} options.full - Force full sync (default: false)
   * @param {number} options.maxResults - Max emails for full sync (default: 100)
   * @returns {Promise<Object>} Sync results { synced, type }
   */
  async syncEmails(accountId, options = {}) {
    await this.ensureValidToken();
    const { full = false, maxResults = 100 } = options;
    console.log(`[GoogleService] Syncing emails for ${this.email} (${full ? 'full' : 'incremental'})`);
    try {
      const syncState = this.db.prepare(
        'SELECT last_history_id FROM account_sync_state WHERE account_id = ? AND sync_type = ?'
      ).get(accountId, 'gmail');
      const lastHistoryId = syncState?.last_history_id;
      if (!full && lastHistoryId) {
        return await this._incrementalEmailSync(accountId, lastHistoryId);
      } else {
        return await this._fullEmailSync(accountId, maxResults);
      }
    } catch (error) {
      console.error(`[GoogleService] Email sync failed:`, error.message);
      throw error;
    }
  }

  /**
   * Full email sync - paginated fetch of all messages
   * @param {string} accountId - Account ID
   * @param {number} maxResults - Maximum emails to sync
   * @returns {Promise<Object>} Sync results { synced, type: 'full' }
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
        const fullMessage = await withExponentialBackoff(async () => {
          return await this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
          });
        });
        const parsed = parseGmailMessage(fullMessage.data);
        this._upsertEmail(accountId, parsed);
        totalSynced++;
        if (totalSynced % 10 === 0) {
          console.log(`[GoogleService] Synced ${totalSynced} emails...`);
        }
      }
      pageToken = response.data.nextPageToken;
      if (totalSynced >= maxResults) break;
    } while (pageToken);
    const profile = await this.gmail.users.getProfile({ userId: 'me' });
    this._updateSyncState(accountId, 'gmail', profile.data.historyId);
    console.log(`[GoogleService] Full sync complete: ${totalSynced} emails`);
    return { synced: totalSynced, type: 'full' };
  }

  /**
   * Incremental email sync using Gmail History API
   * @param {string} accountId - Account ID
   * @param {string} startHistoryId - History ID to sync from
   * @returns {Promise<Object>} Sync results { synced, type: 'incremental' }
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
      if (record.messagesDeleted) {
        for (const deleted of record.messagesDeleted) {
          this._deleteEmail(deleted.message.id);
          changedCount++;
        }
      }
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
    if (response.data.historyId) {
      this._updateSyncState(accountId, 'gmail', response.data.historyId);
    }
    console.log(`[GoogleService] Incremental sync complete: ${changedCount} changes`);
    return { synced: changedCount, type: 'incremental' };
  }

  // =========================================================================
  // DATABASE HELPERS
  // =========================================================================

  /**
   * Upsert email into local database
   * @param {string} accountId - Account ID
   * @param {Object} emailData - Parsed email data from parseGmailMessage
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
    const toEmailsStr = Array.isArray(emailData.toEmails) ? JSON.stringify(emailData.toEmails) : (emailData.toEmails || null);
    const ccEmailsStr = Array.isArray(emailData.ccEmails) ? JSON.stringify(emailData.ccEmails) : (emailData.ccEmails || null);
    const labelsStr = Array.isArray(emailData.labels) ? JSON.stringify(emailData.labels) : (emailData.labels || null);
    const rawDataStr = typeof emailData.rawData === 'object' ? JSON.stringify(emailData.rawData) : (emailData.rawData || null);
    stmt.run(
      emailData.id, accountId, emailData.threadId, emailData.messageId,
      emailData.subject, emailData.snippet, emailData.fromEmail, emailData.fromName,
      toEmailsStr, ccEmailsStr, emailData.date, emailData.bodyText, emailData.bodyHtml,
      labelsStr, emailData.isRead ? 1 : 0, emailData.isStarred ? 1 : 0,
      emailData.hasAttachments ? 1 : 0, rawDataStr, Date.now()
    );
  }

  /**
   * Update email labels, read status, and starred status in local database
   * @param {string} emailId - Email ID
   * @param {Array|string} labels - Labels array or string
   * @param {boolean} isRead - Whether email is read
   * @param {boolean} isStarred - Whether email is starred
   * @private
   */
  _updateEmailLabels(emailId, labels, isRead, isStarred) {
    const stmt = this.db.prepare(`
      UPDATE account_emails
      SET labels = ?, is_read = ?, is_starred = ?, synced_at = ?
      WHERE id = ?
    `);
    const labelsStr = Array.isArray(labels) ? JSON.stringify(labels) : (labels || null);
    stmt.run(labelsStr, isRead ? 1 : 0, isStarred ? 1 : 0, Date.now(), emailId);
  }

  /**
   * Delete email from local database
   * @param {string} emailId - Email ID
   * @private
   */
  _deleteEmail(emailId) {
    const stmt = this.db.prepare('DELETE FROM account_emails WHERE id = ?');
    stmt.run(emailId);
  }

  // =========================================================================
  // EMAIL CRUD
  // =========================================================================

  /**
   * Get emails from local database with filtering options
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Max results (default: 50)
   * @param {number} options.offset - Pagination offset (default: 0)
   * @param {string} options.labels - Filter by label
   * @param {string} options.folder - Filter by folder name (inbox, sent, starred, trash, etc.)
   * @param {boolean} options.unreadOnly - Only unread emails (default: false)
   * @param {number} options.maxResults - Override limit
   * @returns {Promise<Array>} List of emails (without raw_data)
   */
  async getEmails(accountId, options = {}) {
    const { limit = 50, offset = 0, labels = null, folder = null, unreadOnly = false, maxResults = null } = options;
    const folderToLabel = {
      inbox: 'INBOX', sent: 'SENT', starred: 'STARRED', trash: 'TRASH',
      drafts: 'DRAFT', spam: 'SPAM', important: 'IMPORTANT'
    };
    let query = 'SELECT * FROM account_emails WHERE account_id = ?';
    const params = [accountId];
    const lowerFolder = folder?.toLowerCase();
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
      raw_data: null
    }));
  }

  /**
   * Get a single email with full body and raw data
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @returns {Promise<Object>} Email with parsed raw_data
   * @throws {Error} If email not found
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
   * Send an email with optional attachments
   * @param {string} accountId - Account ID
   * @param {Object} message - Message details
   * @param {string} message.to - Recipient email
   * @param {string} message.subject - Email subject
   * @param {string} message.body - Plain text body
   * @param {string} message.html - HTML body (optional)
   * @param {Array} message.attachments - Attachments array (optional)
   * @returns {Promise<Object>} Sent message data from Gmail API
   */
  async sendEmail(accountId, message) {
    await this.ensureValidToken();
    const { to, subject, body, html, attachments = [] } = message;
    let rawMessage;
    if (attachments.length === 0) {
      const messageParts = [
        `To: ${to}`, `Subject: ${subject}`,
        'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8',
        '', body
      ];
      rawMessage = messageParts.join('\n');
    } else {
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const headerParts = [
        `To: ${to}`, `Subject: ${subject}`,
        'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '', `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 7bit',
        '', body
      ];
      const attachmentParts = [];
      for (const attachment of attachments) {
        attachmentParts.push(`--${boundary}`);
        attachmentParts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
        attachmentParts.push('Content-Transfer-Encoding: base64');
        attachmentParts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        attachmentParts.push('');
        const base64Content = attachment.content.replace(/(.{76})/g, '$1\n');
        attachmentParts.push(base64Content);
      }
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
   * @param {string} emailId - Email ID
   * @returns {Promise<Object>} { success: true }
   */
  async trashEmail(accountId, emailId) {
    await this.ensureValidToken();
    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.trash({
        userId: 'me', id: emailId
      });
    });
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
   * @param {string} emailId - Email ID
   * @returns {Promise<Object>} { success: true }
   */
  async deleteEmail(accountId, emailId) {
    await this.ensureValidToken();
    await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.delete({
        userId: 'me', id: emailId
      });
    });
    this._deleteEmail(emailId);
    console.log(`[GoogleService] Email deleted: ${emailId}`);
    return { success: true };
  }

  /**
   * Mark email as read or unread
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @param {boolean} isRead - true to mark read, false for unread
   * @returns {Promise<Object>} { success: true }
   */
  async markAsRead(accountId, emailId, isRead) {
    await this.ensureValidToken();
    const modifyRequest = isRead
      ? { removeLabelIds: ['UNREAD'] }
      : { addLabelIds: ['UNREAD'] };
    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.modify({
        userId: 'me', id: emailId, requestBody: modifyRequest
      });
    });
    const email = await this.getEmail(accountId, emailId);
    this._updateEmailLabels(emailId, email.labels, isRead, email.is_starred);
    console.log(`[GoogleService] Email marked as ${isRead ? 'read' : 'unread'}: ${emailId}`);
    return { success: true };
  }

  /**
   * Star or unstar an email
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID
   * @param {boolean} isStarred - true to star, false to unstar
   * @returns {Promise<Object>} { success: true }
   */
  async toggleStar(accountId, emailId, isStarred) {
    await this.ensureValidToken();
    const modifyRequest = isStarred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] };
    const response = await withExponentialBackoff(async () => {
      return await this.gmail.users.messages.modify({
        userId: 'me', id: emailId, requestBody: modifyRequest
      });
    });
    const email = await this.getEmail(accountId, emailId);
    this._updateEmailLabels(emailId, email.labels, email.is_read, isStarred);
    console.log(`[GoogleService] Email ${isStarred ? 'starred' : 'unstarred'}: ${emailId}`);
    return { success: true };
  }

  /**
   * Reply to an email (threaded)
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID to reply to
   * @param {Object} message - Reply message
   * @param {string} message.body - Reply body text
   * @returns {Promise<Object>} Sent message data from Gmail API
   */
  async replyToEmail(accountId, emailId, message) {
    await this.ensureValidToken();
    const originalEmail = await this.getEmail(accountId, emailId);
    const rawData = JSON.parse(originalEmail.raw_data);
    const originalMessageId = rawData.payload?.headers?.find(
      h => h.name.toLowerCase() === 'message-id'
    )?.value;
    const originalReferences = rawData.payload?.headers?.find(
      h => h.name.toLowerCase() === 'references'
    )?.value || '';
    const references = originalReferences
      ? `${originalReferences} ${originalMessageId}`
      : originalMessageId;
    const messageParts = [
      `To: ${originalEmail.from_email}`,
      `Subject: Re: ${originalEmail.subject}`,
      `In-Reply-To: ${originalMessageId}`,
      `References: ${references}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '', message.body
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
        requestBody: { raw: encodedMessage, threadId: originalEmail.thread_id }
      });
    });
    console.log(`[GoogleService] Reply sent: ${response.data.id}`);
    return response.data;
  }

  /**
   * Forward an email with quoted original content
   * @param {string} accountId - Account ID
   * @param {string} emailId - Email ID to forward
   * @param {Object} message - Forward message
   * @param {string} message.to - Recipient email
   * @param {string} message.body - Additional body text (optional)
   * @returns {Promise<Object>} Sent message data from Gmail API
   */
  async forwardEmail(accountId, emailId, message) {
    await this.ensureValidToken();
    const originalEmail = await this.getEmail(accountId, emailId);
    const forwardedContent = [
      message.body || '', '',
      '---------- Forwarded message ---------',
      `From: ${originalEmail.from_name || originalEmail.from_email} <${originalEmail.from_email}>`,
      `Date: ${new Date(originalEmail.date).toLocaleString()}`,
      `Subject: ${originalEmail.subject}`,
      `To: ${originalEmail.to_emails}`,
      '', originalEmail.body_text || originalEmail.snippet
    ].join('\n');
    const messageParts = [
      `To: ${message.to}`,
      `Subject: Fwd: ${originalEmail.subject}`,
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8',
      '', forwardedContent
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
  // BATCH OPERATIONS
  // =========================================================================

  /**
   * Batch modify emails - apply/remove labels, mark read/unread, star/unstar
   * @param {string} accountId - Account ID
   * @param {Array<string>} emailIds - Email IDs to modify
   * @param {Object} modifications - Modifications to apply
   * @param {Array<string>} modifications.addLabels - Labels to add
   * @param {Array<string>} modifications.removeLabels - Labels to remove
   * @param {boolean} modifications.markRead - Mark as read
   * @param {boolean} modifications.markUnread - Mark as unread
   * @param {boolean} modifications.star - Star emails
   * @param {boolean} modifications.unstar - Unstar emails
   * @returns {Promise<Object>} { success, modified }
   */
  async batchModifyEmails(accountId, emailIds, modifications) {
    await this.ensureValidToken();
    if (!emailIds || emailIds.length === 0) {
      return { success: true, modified: 0 };
    }
    console.log(`[GoogleService] Batch modifying ${emailIds.length} emails`);
    const { addLabels = [], removeLabels = [], markRead, markUnread, star, unstar } = modifications;
    const addLabelIds = [...addLabels];
    const removeLabelIds = [...removeLabels];
    if (markRead) removeLabelIds.push('UNREAD');
    if (markUnread) addLabelIds.push('UNREAD');
    if (star) addLabelIds.push('STARRED');
    if (unstar) removeLabelIds.push('STARRED');
    let modifiedCount = 0;
    const batchSize = 100;
    for (let i = 0; i < emailIds.length; i += batchSize) {
      const batch = emailIds.slice(i, i + batchSize);
      try {
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
        for (const emailId of batch) {
          try {
            const email = this.db.prepare('SELECT * FROM account_emails WHERE id = ?').get(emailId);
            if (email) {
              let labels = email.labels ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : [];
              for (const label of addLabelIds) {
                if (!labels.includes(label)) labels.push(label);
              }
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
      }
    }
    console.log(`[GoogleService] Batch modify complete: ${modifiedCount} emails modified`);
    return { success: true, modified: modifiedCount };
  }

  /**
   * Batch trash emails with concurrency limit
   * @param {string} accountId - Account ID
   * @param {Array<string>} emailIds - Email IDs to trash
   * @returns {Promise<Object>} { success, trashed, results }
   */
  async batchTrashEmails(accountId, emailIds) {
    await this.ensureValidToken();
    if (!emailIds || emailIds.length === 0) {
      return { success: true, trashed: 0 };
    }
    console.log(`[GoogleService] Batch trashing ${emailIds.length} emails`);
    let trashedCount = 0;
    const concurrency = 5;
    const results = [];
    for (let i = 0; i < emailIds.length; i += concurrency) {
      const batch = emailIds.slice(i, i + concurrency);
      const promises = batch.map(async (emailId) => {
        try {
          await withExponentialBackoff(async () => {
            return await this.gmail.users.messages.trash({
              userId: 'me', id: emailId
            });
          });
          try {
            const email = this.db.prepare('SELECT labels, is_read, is_starred FROM account_emails WHERE id = ?').get(emailId);
            if (email) {
              let labels = email.labels ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : [];
              if (!labels.includes('TRASH')) labels.push('TRASH');
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
   * Batch permanently delete emails with concurrency limit
   * @param {string} accountId - Account ID
   * @param {Array<string>} emailIds - Email IDs to delete
   * @returns {Promise<Object>} { success, deleted, results }
   */
  async batchDeleteEmails(accountId, emailIds) {
    await this.ensureValidToken();
    if (!emailIds || emailIds.length === 0) {
      return { success: true, deleted: 0 };
    }
    console.log(`[GoogleService] Batch deleting ${emailIds.length} emails (permanent)`);
    let deletedCount = 0;
    const concurrency = 5;
    const results = [];
    for (let i = 0; i < emailIds.length; i += concurrency) {
      const batch = emailIds.slice(i, i + concurrency);
      const promises = batch.map(async (emailId) => {
        try {
          await withExponentialBackoff(async () => {
            return await this.gmail.users.messages.delete({
              userId: 'me', id: emailId
            });
          });
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

  // =========================================================================
  // ATTACHMENTS
  // =========================================================================

  /**
   * Download an email attachment
   * @param {string} accountId - Account ID
   * @param {string} messageId - Message ID
   * @param {string} attachmentId - Attachment ID
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} { success, data (base64), size, filename }
   */
  async downloadAttachment(accountId, messageId, attachmentId, filename) {
    await this.ensureValidToken();
    console.log(`[GoogleService] Downloading attachment: ${filename} from message ${messageId}`);
    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.attachments.get({
          userId: 'me', messageId: messageId, id: attachmentId
        });
      });
      const base64Data = response.data.data;
      const size = response.data.size;
      console.log(`[GoogleService] Attachment downloaded: ${filename} (${size} bytes)`);
      return { success: true, data: base64Data, size: size, filename: filename };
    } catch (error) {
      console.error(`[GoogleService] Failed to download attachment:`, error.message);
      throw error;
    }
  }

  /**
   * Get attachment metadata for a message
   * @param {string} accountId - Account ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} List of attachments { id, filename, mimeType, size }
   */
  async getAttachments(accountId, messageId) {
    await this.ensureValidToken();
    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.get({
          userId: 'me', id: messageId, format: 'full'
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
        if (part.parts) part.parts.forEach(extractAttachments);
      };
      if (response.data.payload) extractAttachments(response.data.payload);
      return attachments;
    } catch (error) {
      console.error(`[GoogleService] Failed to get attachments:`, error.message);
      throw error;
    }
  }

  /**
   * Get inline images with base64 data for a message
   * @param {string} accountId - Account ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} List of inline images with data
   */
  async getInlineImages(accountId, messageId) {
    await this.ensureValidToken();
    console.log(`[GoogleService] Getting inline images for message ${messageId}`);
    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.get({
          userId: 'me', id: messageId, format: 'full'
        });
      });
      const inlineImages = [];
      const extractInlineImages = (part) => {
        const contentIdHeader = part.headers?.find(
          h => h.name.toLowerCase() === 'content-id'
        );
        const contentDispositionHeader = part.headers?.find(
          h => h.name.toLowerCase() === 'content-disposition'
        );
        const isInline = contentDispositionHeader?.value?.toLowerCase().includes('inline');
        if (contentIdHeader && part.mimeType?.startsWith('image/')) {
          inlineImages.push({
            contentId: contentIdHeader.value,
            mimeType: part.mimeType,
            filename: part.filename || 'inline-image',
            attachmentId: part.body?.attachmentId,
            size: part.body?.size || 0,
            embeddedData: part.body?.data || null
          });
        }
        if (part.parts) part.parts.forEach(extractInlineImages);
      };
      if (response.data.payload) extractInlineImages(response.data.payload);
      console.log(`[GoogleService] Found ${inlineImages.length} inline images`);
      const imagesWithData = await Promise.all(
        inlineImages.map(async (img) => {
          try {
            let imageData = img.embeddedData;
            if (!imageData && img.attachmentId) {
              const attachmentResponse = await withExponentialBackoff(async () => {
                return await this.gmail.users.messages.attachments.get({
                  userId: 'me', messageId: messageId, id: img.attachmentId
                });
              });
              imageData = attachmentResponse.data.data;
            }
            return {
              contentId: img.contentId, mimeType: img.mimeType,
              filename: img.filename, size: img.size, data: imageData
            };
          } catch (error) {
            console.error(`[GoogleService] Failed to fetch inline image ${img.contentId}:`, error.message);
            return {
              contentId: img.contentId, mimeType: img.mimeType,
              filename: img.filename, size: img.size, data: null, error: error.message
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
  // LABEL MANAGEMENT
  // =========================================================================

  /**
   * Get all labels (system + user) for the account
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} Sorted list of labels (system first, then user alphabetical)
   */
  async getLabels(accountId) {
    await this.ensureValidToken();
    console.log(`[GoogleService] Getting labels for ${this.email}`);
    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.list({ userId: 'me' });
      });
      const labels = response.data.labels || [];
      const systemLabels = labels.filter(l => l.type === 'system');
      const userLabels = labels.filter(l => l.type === 'user');
      userLabels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      console.log(`[GoogleService] Found ${labels.length} labels (${systemLabels.length} system, ${userLabels.length} user)`);
      return [...systemLabels, ...userLabels];
    } catch (error) {
      console.error(`[GoogleService] Failed to get labels:`, error.message);
      throw error;
    }
  }

  /**
   * Get details for a single label
   * @param {string} accountId - Account ID
   * @param {string} labelId - Label ID
   * @returns {Promise<Object>} Label details
   */
  async getLabel(accountId, labelId) {
    await this.ensureValidToken();
    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.get({
          userId: 'me', id: labelId
        });
      });
      return response.data;
    } catch (error) {
      console.error(`[GoogleService] Failed to get label:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new label
   * @param {string} accountId - Account ID
   * @param {string} name - Label name
   * @param {Object} options - Label options
   * @param {Object} options.color - Color { backgroundColor, textColor }
   * @returns {Promise<Object>} Created label data
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
      if (options.color) {
        labelBody.color = {
          backgroundColor: options.color.backgroundColor,
          textColor: options.color.textColor
        };
      }
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.create({
          userId: 'me', requestBody: labelBody
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
   * Update an existing label
   * @param {string} accountId - Account ID
   * @param {string} labelId - Label ID
   * @param {Object} updates - Updates { name, color }
   * @returns {Promise<Object>} Updated label data
   */
  async updateLabel(accountId, labelId, updates) {
    await this.ensureValidToken();
    console.log(`[GoogleService] Updating label: ${labelId}`);
    try {
      const labelBody = {};
      if (updates.name) labelBody.name = updates.name;
      if (updates.color) {
        labelBody.color = {
          backgroundColor: updates.color.backgroundColor,
          textColor: updates.color.textColor
        };
      }
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.patch({
          userId: 'me', id: labelId, requestBody: labelBody
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
   * Delete a label
   * @param {string} accountId - Account ID
   * @param {string} labelId - Label ID
   * @returns {Promise<Object>} { success: true }
   */
  async deleteLabel(accountId, labelId) {
    await this.ensureValidToken();
    console.log(`[GoogleService] Deleting label: ${labelId}`);
    try {
      await withExponentialBackoff(async () => {
        return await this.gmail.users.labels.delete({
          userId: 'me', id: labelId
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
   * @returns {Promise<Object>} { success: true }
   */
  async applyLabel(accountId, emailId, labelId) {
    await this.ensureValidToken();
    console.log(`[GoogleService] Applying label ${labelId} to email ${emailId}`);
    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.modify({
          userId: 'me', id: emailId,
          requestBody: { addLabelIds: [labelId] }
        });
      });
      try {
        const email = this.db.prepare('SELECT labels, is_read, is_starred FROM account_emails WHERE id = ?').get(emailId);
        if (email) {
          let labels = email.labels ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : [];
          if (!labels.includes(labelId)) labels.push(labelId);
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
   * @returns {Promise<Object>} { success: true }
   */
  async removeLabel(accountId, emailId, labelId) {
    await this.ensureValidToken();
    console.log(`[GoogleService] Removing label ${labelId} from email ${emailId}`);
    try {
      const response = await withExponentialBackoff(async () => {
        return await this.gmail.users.messages.modify({
          userId: 'me', id: emailId,
          requestBody: { removeLabelIds: [labelId] }
        });
      });
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
}

module.exports = { GmailService };
