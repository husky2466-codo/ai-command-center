# Dashboard (Home)

**Status**: Not Started
**Priority**: P1 (High)
**Estimated Effort**: 5 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup required
- `specs/features/SHARED-COMPONENTS.md` - Card, Widget components
- `specs/components/03-REMINDERS.md` - Reminders widget data
- `specs/components/04-RELATIONSHIPS.md` - Relationships widget data
- `specs/components/02-PROJECTS.md` - Goals and focus data
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Gold `--module-dashboard` (#ffd700)
- **Visual Theme**: Command center feel, data-rich, organized

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Widget backgrounds | `--bg-card` | #2d2d4a |
| Status brief card | `--bg-elevated` | #3a3a5a |
| CTA buttons | `--accent-gold` | #ffd700 |
| Progress bars | Gradient gold to purple | #ffd700 -> #8b5cf6 |
| Alert badges | `--status-warning` | #f59e0b |

### Icon Style
- Line art, 2px stroke weight
- Dashboard icons: grid, calendar, chart, bell
- Use gold color for active/primary icons

### Layout Pattern
```
+--------------------------------------------------+
|  STATUS BRIEF (full width, elevated card)        |
+------------------------+-------------------------+
|  SCHEDULE              |  FOCUS & PRIORITIES     |
|  (timeline)            |  (project cards)        |
+------------------------+-------------------------+
|  REMINDERS             |  RELATIONSHIPS          |
|  (list with badges)    |  (freshness alerts)     |
+------------------------+-------------------------+
|  GOAL ALIGNMENT (progress bars, full width)      |
+--------------------------------------------------+
```

### Component Specifics
- **Status Brief**: Elevated card with gold left border accent
- **Widgets**: Standard cards with subtle hover effect (gold border)
- **Progress bars**: 8px height, rounded, gold fill on dark track
- **Badges**: Hexagonal shape for counts, pill shape for status
- **Empty states**: Centered message with muted text

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] All widgets use `--bg-card` (#2d2d4a)
- [ ] Gold accents on primary actions
- [ ] Line art icons throughout
- [ ] Responsive grid layout
- [ ] Hover states show gold border
- [ ] Professional, not playful design

---

## Overview

The Dashboard is the home screen and daily command center for AI Command Center. It provides an AI-generated daily overview aggregating data from all modules: schedule from Meetings, focus items from Projects, reminders, relationship freshness alerts, and goal progress. The dashboard auto-generates a "status brief" each morning at 8:30 AM.

## Acceptance Criteria

- [ ] Dashboard displays auto-generated status brief with pagination (1/10 navigation)
- [ ] Overview section shows AI-summarized day based on all data sources
- [ ] Today's schedule shows meetings/time blocks from calendar
- [ ] Focus & Priorities widget shows top 3 active focus projects with confidence
- [ ] Reminders widget shows overdue and due-today counts with quick actions
- [ ] Relationships widget shows freshness warnings and needs-attention contacts
- [ ] Goal Alignment widget shows progress bars for tracked goals
- [ ] Dashboard data refreshes automatically every 5 minutes
- [ ] Dashboard brief generates at 8:30 AM daily (configurable)

## Tasks

### Section 1: Dashboard Component Structure
- [ ] Create `src/components/dashboard/` directory structure
  - [ ] Create `DashboardApp.jsx` - Main dashboard container
  - [ ] Create `DashboardApp.css` - Dashboard-specific styles
  - [ ] Create `widgets/` subdirectory for widget components
- [ ] Implement dashboard grid layout (2-column responsive)
  - [ ] Define CSS Grid/Flexbox layout for widget placement
  - [ ] Add responsive breakpoints for mobile/tablet

### Section 2: Status Brief Component
- [ ] Create `StatusBrief.jsx` widget
  - [ ] Implement brief card with date header
  - [ ] Add pagination controls (prev/next arrows)
  - [ ] Store brief history (last 10 briefs)
- [ ] Integrate with DashboardService for brief generation
  - [ ] Pass all module data to AI for summarization
  - [ ] Cache generated briefs in database

### Section 3: Overview Widget
- [ ] Create `OverviewWidget.jsx`
  - [ ] Display AI-generated narrative summary
  - [ ] Show key metrics (tasks due, meetings, etc.)
  - [ ] Add "regenerate" button for manual refresh

### Section 4: Schedule Widget
- [ ] Create `ScheduleWidget.jsx`
  - [ ] Render timeline view of today's events
  - [ ] Color-code by event type (meeting, deep work, etc.)
  - [ ] Show current time indicator
- [ ] Pull meeting data from MeetingService
- [ ] Support time blocks from Projects (focus sessions)

### Section 5: Focus & Priorities Widget
- [ ] Create `FocusPrioritiesWidget.jsx`
  - [ ] List top 3 active focus projects
  - [ ] Show confidence percentages
  - [ ] Display "Due Today" badges
- [ ] Calculate confidence from project completion + meeting alignment

### Section 6: Reminders Widget
- [ ] Create `RemindersWidget.jsx`
  - [ ] Group by: Overdue, Due Today
  - [ ] Show count badges
  - [ ] Add quick complete/snooze actions
- [ ] Pull data from ReminderService

### Section 7: Relationships Widget
- [ ] Create `RelationshipsWidget.jsx`
  - [ ] Show warning count (stale relationships)
  - [ ] List top 3 "needs attention" contacts
  - [ ] Show days since last contact
- [ ] Calculate from RelationshipService.getStaleContacts()

### Section 8: Goals Widget
- [ ] Create `GoalAlignmentWidget.jsx`
  - [ ] Render progress bars for each goal
  - [ ] Show percentage complete
  - [ ] Color by status (on track, behind, ahead)
- [ ] Pull from goals table with project alignments

### Section 9: Dashboard Service
- [ ] Create `src/services/DashboardService.js`
  - [ ] `generateDailyBrief()` - AI generates summary from all data
  - [ ] `getDashboardData()` - Aggregate data from all services
  - [ ] `scheduleAutoGeneration()` - Set up 8:30 AM cron job
- [ ] Implement caching for dashboard data

### Section 10: Auto-Generation Scheduler
- [ ] Add node-cron job in Electron main process
  - [ ] Schedule brief generation at 8:30 AM
  - [ ] Store in briefs table with timestamp
- [ ] Add IPC handler for manual regeneration

## Technical Details

### Files to Create
- `src/components/dashboard/DashboardApp.jsx` - Main container component
- `src/components/dashboard/DashboardApp.css` - Dashboard styles
- `src/components/dashboard/widgets/StatusBrief.jsx` - Daily brief card
- `src/components/dashboard/widgets/OverviewWidget.jsx` - AI summary
- `src/components/dashboard/widgets/ScheduleWidget.jsx` - Today's timeline
- `src/components/dashboard/widgets/FocusPrioritiesWidget.jsx` - Top projects
- `src/components/dashboard/widgets/RemindersWidget.jsx` - Due reminders
- `src/components/dashboard/widgets/RelationshipsWidget.jsx` - Freshness alerts
- `src/components/dashboard/widgets/GoalAlignmentWidget.jsx` - Progress bars
- `src/services/DashboardService.js` - Dashboard data aggregation

### Files to Modify
- `src/App.jsx` - Add Dashboard to router/tabs
- `electron/main.cjs` - Add cron job for auto-generation

### Database Tables Used
```sql
-- Goals table (read)
SELECT * FROM goals;
SELECT * FROM goal_alignments;

-- Brief history (new table)
CREATE TABLE dashboard_briefs (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_data TEXT -- JSON of data used to generate
);
```

### IPC Channels
- `dashboard:get-data` - Fetch aggregated dashboard data
- `dashboard:generate-brief` - Trigger AI brief generation
- `dashboard:get-briefs` - Fetch brief history

## Implementation Hints

- Use CSS Grid with `grid-template-areas` for flexible widget layout
- Cache dashboard data in React state with 5-minute TTL
- Brief generation uses Claude Haiku for speed/cost efficiency
- Consider localStorage for quick initial load while fetching fresh data
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for DashboardService methods
- [ ] Widget renders correctly with mock data
- [ ] Responsive layout works on all breakpoints
- [ ] Brief generation completes within 5 seconds
- [ ] Cron job fires at correct time
- [ ] Error states display gracefully
- [ ] Empty states (no reminders, no meetings) handled

---
**Notes**: The Dashboard is the first screen users see. Focus on fast initial load with progressive enhancement. The status brief is the key differentiator - it should feel like a personal assistant prepared the day.
