# Calendar Multi-Calendar Sync Fix

## Problem

Calendar events from linked apps (like Lasso scheduling app) were not showing up in the calendar view. The issue was that the calendar sync was hardcoded to only sync the "primary" calendar.

## Root Cause

In `electron/services/googleAccountService.cjs`:
- `syncCalendar()` method always used `calendarId = 'primary'`
- `getEvents()` method always queried `calendarId: 'primary'`
- No method to list available calendars
- No way to sync multiple calendars

Google Calendar API supports multiple calendars per account. When apps like Lasso create events, they often create them in separate calendars (not the primary one).

## Solution

### 1. Database Schema (Migration 010)
Created `account_calendars` table to store calendar metadata:
```sql
CREATE TABLE account_calendars (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  background_color TEXT,
  foreground_color TEXT,
  is_primary INTEGER DEFAULT 0,
  is_selected INTEGER DEFAULT 1,
  -- ... other fields
)
```

### 2. Service Methods

Added to `googleAccountService.cjs`:

- **`listCalendars(accountId)`** - Fetches all calendars from Google Calendar API and stores in DB
- **`getCalendarsFromDB(accountId)`** - Returns calendars from local database
- **`toggleCalendarSync(accountId, calendarId, isSelected)`** - Enable/disable sync for specific calendar
- **`syncAllCalendars(accountId, options)`** - Syncs events from all selected calendars
- **`_upsertCalendar(accountId, calendar)`** - Private method to store calendar metadata

### 3. IPC Handlers

Added to `electron/main.cjs`:
- `google:list-calendars` - Fetch calendars from Google API
- `google:get-calendars` - Get calendars from local DB
- `google:toggle-calendar-sync` - Toggle calendar visibility

Updated:
- `google:sync-calendar` - Now calls `syncAllCalendars()` instead of `syncCalendar()`

### 4. UI Updates

Updated `src/components/calendar/CalendarView.jsx`:

**New Features:**
- "Calendars" button in header to open calendar manager
- Calendar Manager modal with checkboxes to select which calendars to sync
- Events now display with calendar color (border-left and dot)
- Event detail panel shows which calendar the event belongs to
- Tooltips show calendar name on hover

**Visual Indicators:**
- Color-coded event chips and week view events
- Calendar color dots in event list
- "Primary" badge for primary calendar in manager
- Calendar name and color in event details

### 5. CSS Styling

Added to `CalendarView.css`:
- `.calendar-manager` - Modal styling
- `.calendar-list-item` - Individual calendar items with checkboxes
- `.calendar-color-indicator` - Circular color dots
- `.calendar-event-chip` - Border-left color from calendar
- `.calendar-week-event` - Border-left color for week view

## How It Works

1. **First Sync**: When user clicks "Sync", the app:
   - Calls `syncAllCalendars()`
   - Which first calls `listCalendars()` to refresh calendar list
   - Then syncs events from all calendars where `is_selected = 1`

2. **Calendar Management**: User clicks "Calendars" button:
   - Opens modal showing all available calendars
   - Can check/uncheck calendars to control which ones sync
   - Changes are saved immediately to DB
   - Events reload to reflect new selection

3. **Event Display**: Events show calendar color:
   - Month view: Left border and dot color
   - Week view: Left border color
   - Detail panel: Calendar name with color indicator

## Files Modified

### Database
- `electron/database/migrations/010_account_calendars.cjs` (NEW)
- `electron/database/db.cjs` (added migration)

### Backend
- `electron/services/googleAccountService.cjs` (added 5 new methods, updated syncCalendar handler)
- `electron/main.cjs` (added 3 IPC handlers, updated google:sync-calendar)
- `electron/preload.cjs` (exposed 3 new IPC methods)

### Frontend
- `src/components/calendar/CalendarView.jsx` (added calendar manager, updated event rendering)
- `src/components/calendar/CalendarView.css` (added calendar manager styles)

## Testing

1. Connect a Google account with multiple calendars (e.g., Lasso appointments calendar)
2. Click "Calendars" button
3. Verify all calendars are listed with correct colors
4. Uncheck a calendar, close modal
5. Verify events from that calendar disappear
6. Re-check the calendar
7. Click "Sync" to refresh events
8. Verify events from all selected calendars appear
9. Click on an event - verify calendar name shows in detail panel

## Default Behavior

- All calendars are selected by default (`is_selected = 1`)
- First sync will fetch and sync all calendars
- Primary calendar is marked with "Primary" badge
- Calendar colors match Google Calendar colors

## Benefits

- Users can now see events from app-created calendars (Lasso, etc.)
- Easy visual distinction between different calendar sources
- Fine-grained control over which calendars to sync
- Better performance (can disable unused calendars)
- Matches user expectations from Google Calendar

## Build Status

Build succeeded with no errors:
```
✓ 1956 modules transformed
✓ built in 2.95s
```
