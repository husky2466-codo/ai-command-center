# Calendar View

Google Calendar integration with month, week, and day views for the AI Command Center.

## Features

### Views
- **Month View**: Full month grid with event chips
- **Week View**: 7-day view with hourly time slots
- **Day View**: Single day view (placeholder for future implementation)

### Event Management
- View event details in a side panel
- Create new events with title, description, location, date/time, and attendees
- Delete events
- All events sync with Google Calendar

### Account Management
- Multi-account support via account selector dropdown
- Sync calendar data on demand
- Requires Google account connection via Accounts module

## Google Calendar API Integration

The component uses the following IPC methods from `window.electronAPI`:

### Account Methods
- `googleListAccounts()` - Get all connected Google accounts
- `googleSyncCalendar(accountId)` - Sync calendar data for account

### Event Methods
- `googleGetEvents(accountId, options)` - Fetch events for date range
  - Options: `{ timeMin, timeMax, maxResults }`
- `googleCreateEvent(accountId, eventData)` - Create new calendar event
  - eventData: `{ summary, description, location, start, end, attendees }`
- `googleUpdateEvent(accountId, eventId, updates)` - Update existing event
- `googleDeleteEvent(accountId, eventId)` - Delete event

## Component Structure

```
CalendarView/
├── CalendarView.jsx    # Main component with view logic
├── CalendarView.css    # Styles for all views
└── README.md          # This file
```

## Usage

The Calendar component is automatically available in the sidebar navigation. It requires:

1. At least one Google account connected (via Accounts module)
2. Calendar sync enabled for the account

## Design

- **Accent Color**: Google Calendar Blue (#4285f4)
- **Icons**: Calendar, Clock, MapPin, Users, Plus (from lucide-react)
- **Layout**: Responsive with full calendar grid and optional event detail panel

## Month View Details

- 6-week grid showing current month plus surrounding days
- Each day shows up to 3 event chips
- "+N more" indicator for days with 4+ events
- Today highlighted with blue border and background
- Click any event chip to view details

## Week View Details

- 7-day columns with hourly time slots (24 hours)
- Events positioned absolutely based on start time and duration
- Time column on left shows hours (12 AM - 11 PM format)
- Events show title and start time
- Hover to highlight event

## Event Detail Panel

Appears on right side when event is clicked:
- Full event information
- Date, time, location
- Description
- Attendees with RSVP status
- Delete button

## Create Event Modal

Form fields:
- Title (required)
- Description (optional)
- Location (optional)
- Start Date & Time (required)
- End Date & Time (required)
- Attendees (comma-separated emails, optional)

## Future Enhancements

- Day view implementation
- Edit event functionality
- Event recurring patterns
- Calendar color coding
- Quick event creation (click-to-create on calendar grid)
- Drag-and-drop event rescheduling
- Multiple calendar support per account
- Event reminders/notifications
- Search and filter events
- Integration with Meetings module for prep sheets
