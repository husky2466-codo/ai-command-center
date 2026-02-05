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
  - `splitPane(paneId, direction)` - Split specific pane ('horizontal' or 'vertical')
  - `closePane(paneId)` - Close pane and return to single view
  - `getPane(paneId)` - Get pane by ID
  - `moveTab(fromPaneId, toPaneId, tabId)` - Move tab between panes

### SplitLayout.jsx
Root layout component that renders either:
- **Single pane view**: When only 1 pane exists
- **Multi-pane split view**: When 2+ panes exist, using react-resizable-panels

Uses PanelGroup, Panel, and PanelResizeHandle from react-resizable-panels for resizable splits.
Dynamically renders all panes with equal initial sizing and resize handles between each pane.

### PaneContainer.jsx
Individual pane component with:
- **Tab bar**: Home button, tabs, split controls, close button
- **Content area**: Active tab content or home screen with app grid
- **Controls**:
  - Split Right (Columns icon) - Splits current pane horizontally (new pane appears to the right)
  - Split Down (Rows icon) - Splits current pane vertically (new pane appears below)
  - Close Pane (X icon) - Removes pane (shown when multiple panes exist)

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

### Drag and Drop Tabs
**NEW**: Tabs can be dragged between panes for flexible workspace organization:
- **Drag to move**: Click and hold any tab, drag to another pane's tab bar
- **Visual feedback**: Gold highlight on valid drop targets, semi-transparent dragged tab
- **Smart handling**: Won't create duplicates - activates existing tab if same app already open
- **Auto-activation**: Moved tab becomes active in destination pane
- See [TAB-DRAG-DROP.md](./TAB-DRAG-DROP.md) for detailed documentation

### Keyboard & Mouse
- Click tab to activate
- Click × to close tab
- **Drag tab to move** between panes
- Drag resize handle to adjust pane sizes
- Minimum pane size: 15% of total width/height

### Constraints
- Maximum 6 panes supported (reasonable usability limit)
- Split controls shown on all panes (each pane can be split independently)
- Close pane button shown when 2+ panes exist
- Cannot close the last remaining pane
- All panes start with equal size distribution

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

## Recent Changes (2026-01-05)

### Multi-Pane Support (3+ panes)
Previously limited to 2 panes, now supports up to 6 panes:
- **Each pane can split independently**: Split buttons available on all panes
- **Dynamic rendering**: SplitLayout.jsx uses array mapping to render any number of panes
- **Equal distribution**: Panes automatically resize to equal widths/heights when new panes are added
- **Flexible closing**: Any pane can be closed (except the last one)
- **Context signature change**: `splitPane(paneId, direction)` now requires paneId parameter

**Breaking Changes:**
- `splitPane(direction)` → `splitPane(paneId, direction)` - must specify which pane to split

## Future Enhancements

Potential features for future versions:
- **Tab reordering**: Drag to reorder tabs within same pane
- **Grid layout**: Mix of horizontal and vertical splits
- **Save/load named layouts**: Persist custom workspace configurations
- **Keyboard shortcuts**: Ctrl+Shift+Arrow to move tabs between panes
- **Tab duplication**: Clone tab to open same app in both panes
- **Customizable minimum pane sizes**: User-defined constraints
- **Pane swap/rearrange**: Drag panes to reorder them
- **More than 6 panes**: Better UI for managing many splits
