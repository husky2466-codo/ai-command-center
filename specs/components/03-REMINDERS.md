# Reminders System

**Status**: Not Started
**Priority**: P1 (High)
**Estimated Effort**: 5 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup required
- `specs/features/SHARED-COMPONENTS.md` - Modal, Card components
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Green `--module-reminders` (#22c55e)
- **Visual Theme**: Time-sensitive, snooze workflow, urgency indicators

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-reminders` | #22c55e |
| Overdue items | `--status-error` | #ef4444 |
| Due today | `--status-warning` | #f59e0b |
| Later items | `--text-muted` | #6b6b80 |
| Snooze warning (3+) | `--status-error` | #ef4444 |

### Snooze Escalation Colors
| Snooze Count | Color | Indicator |
|--------------|-------|-----------|
| 0-1 snoozes | None | No badge |
| 2 snoozes | `--status-warning` (#f59e0b) | Yellow badge |
| 3+ snoozes | `--status-error` (#ef4444) | Red badge + warning icon |

### Icon Style
- Line art, 2px stroke weight
- Reminder icons: bell, clock, calendar, snooze
- Status icons: check, alert-triangle, x

### Layout Pattern
```
+--------------------------------------------------+
| [All] [Overdue] [Today] [Next 3 Days] [Later]    |
+--------------------------------------------------+
| OVERDUE (3)                                      |
|   [ ] Call John      [2x snoozed]   3 days ago  |
|   [ ] Review docs    [WARNING]      5 days ago  |
+--------------------------------------------------+
| TODAY (2)                                        |
|   [ ] Team meeting                  3:00 PM     |
|   [ ] Submit report                 5:00 PM     |
+--------------------------------------------------+
| QUICK ADD: ____________________________  [+]    |
+--------------------------------------------------+
```

### Component Specifics
- **Tab badges**: Count badges on each tab with color coding
- **Reminder items**: Checkbox, title, snooze badge, relative time
- **Snooze dropdown**: Quick options + custom date picker
- **Quick add**: Natural language input with preview

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Overdue items have red accent
- [ ] Snooze badges follow escalation colors
- [ ] Tab counts update in real-time
- [ ] Quick add input is prominent
- [ ] Notifications use system theme

---

## Overview

The Reminders system is a time-based task system with a powerful snooze workflow. Unlike tasks in Projects (which are work to do), reminders are things that need attention at a specific time. Key features include natural language date parsing, recurring reminders, snooze with escalation, and linking to other modules (projects, contacts, meetings).

## Acceptance Criteria

- [ ] Reminders can be created with natural language dates ("tomorrow at 3pm", "next Friday")
- [ ] Reminders grouped by: Overdue, Today, Next 3 Days, This Week, Later, Anytime
- [ ] Snooze options: 1 hour, 3 hours, Tomorrow, Next Week, Custom
- [ ] Snooze count tracked (escalation after 3+ snoozes)
- [ ] Recurring reminders support: daily, weekly, monthly, custom patterns
- [ ] Reminders can link to: Project/Task, Contact, Meeting, URL
- [ ] Quick add from any screen via keyboard shortcut
- [ ] Desktop notifications for due reminders
- [ ] "Anytime" reminders (no due date, just captured)

## Tasks

### Section 1: Component Structure
- [ ] Create `src/components/reminders/` directory
  - [ ] Create `RemindersApp.jsx` - Main container
  - [ ] Create `RemindersApp.css` - Reminders styles
- [ ] Create tab/filter component for grouping

### Section 2: Reminder List Views
- [ ] Create `ReminderTabs.jsx`
  - [ ] Tab buttons: All, Overdue, Today, Next 3 Days, This Week, Later, Anytime
  - [ ] Show counts on each tab
  - [ ] Active tab styling
- [ ] Create `ReminderGroup.jsx`
  - [ ] Collapsible group header with count
  - [ ] Sort reminders within group by due time
- [ ] Create `ReminderItem.jsx`
  - [ ] Display title, due date/time, link icon if applicable
  - [ ] Snooze dropdown button
  - [ ] Complete checkbox
  - [ ] Show snooze count badge if snoozed 2+ times
  - [ ] Visual warning for 3+ snoozes (escalation indicator)

### Section 3: Quick Add
- [ ] Create `ReminderQuickAdd.jsx`
  - [ ] Single input with natural language parsing
  - [ ] Parse examples: "Call John tomorrow 3pm", "Review PR next week"
  - [ ] Show parsed result preview before confirm
- [ ] Implement keyboard shortcut (Ctrl/Cmd + R) for quick add
- [ ] Add floating action button on mobile

### Section 4: Reminder Modal (Full Edit)
- [ ] Create `ReminderModal.jsx`
  - [ ] Title input (required)
  - [ ] Description textarea
  - [ ] Due date/time picker
  - [ ] Recurring toggle with options
  - [ ] Link selector (project, contact, meeting, URL)
- [ ] Recurring options UI
  - [ ] Frequency: Daily, Weekly, Monthly, Custom
  - [ ] Custom pattern builder (every N days/weeks)
  - [ ] End condition: Never, After X occurrences, By date

### Section 5: Snooze System
- [ ] Implement snooze dropdown
  - [ ] Options: 1 hour, 3 hours, Tomorrow morning (9 AM), Next week
  - [ ] Custom snooze with date/time picker
- [ ] Create `handleSnooze()` function
  - [ ] Update snoozed_until field
  - [ ] Increment snooze_count
  - [ ] Set status to 'snoozed'
- [ ] Implement snooze escalation
  - [ ] After 3 snoozes, show warning color/badge
  - [ ] Optional: require reason for snooze after 3+

### Section 6: Natural Language Parsing
- [ ] Create `src/utils/dateParser.js`
  - [ ] Parse relative dates: "tomorrow", "next week", "in 3 days"
  - [ ] Parse absolute dates: "Dec 31", "January 5th 2026"
  - [ ] Parse times: "at 3pm", "at 15:00", "morning" (9 AM)
  - [ ] Extract reminder title vs date parts
- [ ] Use chrono-node library or custom parser
- [ ] Return structured result: `{ title, dueAt, confidence }`

### Section 7: Recurring Logic
- [ ] Create `generateNextOccurrence()` function
  - [ ] Parse recurrence_rule (iCal RRULE format or custom)
  - [ ] Calculate next due date from pattern
- [ ] Implement auto-creation of next occurrence on completion
- [ ] Store recurrence rule in database

### Section 8: Reminder Service
- [ ] Create `src/services/ReminderService.js`
  - [ ] CRUD operations for reminders
  - [ ] `getByGroup()` - Group by time buckets
  - [ ] `snooze(id, until)` - Snooze reminder
  - [ ] `complete(id)` - Mark complete, handle recurrence
  - [ ] `getDue()` - Get reminders due now (for notifications)
  - [ ] `parseNaturalDate(text)` - NLP date parsing

### Section 9: Notifications
- [ ] Implement desktop notification system
  - [ ] Check for due reminders every minute
  - [ ] Show notification with title, snooze action
- [ ] Add notification permission request
- [ ] Implement notification click handler (focus app, scroll to reminder)

### Section 10: Linking System
- [ ] Create link selector UI component
  - [ ] Dropdown with type: Project, Contact, Meeting, URL
  - [ ] Search/select for projects, contacts, meetings
  - [ ] URL input for external links
- [ ] Store as `source_type` and `source_id` or `url`
- [ ] Display link icon and navigate on click

## Technical Details

### Files to Create
- `src/components/reminders/RemindersApp.jsx` - Main container
- `src/components/reminders/RemindersApp.css` - Styles
- `src/components/reminders/ReminderTabs.jsx` - Group tabs
- `src/components/reminders/ReminderGroup.jsx` - Grouped list
- `src/components/reminders/ReminderItem.jsx` - Individual reminder
- `src/components/reminders/ReminderQuickAdd.jsx` - Quick add input
- `src/components/reminders/ReminderModal.jsx` - Full edit modal
- `src/components/reminders/SnoozeDropdown.jsx` - Snooze options
- `src/services/ReminderService.js` - Business logic
- `src/utils/dateParser.js` - Natural language date parsing

### Files to Modify
- `src/App.jsx` - Add Reminders to router
- `electron/main.cjs` - Add notification IPC handlers
- `electron/preload.cjs` - Expose notification API

### Database Tables Used
```sql
SELECT * FROM reminders;

-- Example queries
SELECT * FROM reminders WHERE due_at < datetime('now') AND status = 'pending';
SELECT * FROM reminders WHERE date(due_at) = date('now');
SELECT * FROM reminders WHERE due_at IS NULL; -- Anytime
```

### IPC Channels
- `reminders:get-all` - List all reminders
- `reminders:get-by-group` - Get grouped by time buckets
- `reminders:create` - Create reminder
- `reminders:update` - Update reminder
- `reminders:delete` - Delete reminder
- `reminders:snooze` - Snooze with new due date
- `reminders:complete` - Mark complete
- `reminders:parse-date` - Parse natural language date
- `notifications:show` - Display desktop notification
- `notifications:request-permission` - Request notification permission

## Implementation Hints

- Use date-fns for date manipulation and formatting
- chrono-node is excellent for natural language date parsing
- Notification timing should use setInterval with 60-second check
- Cache reminder groups to avoid constant re-computation
- Snooze count badge: yellow at 2, red at 3+
- Consider haptic feedback (if mobile) on snooze
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for ReminderService methods
- [ ] Natural language parser handles common phrases
- [ ] Snooze correctly updates due date and count
- [ ] Recurring reminders generate next occurrence
- [ ] Notifications fire at correct time
- [ ] Tab counts update in real-time
- [ ] Quick add parses and creates correctly
- [ ] Links navigate to correct modules
- [ ] Edge cases: past dates, invalid input, timezone handling

---
**Notes**: The snooze system is the heart of this module. It acknowledges that plans change, but tracks when things keep getting pushed (snooze count). The escalation at 3+ snoozes forces reflection: is this actually important?
