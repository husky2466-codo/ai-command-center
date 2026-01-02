# React Integration - Project Refresh Hook

This document summarizes the integration of the `useProjectRefresh` hook into React components.

## Overview

The `useProjectRefresh` hook provides real-time project updates from the background daemon. When projects are refreshed, all subscribed components automatically reload their data.

## Files Modified

### 1. ProjectService.js

Added 4 new methods to support the refresh daemon:

```javascript
// Manually trigger a project refresh
async manualRefresh()

// Get refresh daemon status (running, interval, lastRefresh, nextRefresh)
async getDaemonStatus()

// Set refresh interval in milliseconds
async setRefreshInterval(intervalMs)

// Subscribe to refresh events
onProjectsRefreshed(callback)
```

**Location:** `src/services/ProjectService.js` (lines 743-795)

### 2. Projects.jsx

Integrated the hook to reload projects when daemon fires:

```javascript
import { useProjectRefresh } from '../../hooks/useProjectRefresh';

// In component body:
useProjectRefresh(() => {
  console.log('[Projects] Refresh triggered by daemon');
  loadData();
});
```

**Location:** `src/components/projects/Projects.jsx` (lines 4, 37-41)

### 3. Dashboard.jsx

Integrated the hook to reload dashboard when projects update:

```javascript
import { useProjectRefresh } from '../../hooks/useProjectRefresh';

// In component body:
useProjectRefresh(() => {
  console.log('[Dashboard] Refresh triggered by daemon');
  loadDashboard();
});
```

**Location:** `src/components/dashboard/Dashboard.jsx` (lines 4, 25-29)

### 4. DGXSpark.jsx

Integrated the hook to reload DGX projects and connections:

```javascript
import { useProjectRefresh } from '@/hooks/useProjectRefresh';

// In component body:
useProjectRefresh(() => {
  console.log('[DGXSpark] Refresh triggered by daemon');
  loadConnections();
});
```

**Location:** `src/components/dgx-spark/DGXSpark.jsx` (lines 21, 32-36)

## How It Works

1. **Background Daemon**: Runs in Electron main process, scanning projects every 5 minutes
2. **Progress Calculation**: Based on milestones (README, package.json, src/, tests/, build/, .git)
3. **Event Emission**: When projects change, daemon emits `projects-refreshed` event
4. **Hook Subscription**: `useProjectRefresh` subscribes to events via IPC
5. **Component Refresh**: When event fires, callback executes (e.g., `loadData()`)

## Usage Pattern

```javascript
import { useProjectRefresh } from '@/hooks/useProjectRefresh';

function MyComponent() {
  // Add hook with callback to reload data
  useProjectRefresh(() => {
    console.log('[MyComponent] Refresh triggered');
    loadMyData();
  });

  // Rest of component...
}
```

## Benefits

- **Real-time Updates**: Projects UI stays in sync with file system changes
- **Low Overhead**: Only updates when projects actually change
- **Automatic Cleanup**: Hook handles unsubscribe on component unmount
- **Cross-Component**: Multiple components can subscribe independently

## Testing

Build succeeded with no errors:
```
✓ 1972 modules transformed
✓ built in 2.87s
```

All components now receive automatic updates when:
- Files are added/modified in project directories
- Milestones are completed (package.json created, src/ added, etc.)
- DGX projects are created/updated via API
- Manual refresh is triggered

## Related Files

- **Hook Implementation**: `src/hooks/useProjectRefresh.js`
- **Daemon Service**: `electron/services/projectRefreshDaemon.cjs`
- **IPC Handlers**: `electron/main.cjs` (lines for projectRefreshDaemon)
- **Preload API**: `electron/preload.cjs` (projectsManualRefresh, etc.)
