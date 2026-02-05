/**
 * GoogleCalendarService - Calendar event operations
 * Handles calendar sync, event CRUD operations
 */

const { google } = require('googleapis');
const { GoogleBaseService, withExponentialBackoff, isoToTimestamp } = require('./googleBaseService.cjs');

/**
 * GoogleCalendarService - Extends GoogleBaseService with calendar operations
 */
class GoogleCalendarService extends GoogleBaseService {
  constructor(db, email) {
    super(db, email);
    this.calendar = null;
  }

  /**
   * Initialize Calendar API client
   * @returns {Promise<void>}
   */
  async initialize() {
    await super.initialize();
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    console.log(`[GoogleCalendarService] Initialized for ${this.email}`);
  }

  // =========================================================================
  // CALENDAR SYNC
  // =========================================================================

  /**
   * Sync calendar events
   * @param {string} accountId - Account ID
   * @param {Object} options - Sync options
   * @param {string} options.calendarId - Calendar ID (default: 'primary')
   * @param {number} options.maxResults - Max events to fetch (default: 100)
   * @returns {Promise<Object>} Sync results
   */
  async syncCalendar(accountId, options = {}) {
    await this.ensureValidToken();

    const { calendarId = 'primary', maxResults = 100 } = options;

    console.log(`[GoogleCalendarService] Syncing calendar for ${this.email}`);

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.calendar.events.list({
          calendarId,
          timeMin: new Date().toISOString(),
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

      console.log(`[GoogleCalendarService] Calendar sync complete: ${syncedCount} events`);
      return { synced: syncedCount };
    } catch (error) {
      console.error(`[GoogleCalendarService] Calendar sync failed:`, error.message);
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

  // =========================================================================
  // EVENT RETRIEVAL
  // =========================================================================

  /**
   * Get calendar events from local database
   * @param {string} accountId - Account ID
   * @param {Object} options - Query options
   * @param {number} options.startTime - Start time (Unix timestamp)
   * @param {number} options.endTime - End time (Unix timestamp)
   * @param {number} options.limit - Max results (default: 100)
   * @returns {Promise<Array>} List of events
   */
  async getEvents(accountId, options = {}) {
    const { startTime = Date.now(), endTime = null, limit = 100 } = options;

    let query = 'SELECT * FROM account_calendar_events WHERE account_id = ? AND start_time >= ?';
    const params = [accountId, startTime];

    if (endTime) {
      query += ' AND start_time <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY start_time ASC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const events = stmt.all(...params);

    return events.map(event => ({
      ...event,
      attendees: JSON.parse(event.attendees || '[]'),
      recurrence: JSON.parse(event.recurrence || '[]'),
      reminders: JSON.parse(event.reminders || '{}'),
      raw_data: null
    }));
  }

  // =========================================================================
  // EVENT OPERATIONS
  // =========================================================================

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

    console.log(`[GoogleCalendarService] Event created: ${response.data.id}`);
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

    console.log(`[GoogleCalendarService] Event updated: ${eventId}`);
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

    console.log(`[GoogleCalendarService] Event deleted: ${eventId}`);
  }
}

module.exports = GoogleCalendarService;
