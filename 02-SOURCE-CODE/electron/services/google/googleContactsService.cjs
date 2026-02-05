/**
 * GoogleContactsService - Contact management operations
 * Handles contact sync via People API
 */

const { google } = require('googleapis');
const { GoogleBaseService, withExponentialBackoff } = require('./googleBaseService.cjs');

/**
 * GoogleContactsService - Extends GoogleBaseService with contact operations
 */
class GoogleContactsService extends GoogleBaseService {
  constructor(db, email) {
    super(db, email);
    this.people = null;
  }

  /**
   * Initialize People API client
   * @returns {Promise<void>}
   */
  async initialize() {
    await super.initialize();
    this.people = google.people({ version: 'v1', auth: this.oauth2Client });
    console.log(`[GoogleContactsService] Initialized for ${this.email}`);
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

    console.log(`[GoogleContactsService] Syncing contacts for ${this.email}`);

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
        console.log(`[GoogleContactsService] Fetched ${connections.length} contacts from Google API (page ${pageToken ? 'continuation' : 'first'})`);

        for (const contact of connections) {
          this._upsertContact(accountId, contact);
          syncedCount++;
        }

        pageToken = response.data.nextPageToken;

      } while (pageToken);

      console.log(`[GoogleContactsService] Contacts sync complete: ${syncedCount} contacts total synced to database`);
      return { synced: syncedCount };
    } catch (error) {
      console.error(`[GoogleContactsService] Contacts sync failed:`, error.message);
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

  // =========================================================================
  // CONTACT RETRIEVAL
  // =========================================================================

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

    console.log(`[GoogleContactsService] getContacts: Found ${contacts.length} contacts in database for account ${accountId}`);

    // Return contacts in Google People API format by parsing raw_data
    return contacts.map(contact => {
      try {
        // Parse raw_data to get the original Google API format
        const rawContact = JSON.parse(contact.raw_data);
        return rawContact;
      } catch (error) {
        console.error(`[GoogleContactsService] Error parsing contact raw_data for ${contact.id}:`, error.message);
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
}

module.exports = GoogleContactsService;
