# Memory Lane UI

**Status**: Not Started
**Priority**: P0 (Critical)
**Estimated Effort**: 6 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup
- `specs/features/MEMORY-EXTRACTION.md` - Extraction pipeline
- `specs/features/EMBEDDING-SYSTEM.md` - Embeddings for search
- `specs/features/DUAL-RETRIEVAL.md` - Retrieval system
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Rose `--module-memory-lane` (#f43f5e)
- **Visual Symbol**: Brain icon (part of brain/eye/network trinity)
- **Visual Theme**: Memory visualization, timeline, feedback system

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-memory-lane` | #f43f5e |
| Card backgrounds | `--bg-card` | #2d2d4a |
| Feedback positive | `--status-success` | #22c55e |
| Feedback negative | `--status-error` | #ef4444 |

### Memory Type Colors (Critical)
```css
--memory-correction: #ef4444;   /* Red */
--memory-decision: #f59e0b;     /* Amber */
--memory-commitment: #8b5cf6;   /* Violet */
--memory-insight: #06b6d4;      /* Cyan */
--memory-learning: #22c55e;     /* Green */
--memory-confidence: #3b82f6;   /* Blue */
--memory-pattern: #a855f7;      /* Purple */
--memory-cross-agent: #ec4899;  /* Pink */
--memory-workflow: #64748b;     /* Slate */
--memory-gap: #dc2626;          /* Dark Red */
```

### Icon Style
- Line art, 2px stroke weight
- Memory icons: brain, lightbulb, bookmark, star
- Feedback icons: thumbs-up, thumbs-down
- Use hexagonal badges for memory types

### Layout Pattern - View Switcher
```
+--------------------------------------------------+
| [List View] [Visualization] [Entity Queue]        |
+--------------------------------------------------+
| SEARCH: [________________]  FILTER: [Type v]      |
+--------------------------------------------------+
| LIST VIEW                                         |
| +----------------------------------------------+ |
| | [Correction]  Prefers dark mode for coding   | |
| | Confidence: 85%  Recalls: 12  [+] [-]        | |
| +----------------------------------------------+ |
| +----------------------------------------------+ |
| | [Decision]  Use TypeScript for new projects  | |
| | Confidence: 92%  Recalls: 8   [+] [-]        | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

### Visualization Theme
- Timeline/river visualization using D3 or Canvas
- Memory dots color-coded by type
- Density shows memory concentration over time
- Hover preview, click to expand

### Component Specifics
- **Memory Cards**: Type badge (hexagonal), confidence bar, feedback buttons
- **Confidence Bar**: Thin progress bar below content
- **Feedback Buttons**: Subtle icons, highlight on hover
- **Entity Queue**: Grouped list with counts

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Memory type badges use correct colors
- [ ] Hexagonal badge shape for types
- [ ] Feedback buttons are non-intrusive
- [ ] Visualization is performant
- [ ] Brain icon used for module branding

---

## Overview

Memory Lane is the UI for the AI memory system. It provides visualization, browsing, and feedback mechanisms for extracted memories. Users can see what the AI "remembers," provide feedback on memory usefulness, explore memories over time, and understand how memories influence conversations.

## Acceptance Criteria

- [ ] List view of all memories with filtering and search
- [ ] Visualization view showing memories over time (river/timeline)
- [ ] Entity queue showing people/projects mentioned across memories
- [ ] Memory cards with: type, confidence, content, source, feedback
- [ ] Thumbs up/down feedback buttons that affect memory ranking
- [ ] Search memories by content, type, or related entity
- [ ] Timeline showing when memories were formed and recalled
- [ ] Integration with Chat showing which memories are active

## Tasks

### Section 1: Component Structure
- [ ] Create `src/components/memory-lane/` directory
  - [ ] Create `MemoryLaneApp.jsx` - Main container with view switcher
  - [ ] Create `MemoryLaneApp.css` - Memory Lane styles
- [ ] Implement view tabs: List, Visualization, Entity Queue

### Section 2: List View
- [ ] Create `MemoryListView.jsx`
  - [ ] Search input with instant filtering
  - [ ] Type filter dropdown
  - [ ] Category filter dropdown
  - [ ] Sort options: Date, Confidence, Recall Count
- [ ] Create `MemoryCard.jsx` (expanded version)
  - [ ] Type badge with color
  - [ ] Confidence percentage bar
  - [ ] Title and content preview
  - [ ] Expand to show full content
  - [ ] Source chunk display
  - [ ] Related entities as clickable tags
  - [ ] Formed date, recall count
  - [ ] Feedback buttons (thumbs up/down)
  - [ ] Current feedback count display

### Section 3: Visualization View
- [ ] Create `MemoryVisualization.jsx`
  - [ ] Timeline/river view of memories
  - [ ] X-axis: time (weeks)
  - [ ] Y-axis: memory density
  - [ ] Color-coded by type
- [ ] Create `MemoryDot.jsx`
  - [ ] Individual memory point
  - [ ] Hover to show preview
  - [ ] Click to open detail
- [ ] Create `VisualizationLegend.jsx`
  - [ ] Color legend by memory type
  - [ ] Toggle types on/off

### Section 4: Entity Queue View
- [ ] Create `EntityQueueView.jsx`
  - [ ] List entities (people, projects, businesses)
  - [ ] Count of memories per entity
  - [ ] Click to filter memories by entity
- [ ] Create `EntityCard.jsx`
  - [ ] Entity type icon
  - [ ] Canonical name
  - [ ] Memory count
  - [ ] Link to related contact/project if exists
- [ ] Group entities by type

### Section 5: Memory Detail Modal
- [ ] Create `MemoryDetailModal.jsx`
  - [ ] Full memory content display
  - [ ] Source chunk with syntax highlighting
  - [ ] Reasoning explanation
  - [ ] Evidence display
  - [ ] Related entities with links
  - [ ] Recall history (when was this used)
  - [ ] Feedback history

### Section 6: Feedback System
- [ ] Implement thumbs up/down buttons
  - [ ] Visual state: none, positive, negative
  - [ ] Click to toggle
  - [ ] Send feedback to database
- [ ] Create `handleFeedback(memoryId, type)` function
  - [ ] Update memory_feedback table
  - [ ] Update memory positive/negative counts
  - [ ] Recalculate ranking weights
- [ ] Show aggregated feedback counts

### Section 7: Search and Filter
- [ ] Implement full-text search
  - [ ] Search title and content
  - [ ] Highlight matches
- [ ] Implement type filter
  - [ ] Checkboxes for each type
  - [ ] Multi-select support
- [ ] Implement entity filter
  - [ ] Search for entities
  - [ ] Filter memories by selected entity

### Section 8: Memory Timeline
- [ ] Create `MemoryTimeline.jsx`
  - [ ] Chronological display
  - [ ] Grouping by day/week
  - [ ] Show formed vs recalled events
- [ ] Create `TimelineEvent.jsx`
  - [ ] Event type (formed/recalled)
  - [ ] Memory preview
  - [ ] Timestamp

### Section 9: Memory Service Integration
- [ ] Create `src/services/MemoryService.js`
  - [ ] `getAll(filters)` - Get memories with filters
  - [ ] `getById(id)` - Get single memory
  - [ ] `submitFeedback(id, type)` - Record feedback
  - [ ] `getByEntity(entityId)` - Memories for entity
  - [ ] `getTimeline(range)` - Memories in date range
  - [ ] `search(query)` - Search memories
  - [ ] `getRecalls(memoryId)` - Recall history

### Section 10: Chat Integration
- [ ] Create `MemoryLaneBar.jsx` (for Chat)
  - [ ] Compact view of active memories
  - [ ] Expand to show details
  - [ ] Link to full Memory Lane view
- [ ] Track memory usage in conversations
- [ ] Display "used memories" badge

## Technical Details

### Files to Create
- `src/components/memory-lane/MemoryLaneApp.jsx` - Main container
- `src/components/memory-lane/MemoryLaneApp.css` - Styles
- `src/components/memory-lane/MemoryListView.jsx` - List view
- `src/components/memory-lane/MemoryCard.jsx` - Memory display
- `src/components/memory-lane/MemoryVisualization.jsx` - River view
- `src/components/memory-lane/MemoryDot.jsx` - Visualization point
- `src/components/memory-lane/VisualizationLegend.jsx` - Legend
- `src/components/memory-lane/EntityQueueView.jsx` - Entity list
- `src/components/memory-lane/EntityCard.jsx` - Entity display
- `src/components/memory-lane/MemoryDetailModal.jsx` - Full detail
- `src/components/memory-lane/MemoryTimeline.jsx` - Timeline view
- `src/components/memory-lane/TimelineEvent.jsx` - Timeline item
- `src/services/MemoryService.js` - Memory CRUD and search

### Files to Modify
- `src/App.jsx` - Add Memory Lane to router
- `src/components/chat/ChatApp.jsx` - Add MemoryLaneBar

### Database Tables Used
```sql
SELECT * FROM memories;
SELECT * FROM entities;
SELECT * FROM session_recalls;
SELECT * FROM memory_feedback;

-- With recall stats
SELECT m.*,
  COUNT(DISTINCT sr.id) as recall_count,
  MAX(sr.recalled_at) as last_recalled
FROM memories m
LEFT JOIN session_recalls sr ON m.id = sr.memory_id
GROUP BY m.id;
```

### IPC Channels
- `memories:get-all` - List memories with filters
- `memories:get-by-id` - Get single memory
- `memories:search` - Search memories
- `memories:get-by-entity` - Filter by entity
- `memories:submit-feedback` - Record feedback
- `memories:get-recalls` - Recall history
- `memories:get-timeline` - Timeline data
- `entities:get-all` - List entities
- `entities:get-by-id` - Get entity

## Implementation Hints

- Use D3.js or Canvas for visualization (performance)
- Memory cards should lazy-load content for large lists
- Feedback should feel instant (optimistic update)
- Type colors from constants/memoryTypes.js:
  - correction: red
  - decision: blue
  - learning: green
  - insight: purple
  - pattern_seed: cyan
  - gap: gray
- River visualization inspired by git contribution graphs
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for MemoryService methods
- [ ] List view renders with mock data
- [ ] Filtering works correctly for type and entity
- [ ] Search returns relevant results
- [ ] Feedback updates persist and affect display
- [ ] Visualization renders with correct colors
- [ ] Entity queue groups correctly
- [ ] Memory detail modal displays all fields
- [ ] Timeline shows correct chronological order
- [ ] Empty states handled gracefully

---
**Notes**: Memory Lane is what makes the AI feel like it truly "knows" you. The visualization helps users understand how their memories grow over time. The feedback loop is critical - it allows users to shape what the AI remembers and prioritizes.
