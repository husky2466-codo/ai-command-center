# Admin Panel

**Status**: Not Started
**Priority**: P2 (Medium)
**Estimated Effort**: 4 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup
- `specs/features/MEMORY-EXTRACTION.md` - Memory browsing
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Gray `--module-admin` (#64748b)
- **Visual Theme**: System monitoring, data tables, analytics

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-admin` | #64748b |
| Card backgrounds | `--bg-card` | #2d2d4a |
| Charts | Per data type | Various |
| Status healthy | `--status-success` | #22c55e |
| Status warning | `--status-warning` | #f59e0b |
| Status error | `--status-error` | #ef4444 |

### Status Indicator Colors
```css
/* Service/Job Status */
.status-healthy { color: #22c55e; } /* Green */
.status-warning { color: #f59e0b; } /* Yellow */
.status-error   { color: #ef4444; } /* Red */
.status-offline { color: #6b7280; } /* Gray */
```

### Icon Style
- Line art, 2px stroke weight
- Admin icons: settings, database, activity, shield, key
- Status icons: check-circle, alert-circle, x-circle

### Layout Pattern - Tabbed
```
+--------------------------------------------------+
| [Overview] [Memory] [Sessions] [Tokens] [Sync]   |
+--------------------------------------------------+
| OVERVIEW TAB                                     |
| +------------+ +------------+ +------------+     |
| | Memories   | | Sessions   | | Tokens     |     |
| | 1,234      | | 56         | | 2.5M       |     |
| +------------+ +------------+ +------------+     |
|                                                  |
| +----------------------------------------------+ |
| | SERVICE STATUS                               | |
| | [OK] Ollama     [OK] Database    [!] Sync    | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

### Component Specifics
- **Stat Cards**: Large number, label, optional trend
- **Data Tables**: Alternating row colors, sortable headers
- **Charts**: Line/bar charts, dark theme colors
- **API Key Display**: Masked with reveal toggle
- **Delete Buttons**: Red with confirmation dialog

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Status indicators use correct colors
- [ ] API keys are properly masked
- [ ] Tables are readable and sortable
- [ ] Charts use dark-theme-friendly colors
- [ ] Destructive actions have confirmation

---

## Overview

The Admin Panel provides system monitoring and configuration. It includes an overview dashboard with key metrics, memory browser for viewing/managing extracted memories, session viewer for conversation history, token usage analytics, sync job status, and environment configuration.

## Acceptance Criteria

- [ ] Overview tab showing: memory count, session count, token usage, service status
- [ ] Memory browser with filtering by type and category
- [ ] Memory cards with recall stats and feedback counts
- [ ] Session viewer listing all chat sessions
- [ ] Token usage chart by provider and time period
- [ ] Sync job status and management
- [ ] Environment variables display (API keys masked)
- [ ] MCP server status (if applicable)

## Tasks

### Section 1: Component Structure
- [ ] Create `src/components/admin/` directory
  - [ ] Create `AdminApp.jsx` - Main container with tabs
  - [ ] Create `AdminApp.css` - Admin-specific styles
- [ ] Implement tabbed interface
  - [ ] Tabs: Overview, Memory, Sessions, Tokens, Sync, Environment

### Section 2: Overview Tab
- [ ] Create `OverviewTab.jsx`
  - [ ] Stat cards grid layout
- [ ] Create `StatCard.jsx`
  - [ ] Display metric name, value, icon
  - [ ] Optional trend indicator
- [ ] Display metrics:
  - [ ] Total memories
  - [ ] Total sessions
  - [ ] Total tokens used
  - [ ] Active services count
- [ ] Show quick status:
  - [ ] Sync jobs health
  - [ ] Job queue status
  - [ ] MCP server status

### Section 3: Memory Browser Tab
- [ ] Create `MemoryBrowserTab.jsx`
  - [ ] Filter dropdowns: Type, Category
  - [ ] Search input
  - [ ] Memory list
- [ ] Create `MemoryBrowserItem.jsx`
  - [ ] Type badge with color
  - [ ] Title and confidence percentage
  - [ ] Formed date, recall count
  - [ ] Feedback counts (thumbs up/down)
- [ ] Create `MemoryDetailModal.jsx`
  - [ ] Full memory content
  - [ ] Source chunk display
  - [ ] Related entities
  - [ ] Delete button (with confirmation)

### Section 4: Sessions Tab
- [ ] Create `SessionsTab.jsx`
  - [ ] List all chat sessions
  - [ ] Search/filter by date
  - [ ] Sort by date, message count, tokens
- [ ] Create `SessionBrowserItem.jsx`
  - [ ] Title/first message
  - [ ] Date, message count, token count
  - [ ] Click to expand details
- [ ] Create `SessionDetailView.jsx`
  - [ ] Show full message history (read-only)
  - [ ] Token breakdown
  - [ ] Delete session option

### Section 5: Token Usage Tab
- [ ] Create `TokenUsageTab.jsx`
  - [ ] Time period selector (7 days, 30 days, all time)
  - [ ] Provider filter
  - [ ] Chart display
- [ ] Create `TokenUsageChart.jsx`
  - [ ] Line chart of token usage over time
  - [ ] Breakdown by provider
  - [ ] Estimated cost calculation
- [ ] Create `TokenSummaryCards.jsx`
  - [ ] Total tokens this period
  - [ ] By provider breakdown
  - [ ] Estimated cost

### Section 6: Sync Tab
- [ ] Create `SyncTab.jsx`
  - [ ] List all sync jobs
  - [ ] Status indicators
  - [ ] Manual trigger buttons
- [ ] Create `SyncJobItem.jsx`
  - [ ] Job type, status, last run
  - [ ] Next scheduled run
  - [ ] Error message if failed
  - [ ] Trigger now button

### Section 7: Environment Tab
- [ ] Create `EnvironmentTab.jsx`
  - [ ] Display environment variables
  - [ ] API keys masked (show last 4 chars)
  - [ ] Edit capability for non-sensitive values
- [ ] Create `EnvVariableRow.jsx`
  - [ ] Key name, masked/full value
  - [ ] "Show" toggle for revealing
  - [ ] Status indicator (set/missing)
- [ ] Display:
  - [ ] ANTHROPIC_API_KEY
  - [ ] OPENAI_API_KEY
  - [ ] HF_TOKEN
  - [ ] Ollama status
  - [ ] App version
  - [ ] Storage paths

### Section 8: Admin Service
- [ ] Create `src/services/AdminService.js`
  - [ ] `getOverviewStats()` - Aggregate counts
  - [ ] `getMemories(filters)` - Filtered memory list
  - [ ] `getSessions()` - Session list
  - [ ] `getTokenUsage(period)` - Token stats
  - [ ] `getSyncJobs()` - Sync job status
  - [ ] `triggerSync(jobType)` - Manual sync trigger
  - [ ] `getEnvironment()` - Env vars

### Section 9: Memory Management
- [ ] Implement memory deletion
  - [ ] Soft delete or hard delete
  - [ ] Confirmation dialog
- [ ] Implement memory editing (optional)
  - [ ] Edit title/content
  - [ ] Adjust confidence manually

## Technical Details

### Files to Create
- `src/components/admin/AdminApp.jsx` - Main container
- `src/components/admin/AdminApp.css` - Styles
- `src/components/admin/OverviewTab.jsx` - Overview stats
- `src/components/admin/StatCard.jsx` - Metric card
- `src/components/admin/MemoryBrowserTab.jsx` - Memory list
- `src/components/admin/MemoryBrowserItem.jsx` - Memory item
- `src/components/admin/MemoryDetailModal.jsx` - Memory detail
- `src/components/admin/SessionsTab.jsx` - Session list
- `src/components/admin/SessionBrowserItem.jsx` - Session item
- `src/components/admin/SessionDetailView.jsx` - Session detail
- `src/components/admin/TokenUsageTab.jsx` - Token analytics
- `src/components/admin/TokenUsageChart.jsx` - Usage chart
- `src/components/admin/TokenSummaryCards.jsx` - Token summary
- `src/components/admin/SyncTab.jsx` - Sync jobs
- `src/components/admin/SyncJobItem.jsx` - Sync job
- `src/components/admin/EnvironmentTab.jsx` - Env vars
- `src/components/admin/EnvVariableRow.jsx` - Env var row
- `src/services/AdminService.js` - Admin logic

### Files to Modify
- `src/App.jsx` - Add Admin to router

### Database Tables Used
```sql
SELECT COUNT(*) FROM memories;
SELECT COUNT(*) FROM chat_sessions;
SELECT SUM(token_count) FROM chat_messages;
SELECT * FROM sync_jobs;
SELECT * FROM token_usage;
```

### IPC Channels
- `admin:get-stats` - Overview statistics
- `admin:get-memories` - Memory list with filters
- `admin:delete-memory` - Delete memory
- `admin:get-sessions` - Session list
- `admin:get-session-detail` - Full session
- `admin:delete-session` - Delete session
- `admin:get-token-usage` - Token analytics
- `admin:get-sync-jobs` - Sync job status
- `admin:trigger-sync` - Manual sync
- `admin:get-environment` - Env vars

## Implementation Hints

- Use Chart.js or Recharts for token usage visualization
- Memory browser should virtualize if 1000+ memories
- Consider pagination for sessions list
- API keys should never be sent to renderer unmasked
- Sync jobs can use node-cron in main process
- Color-code status indicators: green=healthy, yellow=warning, red=error
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for AdminService methods
- [ ] Overview stats calculate correctly
- [ ] Memory browser filters work
- [ ] Session list loads and displays
- [ ] Token chart renders with data
- [ ] Sync job triggers work
- [ ] Environment variables display correctly
- [ ] API keys are properly masked
- [ ] Delete operations require confirmation
- [ ] Empty states handled

---
**Notes**: The Admin panel is primarily for power users and debugging. It provides transparency into how the system works. The memory browser is particularly useful for understanding what the AI "knows" and cleaning up bad memories.
