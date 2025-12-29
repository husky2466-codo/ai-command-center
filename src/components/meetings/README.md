# Meetings Module

**Status**: ✅ Complete
**Module Accent**: Blue (#3b82f6)
**Dependencies**: Database layer, Contacts (Relationships module)

---

## Overview

The Meetings module provides comprehensive meeting management with calendar view, participant tracking, prep sheet generation, and commitment extraction from meeting notes.

## Features Implemented

### Core Functionality
- ✅ Meeting CRUD operations (Create, Read, Update, Delete)
- ✅ Master-detail layout with sidebar list and detail panel
- ✅ Meeting search by title, description, or participants
- ✅ View filtering: Upcoming, Past, All
- ✅ Time-based grouping: Today, Yesterday, This Week, Earlier, Upcoming

### Meeting Details
- ✅ Date/time and duration display
- ✅ Location (physical or virtual link)
- ✅ Status badges (scheduled, completed, cancelled)
- ✅ Participant management (linked to Contacts)
- ✅ Meeting description

### Prep Sheet Generation
- ✅ Automatic prep sheet generation from participant data
- ✅ Attendee context (title, company, professional background)
- ✅ Last interaction with each participant
- ✅ Previous meeting history with participants
- ✅ Talking points section

### Post-Meeting Features
- ✅ Meeting notes editor (auto-save with 2s debounce)
- ✅ Commitment extraction from notes (keyword-based)
- ✅ Commitment display with assignee and due date

### UI Components
- ✅ Responsive master-detail layout
- ✅ Tab navigation (Details, Prep, Notes, Commitments)
- ✅ Modal for creating/editing meetings
- ✅ Participant cards with avatars
- ✅ Empty states for all sections
- ✅ Loading states

---

## File Structure

```
src/components/meetings/
├── Meetings.jsx           # Main container component
├── Meetings.css          # Blue-accented styling
└── README.md             # This file

src/services/
└── meetingService.js     # Business logic and database operations
```

---

## Database Schema

### `meetings` table
```sql
- id (TEXT PRIMARY KEY)
- title (TEXT NOT NULL)
- description (TEXT)
- scheduled_at (DATETIME)
- duration_minutes (INTEGER DEFAULT 60)
- location (TEXT)
- calendar_link (TEXT)
- prep_sheet (TEXT) -- JSON
- post_notes (TEXT) -- Markdown
- status (TEXT) -- 'scheduled', 'completed', 'cancelled'
- created_at (DATETIME)
- updated_at (DATETIME)
```

### `meeting_participants` table
```sql
- meeting_id (TEXT REFERENCES meetings)
- contact_id (TEXT REFERENCES contacts)
- role (TEXT)
- PRIMARY KEY (meeting_id, contact_id)
```

---

## Usage

### Opening the Module
Click "Meetings" in the sidebar navigation. The module opens as a tab.

### Creating a Meeting
1. Click the "New" button in the sidebar header
2. Fill in meeting details:
   - Title (required)
   - Description (optional)
   - Date & Time (required)
   - Duration in minutes (default: 60)
   - Location (optional)
   - Virtual Link (optional)
3. Click "Create Meeting"

### Viewing Meeting Details
Click any meeting in the sidebar list to view its details in the main panel.

### Generating a Prep Sheet
1. Open a meeting with participants
2. Navigate to the "Prep Sheet" tab
3. Click "Generate Prep Sheet"
4. The system will pull context from linked contacts

### Adding Meeting Notes
1. Open a meeting
2. Navigate to the "Notes" tab
3. Type your post-meeting notes
4. Notes auto-save after 2 seconds

### Extracting Commitments
1. Add meeting notes with action items
2. Click "Extract Commitments" button
3. System identifies lines with action keywords:
   - will, should, need to, must
   - action:, todo:, follow up
   - commit to, promised, agreed to
4. View extracted commitments in "Commitments" tab

---

## Design System Compliance

### Colors
- **Module Accent**: `var(--module-meetings)` (#3b82f6)
- **Backgrounds**: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-card)`
- **Text**: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- **Status Colors**: Green (completed), Blue (scheduled), Gray (cancelled)

### Icons (lucide-react)
- Calendar - Module icon
- Clock - Time/duration
- MapPin - Location
- Users - Participants
- Video - Virtual link
- FileText - Notes
- CheckSquare - Prep sheet
- AlertCircle - Commitments
- Edit2, Trash2 - Actions

### Layout
- Master-detail pattern (360px sidebar + flexible detail area)
- Responsive breakpoints at 1024px and 768px
- Card-based list items with hover effects
- Tab navigation for detail sections

---

## Future Enhancements

### Phase 1 (Basic Improvements)
- [ ] Add participant search when creating meetings
- [ ] Support drag-and-drop to reorder participants
- [ ] Add recurring meeting support
- [ ] Calendar view (monthly grid)

### Phase 2 (AI Integration)
- [ ] Use Claude API for better commitment extraction
- [ ] Auto-generate meeting summaries from notes
- [ ] Smart prep sheet with relevant knowledge articles
- [ ] Meeting transcription integration

### Phase 3 (Calendar Sync)
- [ ] Google Calendar integration
- [ ] Outlook Calendar integration
- [ ] iCal import/export
- [ ] Automatic meeting detection

### Phase 4 (Advanced Features)
- [ ] Meeting templates by type (1:1, standup, review)
- [ ] Pre-meeting checklist system
- [ ] Convert commitments to Reminders/Tasks
- [ ] Meeting analytics (duration, frequency, participants)

---

## Testing Checklist

- [x] Meeting list loads and displays grouped meetings
- [x] Search filters meetings correctly
- [x] View toggle switches between Upcoming/Past/All
- [x] Create meeting modal opens and saves
- [x] Edit meeting updates existing record
- [x] Delete meeting removes from list
- [x] Meeting detail shows all information
- [x] Participant list displays contact data
- [x] Prep sheet generates with context
- [x] Notes editor auto-saves
- [x] Commitment extraction identifies action items
- [x] Responsive layout works at different screen sizes
- [x] Blue accent color applied consistently
- [x] Empty states show helpful messages
- [x] Error handling displays user-friendly messages

---

## Known Limitations

1. **Participant Management**: Currently requires contacts to exist first. No inline participant creation.
2. **Commitment Extraction**: Uses simple keyword matching. AI integration would improve accuracy.
3. **Calendar View**: Only list view implemented. Grid calendar view is a future enhancement.
4. **Time Zones**: Displays local time. No timezone conversion for distributed teams.
5. **Notifications**: No reminder system. Meeting reminders would integrate with Reminders module.

---

## Integration Points

### Relationships Module
- Meetings link to Contacts via `meeting_participants` table
- Prep sheet pulls context from contact records
- Last interaction and previous meetings queried from database

### Reminders Module (Future)
- Commitments can be converted to reminders
- Meeting reminders (15 min before, 1 day before)

### Knowledge Base (Future)
- Prep sheet can include relevant knowledge articles
- Meeting notes can reference knowledge base entries

### Dashboard (Future)
- Today's meetings widget
- Upcoming meetings summary
- Meeting statistics

---

## API Reference

### MeetingService Methods

```javascript
// CRUD
await meetingService.create(data)
await meetingService.getById(id)
await meetingService.update(id, data)
await meetingService.delete(id)

// Queries
await meetingService.getAll()
await meetingService.getAllWithParticipants()
await meetingService.getUpcoming()
await meetingService.getToday()
await meetingService.getPast(limit)
await meetingService.getGrouped()
await meetingService.search(query)

// Participants
await meetingService.addParticipant(meetingId, contactId, role)
await meetingService.removeParticipant(meetingId, contactId)

// Business Logic
await meetingService.generatePrepSheet(meetingId)
await meetingService.extractCommitments(meetingId, notes, apiKeys)
await meetingService.updateStatus(meetingId, status)
await meetingService.updateNotes(meetingId, notes)
```

---

## Development Notes

- Built following the AI Command Center design system
- Uses shared components (Card, Modal, Button, Input, Badge)
- Follows BaseService pattern for consistent database operations
- Auto-save implemented with debounce to avoid excessive writes
- SQL queries join contacts for participant display
- Prep sheet stored as JSON in database
- Blue accent color consistently applied throughout

---

*Last Updated: 2025-12-29*
*Developer: Built by Claude Code*
