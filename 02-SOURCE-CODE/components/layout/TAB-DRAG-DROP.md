# Tab Drag and Drop Feature

## Overview

Users can now drag and drop tabs between split panes in AI Command Center. This allows for flexible workspace organization where tabs can be moved from one pane to another seamlessly.

## Implementation

### Files Modified

1. **LayoutContext.jsx** - Added `moveTab` function
2. **PaneContainer.jsx** - Added drag-and-drop handlers
3. **layout.css** - Added visual feedback styles

### Key Features

#### 1. Drag Functionality
- **Cursor Feedback**: Tabs show `grab` cursor on hover, `grabbing` while dragging
- **Opacity Change**: Dragged tab becomes semi-transparent (40% opacity)
- **Data Transfer**: Tab ID and source pane ID are passed via drag event

#### 2. Drop Target Highlighting
- **Visual Indicator**: Drop-enabled pane shows gold highlight and background tint
- **Border**: 2px gold border around the tabs container when dragging over it
- **Background**: Subtle gold tint (rgba(255, 215, 0, 0.1))

#### 3. Smart Tab Movement
- **Duplicate Prevention**: If the destination pane already has a tab with the same app, it just activates that tab instead of creating a duplicate
- **Same-Pane Guard**: Dragging within the same pane does nothing
- **Active Tab Management**: Source pane intelligently selects a new active tab after removal
- **Auto-Activation**: Moved tab becomes active in the destination pane

## Usage

### How to Drag a Tab

1. **Click and hold** on any tab in a split pane
2. **Drag** the tab over to another pane's tab bar
3. **Release** when you see the gold highlight
4. The tab will move to the new pane and become active

### Visual Feedback

- **While dragging**:
  - Dragged tab: 40% opacity
  - Mouse cursor: Changes to "grabbing" icon
  - Valid drop target: Gold border and background tint

- **After dropping**:
  - Tab appears in destination pane
  - Tab becomes active in destination
  - Source pane updates active tab selection

### Edge Cases Handled

1. **Duplicate Apps**: Won't create duplicate instances - just switches to existing tab
2. **Same Pane**: No action taken if you drop in the same pane
3. **Last Tab**: Source pane goes to home screen if you move the last tab
4. **Invalid Data**: Error handling for corrupted drag data

## API Reference

### LayoutContext: `moveTab(fromPaneId, toPaneId, tabId)`

Moves a tab from one pane to another.

**Parameters:**
- `fromPaneId` (string): ID of the pane containing the tab
- `toPaneId` (string): ID of the destination pane
- `tabId` (string): ID of the tab to move

**Behavior:**
- Removes tab from source pane
- Adds tab to destination pane (or activates existing tab with same appId)
- Updates active tab states in both panes
- Persists layout to localStorage

**Returns:** void

## Technical Details

### HTML5 Drag and Drop API

Uses native browser drag-and-drop:
- `draggable="true"` on tab elements
- `dataTransfer.setData()` to pass tab info as JSON
- `dataTransfer.effectAllowed = 'move'`
- `dataTransfer.dropEffect = 'move'`

### State Management

- Uses React hooks (`useState`) for drag-over state
- LayoutContext manages all pane/tab state
- Changes persist to localStorage automatically

### CSS Variables

Styling uses theme-aware CSS variables:
- `--accent-primary`: Gold highlight color
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`: Background colors
- `--transition-fast`: Animation timing

## Future Enhancements

Possible improvements:
- **Tab reordering**: Drag to reorder tabs within same pane
- **Visual preview**: Ghost image showing tab position while dragging
- **Drop zones**: Show explicit drop indicators between tabs
- **Keyboard shortcuts**: Ctrl+Shift+Arrow to move tabs between panes
- **Multi-select**: Drag multiple tabs at once

## Testing

To test the feature:

1. **Split a pane** (click Columns or Rows icon)
2. **Open apps** in both panes (Dashboard, Projects, etc.)
3. **Drag a tab** from one pane to the other
4. **Verify**:
   - Tab moves correctly
   - Visual feedback appears
   - Active states update
   - Layout persists after refresh

## Known Limitations

- Maximum 6 panes supported (reasonable for usability)
- Can't drag home screen (only actual tabs)
- Drag preview is browser default (may vary by OS)
