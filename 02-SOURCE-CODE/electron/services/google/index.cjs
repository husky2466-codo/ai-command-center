/**
 * GoogleAccountService - Facade class
 *
 * Delegates to focused sub-services while maintaining the exact same API
 * that consumers expect from the original monolithic googleAccountService.cjs.
 *
 * Sub-services:
 *   - GmailService (gmail.cjs) + search mixin (gmailSearch.cjs)
 *   - GoogleCalendarService (calendar.cjs)
 *   - GoogleContactsService (contacts.cjs)
 *   - EmailTemplateService (templates.cjs) - static methods only
 *   - EmailSignatureService (signatures.cjs) - instance, db-only
 *
 * Static account methods delegate to GoogleBaseService (base.cjs).
 */

const { GoogleBaseService } = require('./base.cjs');
const { GmailService } = require('./gmail.cjs');
const { applySearchMixin } = require('./gmailSearch.cjs');
const GoogleCalendarService = require('./calendar.cjs');
const GoogleContactsService = require('./contacts.cjs');
const EmailTemplateService = require('./templates.cjs');
const EmailSignatureService = require('./signatures.cjs');

// Apply search mixin once at module load
applySearchMixin(GmailService);

/**
 * GoogleAccountService - Unified facade for all Google services
 */
class GoogleAccountService {
  constructor(db, email) {
    this.db = db;
    this.email = email;

    // Create sub-service instances
    this._gmail = new GmailService(db, email);
    this._calendar = new GoogleCalendarService(db, email);
    this._contacts = new GoogleContactsService(db, email);
    this._signatures = new EmailSignatureService(db);
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize all sub-services that need OAuth
   * @returns {Promise<void>}
   */
  async initialize() {
    await this._gmail.initialize();
    await this._calendar.initialize();
    await this._contacts.initialize();
    // signatures don't need initialize (db-only)
  }

  // ===========================================================================
  // STATIC ACCOUNT MANAGEMENT (delegate to GoogleBaseService)
  // ===========================================================================

  static async addAccount(db, email, oauth2Client) {
    return GoogleBaseService.addAccount(db, email, oauth2Client);
  }

  static removeAccount(db, accountId) {
    return GoogleBaseService.removeAccount(db, accountId);
  }

  static getAccount(db, accountId) {
    return GoogleBaseService.getAccount(db, accountId);
  }

  static listAccounts(db) {
    return GoogleBaseService.listAccounts(db);
  }

  // ===========================================================================
  // STATIC TEMPLATE METHODS (delegate to EmailTemplateService)
  // ===========================================================================

  static getTemplates(db, accountId) {
    return EmailTemplateService.getTemplates(db, accountId);
  }

  static getTemplate(db, templateId) {
    return EmailTemplateService.getTemplate(db, templateId);
  }

  static createTemplate(db, data) {
    return EmailTemplateService.createTemplate(db, data);
  }

  static updateTemplate(db, templateId, updates) {
    return EmailTemplateService.updateTemplate(db, templateId, updates);
  }

  static deleteTemplate(db, templateId) {
    return EmailTemplateService.deleteTemplate(db, templateId);
  }

  static incrementTemplateUsage(db, templateId) {
    return EmailTemplateService.incrementTemplateUsage(db, templateId);
  }

  static toggleTemplateFavorite(db, templateId) {
    return EmailTemplateService.toggleTemplateFavorite(db, templateId);
  }

  static getTemplateCategories(db, accountId) {
    return EmailTemplateService.getTemplateCategories(db, accountId);
  }

  // ===========================================================================
  // GMAIL METHODS (delegate to this._gmail)
  // ===========================================================================

  async syncEmails(accountId, options) {
    return this._gmail.syncEmails(accountId, options);
  }

  async getEmails(accountId, options) {
    return this._gmail.getEmails(accountId, options);
  }

  async getEmail(accountId, emailId) {
    return this._gmail.getEmail(accountId, emailId);
  }

  async sendEmail(accountId, message) {
    return this._gmail.sendEmail(accountId, message);
  }

  async trashEmail(accountId, emailId) {
    return this._gmail.trashEmail(accountId, emailId);
  }

  async deleteEmail(accountId, emailId) {
    return this._gmail.deleteEmail(accountId, emailId);
  }

  async markAsRead(accountId, emailId, isRead) {
    return this._gmail.markAsRead(accountId, emailId, isRead);
  }

  async toggleStar(accountId, emailId, isStarred) {
    return this._gmail.toggleStar(accountId, emailId, isStarred);
  }

  async replyToEmail(accountId, emailId, message) {
    return this._gmail.replyToEmail(accountId, emailId, message);
  }

  async forwardEmail(accountId, emailId, message) {
    return this._gmail.forwardEmail(accountId, emailId, message);
  }

  // -- Batch operations --

  async batchModifyEmails(accountId, emailIds, modifications) {
    return this._gmail.batchModifyEmails(accountId, emailIds, modifications);
  }

  async batchTrashEmails(accountId, emailIds) {
    return this._gmail.batchTrashEmails(accountId, emailIds);
  }

  async batchDeleteEmails(accountId, emailIds) {
    return this._gmail.batchDeleteEmails(accountId, emailIds);
  }

  // -- Attachment methods --

  async downloadAttachment(accountId, messageId, attachmentId, filename) {
    return this._gmail.downloadAttachment(accountId, messageId, attachmentId, filename);
  }

  async getAttachments(accountId, messageId) {
    return this._gmail.getAttachments(accountId, messageId);
  }

  async getInlineImages(accountId, messageId) {
    return this._gmail.getInlineImages(accountId, messageId);
  }

  // -- Label methods --

  async getLabels(accountId) {
    return this._gmail.getLabels(accountId);
  }

  async getLabel(accountId, labelId) {
    return this._gmail.getLabel(accountId, labelId);
  }

  async createLabel(accountId, name, options) {
    return this._gmail.createLabel(accountId, name, options);
  }

  async updateLabel(accountId, labelId, updates) {
    return this._gmail.updateLabel(accountId, labelId, updates);
  }

  async deleteLabel(accountId, labelId) {
    return this._gmail.deleteLabel(accountId, labelId);
  }

  async applyLabel(accountId, emailId, labelId) {
    return this._gmail.applyLabel(accountId, emailId, labelId);
  }

  async removeLabel(accountId, emailId, labelId) {
    return this._gmail.removeLabel(accountId, emailId, labelId);
  }

  // -- Search methods (from mixin) --

  async searchEmails(accountId, query, options) {
    return this._gmail.searchEmails(accountId, query, options);
  }

  async saveSearch(accountId, name, query, isFavorite) {
    return this._gmail.saveSearch(accountId, name, query, isFavorite);
  }

  async getSavedSearches(accountId, options) {
    return this._gmail.getSavedSearches(accountId, options);
  }

  async updateSavedSearch(searchId, updates) {
    return this._gmail.updateSavedSearch(searchId, updates);
  }

  async deleteSavedSearch(searchId) {
    return this._gmail.deleteSavedSearch(searchId);
  }

  async recordSearchUsage(searchId) {
    return this._gmail.recordSearchUsage(searchId);
  }

  async getRecentSearches(accountId, limit) {
    return this._gmail.getRecentSearches(accountId, limit);
  }

  // ===========================================================================
  // CALENDAR METHODS (delegate to this._calendar)
  // ===========================================================================

  async listCalendars(accountId) {
    return this._calendar.listCalendars(accountId);
  }

  getCalendarsFromDB(accountId) {
    return this._calendar.getCalendarsFromDB(accountId);
  }

  toggleCalendarSync(accountId, calendarId, isSelected) {
    return this._calendar.toggleCalendarSync(accountId, calendarId, isSelected);
  }

  async syncAllCalendars(accountId, options) {
    return this._calendar.syncAllCalendars(accountId, options);
  }

  async syncCalendar(accountId, options) {
    return this._calendar.syncCalendar(accountId, options);
  }

  async getEvents(accountId, options) {
    return this._calendar.getEvents(accountId, options);
  }

  async createEvent(accountId, event) {
    return this._calendar.createEvent(accountId, event);
  }

  async updateEvent(accountId, eventId, updates) {
    return this._calendar.updateEvent(accountId, eventId, updates);
  }

  async deleteEvent(accountId, eventId) {
    return this._calendar.deleteEvent(accountId, eventId);
  }

  // ===========================================================================
  // CONTACTS METHODS (delegate to this._contacts)
  // ===========================================================================

  async syncContacts(accountId, options) {
    return this._contacts.syncContacts(accountId, options);
  }

  async getContacts(accountId, options) {
    return this._contacts.getContacts(accountId, options);
  }

  async getContact(accountId, contactId) {
    return this._contacts.getContact(accountId, contactId);
  }

  // ===========================================================================
  // SIGNATURE METHODS (delegate to this._signatures)
  // ===========================================================================

  getSignatures(accountId) {
    return this._signatures.getSignatures(accountId);
  }

  getSignature(signatureId) {
    return this._signatures.getSignature(signatureId);
  }

  createSignature(accountId, data) {
    return this._signatures.createSignature(accountId, data);
  }

  updateSignature(signatureId, data) {
    return this._signatures.updateSignature(signatureId, data);
  }

  deleteSignature(signatureId) {
    return this._signatures.deleteSignature(signatureId);
  }

  getDefaultSignature(accountId, type) {
    return this._signatures.getDefaultSignature(accountId, type);
  }

  setDefaultSignature(accountId, signatureId) {
    return this._signatures.setDefaultSignature(accountId, signatureId);
  }

  // ===========================================================================
  // COMPOSITE METHODS (implemented on facade)
  // ===========================================================================

  /**
   * Get sync status for all service types
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Sync status for gmail, calendar, contacts
   */
  async getSyncStatus(accountId) {
    const db = this._gmail.db;
    const stmt = db.prepare('SELECT * FROM account_sync_state WHERE account_id = ?');
    const states = stmt.all(accountId);
    const status = { gmail: null, calendar: null, contacts: null };

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
   * Sync all data types (emails, calendar, contacts) in parallel
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Results for each sync type
   */
  async syncAll(accountId) {
    console.log(`[GoogleService] Syncing all data for ${this._gmail.email}`);

    const results = await Promise.allSettled([
      this.syncEmails(accountId),
      this.syncCalendar(accountId),
      this.syncContacts(accountId)
    ]);

    const [emailResult, calendarResult, contactsResult] = results;

    return {
      emails: emailResult.status === 'fulfilled'
        ? emailResult.value
        : { error: emailResult.reason.message },
      calendar: calendarResult.status === 'fulfilled'
        ? calendarResult.value
        : { error: calendarResult.reason.message },
      contacts: contactsResult.status === 'fulfilled'
        ? contactsResult.value
        : { error: contactsResult.reason.message }
    };
  }
}

module.exports = GoogleAccountService;
