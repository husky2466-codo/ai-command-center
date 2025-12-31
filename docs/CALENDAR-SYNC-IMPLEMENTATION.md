# Calendar Sync Implementation Documentation

## Overview
This document describes the Google Calendar integration implementation in AI Command Center, including the fix applied on 2025-12-30 to resolve calendar event display issues.

## Architecture

### Components

1. **Frontend**: `src/components/calendar/CalendarView.jsx`
   - React component for calendar UI
   - Month, Week, Day views
   - Event detail panel
   - Create/delete event modals

2. **Service Layer**: `electron/services/googleAccountService.cjs`
   - Google Calendar API integration
   - Event sync and CRUD operations
   - Token refresh and error handling

3. **IPC Layer**: `electron/main.cjs` + `electron/preload.cjs`
   - Bridges frontend and backend
   - Exposes calendar methods to renderer process

4. **Database**: SQLite table `account_calendar_events`
   - Local cache for calendar events
   - Enables offline access
   - Faster subsequent loads

## Data Flow

### Loading Events (Live Fetch)
```
CalendarView.loadEvents()
  → window.electronAPI.googleGetEvents(accountId, {timeMin, timeMax})
    → IPC: 'google:get-events'
      → main.cjs handler
        → GoogleAccountService.getEvents(accountId, options)
          → Google Calendar API: events.list()
            → Transform events to standard format
              → Return to frontend
                → CalendarView.setEvents(events)
                  → Render in month/week/day grid
```

### Syncing Events (Database Cache)
```
CalendarView.handleSyncCalendar()
  → window.electronAPI.googleSyncCalendar(accountId)
    → IPC: 'google:sync-calendar'
      → main.cjs handler
        → GoogleAccountService.syncCalendar(accountId)
          → Google Calendar API: events.list() [6 months past to 1 year future]
            → For each event:
              → _upsertCalendarEvent() [INSERT OR REPLACE into DB]
            → Return sync count
          → CalendarView shows success message
```

## Methods

### GoogleAccountService.getEvents()

**Purpose**: Fetch calendar events, either live from Google or from local database

**Parameters**:
```javascript
{
  // For live Google API fetch:
  timeMin: '2024-12-01T00:00:00.000Z',  // ISO string
  timeMax: '2024-12-31T23:59:59.999Z',  // ISO string
  maxResults: 250,                       // Max events

  // For local database query:
  startTime: 1701388800000,              // Unix timestamp (ms)
  endTime: 1704067199999,                // Unix timestamp (ms)
  limit: 100,                            // Max events

  // Control behavior:
  useLiveData: true                      // true = API, false = DB only
}
```

**Returns**: Array of event objects in Google Calendar format
```javascript
[
  {
    id: 'event_123',
    summary: 'Team Meeting',
    description: 'Weekly sync',
    location: 'Conference Room A',
    start: {
      dateTime: '2024-12-15T14:00:00Z',
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: '2024-12-15T15:00:00Z',
      timeZone: 'America/New_York'
    },
    status: 'confirmed',
    attendees: [
      { email: 'user@example.com', responseStatus: 'accepted' }
    ],
    organizer: { email: 'organizer@example.com' },
    htmlLink: 'https://calendar.google.com/...',
    hangoutLink: 'https://meet.google.com/...'
  }
]
```

**Logic Flow**:
1. Check if `useLiveData` is true AND `timeMin` or `timeMax` provided
2. If yes → Fetch from Google Calendar API
   - Call `calendar.events.list()` with parameters
   - Transform events to standard format
   - Return events array
3. If API fails OR `useLiveData` is false → Query local database
   - Convert ISO strings to timestamps if needed
   - Query `account_calendar_events` table
   - Transform DB records to match API format
   - Return events array

### GoogleAccountService.syncCalendar()

**Purpose**: Fetch events from Google and store in local database for caching

**Parameters**:
```javascript
{
  calendarId: 'primary',      // Which calendar to sync
  maxResults: 250,            // Max events to fetch
  timeMin: '2024-06-30...',   // Default: 6 months ago
  timeMax: '2025-12-31...'    // Default: 1 year from now
}
```

**Returns**: Sync result
```javascript
{
  synced: 87  // Number of events synced
}
```

**Logic Flow**:
1. Ensure OAuth token is valid (refresh if needed)
2. Call Google Calendar API with date range
3. For each event received:
   - Call `_upsertCalendarEvent()` to save to DB
   - Uses `INSERT OR REPLACE` to update existing events
4. Return count of synced events

### GoogleAccountService._upsertCalendarEvent()

**Purpose**: Insert or update a calendar event in the database

**Parameters**:
- `accountId` - Account UUID
- `calendarId` - Calendar ID (e.g., 'primary')
- `event` - Google Calendar event object

**Database Operation**:
```sql
INSERT OR REPLACE INTO account_calendar_events (
  id, account_id, calendar_id, summary, description, location,
  start_time, end_time, all_day, status, attendees, organizer_email,
  recurrence, reminders, raw_data, synced_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Data Transformations**:
- `start_time`: ISO string → Unix timestamp (ms)
- `end_time`: ISO string → Unix timestamp (ms)
- `all_day`: Determined by presence of `dateTime` field
- `attendees`: Array → JSON string
- `recurrence`: Array → JSON string
- `reminders`: Object → JSON string
- `raw_data`: Full event object → JSON string

## Event Types

### Regular Timed Event
```javascript
{
  summary: 'Team Meeting',
  start: { dateTime: '2024-12-15T14:00:00Z', timeZone: 'America/New_York' },
  end: { dateTime: '2024-12-15T15:00:00Z', timeZone: 'America/New_York' }
}
```

### All-Day Event (including Holidays)
```javascript
{
  summary: 'Christmas Day',
  start: { date: '2024-12-25' },  // Note: 'date' field, not 'dateTime'
  end: { date: '2024-12-26' }     // End date is exclusive
}
```

### Recurring Event
```javascript
{
  summary: 'Weekly Standup',
  recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
  start: { dateTime: '2024-12-02T09:00:00Z' },
  end: { dateTime: '2024-12-02T09:30:00Z' }
}
```
Note: With `singleEvents: true`, recurring events are expanded into individual instances.

## OAuth Scopes

Required scopes (configured in `electron/services/googleAuth.cjs`):

1. **Read Access**:
   ```
   https://www.googleapis.com/auth/calendar.readonly
   ```
   - List calendars
   - Read calendar events
   - Read event details

2. **Write Access**:
   ```
   https://www.googleapis.com/auth/calendar.events
   ```
   - Create events
   - Update events
   - Delete events

## Database Schema

### Table: `account_calendar_events`

```sql
CREATE TABLE account_calendar_events (
  id TEXT PRIMARY KEY,              -- Google event ID
  account_id TEXT NOT NULL,         -- FK to connected_accounts
  calendar_id TEXT,                 -- Calendar ID (e.g., 'primary')
  summary TEXT,                     -- Event title
  description TEXT,                 -- Event description
  location TEXT,                    -- Event location
  start_time INTEGER,               -- Unix timestamp (ms)
  end_time INTEGER,                 -- Unix timestamp (ms)
  all_day INTEGER DEFAULT 0,        -- Boolean: 0 = timed, 1 = all-day
  status TEXT,                      -- confirmed, tentative, cancelled
  attendees TEXT,                   -- JSON array of attendees
  organizer_email TEXT,             -- Event creator email
  recurrence TEXT,                  -- JSON array of RRULE strings
  reminders TEXT,                   -- JSON object of reminder settings
  raw_data TEXT,                    -- Full Google event JSON
  synced_at INTEGER,                -- Last sync timestamp
  FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_account ON account_calendar_events(account_id);
CREATE INDEX idx_events_start ON account_calendar_events(start_time);
```

## Error Handling

### Token Expiration
- Detected in `ensureValidToken()` method
- Automatically refreshes using refresh token
- New token saved to secure storage
- Operation retries with new token

### API Rate Limiting
- Uses `withExponentialBackoff()` wrapper
- Retries on 429 (Too Many Requests) or 403 (Forbidden)
- Exponential delay: 1s, 2s, 4s, 8s, 16s, 32s
- Max 5 retry attempts
- Logs retry attempts to console

### Network Failures
- Caught in try/catch blocks
- Error message displayed in UI
- Falls back to cached data if available
- User can retry manually

### Missing Scopes
- Detected when API returns 403 Forbidden
- User must re-authenticate with correct scopes
- App prompts to reconnect account

## Performance Considerations

### Live Fetch vs Database Cache

**Live Fetch** (default):
- ✅ Always up-to-date
- ✅ Includes real-time changes
- ❌ Requires network connection
- ❌ Slower (API latency)
- ❌ Counts against API quota

**Database Cache**:
- ✅ Fast (no network)
- ✅ Works offline
- ✅ No API quota usage
- ❌ May be stale
- ❌ Requires periodic sync

**Hybrid Approach** (current implementation):
- Default: Live fetch for current view
- Fallback: Database if API fails
- Manual: Sync button for explicit cache update
- Future: Background sync every 15 minutes

### API Quota Limits

Google Calendar API Free Tier:
- 1,000,000 queries per day
- 100 queries per 100 seconds per user

Current usage per load:
- 1 query per view change
- 1 query per month navigation
- 1 query per sync operation

Typical daily usage: ~50-100 queries (well within limits)

## Testing

### Unit Tests (Future)
- Mock Google Calendar API responses
- Test event transformation logic
- Test database upsert operations
- Test date range calculations

### Integration Tests (Future)
- Test end-to-end event loading
- Test sync with real Google account (sandbox)
- Test error recovery scenarios
- Test offline/online transitions

### Manual Testing
1. Load calendar view → Should fetch events
2. Navigate months → Should update event range
3. Click sync → Should save to database
4. Disconnect network → Should fall back to cache
5. Create event → Should appear immediately
6. Delete event → Should remove from view

## Future Enhancements

### Planned Features
1. **Multi-Calendar Support**
   - List all user calendars
   - Select which calendars to display
   - Color-code events by calendar

2. **Background Sync**
   - Auto-sync every 15 minutes
   - Incremental sync (delta API)
   - Push notifications for new events

3. **Enhanced Filtering**
   - Filter by calendar
   - Filter by attendee
   - Filter by event type
   - Search event content

4. **Event Management**
   - Drag-and-drop to reschedule
   - Inline editing
   - Quick event creation
   - Event templates

5. **Meeting Integration**
   - Link calendar events to meetings table
   - Auto-generate prep sheets
   - Track commitments
   - Sync attendees to contacts

### Technical Debt
1. **Incremental Sync**: Use Google Calendar sync token API
2. **Caching Strategy**: Implement cache invalidation rules
3. **Error Recovery**: Better handling of partial failures
4. **Performance**: Implement virtual scrolling for large event lists

## Related Files

### Source Files
- `src/components/calendar/CalendarView.jsx` - Main UI component
- `src/components/calendar/CalendarView.css` - Styles
- `electron/services/googleAccountService.cjs` - Calendar sync logic
- `electron/services/googleAuth.cjs` - OAuth flow
- `electron/services/tokenStorage.cjs` - Secure token storage
- `electron/main.cjs` - IPC handlers (lines 905-920, 1407-1423)
- `electron/preload.cjs` - IPC method exposure (lines 81, 102)

### Database
- `electron/database/migrations/004_accounts.cjs` - Schema definition

### Documentation
- `CALENDAR-FIX.md` - Fix implementation details
- `CALENDAR-TESTING-GUIDE.md` - Testing instructions
- `docs/API-SERVER.md` - API reference (calendar endpoints)

## Troubleshooting

### Events not loading
1. Check console for errors
2. Verify account is connected: `window.electronAPI.googleListAccounts()`
3. Test API call: `window.electronAPI.googleGetEvents(accountId, {timeMin: new Date().toISOString()})`
4. Check OAuth scopes in Google Cloud Console

### Sync fails
1. Check token validity
2. Verify calendar API is enabled in Google Cloud Console
3. Check API quota limits
4. Review error logs in Electron main process

### Events display incorrectly
1. Check event data structure in console
2. Verify timezone handling
3. Test all-day vs timed events
4. Check date range calculations

### Performance issues
1. Reduce `maxResults` parameter
2. Use database cache instead of live fetch
3. Implement pagination
4. Add loading indicators

## Support

For issues or questions:
1. Check console logs for error messages
2. Review this documentation
3. Test with CALENDAR-TESTING-GUIDE.md
4. Check Google Calendar API documentation
5. Verify OAuth token is valid
