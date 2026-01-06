# Multi-Pane Split View Implementation

**Date:** 2026-01-05
**Status:** Complete

## Overview

Upgraded the split view system from supporting only 2 panes to supporting up to 6 independent panes. Users can now split any pane repeatedly to create complex multi-pane layouts.

## Problem

The original implementation had hard-coded limitations:
- Maximum 2 panes enforced in `LayoutContext.jsx`
- Split buttons were disabled after creating the first split
- `SplitLayout.jsx` only rendered exactly 2 panes
- No way to create 3, 4, or more panes

## Solution

### 1. Updated `LayoutContext.jsx`

**Before:**
```javascript
const splitPane = useCallback((direction) => {
  if (panes.length >= 2) {
    console.warn('Maximum 2 panes supported');
    return;
  }
  // Creates new pane...
}, [panes.length]);
```

**After:**
```javascript
const splitPane = useCallback((paneId, direction) => {
  const maxPanes = 6; // Reasonable usability limit
  if (panes.length >= maxPanes) {
    console.warn(`Maximum ${maxPanes} panes supported`);
    return;
  }

  // Find the specific pane to split
  const paneIndex = panes.findIndex(p => p.id === paneId);
  // Insert new pane after the one being split
  // ...
}, [panes]);
```

**Key Changes:**
- `splitPane()` now accepts `paneId` parameter to identify which pane to split
- Maximum increased from 2 to 6 panes
- New pane is inserted adjacent to the pane being split
- Split direction is set only on first split (subsequent splits follow the same direction)

### 2. Updated `SplitLayout.jsx`

**Before:**
```javascript
// Hard-coded for exactly 2 panes
<Panel defaultSize={50} minSize={20}>
  <PaneContainer paneId={panes[0].id} canSplit={false} />
</Panel>
<PanelResizeHandle />
<Panel defaultSize={50} minSize={20}>
  <PaneContainer paneId={panes[1].id} canSplit={false} />
</Panel>
```

**After:**
```javascript
// Dynamic rendering for any number of panes
const defaultSize = 100 / panes.length;

{panes.map((pane, index) => (
  <React.Fragment key={pane.id}>
    <Panel defaultSize={defaultSize} minSize={15}>
      <PaneContainer paneId={pane.id} canSplit={true} />
    </Panel>
    {index < panes.length - 1 && <PanelResizeHandle />}
  </React.Fragment>
))}
```

**Key Changes:**
- Uses array mapping to render any number of panes
- Equal size distribution (100% / panes.length)
- Each pane has `canSplit={true}` (all panes can split)
- Resize handles only between panes (not after the last one)
- Reduced minimum pane size from 20% to 15%

### 3. Updated `PaneContainer.jsx`

**Before:**
```javascript
const handleSplitRight = () => {
  splitPane('horizontal');
};

const handleSplitDown = () => {
  splitPane('vertical');
};
```

**After:**
```javascript
const handleSplitRight = () => {
  splitPane(paneId, 'horizontal');
};

const handleSplitDown = () => {
  splitPane(paneId, 'vertical');
};
```

**Key Changes:**
- Now passes `paneId` to identify which pane is being split
- Split buttons remain enabled on all panes

## Features

### Multi-Pane Splitting
- Start with 1 pane
- Click "Split Right" or "Split Down" on any pane
- New pane appears adjacent to the one being split
- Can create up to 6 panes total

### Independent Pane Control
- Each pane has its own split buttons
- Each pane can have its own tabs and active content
- Close button shown on all panes when 2+ exist
- Cannot close the last remaining pane

### Automatic Resizing
- Panes are equally distributed when a new pane is added
- Example: 3 panes = 33.3% each, 4 panes = 25% each
- User can manually resize any pane by dragging handles

### Persistence
- Layout state (including all panes) saved to localStorage
- Restored on app restart

### Bonus: Drag-and-Drop Tabs
The system also gained drag-and-drop functionality (added during refactoring):
- Drag tabs between panes to move them
- Visual feedback during drag (opacity change)
- Drop zone highlighting
- Prevents duplicate app instances per pane

## Technical Details

### Constraints
- **Maximum panes:** 6 (configurable in code)
- **Minimum pane size:** 15% of container width/height
- **Split direction:** Set on first split, maintained for all subsequent splits
  - First split determines if layout is horizontal or vertical
  - All panes align in the same direction
  - Close all panes and restart to change direction

### Files Modified
- `src/components/layout/LayoutContext.jsx` - Core state management
- `src/components/layout/SplitLayout.jsx` - Dynamic multi-pane rendering
- `src/components/layout/PaneContainer.jsx` - Split button handlers
- `src/components/layout/README.md` - Documentation update

### Breaking Changes
- **API signature change:** `splitPane(direction)` → `splitPane(paneId, direction)`
- Components calling `splitPane()` must now provide `paneId` parameter

## Testing

Build completed successfully:
```
✓ 1978 modules transformed
✓ built in 3.59s
```

### Test Scenarios
1. **Single to double pane:** Click "Split Right" on first pane → creates 2nd pane
2. **Double to triple pane:** Click "Split Right" on any existing pane → creates 3rd pane
3. **Triple to quad pane:** Continue splitting → creates 4th pane
4. **Maximum limit:** Try to create 7th pane → warning in console, no action
5. **Close pane:** Click X on any pane → removes pane, redistributes space
6. **Resize panes:** Drag handles between panes → adjusts sizes
7. **Persistence:** Refresh app → layout restored from localStorage

## Future Enhancements

Potential improvements:
- **Grid layouts:** Mix horizontal and vertical splits (2x2 grid)
- **Named layouts:** Save/load layout configurations
- **More than 6 panes:** With better UI for managing many panes
- **Keyboard shortcuts:** Quick split/close commands
- **Pane swap:** Drag panes to rearrange order

## Usage Example

```javascript
import { useLayout } from './components/layout/LayoutContext';

function MyComponent() {
  const { splitPane, panes } = useLayout();

  const handleSplit = () => {
    // Split the first pane horizontally
    splitPane(panes[0].id, 'horizontal');
  };

  return (
    <button onClick={handleSplit}>
      Split First Pane
    </button>
  );
}
```

## Conclusion

The multi-pane implementation successfully removes the 2-pane limitation and provides a flexible, scalable layout system. Users can now create complex workspace arrangements with up to 6 independent panes, each with its own tabs and content.

All panes have equal capabilities (can split, can be closed), providing a consistent and intuitive user experience.
