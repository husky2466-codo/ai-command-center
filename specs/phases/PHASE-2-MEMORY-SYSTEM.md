# Phase 2: Memory System

**Status**: Not Started
**Timeline**: Weeks 4-6
**Priority**: P0 (Critical - Core differentiator)
**Estimated Effort**: 15 days

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [09-MEMORY-LANE.md](../components/09-MEMORY-LANE.md)

---

## Design Review Checkpoint

### Before Starting Phase 2
- [ ] Verify CSS variables from Phase 1 are working correctly
- [ ] Confirm shared components follow design system

### Memory Lane Design Requirements
- [ ] Module uses Brain icon for branding
- [ ] Primary accent: Rose `--module-memory-lane` (#f43f5e)
- [ ] Memory type badges use hexagonal shape
- [ ] Memory type colors:
  - Correction: `--memory-correction` (#ef4444)
  - Decision: `--memory-decision` (#f59e0b)
  - Commitment: `--memory-commitment` (#8b5cf6)
  - Insight: `--memory-insight` (#06b6d4)
  - Learning: `--memory-learning` (#22c55e)
- [ ] Confidence bars use module accent color
- [ ] Feedback buttons (thumbs): `--status-success` / `--status-error`

### End of Phase 2 Design Checklist
- [ ] Memory cards follow card design pattern from shared components
- [ ] All memory type badges display with correct colors
- [ ] Confidence bars render correctly
- [ ] Visualization uses type colors for dots
- [ ] No hardcoded colors in Memory Lane CSS files
- [ ] Dark background maintained throughout

---

## Overview

Phase 2 builds the Memory Lane system - the intelligent memory extraction, storage, and retrieval system that makes AI Command Center unique. This includes parsing Claude Code sessions, extracting memorable moments, generating embeddings, and providing dual retrieval (entity + semantic search).

## Objectives

1. Create session file parser for JSONL transcripts
2. Build Memory Catcher with AI extraction
3. Implement entity resolution system
4. Create dual retrieval (entity + semantic)
5. Build re-ranking algorithm
6. Create Memory Lane UI for viewing memories
7. Integrate Memory Lane bar into Chat

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2 DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From Phase 1:                                                  │
│  • SQLite database with memories table                         │
│  • EmbeddingService for vector generation                      │
│  • BaseService for CRUD operations                             │
│  • Card, Modal components for UI                               │
│  • Theme CSS for styling                                       │
│                                                                 │
│  External Dependencies:                                         │
│  • Claude API access (for extraction)                          │
│  • Claude Code sessions (~/.claude/projects/*/sessions/)       │
│  • node-cron (for scheduled extraction)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Task Checklist

### Week 4: Extraction Pipeline

#### Session Parser (Days 1-2)
- [ ] Create `src/services/SessionParser.js`
  - [ ] Find session files in `~/.claude/projects/*/sessions/*.jsonl`
  - [ ] Parse JSONL format line by line
  - [ ] Extract user/assistant message pairs
  - [ ] Track tool calls and results
  - [ ] Handle malformed lines gracefully
- [ ] Create extraction state table
  ```sql
  CREATE TABLE extraction_state (
      file_path TEXT PRIMARY KEY,
      last_position INTEGER,
      last_extracted_at DATETIME
  );
  ```
- [ ] Implement session discovery
  - [ ] Scan all project directories
  - [ ] Track last processed position per file
  - [ ] Resume from where left off

#### Memory Catcher (Days 3-4)
- [ ] Create `src/services/MemoryCatcher.js`
- [ ] Define extraction system prompt
  - [ ] Include all 10 memory types
  - [ ] Define triggers to watch for
  - [ ] Specify JSON output format
- [ ] Implement `extractMemories(conversationChunk)` function
  - [ ] Chunk conversations (10-15 messages)
  - [ ] Call Claude API with extraction prompt
  - [ ] Parse returned JSON
  - [ ] Validate memory structure
- [ ] Handle extraction errors
  - [ ] Retry logic for API failures
  - [ ] Log failed extractions
  - [ ] Continue with next chunk

#### Memory Types (Day 5)
- [ ] Create `src/constants/memoryTypes.js`
  ```javascript
  export const MEMORY_TYPES = {
    // High Priority
    correction: { color: '#ef4444', priority: 'high' },
    decision: { color: '#3b82f6', priority: 'high' },
    commitment: { color: '#22c55e', priority: 'high' },
    // Medium Priority
    insight: { color: '#8b5cf6', priority: 'medium' },
    learning: { color: '#22c55e', priority: 'medium' },
    confidence: { color: '#f59e0b', priority: 'medium' },
    // Lower Priority
    pattern_seed: { color: '#06b6d4', priority: 'low' },
    cross_agent: { color: '#ec4899', priority: 'low' },
    workflow_note: { color: '#64748b', priority: 'low' },
    gap: { color: '#6b7280', priority: 'low' }
  };
  ```
- [ ] Implement confidence scoring adjustments
- [ ] Add type-specific handling

### Week 5: Entity Resolution & Retrieval

#### Entity Resolution (Days 6-7)
- [ ] Create `src/services/EntityResolver.js`
- [ ] Implement entity extraction from memories
  - [ ] People: @mentions, names in context
  - [ ] Projects: repository names, project references
  - [ ] Businesses: company names
  - [ ] Locations: city/country references
- [ ] Generate slugs for entities
- [ ] Link to existing contacts/projects if match found
- [ ] Create new entities if novel
- [ ] Handle aliases and variations

#### Embedding Integration (Day 8)
- [ ] Integrate EmbeddingService with Memory Catcher
  - [ ] Generate embedding for memory content
  - [ ] Store as BLOB in memories table
- [ ] Implement deduplication
  - [ ] Check for similar memories before storing
  - [ ] If similarity > 0.9, merge instead of create
  - [ ] Update times_observed and last_observed_at

#### Dual Retrieval (Days 9-10)
- [ ] Create `src/utils/memoryRetrieval.js`
- [ ] Implement `entitySearch(query)` function
  - [ ] Extract entities from query
  - [ ] Match against entities table
  - [ ] Return linked memories
- [ ] Implement `semanticSearch(query)` function
  - [ ] Generate query embedding
  - [ ] Calculate cosine similarity
  - [ ] Filter by threshold (0.4)
- [ ] Implement `mergeResults()` function
  - [ ] Combine entity and semantic results
  - [ ] Deduplicate by memory ID

#### Re-Ranking Algorithm (Days 10-11)
- [ ] Implement `calculateFinalScore()` function
  - [ ] Vector similarity weight: 60%
  - [ ] Recency weight: 10%
  - [ ] Confidence weight: 15%
  - [ ] Observation count: 10%
  - [ ] Type boost: 5%
- [ ] Add query-aware type boosting
  - [ ] "mistake|wrong|error" -> boost corrections
  - [ ] "decided|chose" -> boost decisions
  - [ ] "always|usually|prefer" -> boost commitments
- [ ] Apply feedback adjustments (+/- 5% per vote)

### Week 6: Memory Lane UI

#### Memory Lane App (Days 12-13)
- [ ] Create `src/components/memory-lane/MemoryLaneApp.jsx`
  - [ ] View switcher: List, Visualization, Entity Queue
- [ ] Create `src/components/memory-lane/MemoryListView.jsx`
  - [ ] Search input
  - [ ] Type and category filters
  - [ ] Sort options
- [ ] Create `src/components/memory-lane/MemoryCard.jsx`
  - [ ] Type badge with color
  - [ ] Confidence bar
  - [ ] Title and content preview
  - [ ] Expand for full details
  - [ ] Feedback buttons (thumbs up/down)

#### Memory Visualization (Day 13)
- [ ] Create `src/components/memory-lane/MemoryVisualization.jsx`
  - [ ] Timeline/river view
  - [ ] Color-coded by type
  - [ ] Interactive dots for memories
- [ ] Create legend component

#### Entity Queue (Day 14)
- [ ] Create `src/components/memory-lane/EntityQueueView.jsx`
  - [ ] List entities by type
  - [ ] Show memory count per entity
  - [ ] Click to filter memories

#### Feedback System (Day 14)
- [ ] Implement feedback handling
  - [ ] Record in memory_feedback table
  - [ ] Update memory positive/negative counts
  - [ ] Visual state in memory cards

#### Chat Integration (Day 15)
- [ ] Create `src/components/chat/MemoryLaneBar.jsx`
  - [ ] Compact display of active memories
  - [ ] Badge showing entity/semantic counts
  - [ ] Expandable to show details
- [ ] Create `src/hooks/useMemoryRetrieval.js`
  - [ ] Trigger retrieval on query change
  - [ ] Return ranked memories

#### Scheduled Extraction (Day 15)
- [ ] Install node-cron
- [ ] Add extraction cron job to main.cjs
  - [ ] Run every 15 minutes
  - [ ] Track in sync_jobs table
- [ ] Add manual extraction trigger via IPC

## Deliverables

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2 DELIVERABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Extraction Pipeline                                            │
│  ├─ SessionParser parsing JSONL files                          │
│  ├─ MemoryCatcher extracting memories                          │
│  ├─ Entity resolution linking people/projects                  │
│  └─ Deduplication preventing duplicates                        │
│                                                                 │
│  Retrieval System                                               │
│  ├─ Entity-based exact match search                            │
│  ├─ Semantic similarity search                                 │
│  ├─ Merged results with deduplication                          │
│  └─ Re-ranking with multiple factors                           │
│                                                                 │
│  Memory Lane UI                                                 │
│  ├─ List view with filters and search                          │
│  ├─ Visualization (river/timeline)                             │
│  ├─ Entity queue view                                          │
│  ├─ Memory cards with feedback                                 │
│  └─ Memory Lane bar for Chat                                   │
│                                                                 │
│  Automation                                                     │
│  ├─ 15-minute extraction cron job                              │
│  └─ Manual extraction trigger                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Claude API rate limits | Medium | Medium | Batch requests, respect limits |
| Poor extraction quality | Medium | High | Refine prompts, use Haiku for speed |
| Session file format changes | Low | Medium | Defensive parsing |
| Large memory database | Low | Medium | Pagination, lazy loading |

## Success Criteria

- [ ] Memories extracted from at least 5 Claude Code sessions
- [ ] Entity resolution correctly links to existing contacts
- [ ] Semantic search returns relevant results
- [ ] Re-ranking produces sensible ordering
- [ ] Memory Lane UI displays memories correctly
- [ ] Feedback updates memory rankings
- [ ] Extraction runs automatically every 15 minutes
- [ ] No performance issues with 100+ memories

## Files Created/Modified

### New Files (~20)
```
src/services/SessionParser.js
src/services/MemoryCatcher.js
src/services/EntityResolver.js
src/services/MemoryService.js
src/utils/memoryRetrieval.js
src/hooks/useMemoryRetrieval.js
src/constants/memoryTypes.js
src/components/memory-lane/MemoryLaneApp.jsx
src/components/memory-lane/MemoryLaneApp.css
src/components/memory-lane/MemoryListView.jsx
src/components/memory-lane/MemoryCard.jsx
src/components/memory-lane/MemoryVisualization.jsx
src/components/memory-lane/VisualizationLegend.jsx
src/components/memory-lane/EntityQueueView.jsx
src/components/memory-lane/EntityCard.jsx
src/components/memory-lane/MemoryDetailModal.jsx
src/components/chat/MemoryLaneBar.jsx
```

### Modified Files (~3)
```
electron/main.cjs - Add cron job, extraction IPC
electron/database/migrations/001_initial.cjs - Add extraction_state table
src/App.jsx - Add Memory Lane route
```

## Agent Assignment

- Primary: `electron-react-dev`
- The memory system is core infrastructure requiring full-stack work

---
**Notes**: Phase 2 is the heart of what makes AI Command Center special. The quality of memory extraction determines how useful the AI feels. Start with high-priority memory types and refine the extraction prompt based on results.
