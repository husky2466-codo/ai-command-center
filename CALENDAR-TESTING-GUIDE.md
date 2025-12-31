# Calendar Testing Guide

## Quick Test Steps

### 1. Start the App
```bash
npm run dev:electron
```

### 2. Open DevTools
- Press `F12` or `Ctrl+Shift+I`
- Go to Console tab

### 3. Navigate to Calendar
- Click the "Calendar" tab in the app
- Account should auto-select: pmnicolasm@gmail.com

### 4. Watch Console Output

You should see logs like this:

```
[CalendarView] Loading events from 2024-12-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z
[GoogleService] Fetching live calendar events for pmnicolasm@gmail.com
[GoogleService] Fetched 15 live calendar events
[CalendarView] Received result: {success: true, data: Array(15)}
[CalendarView] Parsed events list: Array(15) Length: 15
```

### 5. Verify Events Display

**Month View** (default):
- Look for colored event chips on calendar days
- Events should show title
- Click an event to see details panel

**Week View**:
- Click "Week" button
- Events should appear in time slots
- Hover to see event titles

**Today Button**:
- Click "Today" to jump to current date
- Should show today's events highlighted

### 6. Test Sync Button

1. Click "Sync" button (top right)
2. Should show spinning icon briefly
3. Console should log:
   ```
   [CalendarView] Starting calendar sync for account: <account-id>
   [GoogleService] Syncing calendar for pmnicolasm@gmail.com (6 months ago to 1 year from now)
   [GoogleService] Calendar sync complete: X events
   [CalendarView] Sync result: {success: true, data: {synced: X}}
   ```
4. Events should persist to database

### 7. Test Event Detail

1. Click any event in month or week view
2. Detail panel should slide in from right
3. Should show:
   - Event title
   - Date & time
   - Location (if present)
   - Description (if present)
   - Attendees (if present)
   - Delete button

## What to Look For

### ✅ Success Indicators
- Events appear on calendar grid
- Event chips are clickable
- Detail panel shows complete info
- "Sync" button works without errors
- Console shows "Fetched X live calendar events"

### ❌ Failure Indicators
- Empty calendar (no events)
- Console errors about `timeMin` or `timeMax`
- "Failed to load events" error message
- Events don't appear after sync

## Common Issues & Fixes

### Issue: "No Google Accounts Connected"
**Fix**:
1. Go to Admin tab → Accounts section
2. Click "Add Account"
3. Sign in with Google
4. Grant calendar permissions

### Issue: Events not showing
**Check**:
1. Console for error messages
2. Account is selected in dropdown
3. Date range includes events (try clicking "Today")
4. Network connection is working

### Issue: "Failed to load events"
**Possible Causes**:
1. OAuth token expired - re-add account
2. Calendar API not enabled in Google Cloud Console
3. Missing calendar scopes - need to re-authenticate

## Debugging Tips

### Check Database for Synced Events
Open Electron DevTools Console and run:
```javascript
await window.electronAPI.dbQuery('SELECT COUNT(*) as count FROM account_calendar_events')
```

Should show count > 0 after sync.

### Check Account ID
```javascript
await window.electronAPI.googleListAccounts()
```

Should return array with at least one account.

### Manual Sync Test
```javascript
const accounts = await window.electronAPI.googleListAccounts();
const accountId = accounts.data[0].id;
await window.electronAPI.googleSyncCalendar(accountId);
```

## Expected Console Output (Full Example)

```
[CalendarView] Loading events from 2024-12-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z
[GoogleService] Initialized for pmnicolasm@gmail.com
[GoogleService] Fetching live calendar events for pmnicolasm@gmail.com
[GoogleService] Fetched 23 live calendar events
[CalendarView] Received result: {success: true, data: Array(23)}
[CalendarView] Parsed events list: (23) [{…}, {…}, {…}, ...] Length: 23

# After clicking Sync:
[CalendarView] Starting calendar sync for account: abc-123-def-456
[GoogleService] Syncing calendar for pmnicolasm@gmail.com (2024-06-30 to 2025-12-31)
[GoogleService] Calendar sync complete: 87 events
[CalendarView] Sync result: {success: true, data: {synced: 87}}
[CalendarView] Loading events from 2024-12-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z
[GoogleService] Fetching live calendar events for pmnicolasm@gmail.com
[GoogleService] Fetched 23 live calendar events
[CalendarView] Received result: {success: true, data: Array(23)}
[CalendarView] Parsed events list: (23) [{…}, {…}, {…}, ...] Length: 23
```

## Database Schema Reference

Events are stored in table `account_calendar_events` with columns:
- `id` - Event ID from Google
- `account_id` - Foreign key to connected_accounts
- `summary` - Event title
- `description` - Event description
- `location` - Event location
- `start_time` - Unix timestamp
- `end_time` - Unix timestamp
- `all_day` - Boolean (0/1)
- `status` - Event status (confirmed, tentative, cancelled)
- `attendees` - JSON array
- `organizer_email` - Event creator
- `raw_data` - Full Google Calendar event JSON
- `synced_at` - Last sync timestamp

## API Endpoints Used

### IPC Handlers (Electron Main Process)
- `window.electronAPI.googleListAccounts()` - Get connected Google accounts
- `window.electronAPI.googleGetEvents(accountId, options)` - Fetch calendar events
- `window.electronAPI.googleSyncCalendar(accountId)` - Sync to local database
- `window.electronAPI.googleCreateEvent(accountId, eventData)` - Create new event
- `window.electronAPI.googleDeleteEvent(accountId, eventId)` - Delete event

### Options for googleGetEvents
```javascript
{
  timeMin: '2024-12-01T00:00:00.000Z',  // ISO string (required for live fetch)
  timeMax: '2024-12-31T23:59:59.999Z',  // ISO string (optional)
  maxResults: 250,                       // Max events to return
  useLiveData: true                      // Fetch from Google API vs local DB
}
```

## Google Calendar API Scopes Required

Already configured in `electron/services/googleAuth.cjs`:
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar data
- `https://www.googleapis.com/auth/calendar.events` - Create/modify events

## Holidays in Google Calendar

Holidays appear as regular all-day events:
```javascript
{
  summary: "Christmas Day",
  start: { date: "2024-12-25" },  // Note: date field, not dateTime
  end: { date: "2024-12-26" }
}
```

The app handles all-day events correctly - they show up in the calendar grid.

## Next Steps After Verification

1. **Remove Debug Logs** (if desired):
   - Edit `src/components/calendar/CalendarView.jsx`
   - Remove or comment out `console.log` statements
   - Keep error logs (`console.error`)

2. **Optional Enhancements**:
   - Add auto-sync on account connection
   - Add periodic background sync (every 15 minutes)
   - Add visual indicator for cached vs live data
   - Add support for multiple calendars
   - Add special styling for holidays
   - Add color coding by calendar

3. **Performance Optimization**:
   - Use DB cache for fast loads
   - Only fetch live data when needed
   - Implement incremental sync (delta API)

## Report Issues

If events still don't show:

1. Copy full console output
2. Check Electron main process logs
3. Verify OAuth token in database:
   ```sql
   SELECT * FROM connected_accounts WHERE email = 'pmnicolasm@gmail.com'
   ```
4. Check Google Cloud Console for API quotas/errors
