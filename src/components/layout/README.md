# Split Pane Layout System

This folder contains the split pane/tab view functionality for AI Command Center.

## Overview

The split layout system allows users to:
- View multiple apps side-by-side in split panes
- Have independent tab bars in each pane
- Resize panes by dragging the divider
- Split horizontally (left/right) or vertically (top/bottom)
- Close panes to return to single view
- Persist layout state to localStorage

## Components

### LayoutContext.jsx
Manages global layout state using React Context:
- **State**: Array of panes, each with its own tabs and activeTabId
- **Methods**:
  - `openAppInPane(paneId, appData)` - Open app in specific pane
  - `closeTabInPane(paneId, tabId)` - Close tab in specific pane
  - `setActiveTabInPane(paneId, tabId)` - Set active tab in pane
  - `splitPane(direction)` - Create second pane ('horizontal' or 'vertical')
  - `closePane(paneId)` - Close pane and return to single view
  - `getPane(paneId)` - Get pane by ID

### SplitLayout.jsx
Root layout component that renders either:
- **Single pane view**: When only 1 pane exists
- **Split view**: When 2 panes exist, using react-resizable-panels

Uses PanelGroup, Panel, and PanelResizeHandle from react-resizable-panels for resizable split.

### PaneContainer.jsx
Individual pane component with:
- **Tab bar**: Home button, tabs, split controls, close button
- **Content area**: Active tab content or home screen with app grid
- **Controls**:
  - Split Right (Columns icon) - Creates horizontal split
  - Split Down (Rows icon) - Creates vertical split
  - Close Pane (X icon) - Removes pane (only shown in 2nd pane)

### layout.css
Styles for all layout components:
- Tab bar styling matching existing TabNavigation
- Split controls button styles
- Resize handle styling with hover/drag states
- Pane home screen with app grid
- Uses CSS variables from design system

## Usage

### In App.jsx

```jsx
import { LayoutProvider } from './components/layout/LayoutContext';
import SplitLayout from './components/layout/SplitLayout';

export default function App() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <SplitLayout APPS={APPS} apiKeys={apiKeys} />
      </LayoutProvider>
    </ThemeProvider>
  );
}
```

### Opening Apps from Sidebar

```jsx
const { openAppInPane, panes } = useLayout();

const openApp = (appId) => {
  // Open in first pane by default
  if (panes.length > 0 && APPS[appId]) {
    openAppInPane(panes[0].id, APPS[appId]);
  }
};
```

## Features

### Persistence
Layout state is automatically saved to localStorage under key `ai-command-center-layout`:
- Pane configuration (IDs)
- Open tabs in each pane (appId, tabId)
- Active tab per pane
- Split direction ('horizontal' or 'vertical')

### Component Instances
Each tab gets a unique `instanceId` prop (same as tab.id) allowing components to maintain separate state when opened multiple times.

### Keyboard & Mouse
- Click tab to activate
- Click × to close tab
- Drag resize handle to adjust pane sizes
- Minimum pane size: 20% of total width/height

### Constraints
- Maximum 2 panes supported
- Split controls only shown when 1 pane exists
- Close pane button only shown on 2nd pane
- First pane cannot be closed

## Design System Integration

### Colors
- Uses `--accent-primary` (gold) for split button hover
- Resize handle uses `--accent-primary` on hover/drag
- Follows existing tab bar color scheme
- Error color for close pane button hover

### Icons
- Home: SVG house icon (existing)
- Split Right: Lucide `Columns` icon (16px)
- Split Down: Lucide `Rows` icon (16px)
- Close Pane: Lucide `X` icon (16px)

### Transitions
- Uses `--transition-fast` for button hover effects
- Resize handle background transition

## Dependencies

- **react-resizable-panels**: ^2.1.7
- **lucide-react**: ^0.562.0 (already installed)

## Future Enhancements

Potential features for future versions:
- Drag-and-drop tabs between panes
- More than 2 panes (grid layout)
- Save/load named layouts
- Keyboard shortcuts for split/close
- Tab duplication (open same app in both panes)
- Customizable minimum pane sizes
- Pane swap/rearrange
