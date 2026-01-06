# Tab Drag and Drop - Testing Guide

## Quick Start

1. **Launch the app**: `npm run dev:electron`
2. **Create a split**: Click the Columns icon in the tab bar
3. **Open apps**: Open Dashboard in left pane, Projects in right pane
4. **Test drag**: Drag the Dashboard tab to the right pane

## Test Scenarios

### Test 1: Basic Tab Move
**Objective**: Verify tabs can be dragged between panes

1. Split the screen (Columns button)
2. Open Dashboard in left pane
3. Open Projects in right pane
4. Drag Dashboard tab from left to right
5. **Expected**: Dashboard tab appears in right pane and becomes active

**Pass Criteria**:
- ✅ Tab moves to destination pane
- ✅ Tab becomes active in destination
- ✅ Source pane shows home screen (no tabs left)

---

### Test 2: Visual Feedback
**Objective**: Verify drag-and-drop visual indicators

1. Start dragging any tab
2. **Expected**: Tab becomes semi-transparent (40% opacity)
3. Hover over another pane's tab bar
4. **Expected**: Gold highlight appears around tabs container
5. Release the tab
6. **Expected**: Highlight disappears, tab opacity restored

**Pass Criteria**:
- ✅ Dragged tab shows 40% opacity
- ✅ Cursor changes to "grabbing" icon
- ✅ Drop target shows gold border and background tint
- ✅ Visual feedback clears after drop

---

### Test 3: Duplicate Prevention
**Objective**: Verify no duplicate tabs are created

1. Open Dashboard in both panes
2. Drag Dashboard tab from left pane to right pane
3. **Expected**: Right pane activates existing Dashboard tab (no duplicate)

**Pass Criteria**:
- ✅ No duplicate Dashboard tabs created
- ✅ Existing Dashboard tab becomes active
- ✅ Source Dashboard tab is removed

---

### Test 4: Active Tab Management
**Objective**: Verify active tab updates correctly

1. Open 3 tabs in left pane: Dashboard, Projects, Reminders
2. Make Projects tab active (middle tab)
3. Drag Projects tab to right pane
4. **Expected**:
   - Left pane activates Reminders tab (next in order)
   - Right pane activates Projects tab

**Pass Criteria**:
- ✅ Source pane activates next available tab
- ✅ Destination pane activates moved tab
- ✅ No blank/empty pane content

---

### Test 5: Same Pane Drop (No-op)
**Objective**: Verify dragging within same pane does nothing

1. Open 2 tabs in left pane
2. Drag one tab, then drop it back in the same pane
3. **Expected**: Nothing changes (same order, same active tab)

**Pass Criteria**:
- ✅ Tab stays in same pane
- ✅ Tab order unchanged
- ✅ Active tab unchanged

---

### Test 6: Multi-Pane Moves
**Objective**: Verify moves work with 3+ panes

1. Split to create 3 panes (split twice)
2. Open different apps in each pane
3. Drag tabs between all combinations of panes
4. **Expected**: All moves work correctly

**Pass Criteria**:
- ✅ Can move from pane 1 → pane 2
- ✅ Can move from pane 2 → pane 3
- ✅ Can move from pane 3 → pane 1
- ✅ All visual feedback works

---

### Test 7: Persistence
**Objective**: Verify layout persists after refresh

1. Create split with multiple tabs in each pane
2. Move tabs between panes
3. Refresh the page (F5)
4. **Expected**: Layout restored with tabs in correct panes

**Pass Criteria**:
- ✅ Panes restored correctly
- ✅ Tabs appear in correct panes
- ✅ Active tabs restored
- ✅ Tab order preserved

---

### Test 8: Cursor States
**Objective**: Verify cursor changes throughout drag

1. Hover over a tab (no click)
2. **Expected**: Cursor shows "grab" icon (open hand)
3. Click and hold tab
4. **Expected**: Cursor shows "grabbing" icon (closed fist)
5. Release tab
6. **Expected**: Cursor returns to normal

**Pass Criteria**:
- ✅ Hover shows `cursor: grab`
- ✅ Active drag shows `cursor: grabbing`
- ✅ After drop, cursor returns to default

---

### Test 9: Edge Case - Last Tab
**Objective**: Verify pane goes to home screen when last tab removed

1. Open single tab in left pane
2. Drag that tab to right pane
3. **Expected**:
   - Left pane shows home screen (app grid)
   - Right pane shows moved tab

**Pass Criteria**:
- ✅ Source pane displays home screen
- ✅ Home screen shows all available apps
- ✅ No errors in console

---

### Test 10: Drag Cancel
**Objective**: Verify canceling drag doesn't break anything

1. Start dragging a tab
2. Press ESC or drag outside window
3. **Expected**: Drag canceled, tab stays in original pane

**Pass Criteria**:
- ✅ Tab opacity restored
- ✅ Tab remains in original pane
- ✅ No visual artifacts
- ✅ Can immediately drag again

---

## Visual Inspection Checklist

### During Drag
- [ ] Tab opacity: 40% (semi-transparent)
- [ ] Cursor: "grabbing" icon (closed fist)
- [ ] Tab still readable despite opacity

### Drop Target Highlight
- [ ] Background: Subtle gold tint
- [ ] Border: 2px solid gold
- [ ] Border radius: 8px (rounded corners)
- [ ] Highlight only on valid drop targets

### After Drop
- [ ] No visual artifacts
- [ ] All opacity restored to 100%
- [ ] Highlight removed
- [ ] Smooth transition

## Browser Testing

Test in multiple browsers (if using web mode):
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (macOS)

**Note**: Electron apps use Chromium, so primary testing should be in Electron.

## Performance Testing

### Drag Performance
1. Create 6 panes with 5 tabs each
2. Drag tabs rapidly between panes
3. **Expected**: No lag, smooth animations

**Pass Criteria**:
- ✅ Drag events don't cause lag
- ✅ Animations remain smooth
- ✅ No memory leaks (check DevTools)

### Persistence Performance
1. Create complex layout (6 panes, 20 tabs)
2. Move tabs around
3. Refresh page
4. **Expected**: Quick restore (< 1 second)

**Pass Criteria**:
- ✅ Fast localStorage read/write
- ✅ No blocking operations
- ✅ UI responsive during restore

## Accessibility Testing

### Keyboard Navigation
- [ ] Can tab to reach tab elements
- [ ] Tab elements have proper focus states
- [ ] Keyboard users are informed of drag capability

### Screen Reader
- [ ] Tab elements have descriptive labels
- [ ] Drag state changes announced
- [ ] Drop results announced

**Note**: Full keyboard drag-and-drop requires additional implementation (future enhancement).

## Developer Testing

### Console Checks
1. Open DevTools Console
2. Perform all test scenarios above
3. **Expected**: No errors or warnings

**Look for**:
- ✅ No React errors
- ✅ No JavaScript errors
- ✅ No localStorage errors
- ✅ Clean console output

### React DevTools
1. Install React DevTools extension
2. Watch component re-renders during drag
3. **Expected**: Minimal re-renders

**Verify**:
- ✅ Only affected panes re-render
- ✅ No unnecessary global updates
- ✅ Efficient state management

## Bug Reporting Template

If you find issues, report using this template:

```markdown
**Issue**: Brief description

**Steps to Reproduce**:
1. First step
2. Second step
3. What happened

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happened

**Screenshots**: If applicable

**Environment**:
- OS: Windows/macOS/Linux
- Electron Version: (from Help → About)
- App Version: 2.0.0

**Console Errors**: Paste any errors from DevTools
```

## Success Criteria Summary

All tests should pass with:
- ✅ No console errors
- ✅ Smooth animations
- ✅ Correct visual feedback
- ✅ Proper state management
- ✅ Persistence working
- ✅ No duplicate tabs
- ✅ No visual artifacts

## Quick Smoke Test (2 minutes)

Fastest way to verify basic functionality:

1. Split screen
2. Open 2 apps in each pane
3. Drag one tab between panes
4. Verify gold highlight appears
5. Verify tab moves correctly
6. Refresh page
7. Verify layout persists

**If all 7 steps pass, core functionality is working.**
