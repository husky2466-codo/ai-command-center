# Multi-Pane Split View - Test Plan

**Date:** 2026-01-05
**Feature:** Multi-pane split view (supporting 3+ panes)

## Test Environment

- **OS:** Windows 11
- **App:** AI Command Center v2.0.0
- **Framework:** Electron + React
- **Component:** Split Layout System

## Pre-Test Checklist

- [ ] Build completed successfully (`npm run build`)
- [ ] No console errors on app startup
- [ ] LocalStorage cleared for fresh test (optional): Delete `ai-command-center-layout` key

## Test Cases

### TC-01: Single Pane to Split View

**Objective:** Verify first split creates 2 panes

**Steps:**
1. Launch AI Command Center
2. Observe single pane with "Split Right" and "Split Down" buttons
3. Click "Split Right"
4. Verify 2nd pane appears to the right
5. Verify both panes are equal width (50/50 split)
6. Verify resize handle appears between panes
7. Verify both panes show split buttons
8. Verify 2nd pane shows close button (X)

**Expected Result:** 2 equal-sized panes with split controls on both

**Actual Result:** [PASS/FAIL]

---

### TC-02: Create 3rd Pane

**Objective:** Verify splitting works beyond 2 panes

**Steps:**
1. Start with 2 panes (from TC-01)
2. Click "Split Right" on first pane
3. Verify 3rd pane is inserted between pane 1 and 2
4. Verify all 3 panes are equal width (~33% each)
5. Verify 2 resize handles (between pane 1-3, and 3-2)
6. Verify all panes still have split buttons

**Expected Result:** 3 equal-width panes, all with split capability

**Actual Result:** [PASS/FAIL]

---

### TC-03: Create 4th, 5th, 6th Panes

**Objective:** Verify splitting works up to maximum limit

**Steps:**
1. Continue splitting from TC-02
2. Create 4th pane → verify equal distribution (25% each)
3. Create 5th pane → verify equal distribution (20% each)
4. Create 6th pane → verify equal distribution (~16.7% each)
5. Verify all panes have split buttons
6. Verify all panes except first have close button

**Expected Result:** 6 equal-width panes with full functionality

**Actual Result:** [PASS/FAIL]

---

### TC-04: Maximum Pane Limit

**Objective:** Verify 7th pane is blocked

**Steps:**
1. Start with 6 panes (from TC-03)
2. Open browser DevTools console
3. Click "Split Right" on any pane
4. Check console for warning message
5. Verify no 7th pane is created
6. Verify layout remains unchanged

**Expected Console Message:** "Maximum 6 panes supported"

**Expected Result:** No 7th pane created, warning logged

**Actual Result:** [PASS/FAIL]

---

### TC-05: Resize Panes

**Objective:** Verify manual resizing works

**Steps:**
1. Create 3 panes
2. Hover over resize handle between pane 1 and 2
3. Verify handle changes to gold color
4. Drag handle to the right
5. Verify pane 1 shrinks, other panes adjust
6. Drag handle to minimum (15% width)
7. Verify pane 1 cannot shrink below minimum

**Expected Result:** Smooth resizing with minimum size enforced

**Actual Result:** [PASS/FAIL]

---

### TC-06: Close Pane (Middle)

**Objective:** Verify closing a middle pane redistributes space

**Steps:**
1. Create 4 panes
2. Click close button (X) on pane 2 (second from left)
3. Verify pane 2 is removed
4. Verify 3 panes remain
5. Verify panes resize to equal width (~33% each)
6. Verify tabs from closed pane are gone

**Expected Result:** Pane removed, space redistributed equally

**Actual Result:** [PASS/FAIL]

---

### TC-07: Close Panes Until One Remains

**Objective:** Verify cannot close last pane

**Steps:**
1. Create 3 panes
2. Close pane 3 → verify 2 panes remain
3. Close pane 2 → verify 1 pane remains
4. Check that close button is no longer visible
5. Verify split buttons are still visible
6. Try to close pane 1 (should not be possible)

**Expected Result:** Last pane cannot be closed

**Actual Result:** [PASS/FAIL]

---

### TC-08: Split Vertical Direction

**Objective:** Verify vertical splits work the same way

**Steps:**
1. Start fresh (close all extra panes)
2. Click "Split Down" on pane 1
3. Verify 2nd pane appears below (not to the right)
4. Create 3rd pane → verify stacks vertically
5. Verify resize handles are horizontal
6. Verify equal height distribution

**Expected Result:** Vertical stacking with equal heights

**Actual Result:** [PASS/FAIL]

---

### TC-09: Split Direction Persistence

**Objective:** Verify first split determines direction for all

**Steps:**
1. Start fresh
2. Click "Split Right" → verify horizontal split
3. Split any pane again → verify still horizontal
4. Close all panes except 1
5. Click "Split Down" → verify vertical split
6. Split any pane again → verify still vertical

**Expected Result:** Direction locked after first split until reset

**Actual Result:** [PASS/FAIL]

---

### TC-10: Layout Persistence

**Objective:** Verify layout survives app restart

**Steps:**
1. Create 4 panes
2. Open different apps in each pane (Projects, Terminal, Email, etc.)
3. Close AI Command Center completely
4. Relaunch AI Command Center
5. Verify 4 panes are restored
6. Verify apps are restored in correct panes
7. Verify split direction is restored

**Expected Result:** Complete layout restoration

**Actual Result:** [PASS/FAIL]

---

### TC-11: Drag Tab Between Panes

**Objective:** Verify drag-and-drop functionality

**Steps:**
1. Create 2 panes
2. Open "Projects" in pane 1
3. Open "Terminal" in pane 2
4. Drag "Projects" tab from pane 1 toward pane 2
5. Verify pane 2 tab bar highlights (gold)
6. Drop tab on pane 2 tab bar
7. Verify "Projects" now appears in pane 2
8. Verify "Projects" is removed from pane 1

**Expected Result:** Tab moves to target pane

**Actual Result:** [PASS/FAIL]

---

### TC-12: Drag Tab - Duplicate Prevention

**Objective:** Verify duplicate apps are prevented

**Steps:**
1. Create 2 panes
2. Open "Projects" in both panes
3. Drag "Projects" tab from pane 1 to pane 2
4. Verify tab doesn't duplicate
5. Verify existing "Projects" tab in pane 2 becomes active
6. Verify pane 1 still has "Projects" tab

**Expected Result:** No duplicate, existing tab activated

**Actual Result:** [PASS/FAIL]

---

### TC-13: Pane with Multiple Tabs

**Objective:** Verify multiple tabs work correctly per pane

**Steps:**
1. Create 2 panes
2. In pane 1, open: Projects, Terminal, Email
3. In pane 2, open: Calendar, Contacts
4. Verify tab bars show all tabs
5. Switch between tabs in pane 1
6. Verify pane 2 tabs remain independent
7. Close middle tab in pane 1
8. Verify correct tab becomes active

**Expected Result:** Independent tab management per pane

**Actual Result:** [PASS/FAIL]

---

### TC-14: Split While App Is Open

**Objective:** Verify splitting doesn't break open apps

**Steps:**
1. Open "Terminal" in single pane
2. Run a command in terminal
3. Click "Split Right"
4. Verify terminal still works in pane 1
5. Verify pane 2 shows empty home screen
6. Open "Projects" in pane 2
7. Verify both apps function independently

**Expected Result:** No interference between panes

**Actual Result:** [PASS/FAIL]

---

### TC-15: Edge Cases

**Objective:** Test unusual scenarios

**Steps:**
1. Create 6 panes, close all, create 6 again (stress test)
2. Create 3 panes, drag resize handles rapidly
3. Create 2 panes, open same app in both, drag between them
4. Create 4 panes, close them in random order
5. Create 5 panes, refresh app, verify restoration

**Expected Result:** No crashes, consistent behavior

**Actual Result:** [PASS/FAIL]

---

## Success Criteria

The feature is considered ready for release if:
- [ ] All 15 test cases pass
- [ ] No console errors during testing
- [ ] Layout persists correctly across restarts
- [ ] Performance is smooth (no lag when resizing/splitting)
- [ ] Drag-and-drop works reliably
- [ ] Maximum limit is enforced properly
- [ ] Minimum pane size is respected

## Known Limitations

Document any issues found during testing:

1. **Limitation 1:** [Description]
2. **Limitation 2:** [Description]
3. **Bug 1:** [Description and reproduction steps]

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-01 | [ ] PASS / [ ] FAIL | |
| TC-02 | [ ] PASS / [ ] FAIL | |
| TC-03 | [ ] PASS / [ ] FAIL | |
| TC-04 | [ ] PASS / [ ] FAIL | |
| TC-05 | [ ] PASS / [ ] FAIL | |
| TC-06 | [ ] PASS / [ ] FAIL | |
| TC-07 | [ ] PASS / [ ] FAIL | |
| TC-08 | [ ] PASS / [ ] FAIL | |
| TC-09 | [ ] PASS / [ ] FAIL | |
| TC-10 | [ ] PASS / [ ] FAIL | |
| TC-11 | [ ] PASS / [ ] FAIL | |
| TC-12 | [ ] PASS / [ ] FAIL | |
| TC-13 | [ ] PASS / [ ] FAIL | |
| TC-14 | [ ] PASS / [ ] FAIL | |
| TC-15 | [ ] PASS / [ ] FAIL | |

**Overall Result:** [ ] PASS / [ ] FAIL

**Tested By:** _______________ **Date:** _______________

**Sign-off:** _______________ **Date:** _______________
