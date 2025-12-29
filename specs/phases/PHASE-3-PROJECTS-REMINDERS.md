# Phase 3: Projects & Reminders

**Status**: Not Started
**Timeline**: Weeks 7-9
**Priority**: P1 (High)
**Estimated Effort**: 15 days

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [02-PROJECTS.md](../components/02-PROJECTS.md) | [03-REMINDERS.md](../components/03-REMINDERS.md)

---

## Design Review Checkpoint

### Projects Design Requirements
- [ ] Module accent: Purple `--module-projects` (#8b5cf6)
- [ ] Energy type badges use correct colors:
  - Low: `--energy-low` (#6b7280)
  - Quick Win: `--energy-quick-win` (#22c55e)
  - Deep Work: `--energy-deep-work` (#8b5cf6)
  - Creative: `--energy-creative` (#ec4899)
  - Execution: `--energy-execution` (#f59e0b)
  - People: `--energy-people` (#3b82f6)
- [ ] Progress bars use purple gradient
- [ ] Three-tier navigation is visually clear

### Reminders Design Requirements
- [ ] Module accent: Green `--module-reminders` (#22c55e)
- [ ] Overdue items: `--status-error` (#ef4444)
- [ ] Due today: `--status-warning` (#f59e0b)
- [ ] Snooze escalation badges follow color progression
- [ ] Tab badges use count indicators

### End of Phase 3 Design Checklist
- [ ] All energy badges display correct colors
- [ ] Progress bars animate smoothly
- [ ] Drag-and-drop has visual feedback (gold border)
- [ ] Snooze badges follow escalation colors
- [ ] No hardcoded colors in Projects or Reminders CSS
- [ ] Dashboard widgets match parent module colors

---

## Overview

Phase 3 builds the productivity suite: Projects (with three-tier view and energy-based filtering) and Reminders (with snooze workflow and natural language dates). These modules work together - tasks can have associated reminders, and both connect to the dashboard.

## Objectives

1. Build Projects system with Life/Projects/Now views
2. Implement energy-based task filtering
3. Create Reminders with snooze workflow
4. Add natural language date parsing
5. Implement recurring reminders
6. Connect projects and reminders
7. Build dashboard widgets for both

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 3 DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From Phase 1:                                                  │
│  • SQLite with spaces, projects, tasks, reminders tables       │
│  • BaseService for CRUD operations                             │
│  • Card, Modal, Input, Select components                       │
│  • Theme and sidebar navigation                                │
│                                                                 │
│  External Dependencies:                                         │
│  • date-fns (date manipulation)                                │
│  • chrono-node or custom date parser                           │
│  • react-dnd or @dnd-kit (drag-and-drop)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Task Checklist

### Week 7: Projects Foundation

#### Projects Structure (Days 1-2)
- [ ] Create `src/components/projects/` directory
- [ ] Create `src/components/projects/ProjectsApp.jsx`
  - [ ] View switcher tabs: Life, Projects, Now
  - [ ] State management for active view
- [ ] Create `src/components/projects/ProjectsApp.css`
- [ ] Create `src/constants/energyTypes.js`
  ```javascript
  export const ENERGY_TYPES = {
    low: { label: 'Low', color: '#6b7280' },
    medium: { label: 'Medium', color: '#3b82f6' },
    deep_work: { label: 'Deep Work', color: '#7c3aed' },
    creative: { label: 'Creative', color: '#ec4899' },
    quick_win: { label: 'Quick Win', color: '#22c55e' },
    execution: { label: 'Execution', color: '#f97316' },
    people_work: { label: 'People Work', color: '#14b8a6' }
  };
  ```

#### Life View (Day 2)
- [ ] Create `src/components/projects/LifeView.jsx`
  - [ ] Grid layout of Space cards
  - [ ] Show project count per space
  - [ ] Add Space button
- [ ] Create `src/components/projects/SpaceCard.jsx`
  - [ ] Space name, description, color, icon
  - [ ] Project count badge
  - [ ] Click to filter Projects view

#### Projects View (Days 3-4)
- [ ] Create `src/components/projects/ProjectsView.jsx`
  - [ ] Sort dropdown: Next Action, Due Date, Progress
  - [ ] Status sections
- [ ] Create `src/components/projects/ProjectSection.jsx`
  - [ ] Collapsible section by status
  - [ ] Headers: Active Focus, On Deck, Growing, On Hold, Completed
- [ ] Create `src/components/projects/ProjectCard.jsx`
  - [ ] Project name, space tag
  - [ ] Progress bar (auto-calculated)
  - [ ] Task count (completed/total)
  - [ ] Next action preview
  - [ ] Deadline with urgency coloring

#### Now View (Day 5)
- [ ] Create `src/components/projects/NowView.jsx`
  - [ ] Energy filter bar
  - [ ] Task list
- [ ] Create `src/components/projects/EnergyFilterBar.jsx`
  - [ ] Filter buttons with counts
  - [ ] Multi-select toggle
- [ ] Create `src/components/projects/TaskList.jsx`
  - [ ] Ordered task list
  - [ ] Drag-and-drop support
- [ ] Create `src/components/projects/TaskItem.jsx`
  - [ ] Checkbox for completion
  - [ ] Energy type badge
  - [ ] Due date
  - [ ] Project name link

### Week 8: Modals, Service & Reminders

#### Create/Edit Modals (Days 6-7)
- [ ] Create `src/components/projects/SpaceModal.jsx`
  - [ ] Name, description, color picker, icon selector
- [ ] Create `src/components/projects/ProjectModal.jsx`
  - [ ] Name, description, space selector, status
  - [ ] Deadline date picker
  - [ ] Planning notes textarea
- [ ] Create `src/components/projects/TaskModal.jsx`
  - [ ] Title, description, project selector
  - [ ] Energy type dropdown
  - [ ] Due date picker
  - [ ] Status dropdown

#### Project Service (Day 7)
- [ ] Create `src/services/ProjectService.js`
  - [ ] CRUD for spaces, projects, tasks
  - [ ] `getProjectsByStatus()` - Group by status
  - [ ] `getTasksByEnergy()` - Filter by energy type
  - [ ] `updateProjectProgress()` - Calculate from tasks
  - [ ] `getNextAction()` - Top incomplete task
  - [ ] `reorderTasks()` - Update sort orders

#### Drag-and-Drop (Day 8)
- [ ] Install @dnd-kit or react-dnd
- [ ] Implement drag-and-drop in TaskList
  - [ ] Reorder within project
  - [ ] Update sort_order on drop
- [ ] Persist order to database

#### Reminders Structure (Days 8-9)
- [ ] Create `src/components/reminders/` directory
- [ ] Create `src/components/reminders/RemindersApp.jsx`
  - [ ] Tab view for grouping
  - [ ] Reminder list
- [ ] Create `src/components/reminders/RemindersApp.css`
- [ ] Create `src/components/reminders/ReminderTabs.jsx`
  - [ ] Tabs: All, Overdue, Today, Next 3 Days, This Week, Later, Anytime
  - [ ] Count badges

#### Reminder List (Days 9-10)
- [ ] Create `src/components/reminders/ReminderGroup.jsx`
  - [ ] Collapsible group header
  - [ ] Sorted by due time
- [ ] Create `src/components/reminders/ReminderItem.jsx`
  - [ ] Title, due date/time
  - [ ] Link indicator
  - [ ] Snooze dropdown
  - [ ] Complete checkbox
  - [ ] Snooze count badge

### Week 9: Snooze, NLP & Integration

#### Snooze System (Day 11)
- [ ] Create `src/components/reminders/SnoozeDropdown.jsx`
  - [ ] Options: 1 hour, 3 hours, Tomorrow, Next Week
  - [ ] Custom date picker
- [ ] Implement `handleSnooze()` function
  - [ ] Update snoozed_until field
  - [ ] Increment snooze_count
  - [ ] Set status to 'snoozed'
- [ ] Implement snooze escalation
  - [ ] Visual warning at 3+ snoozes

#### Natural Language Parsing (Day 12)
- [ ] Install chrono-node or build custom parser
- [ ] Create `src/utils/dateParser.js`
  - [ ] Parse: "tomorrow", "next week", "in 3 days"
  - [ ] Parse: "Dec 31", "January 5th"
  - [ ] Parse: "at 3pm", "morning"
  - [ ] Return: { title, dueAt, confidence }
- [ ] Create `src/components/reminders/ReminderQuickAdd.jsx`
  - [ ] Single input with NLP parsing
  - [ ] Preview parsed result
  - [ ] Keyboard shortcut trigger

#### Recurring Reminders (Day 13)
- [ ] Create `generateNextOccurrence()` function
  - [ ] Parse recurrence_rule
  - [ ] Calculate next due date
- [ ] Implement in ReminderService
  - [ ] On completion, create next occurrence
- [ ] Create recurring options UI in ReminderModal

#### Reminder Service (Day 13)
- [ ] Create `src/services/ReminderService.js`
  - [ ] CRUD for reminders
  - [ ] `getByGroup()` - Group by time buckets
  - [ ] `snooze(id, until)` - Snooze reminder
  - [ ] `complete(id)` - Mark complete, handle recurrence
  - [ ] `getDue()` - Get due reminders
  - [ ] `parseNaturalDate(text)` - NLP parsing

#### Notifications (Day 14)
- [ ] Implement desktop notification system
  - [ ] Check for due reminders every minute
  - [ ] Show notification with title
- [ ] Add notification permission request
- [ ] Handle notification click

#### Dashboard Widgets (Day 15)
- [ ] Create `src/components/dashboard/widgets/FocusPrioritiesWidget.jsx`
  - [ ] Top 3 active focus projects
  - [ ] Confidence percentages
- [ ] Create `src/components/dashboard/widgets/RemindersWidget.jsx`
  - [ ] Overdue and Due Today counts
  - [ ] Quick complete/snooze actions
- [ ] Connect to services

## Deliverables

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 3 DELIVERABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Projects System                                                │
│  ├─ Life View (spaces overview)                                │
│  ├─ Projects View (grouped by status)                          │
│  ├─ Now View (energy-filtered tasks)                           │
│  ├─ CRUD modals for spaces, projects, tasks                    │
│  ├─ Drag-and-drop reordering                                   │
│  └─ Auto-calculated progress bars                              │
│                                                                 │
│  Reminders System                                               │
│  ├─ Tab-based grouping view                                    │
│  ├─ Snooze workflow with escalation                            │
│  ├─ Natural language date parsing                              │
│  ├─ Recurring reminders                                        │
│  ├─ Desktop notifications                                      │
│  └─ Quick add with NLP                                         │
│                                                                 │
│  Dashboard Widgets                                              │
│  ├─ Focus & Priorities widget                                  │
│  └─ Reminders widget                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| NLP date parsing edge cases | High | Low | Fallback to manual date picker |
| Drag-and-drop complexity | Medium | Medium | Use well-tested library |
| Notification permissions denied | Medium | Low | Graceful fallback |
| Performance with many tasks | Low | Medium | Virtualization |

## Success Criteria

- [ ] Can create spaces, projects, and tasks
- [ ] Energy filtering works in Now view
- [ ] Drag-and-drop reorders tasks
- [ ] Progress auto-calculates on task completion
- [ ] Reminders display in correct time groups
- [ ] Snooze updates due date correctly
- [ ] Natural language parsing handles common phrases
- [ ] Recurring reminders create next occurrence
- [ ] Notifications fire for due reminders
- [ ] Dashboard widgets display correct data

## Files Created/Modified

### New Files (~25)
```
src/components/projects/ProjectsApp.jsx
src/components/projects/ProjectsApp.css
src/components/projects/LifeView.jsx
src/components/projects/ProjectsView.jsx
src/components/projects/NowView.jsx
src/components/projects/SpaceCard.jsx
src/components/projects/ProjectSection.jsx
src/components/projects/ProjectCard.jsx
src/components/projects/EnergyFilterBar.jsx
src/components/projects/TaskList.jsx
src/components/projects/TaskItem.jsx
src/components/projects/SpaceModal.jsx
src/components/projects/ProjectModal.jsx
src/components/projects/TaskModal.jsx
src/services/ProjectService.js
src/constants/energyTypes.js
src/components/reminders/RemindersApp.jsx
src/components/reminders/RemindersApp.css
src/components/reminders/ReminderTabs.jsx
src/components/reminders/ReminderGroup.jsx
src/components/reminders/ReminderItem.jsx
src/components/reminders/SnoozeDropdown.jsx
src/components/reminders/ReminderQuickAdd.jsx
src/components/reminders/ReminderModal.jsx
src/services/ReminderService.js
src/utils/dateParser.js
src/components/dashboard/widgets/FocusPrioritiesWidget.jsx
src/components/dashboard/widgets/RemindersWidget.jsx
```

### Modified Files (~3)
```
src/App.jsx - Add Projects and Reminders routes
package.json - Add date-fns, chrono-node, @dnd-kit
electron/main.cjs - Add notification handlers
```

## Agent Assignment

- Primary: `electron-react-dev`
- Standard React/Electron development work

---
**Notes**: Projects and Reminders are the daily driver features. Focus on smooth UX - the energy filtering should feel intuitive, snooze should be frictionless. Natural language parsing doesn't need to be perfect, just helpful.
