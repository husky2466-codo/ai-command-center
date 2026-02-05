/**
 * GoogleCalendarService - Calendar event operations
 * Handles calendar list management, multi-calendar sync, event CRUD operations
 *
 * Methods: listCalendars, getCalendarsFromDB, toggleCalendarSync, _upsertCalendar,
 *          syncAllCalendars, syncCalendar, _upsertCalendarEvent, getEvents,
 *          createEvent, updateEvent, deleteEvent
 */

const { google } = require('googleapis');
const { GoogleBaseService, withExponentialBackoff, isoToTimestamp } = require('./base.cjs');

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
  // CALENDAR LIST MANAGEMENT
  // =========================================================================

  /**
   * List all calendars available to the user
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} List of calendars
   */
  async listCalendars(accountId) {
    await this.ensureValidToken();

    try {
      const response = await withExponentialBackoff(async () => {
        return await this.calendar.calendarList.list();
      });

      const calendars = response.data.items || [];

      // Store calendar metadata in database
      for (const calendar of calendars) {
        this._upsertCalendar(accountId, calendar);
      }

      console.log(`[GoogleService] Listed ${calendars.length} calendars for ${this.email}`);
      return calendars;
    } catch (error) {
      console.error(`[GoogleService] Failed to list calendars:`, error.message);
      throw error;
    }
  }

  /**
   * Get calendars from local database
   * @param {string} accountId - Account ID
   * @returns {Array} List of calendars
   */
  getCalendarsFromDB(accountId) {
    const stmt = this.db.prepare(`
      SELECT * FROM account_calendars
      WHERE account_id = ?
      ORDER BY is_primary DESC, summary ASC
    `);
    return stmt.all(accountId);
  }

  /**
   * Toggle calendar selection for sync
   * @param {string} accountId - Account ID
   * @param {string} calendarId - Calendar ID
   * @param {boolean} isSelected - Whether to sync this calendar
   */
  toggleCalendarSync(accountId, calendarId, isSelected) {
    const stmt = this.db.prepare(`
      UPDATE account_calendars
      SET is_selected = ?
      WHERE account_id = ? AND calendar_id = ?
    `);
    stmt.run(isSelected ? 1 : 0, accountId, calendarId);
    console.log(`[GoogleService] Calendar ${calendarId} sync ${isSelected ? 'enabled' : 'disabled'}`);
  }

  /**
   * Upsert calendar metadata into database
   * @private
   */
  _upsertCalendar(accountId, calendar) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO account_calendars (
        id, account_id, calendar_id, summary, description, location,
        time_zone, color_id, background_color, foreground_color,
        access_role, is_primary, is_selected, synced_at, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const calendarDbId = `${accountId}_${calendar.id}`;
    const isPrimary = calendar.primary ? 1 : 0;

    // Get existing is_selected value or default to 1 (selected)
    const existing = this.db.prepare(
      'SELECT is_selected FROM account_calendars WHERE id = ?'
    ).get(calendarDbId);
    const isSelected = existing ? existing.is_selected : 1;

    stmt.run(
      calendarDbId,
      accountId,
      calendar.id,
      calendar.summary,
      calendar.description,
      calendar.location,
      calendar.timeZone,
      calendar.colorId,
      calendar.backgroundColor,
      calendar.foregroundColor,
      calendar.accessRole,
      isPrimary,
      isSelected,
      Date.now(),
      JSON.stringify(calendar)
    );
  }

  // =========================================================================
  // CALENDAR SYNC
  // =========================================================================

  /**
   * Sync calendar events from all selected calendars
   * @param {string} accountId - Account ID
   * @param {Object} options - Sync options
   * @param {number} options.maxResults - Max events to fetch per calendar (default: 250)
   * @param {string} options.timeMin - Start time (ISO string, default: 6 months ago)
   * @param {string} options.timeMax - End time (ISO string, default: 1 year from now)
   * @param {boolean} options.syncAllCalendars - Sync all selected calendars (default: true)
   * @returns {Promise<Object>} Sync results
   */
  async syncAllCalendars(accountId, options = {}) {
    await this.ensureValidToken();

    const {
      maxResults = 250,
      timeMin = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      syncAllCalendars = true
    } = options;

    const DEBUG_CALENDAR = process.env.DEBUG_CALENDAR === 'true';

    try {
      // First, refresh the calendar list
      await this.listCalendars(accountId);

      // Get selected calendars from DB
      const calendars = this.getCalendarsFromDB(accountId);
      const selectedCalendars = calendars.filter(cal => cal.is_selected === 1);

      if (DEBUG_CALENDAR) {
        console.log(`[GoogleService] Syncing ${selectedCalendars.length} calendars for ${this.email}`);
      }

      let totalSynced = 0;
      const results = {};

      for (const calendar of selectedCalendars) {
        try {
          const result = await this.syncCalendar(accountId, {
            calendarId: calendar.calendar_id,
            maxResults,
            timeMin,
            timeMax
          });

          results[calendar.calendar_id] = result;
          totalSynced += result.synced;
        } catch (error) {
          console.error(`[GoogleService] Failed to sync calendar ${calendar.summary}:`, error.message);
          results[calendar.calendar_id] = { error: error.message };
        }
      }

      if (DEBUG_CALENDAR) {
        console.log(`[GoogleService] Multi-calendar sync complete: ${totalSynced} total events`);
      }

      return {
        totalSynced,
        calendars: selectedCalendars.length,
        results
      };
    } catch (error) {
      console.error(`[GoogleService] Multi-calendar sync failed:`, error.message);
      throw error;
    }
  }

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

    const DEBUG_CALENDAR = process.env.DEBUG_CALENDAR === 'true';
    if (DEBUG_CALENDAR) console.log(`[GoogleService] Syncing calendar for ${this.email} (${timeMin} to ${timeMax})`);

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

      if (DEBUG_CALENDAR) console.log(`[GoogleService] Calendar sync complete: ${syncedCount} events`);
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

  // =========================================================================
  // EVENT RETRIEVAL
  // =========================================================================

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

    const DEBUG_CALENDAR = process.env.DEBUG_CALENDAR === 'true';
    let apiFailed = false;

    // If timeMin/timeMax provided (ISO strings), fetch live from Google Calendar
    if (useLiveData && (timeMin || timeMax)) {
      if (DEBUG_CALENDAR) console.log(`[GoogleService] Fetching live calendar events for ${this.email}`);
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
        if (DEBUG_CALENDAR) console.log(`[GoogleService] Fetched ${events.length} live calendar events`);

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
        if (DEBUG_CALENDAR) console.log(`[GoogleService] Falling back to local DB`);
        apiFailed = true;
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

    if (DEBUG_CALENDAR) console.log(`[GoogleService] Retrieved ${events.length} events from local DB`);

    // If both API and DB failed/empty, log warning
    if (apiFailed && events.length === 0) {
      console.warn(`[GoogleService] Both live API and local DB returned no events for account ${accountId}. User may see empty calendar.`);
    }

    // Transform DB events to match Google Calendar API format
    return events.map(event => {
      const rawData = event.raw_data ? JSON.parse(event.raw_data) : null;

      // For all-day events without rawData, use UTC date to avoid timezone shifts
      const getDateOnly = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      };

      return {
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: rawData?.start || {
          dateTime: event.all_day ? null : new Date(event.start_time).toISOString(),
          date: event.all_day ? getDateOnly(event.start_time) : null
        },
        end: rawData?.end || {
          dateTime: event.all_day ? null : new Date(event.end_time).toISOString(),
          date: event.all_day ? getDateOnly(event.end_time) : null
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
}

module.exports = GoogleCalendarService;
