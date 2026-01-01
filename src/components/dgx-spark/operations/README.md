# Operations Tab - DGX Spark

Real-time monitoring of running operations on DGX Spark systems.

## Overview

The Operations tab provides a unified view of all active operations on the connected DGX system, organized into three categories:

- **Servers**: Running services (ComfyUI, Ollama, web servers, etc.)
- **Training Jobs**: Active ML training jobs with progress tracking
- **Programs & Scripts**: Background processes and scripts

## Components

### OperationsTab.jsx
Main tab component that:
- Uses `useOperationPolling` hook for real-time data
- Displays three collapsible sections
- Shows empty states when no operations running
- Includes "New Operation" button (placeholder for future feature)

### useOperationPolling.js
Custom React hook that:
- Fetches operations from `/api/dgx/operations` every 2 seconds
- Groups operations by type (servers, jobs, programs)
- Returns `{ operations, loading, error, refresh }`
- Automatically cleans up polling interval on unmount

### OperationCard.jsx
Individual operation display card showing:
- Operation type icon (Server, Brain, Terminal)
- Name and description
- Status indicator with color-coded dot
- Type-specific details:
  - **Servers**: Port number
  - **Jobs**: Progress percentage, current epoch
  - **Programs**: Process ID (PID)
- Common details: Start time, uptime

### OperationsTab.css
Styling for:
- Section headers with hover effects
- Collapsible sections with chevron icons
- Operation cards in responsive grid layout
- Status indicators with pulse animation
- Empty states for each section

## Data Format

The hook expects operations to have this structure:

```javascript
{
  id: 'operation-uuid',
  type: 'server' | 'job' | 'program',
  name: 'Operation Name',
  description: 'Optional description',
  status: 'running' | 'active' | 'starting' | 'pending' | 'stopped' | 'failed',
  started_at: '2025-12-31T12:00:00Z',

  // Server-specific
  port: 8188,

  // Job-specific
  progress: 0.45,
  metrics: {
    epoch: 25,
    train_loss: 0.342
  },

  // Program-specific
  pid: 12345,

  // Common
  uptime: 3600 // seconds
}
```

## API Integration

### Endpoint
```
GET /api/dgx/operations
```

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "op-123",
      "type": "server",
      "name": "ComfyUI Server",
      "status": "running",
      "port": 8188,
      "started_at": "2025-12-31T10:00:00Z",
      "uptime": 7200
    }
  ]
}
```

## Features

- **Real-time Polling**: Auto-refreshes every 2 seconds
- **Grouped by Type**: Three distinct sections for better organization
- **Collapsible Sections**: Click headers to expand/collapse
- **Status Indicators**: Color-coded dots (green=running, yellow=starting, red=failed)
- **Empty States**: Clear messaging when no operations are running
- **Responsive Design**: Grid layout adapts to screen size

## Usage

The tab is integrated into DGXSpark.jsx:

```jsx
import OperationsTab from './operations/OperationsTab.jsx';

// In tabs array
{ id: 'operations', name: 'Running Operations', icon: Activity }

// In render
{activeTab === 'operations' && (
  <OperationsTab
    isConnected={connectionStatus === 'connected'}
    connectionId={activeConnection?.id}
  />
)}
```

## Future Enhancements

- **New Operation Button**: Launch new jobs/servers from UI
- **Stop/Start Actions**: Control buttons for each operation
- **Log Viewing**: Click operation to view real-time logs
- **Resource Usage**: Show CPU/GPU/RAM per operation
- **Notifications**: Alert when operations fail or complete
- **Filtering**: Search and filter operations
- **Sorting**: Sort by status, start time, or name

## Design Alignment

Follows DGX Spark design patterns:
- Dark theme with subtle borders
- Accent color on hover
- Consistent icon sizing (lucide-react)
- Card-based layout
- Status color coding (green/yellow/red)
