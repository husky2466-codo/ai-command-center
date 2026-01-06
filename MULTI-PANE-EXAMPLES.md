# Multi-Pane Split View - Visual Examples

**Date:** 2026-01-05

## Single Pane (Starting State)

```
┌─────────────────────────────────────────────────────────┐
│  [Home] [Close All]  [Terminal] [Projects]  [⊞][⊟]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                  App Content Area                       │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Controls:**
- [⊞] = Split Right (Columns icon)
- [⊟] = Split Down (Rows icon)

---

## Two Panes (Horizontal Split)

```
┌────────────────────────────┬────────────────────────────┐
│  [Home]  [Terminal]  [⊞][⊟]│  [Home]  [Projects]  [⊞][⊟][X]│
├────────────────────────────┼────────────────────────────┤
│                            │                            │
│                            │                            │
│     Terminal Content       │     Projects Content       │
│                            │                            │
│                            │                            │
└────────────────────────────┴────────────────────────────┘
                  ↑
            Resize Handle
```

**User clicked:** "Split Right" on Pane 1

**Controls:**
- Both panes have split buttons
- Pane 2 has close button [X]
- Drag the resize handle to adjust widths

---

## Three Panes (Horizontal Split)

```
┌──────────────┬──────────────┬──────────────┐
│ [H][Term]    │ [H][Email]   │ [H][Projects]│
│ [⊞][⊟]       │ [⊞][⊟][X]    │ [⊞][⊟][X]    │
├──────────────┼──────────────┼──────────────┤
│              │              │              │
│   Terminal   │    Email     │   Projects   │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
     33%            33%            33%
```

**User clicked:** "Split Right" on Pane 1
**Result:** New pane inserted between Pane 1 and Pane 2

---

## Four Panes (Horizontal Split)

```
┌──────┬──────┬──────┬──────┐
│ Term │Email │Proj  │Calen │
│[⊞][⊟]│[⊞][⊟]│[⊞][⊟]│[⊞][⊟]│
│      │  [X] │  [X] │  [X] │
├──────┼──────┼──────┼──────┤
│      │      │      │      │
│      │      │      │      │
└──────┴──────┴──────┴──────┘
  25%    25%    25%    25%
```

**User clicked:** "Split Right" on Pane 2
**Result:** 4 equal panes

---

## Six Panes (Maximum, Horizontal Split)

```
┌────┬────┬────┬────┬────┬────┐
│ T  │ E  │ P  │ C  │ K  │ D  │
│[⊞] │[⊞] │[⊞] │[⊞] │[⊞] │[⊞] │
│[⊟] │[⊟] │[⊟] │[⊟] │[⊟] │[⊟] │
│    │[X] │[X] │[X] │[X] │[X] │
├────┼────┼────┼────┼────┼────┤
│    │    │    │    │    │    │
└────┴────┴────┴────┴────┴────┘
 16.7% each
```

**Legend:**
- T = Terminal
- E = Email
- P = Projects
- C = Calendar
- K = Knowledge
- D = Dashboard

**Note:** Clicking split button now shows console warning: "Maximum 6 panes supported"

---

## Two Panes (Vertical Split)

```
┌─────────────────────────────────────────────────────────┐
│  [Home]  [Terminal]  [Projects]  [⊞][⊟]                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  Terminal Content                       │
│                                                         │
├═════════════════════════════════════════════════════════┤ ← Resize Handle
│  [Home]  [Email]  [⊞][⊟][X]                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  Email Content                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**User clicked:** "Split Down" on Pane 1
**Result:** Vertical stacking (50% height each)

---

## Four Panes (Vertical Split)

```
┌─────────────────────────────────────────────────────────┐
│  [Home]  [Terminal]  [⊞][⊟]                             │
├─────────────────────────────────────────────────────────┤
│                  Terminal (25% height)                  │
├═════════════════════════════════════════════════════════┤
│  [Home]  [Email]  [⊞][⊟][X]                             │
├─────────────────────────────────────────────────────────┤
│                  Email (25% height)                     │
├═════════════════════════════════════════════════════════┤
│  [Home]  [Projects]  [⊞][⊟][X]                          │
├─────────────────────────────────────────────────────────┤
│                  Projects (25% height)                  │
├═════════════════════════════════════════════════════════┤
│  [Home]  [Calendar]  [⊞][⊟][X]                          │
├─────────────────────────────────────────────────────────┤
│                  Calendar (25% height)                  │
└─────────────────────────────────────────────────────────┘
```

---

## Tab Bar with Multiple Tabs

```
┌─────────────────────────────────────────────────────────┐
│  [H] [Close All] [Terminal][Projects][Email][Calendar]  │
│                   └─active──┘                           │
│                                              [⊞][⊟]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                  Projects Content                       │
│                  (active tab)                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Multiple tabs per pane
- Active tab highlighted with accent color (gold underline)
- Click tab to switch
- Click × on tab to close it
- "Close All" button closes all tabs in pane

---

## Drag and Drop Between Panes

### Before Drag

```
┌────────────────────────────┬────────────────────────────┐
│ [H] [Terminal][Projects]   │ [H] [Email]                │
│           └─drag this──┘   │                            │
├────────────────────────────┼────────────────────────────┤
│     Terminal Content       │     Email Content          │
└────────────────────────────┴────────────────────────────┘
```

### During Drag (Hovering Over Pane 2)

```
┌────────────────────────────┬────────────────────────────┐
│ [H] [Terminal][Projects]   │ [H] [Email]                │
│           └─dragging...    │  ╔════════════════════╗    │
│                  (opacity) │  ║ DROP ZONE (gold)   ║    │
│                            │  ╚════════════════════╝    │
├────────────────────────────┼────────────────────────────┤
│     Terminal Content       │     Email Content          │
└────────────────────────────┴────────────────────────────┘
```

### After Drop

```
┌────────────────────────────┬────────────────────────────┐
│ [H] [Terminal]             │ [H] [Email][Projects]      │
│                            │          └─moved here──┘   │
├────────────────────────────┼────────────────────────────┤
│     Terminal Content       │     Projects Content       │
└────────────────────────────┴────────────────────────────┘
```

**Result:** "Projects" tab moved from Pane 1 to Pane 2 and became active

---

## Closing a Pane (Space Redistribution)

### Before Close (3 panes)

```
┌──────────────┬──────────────┬──────────────┐
│ Terminal     │ Email        │ Projects     │
│              │   [X]        │   [X]        │
└──────────────┴──────────────┴──────────────┘
     33%            33%            33%
```

### After Closing Middle Pane

```
┌──────────────────────────┬──────────────────────────┐
│ Terminal                 │ Projects                 │
│                          │   [X]                    │
└──────────────────────────┴──────────────────────────┘
           50%                       50%
```

**Result:** Space automatically redistributed equally among remaining panes

---

## Minimum Pane Size

### Normal Size (33% each)

```
┌──────────────┬──────────────┬──────────────┐
│              │              │              │
│   Terminal   │    Email     │   Projects   │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

### Dragged to Minimum (15%)

```
┌────┬──────────────────────┬──────────────┐
│ T  │        Email         │   Projects   │
│ e  │                      │              │
│ r  │                      │              │
│ m  │                      │              │
└────┴──────────────────────┴──────────────┘
 15%         55%                  30%
```

**Note:** Pane 1 cannot be resized below 15% of total width

---

## Real-World Use Cases

### 1. Development Workflow (Horizontal Split)

```
┌──────────────────┬──────────────────┬──────────────────┐
│  Terminal        │  Projects        │  Documentation   │
│  (run commands)  │  (file tree)     │  (API reference) │
├──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │
│  $ npm run dev   │  ├─ src/         │  # API Docs      │
│  $ git status    │  │  ├─ App.jsx   │                  │
│                  │  │  └─ ...       │  ## Endpoints    │
│                  │  └─ ...          │  - GET /api/...  │
│                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

### 2. Communication Center (Vertical Split)

```
┌─────────────────────────────────────────────────────────┐
│  Email                                                  │
├─────────────────────────────────────────────────────────┤
│  Inbox (20 unread)                                      │
├═════════════════════════════════════════════════════════┤
│  Calendar                                               │
├─────────────────────────────────────────────────────────┤
│  Today's meetings: 3                                    │
├═════════════════════════════════════════════════════════┤
│  Contacts                                               │
├─────────────────────────────────────────────────────────┤
│  Recent: John Doe, Jane Smith                           │
└─────────────────────────────────────────────────────────┘
```

### 3. AI Training Monitor (Horizontal Split)

```
┌──────────────────┬──────────────────┬──────────────────┐
│  DGX Spark       │  Chain Runner    │  Vision          │
│  (GPU metrics)   │  (RAG training)  │  (monitoring)    │
├──────────────────┼──────────────────┼──────────────────┤
│                  │                  │                  │
│  GPU 0: 98%      │  Iteration 5/10  │  [Camera Feed]   │
│  GPU 1: 97%      │  Quality: 0.89   │                  │
│  Temp: 75°C      │  Tokens: 1.2M    │  "Model is       │
│  Power: 350W     │                  │   training..."   │
│                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## Tips for Using Multi-Pane Layout

1. **Start with purpose**: Think about your workflow before splitting
2. **Horizontal for side-by-side**: Use horizontal split for comparing or referencing
3. **Vertical for stacking**: Use vertical split for monitoring multiple sources
4. **Don't over-split**: More panes = less space per pane (6 is usually too many)
5. **Resize to focus**: Make your primary pane larger, keep references smaller
6. **Drag to organize**: Move tabs between panes to group related content
7. **Close when done**: Close panes you're not using to reclaim screen space
8. **Restart direction**: Close all panes to change from horizontal to vertical

---

## Keyboard Shortcuts (Future Enhancement)

Currently planned but not implemented:

- `Ctrl+Shift+Right`: Split right
- `Ctrl+Shift+Down`: Split down
- `Ctrl+Shift+W`: Close current pane
- `Ctrl+Shift+Tab`: Move tab to next pane
- `Ctrl+Shift+[1-6]`: Focus pane by number

---

## Related Documentation

- [Multi-Pane Implementation Details](./MULTI-PANE-IMPLEMENTATION.md)
- [Test Plan](./MULTI-PANE-TEST-PLAN.md)
- [Layout System README](./src/components/layout/README.md)
- [Tab Drag-and-Drop Documentation](./src/components/layout/TAB-DRAG-DROP.md)
