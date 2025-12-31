# Calendar Sync Fix - 2025-12-30

## Problem
Google Calendar events (including holidays) are not showing in the Calendar/Meetings tab. OAuth connection works (pmnicolasm@gmail.com), but calendar data doesn't display.

## Root Causes Found

### 1. API Parameter Mismatch
**Location**: `electron/services/googleAccountService.cjs` - `getEvents()` method

**Issue**: CalendarView was sending `timeMin`/`timeMax` (ISO strings) but getEvents() expected `startTime`/`endTime` (Unix timestamps).

**Fix**: Updated `getEvents()` to:
- Accept both formats (ISO strings and timestamps)
- Default to fetching live data from Google Calendar API
- Fall back to local database if API fails
- Transform events to match Google Calendar API format

### 2. Limited Time Range for Sync
**Location**: `electron/services/googleAccountService.cjs` - `syncCalendar()` method

**Issue**: Was only syncing future events (from `new Date()` onwards), missing past events and holidays.

**Fix**: Updated `syncCalendar()` to:
- Default timeMin: 6 months ago
- Default timeMax: 1 year from now
- Support custom time ranges via options
- Increased default maxResults from 100 to 250

### 3. Event Data Not Fetched Live
**Issue**: `getEvents()` was only reading from local DB, which was empty if calendar was never synced.

**Fix**: Changed default behavior to fetch live from Google Calendar API when `timeMin`/`timeMax` provided (which CalendarView does).

## Files Modified

### `electron/services/googleAccountService.cjs`

#### getEvents() Method (lines 1219-1336)
```javascript
// Now supports:
- timeMin/timeMax (ISO strings) - triggers live Google API fetch
- startTime/endTime (timestamps) - uses local DB
- useLiveData option (default: true)
- Falls back to DB if API fails
- Transforms DB events to match Google Calendar format
```

#### syncCalendar() Method (lines 1140-1188)
```javascript
// Now includes:
- Default timeMin: 6 months ago
- Default timeMax: 1 year from now
- Support for custom time ranges
- maxResults: 250 (was 100)
```

### `src/components/calendar/CalendarView.jsx`

#### loadEvents() Method (lines 85-116)
- Added console logging for debugging
- Logs date range being requested
- Logs API response
- Logs parsed events list

#### handleSyncCalendar() Method (lines 118-135)
- Added console logging
- Logs sync start and result

## Testing Checklist

1. **Open DevTools Console** - Watch for logs
2. **Navigate to Calendar Tab**
3. **Select Google Account** (pmnicolasm@gmail.com)
4. **Check Console Logs**:
   - Should see: `[CalendarView] Loading events from ...`
   - Should see: `[GoogleService] Fetching live calendar events for pmnicolasm@gmail.com`
   - Should see: `[GoogleService] Fetched X live calendar events`
   - Should see: `[CalendarView] Parsed events list: Array(X)`

5. **Verify Events Display**:
   - Month view should show colored event chips
   - Week view should show events in time slots
   - Click event to see detail panel

6. **Test Sync Button**:
   - Click "Sync" button
   - Should see: `[CalendarView] Starting calendar sync`
   - Should see: `[GoogleService] Calendar sync complete: X events`
   - Events should persist to database

## Expected Behavior

### On Load
- CalendarView automatically calls `googleGetEvents()` with date range
- Service fetches live events from Google Calendar API
- Events display immediately (no sync needed)

### On Sync
- Manually triggered via "Sync" button
- Fetches 6 months past to 1 year future
- Stores events in local database
- Subsequent loads can use DB for faster access

## OAuth Scopes Required
Already configured correctly in `electron/services/googleAuth.cjs`:
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events`

## Database Schema
Table `account_calendar_events` exists with correct structure (migration 004).

## Additional Notes

- Holidays are regular calendar events in Google Calendar
- All-day events have `start.date` instead of `start.dateTime`
- Recurring events are expanded with `singleEvents: true`
- Transforms ensure both DB and API responses match expected format

## Rollback Plan
If issues occur, revert:
1. `electron/services/googleAccountService.cjs` - methods getEvents() and syncCalendar()
2. `src/components/calendar/CalendarView.jsx` - remove console.log statements

## Next Steps After Fix Verified

1. Remove or reduce console.log statements (keep error logs)
2. Consider adding:
   - Auto-sync on account connection
   - Periodic background sync
   - Visual indicator for cached vs live data
   - Support for multiple calendars (not just 'primary')
   - Holiday detection/special styling
