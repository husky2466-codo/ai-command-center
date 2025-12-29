# Phase 6: Dashboard & Admin

**Status**: Not Started
**Timeline**: Weeks 14-15
**Priority**: P1 (High)
**Estimated Effort**: 10 days

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [01-DASHBOARD.md](../components/01-DASHBOARD.md) | [08-ADMIN.md](../components/08-ADMIN.md)

---

## Design Review Checkpoint

### Dashboard Design Requirements
- [ ] Module accent: Gold `--module-dashboard` (#ffd700)
- [ ] Status brief is the hero element (elevated card)
- [ ] Widget grid is responsive
- [ ] Each widget uses parent module's accent color
- [ ] Progress bars use consistent styling
- [ ] Goal alignment visualization is clear

### Admin Design Requirements
- [ ] Module accent: Gray `--module-admin` (#64748b)
- [ ] Status indicators use correct colors:
  - Healthy: `--status-success` (#22c55e)
  - Warning: `--status-warning` (#f59e0b)
  - Error: `--status-error` (#ef4444)
- [ ] Data tables are readable with alternating rows
- [ ] Charts use dark-theme-friendly colors
- [ ] API keys are masked with reveal toggle

### End of Phase 6 Design Checklist
- [ ] Dashboard is the visually richest screen (command center feel)
- [ ] All widgets populate with correct styling
- [ ] Status brief renders markdown correctly
- [ ] Admin tabs are clearly differentiated
- [ ] Charts contrast well against dark background
- [ ] No hardcoded colors in Dashboard or Admin CSS

---

## Overview

Phase 6 builds the Dashboard (home screen with AI-generated daily briefs) and Admin panel (system monitoring and configuration). Dashboard aggregates data from all modules into a cohesive daily command center. Admin provides visibility into memories, sessions, tokens, and system health.

## Objectives

1. Build Dashboard with widget system
2. Implement auto-generated status brief
3. Create goal tracking visualization
4. Build Admin panel with tabs
5. Create memory browser
6. Implement session viewer
7. Add token usage analytics
8. Polish loading states and error handling

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 6 DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From Phase 1-5:                                                │
│  • All services: Dashboard, Project, Reminder, Relationship,   │
│    Meeting, Knowledge, Memory, Chat                            │
│  • All database tables populated                               │
│  • Shared components                                           │
│                                                                 │
│  External Dependencies:                                         │
│  • Claude API (for brief generation)                           │
│  • Chart.js or Recharts (for visualizations)                   │
│  • node-cron (for scheduled brief generation)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Task Checklist

### Week 14: Dashboard

#### Dashboard Structure (Day 1)
- [ ] Create `src/components/dashboard/` directory
- [ ] Create `src/components/dashboard/DashboardApp.jsx`
  - [ ] Widget grid layout
  - [ ] Data aggregation from all services
- [ ] Create `src/components/dashboard/DashboardApp.css`
  - [ ] Responsive grid
  - [ ] Widget styling

#### Status Brief (Days 1-2)
- [ ] Create `src/components/dashboard/widgets/StatusBrief.jsx`
  - [ ] Brief card with date header
  - [ ] Pagination (prev/next through history)
  - [ ] "Regenerate" button
- [ ] Create dashboard_briefs table migration
  ```sql
  CREATE TABLE dashboard_briefs (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_data TEXT
  );
  ```
- [ ] Implement brief generation
  - [ ] Aggregate all module data
  - [ ] Send to Claude for summarization
  - [ ] Store in database

#### Overview Widget (Day 2)
- [ ] Create `src/components/dashboard/widgets/OverviewWidget.jsx`
  - [ ] AI-generated narrative summary
  - [ ] Key metrics
  - [ ] Today's focus

#### Schedule Widget (Day 3)
- [ ] Create `src/components/dashboard/widgets/ScheduleWidget.jsx`
  - [ ] Timeline view of today's events
  - [ ] Color-code by event type
  - [ ] Current time indicator
- [ ] Pull from MeetingService

#### Focus & Priorities Widget (Day 3)
- [ ] Create `src/components/dashboard/widgets/FocusPrioritiesWidget.jsx`
  - [ ] Top 3 active focus projects
  - [ ] Confidence percentages
  - [ ] Due indicators
- [ ] Pull from ProjectService

#### Reminders Widget (Day 4)
- [ ] Create `src/components/dashboard/widgets/RemindersWidget.jsx`
  - [ ] Overdue count with items
  - [ ] Due Today count with items
  - [ ] Quick complete/snooze actions
- [ ] Pull from ReminderService

#### Relationships Widget (Day 4)
- [ ] Create `src/components/dashboard/widgets/RelationshipsWidget.jsx`
  - [ ] Stale relationship count
  - [ ] Needs-attention contacts
  - [ ] Patterns detected
- [ ] Pull from RelationshipService

#### Goals Widget (Day 5)
- [ ] Create `src/components/dashboard/widgets/GoalAlignmentWidget.jsx`
  - [ ] Progress bars for each goal
  - [ ] Color by status
- [ ] Implement goal alignment calculation
  - [ ] Link projects to goals
  - [ ] Calculate weighted progress

#### Dashboard Service (Day 5)
- [ ] Create `src/services/DashboardService.js`
  - [ ] `generateDailyBrief()` - AI summarization
  - [ ] `getDashboardData()` - Aggregate from all services
  - [ ] `scheduleAutoGeneration()` - 8:30 AM cron job
  - [ ] `getGoalProgress()` - Calculate goal completion
- [ ] Add cron job to Electron main process

### Week 15: Admin Panel

#### Admin Structure (Day 6)
- [ ] Create `src/components/admin/` directory
- [ ] Create `src/components/admin/AdminApp.jsx`
  - [ ] Tab navigation
  - [ ] Tabs: Overview, Memory, Sessions, Tokens, Sync, Environment
- [ ] Create `src/components/admin/AdminApp.css`

#### Overview Tab (Day 6)
- [ ] Create `src/components/admin/OverviewTab.jsx`
  - [ ] Stat cards grid
- [ ] Create `src/components/admin/StatCard.jsx`
  - [ ] Metric name, value, icon
  - [ ] Optional trend indicator
- [ ] Display: memories, sessions, tokens, services

#### Memory Browser Tab (Days 7-8)
- [ ] Create `src/components/admin/MemoryBrowserTab.jsx`
  - [ ] Type and category filters
  - [ ] Search input
  - [ ] Memory list
- [ ] Create `src/components/admin/MemoryBrowserItem.jsx`
  - [ ] Type badge, title, confidence
  - [ ] Formed date, recall count
  - [ ] Feedback counts
- [ ] Create `src/components/admin/MemoryDetailModal.jsx`
  - [ ] Full content, source chunk
  - [ ] Related entities
  - [ ] Delete option

#### Sessions Tab (Day 8)
- [ ] Create `src/components/admin/SessionsTab.jsx`
  - [ ] Session list
  - [ ] Search/filter
  - [ ] Sort options
- [ ] Create `src/components/admin/SessionBrowserItem.jsx`
  - [ ] Title, date, counts
  - [ ] Click to expand
- [ ] Create `src/components/admin/SessionDetailView.jsx`
  - [ ] Full message history
  - [ ] Token breakdown

#### Token Usage Tab (Day 9)
- [ ] Install Chart.js or Recharts
- [ ] Create `src/components/admin/TokenUsageTab.jsx`
  - [ ] Time period selector
  - [ ] Provider filter
- [ ] Create `src/components/admin/TokenUsageChart.jsx`
  - [ ] Line chart over time
  - [ ] Provider breakdown
- [ ] Create `src/components/admin/TokenSummaryCards.jsx`
  - [ ] Total tokens, cost estimate

#### Sync & Environment Tabs (Day 9)
- [ ] Create `src/components/admin/SyncTab.jsx`
  - [ ] Sync job list with status
  - [ ] Manual trigger buttons
- [ ] Create `src/components/admin/SyncJobItem.jsx`
- [ ] Create `src/components/admin/EnvironmentTab.jsx`
  - [ ] Environment variables (masked)
  - [ ] API key status
  - [ ] App version, paths
- [ ] Create `src/components/admin/EnvVariableRow.jsx`

#### Admin Service (Day 10)
- [ ] Create `src/services/AdminService.js`
  - [ ] `getOverviewStats()`
  - [ ] `getMemories(filters)`
  - [ ] `getSessions()`
  - [ ] `getTokenUsage(period)`
  - [ ] `getSyncJobs()`
  - [ ] `triggerSync(jobType)`
  - [ ] `getEnvironment()`

#### Polish (Day 10)
- [ ] Add loading states to all widgets
- [ ] Implement error boundaries
- [ ] Add empty states
- [ ] Test all data flows

## Deliverables

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 6 DELIVERABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dashboard                                                      │
│  ├─ Status Brief with AI generation                            │
│  ├─ Overview widget with narrative                             │
│  ├─ Schedule widget (today's meetings)                         │
│  ├─ Focus & Priorities widget                                  │
│  ├─ Reminders widget with quick actions                        │
│  ├─ Relationships widget (freshness)                           │
│  ├─ Goals widget with progress bars                            │
│  └─ Auto-generation at 8:30 AM                                 │
│                                                                 │
│  Admin Panel                                                    │
│  ├─ Overview with key metrics                                  │
│  ├─ Memory browser with filters                                │
│  ├─ Session viewer                                             │
│  ├─ Token usage analytics with charts                          │
│  ├─ Sync job management                                        │
│  └─ Environment configuration                                  │
│                                                                 │
│  Polish                                                         │
│  ├─ Loading states everywhere                                  │
│  ├─ Error boundaries                                           │
│  └─ Empty states                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Brief generation slow | Medium | Low | Cache, use Haiku |
| Chart rendering performance | Low | Low | Use canvas, virtualize |
| Data aggregation complex | Medium | Medium | Incremental caching |

## Success Criteria

- [ ] Dashboard loads with all widgets populated
- [ ] Status brief generates with meaningful content
- [ ] Brief pagination works through history
- [ ] Goal progress calculates correctly
- [ ] Admin overview shows accurate stats
- [ ] Memory browser filters work
- [ ] Token chart renders with data
- [ ] Sync jobs trigger and display status
- [ ] Environment shows API key status
- [ ] All loading/error states work

## Files Created/Modified

### New Files (~25)
```
src/components/dashboard/DashboardApp.jsx
src/components/dashboard/DashboardApp.css
src/components/dashboard/widgets/StatusBrief.jsx
src/components/dashboard/widgets/OverviewWidget.jsx
src/components/dashboard/widgets/ScheduleWidget.jsx
src/components/dashboard/widgets/FocusPrioritiesWidget.jsx
src/components/dashboard/widgets/RemindersWidget.jsx
src/components/dashboard/widgets/RelationshipsWidget.jsx
src/components/dashboard/widgets/GoalAlignmentWidget.jsx
src/services/DashboardService.js
src/components/admin/AdminApp.jsx
src/components/admin/AdminApp.css
src/components/admin/OverviewTab.jsx
src/components/admin/StatCard.jsx
src/components/admin/MemoryBrowserTab.jsx
src/components/admin/MemoryBrowserItem.jsx
src/components/admin/MemoryDetailModal.jsx
src/components/admin/SessionsTab.jsx
src/components/admin/SessionBrowserItem.jsx
src/components/admin/SessionDetailView.jsx
src/components/admin/TokenUsageTab.jsx
src/components/admin/TokenUsageChart.jsx
src/components/admin/TokenSummaryCards.jsx
src/components/admin/SyncTab.jsx
src/components/admin/SyncJobItem.jsx
src/components/admin/EnvironmentTab.jsx
src/components/admin/EnvVariableRow.jsx
src/services/AdminService.js
electron/database/migrations/003_briefs.cjs
```

### Modified Files (~3)
```
src/App.jsx - Add Dashboard and Admin routes
electron/main.cjs - Add brief generation cron job
package.json - Add chart library
```

## Agent Assignment

- Primary: `electron-react-dev`

---
**Notes**: Dashboard is the first thing users see every morning. The status brief should feel like a personal assistant prepared your day. Admin is for power users - make it informative but not overwhelming.
