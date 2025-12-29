# Meetings System

**Status**: Not Started
**Priority**: P2 (Medium)
**Estimated Effort**: 5 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup required
- `specs/components/04-RELATIONSHIPS.md` - Contact linking
- `specs/features/SHARED-COMPONENTS.md` - Card, Modal, MarkdownEditor
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Blue `--module-meetings` (#3b82f6)
- **Visual Theme**: Calendar integration, prep sheets, commitment tracking

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-meetings` | #3b82f6 |
| Card backgrounds | `--bg-card` | #2d2d4a |
| Upcoming meetings | `--status-info` | #3b82f6 |
| Past meetings | `--text-muted` | #6b6b80 |
| Commitments | `--status-warning` | #f59e0b |

### Status Colors
| Status | Color | Usage |
|--------|-------|-------|
| Scheduled | Blue #3b82f6 | Upcoming meetings |
| Completed | Green #22c55e | Past meetings with notes |
| Cancelled | Gray #6b7280 | Cancelled meetings |

### Icon Style
- Line art, 2px stroke weight
- Meeting icons: calendar, clock, users, video, map-pin
- Action icons: clipboard, edit, check-square

### Layout Pattern - Master/Detail
```
+------------------+------------------------------------+
| MEETING LIST     | MEETING DETAIL                     |
|                  |                                    |
| [Search...]      | Project Kickoff  [Scheduled]       |
|                  | Dec 30, 2025 @ 2:00 PM (1h)       |
| UPCOMING         | Location: Zoom                     |
| - Today          +------------------------------------+
|   [x] Standup    | PARTICIPANTS                       |
|   [ ] Kickoff    | [John] [Jane] [Bob]  [+ Add]      |
| - This Week      +------------------------------------+
|   [ ] Review     | [Prep] [Notes] [Commitments]       |
|                  +------------------------------------+
| PAST             | PREP SHEET                         |
| - Yesterday      | Attendee: John Smith               |
|   [x] Interview  | - Last interaction: 1 week ago     |
|                  | - Context: CEO, decision maker     |
+------------------+------------------------------------+
```

### Component Specifics
- **Meeting List Items**: Title, time, participant avatars
- **Prep Sheet**: Auto-generated attendee context sections
- **Checklist**: Checkbox items with completion state
- **Notes Editor**: Markdown with template sections
- **Commitment Badges**: Pill badges with action items

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Blue accent for module highlights
- [ ] Participant avatars show freshness
- [ ] Prep sheet is auto-generated and readable
- [ ] Markdown notes render correctly
- [ ] Time displays handle timezone

---

## Overview

The Meetings system manages meeting preparation and post-meeting notes. It auto-generates prep sheets with attendee context (pulled from Relationships), provides pre-meeting checklists, and captures post-meeting summaries with commitment extraction. Commitments can become reminders or tasks.

## Acceptance Criteria

- [ ] Meeting list view with chronological grouping (Today, Yesterday, This Week, Earlier)
- [ ] Meeting detail view with prep sheet and post-notes
- [ ] Participants linked to contacts (with context pulled automatically)
- [ ] Auto-generated prep sheet with: attendee backgrounds, last interactions, talking points
- [ ] Pre-meeting checklist (customizable per meeting type)
- [ ] Post-meeting notes with markdown support
- [ ] Commitment extraction from notes -> create reminders/tasks
- [ ] Calendar integration placeholder (manual entry for v1)

## Tasks

### Section 1: Component Structure
- [ ] Create `src/components/meetings/` directory
  - [ ] Create `MeetingsApp.jsx` - Main container (list + detail)
  - [ ] Create `MeetingsApp.css` - Meetings styles
- [ ] Implement master-detail layout

### Section 2: Meeting List
- [ ] Create `MeetingList.jsx`
  - [ ] Search input
  - [ ] Group by date: Today, Yesterday, This Week, Earlier, Upcoming
  - [ ] Filter tabs: All, Upcoming, Past
- [ ] Create `MeetingListItem.jsx`
  - [ ] Title, date/time, participant count
  - [ ] Status indicator (scheduled, completed, cancelled)
  - [ ] Duration display

### Section 3: Meeting Detail
- [ ] Create `MeetingDetail.jsx`
  - [ ] Header with title, date, time, duration, location
  - [ ] Participant list with avatars/initials
  - [ ] Tabs or sections: Prep, Notes, Commitments
- [ ] Create `ParticipantList.jsx`
  - [ ] Show linked contacts with freshness
  - [ ] Add participant button (search contacts)
  - [ ] Click to navigate to contact detail

### Section 4: Prep Sheet
- [ ] Create `PrepSheet.jsx`
  - [ ] Auto-generated attendee context section
  - [ ] Last interaction with each attendee
  - [ ] Meeting history (previous meetings with these people)
  - [ ] Talking points input area
- [ ] Create `AttendeeContext.jsx`
  - [ ] Pull from contact's professional_background and context
  - [ ] Show last interaction date and summary
- [ ] Implement prep sheet generation
  - [ ] AI-assisted or template-based
  - [ ] Include relevant knowledge articles about attendees

### Section 5: Pre-Meeting Checklist
- [ ] Create `PreMeetingChecklist.jsx`
  - [ ] Default items: Review last notes, Prepare agenda, Share with team
  - [ ] Custom items per meeting
  - [ ] Checkbox with completion state
- [ ] Store checklist items in meeting record
- [ ] Allow template checklists by meeting type

### Section 6: Post-Meeting Notes
- [ ] Create `PostMeetingNotes.jsx`
  - [ ] Markdown editor for notes
  - [ ] Template sections: Takeaways, Decisions, Action Items
  - [ ] Auto-save on change
- [ ] Integrate MarkdownEditor from shared components
- [ ] Support @mention for people (link to contacts)

### Section 7: Commitment Extraction
- [ ] Create `CommitmentExtractor.jsx`
  - [ ] "Extract Commitments" button
  - [ ] AI parses notes for action items
  - [ ] Display extracted commitments for review
  - [ ] Convert to Reminder or Task buttons
- [ ] Implement extraction logic
  - [ ] Use Claude to identify commitments/action items
  - [ ] Return structured list with assignee, description, due date
- [ ] Create commitment -> reminder/task flow

### Section 8: Meeting Modal (Create/Edit)
- [ ] Create `MeetingModal.jsx`
  - [ ] Title (required)
  - [ ] Description
  - [ ] Date and time picker
  - [ ] Duration dropdown (15, 30, 45, 60, 90 min)
  - [ ] Location (text or URL for virtual)
  - [ ] Participant search/add
- [ ] Validate required fields

### Section 9: Meeting Service
- [ ] Create `src/services/MeetingService.js`
  - [ ] CRUD for meetings
  - [ ] `addParticipant(meetingId, contactId)` - Link contact
  - [ ] `removeParticipant(meetingId, contactId)` - Unlink
  - [ ] `generatePrepSheet(meetingId)` - Build prep content
  - [ ] `extractCommitments(meetingId, notes)` - AI extraction
  - [ ] `getUpcoming()` - Meetings in next 7 days
  - [ ] `getPast()` - Completed meetings

### Section 10: Dashboard Integration
- [ ] Create schedule widget data method
  - [ ] Return today's meetings
  - [ ] Return next meeting details
- [ ] Feed to Dashboard ScheduleWidget

## Technical Details

### Files to Create
- `src/components/meetings/MeetingsApp.jsx` - Main container
- `src/components/meetings/MeetingsApp.css` - Styles
- `src/components/meetings/MeetingList.jsx` - List panel
- `src/components/meetings/MeetingListItem.jsx` - List item
- `src/components/meetings/MeetingDetail.jsx` - Detail panel
- `src/components/meetings/ParticipantList.jsx` - Attendees
- `src/components/meetings/PrepSheet.jsx` - Auto-generated prep
- `src/components/meetings/AttendeeContext.jsx` - Person context
- `src/components/meetings/PreMeetingChecklist.jsx` - Checklist
- `src/components/meetings/PostMeetingNotes.jsx` - Notes editor
- `src/components/meetings/CommitmentExtractor.jsx` - AI extraction
- `src/components/meetings/MeetingModal.jsx` - Create/edit
- `src/services/MeetingService.js` - Business logic

### Files to Modify
- `src/App.jsx` - Add Meetings to router

### Database Tables Used
```sql
SELECT * FROM meetings;
SELECT * FROM meeting_participants;

-- With contact details
SELECT m.*, c.name as participant_name
FROM meetings m
JOIN meeting_participants mp ON m.id = mp.meeting_id
JOIN contacts c ON mp.contact_id = c.id;
```

### IPC Channels
- `meetings:get-all` - List meetings
- `meetings:get-by-id` - Get single meeting
- `meetings:create` - Create meeting
- `meetings:update` - Update meeting
- `meetings:delete` - Delete meeting
- `meetings:add-participant` - Link contact
- `meetings:remove-participant` - Unlink contact
- `meetings:generate-prep` - Generate prep sheet
- `meetings:extract-commitments` - AI extraction from notes
- `meetings:get-upcoming` - Upcoming meetings
- `meetings:get-today` - Today's meetings

## Implementation Hints

- Prep sheet generation can use Claude Haiku for speed
- Commitment extraction prompt should look for action words: "will", "need to", "should", "action:"
- Consider ICS/vCalendar import for future versions
- Timeline view for Today's schedule on Dashboard
- Notes should auto-save with debounce (2 seconds after typing stops)
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for MeetingService methods
- [ ] Meeting CRUD operations work
- [ ] Participant linking works both directions
- [ ] Prep sheet generates with attendee context
- [ ] Notes save and load correctly
- [ ] Commitment extraction identifies action items
- [ ] Conversion to reminder/task works
- [ ] Time/date display handles timezone correctly
- [ ] Empty states for no meetings

---
**Notes**: The magic of this module is the prep sheet auto-generation. Walking into a meeting with context about each attendee (from Relationships) makes you look prepared and thoughtful. Post-meeting commitment extraction ensures nothing falls through the cracks.
