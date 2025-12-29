# Phase 1: Core Infrastructure

**Status**: Not Started
**Timeline**: Weeks 1-3
**Priority**: P0 (Critical - Foundation for everything)
**Estimated Effort**: 15 days

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](../components/00-CSS-VARIABLES.md)

---

## Design System Integration (CRITICAL)

Phase 1 establishes the design foundation. The CSS Variables file MUST be created early in this phase.

### Design Tasks (Add to Week 1)

- [ ] **Create CSS Variables File** (Priority: Day 1)
  - [ ] Create `src/styles/variables.css` from [00-CSS-VARIABLES.md](../components/00-CSS-VARIABLES.md)
  - [ ] Import as FIRST stylesheet in `src/main.jsx`
  - [ ] Verify all variables render correctly

- [ ] **Create Theme Constants** (Priority: Day 2)
  - [ ] Create `src/constants/colors.js` - Export color values for JS usage
  - [ ] Create `src/constants/memoryTypes.js` - Memory type color mapping
  - [ ] Create `src/constants/energyTypes.js` - Energy type color mapping

### Design Review Checkpoint (End of Week 3)

Before completing Phase 1, verify:

- [ ] `src/styles/variables.css` contains ALL colors from DESIGN-SYSTEM.md
- [ ] Background color is `--bg-primary` (#1a1a2e) throughout
- [ ] Gold accent (#ffd700) used for all CTAs
- [ ] Sidebar follows design specs (64px/240px widths)
- [ ] All shared components use CSS variables (NO hardcoded colors)
- [ ] Icons are line art style with 2px stroke
- [ ] No light backgrounds anywhere in the app

---

## Overview

Phase 1 establishes the foundational infrastructure for all AI Command Center modules. This includes SQLite database setup with migrations, the embedding service for vector search, the new sidebar navigation, and the shared component library. Everything built in later phases depends on this foundation.

## Objectives

1. Set up SQLite + sqlite-vss database layer
2. Create migration system and initial schema
3. Integrate Ollama for embeddings
4. Build new sidebar navigation with all modules
5. Create shared UI component library
6. Implement dark theme with yellow accents
7. Update Electron IPC for database operations

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1 DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  External Dependencies:                                         │
│  • better-sqlite3 (npm package)                                 │
│  • sqlite-vss (native extension)                                │
│  • Ollama (local installation)                                  │
│  • mxbai-embed-large (Ollama model)                            │
│  • marked, dompurify (npm packages)                             │
│                                                                 │
│  Internal Dependencies: None (this is the foundation)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Task Checklist

### Week 1: Database Foundation

#### Database Setup (Days 1-2)
- [ ] Install better-sqlite3 dependency
  - [ ] Run `npm install better-sqlite3`
  - [ ] Configure electron-rebuild for native module
  - [ ] Test database creation works
- [ ] Create `electron/database/` directory structure
- [ ] Create `electron/database/db.cjs`
  - [ ] Initialize database connection
  - [ ] Enable WAL mode
  - [ ] Attempt sqlite-vss extension load
  - [ ] Export getDatabase() and initializeDatabase()
- [ ] Update `electron/main.cjs`
  - [ ] Call initializeDatabase() on app ready
  - [ ] Handle database initialization errors

#### Migration System (Days 2-3)
- [ ] Create migration runner in `db.cjs`
  - [ ] Create migrations tracking table
  - [ ] Load and execute pending migrations
  - [ ] Log migration progress
- [ ] Create `electron/database/migrations/` directory
- [ ] Create `001_initial.cjs` migration
  - [ ] spaces, projects, tasks tables
  - [ ] reminders table
  - [ ] contacts, contact_groups, contact_group_members, contact_interactions tables
  - [ ] meetings, meeting_participants tables
  - [ ] knowledge_folders, knowledge_articles tables
  - [ ] memories, session_recalls, memory_feedback tables
  - [ ] chat_sessions, chat_messages tables
  - [ ] entities, goals, goal_alignments tables
  - [ ] sync_jobs, token_usage tables
  - [ ] All required indexes
- [ ] Create `002_vectors.cjs` migration
  - [ ] Create vss virtual tables (if extension available)
  - [ ] Handle graceful fallback

#### IPC Handlers (Days 3-4)
- [ ] Create `electron/database/ipc.cjs`
  - [ ] `db:query` - SELECT operations
  - [ ] `db:run` - INSERT/UPDATE/DELETE
  - [ ] `db:get` - Single row SELECT
  - [ ] `db:health` - Database health check
- [ ] Update `electron/preload.cjs`
  - [ ] Expose dbQuery, dbRun, dbGet methods
  - [ ] Type definitions for TypeScript (if used)
- [ ] Import and register IPC handlers in main.cjs

#### Base Services (Days 4-5)
- [ ] Create `src/services/BaseService.js`
  - [ ] Generic CRUD operations
  - [ ] getAll(), getById(), create(), update(), delete()
- [ ] Create `src/services/DataService.js`
  - [ ] Direct database access wrapper
  - [ ] Query caching utilities
- [ ] Test services with sample data

### Week 2: Embedding & Navigation

#### Embedding Service (Days 6-7)
- [ ] Verify Ollama installation
  - [ ] Test `ollama list` shows mxbai-embed-large
  - [ ] If not, run `ollama pull mxbai-embed-large`
- [ ] Create `src/services/EmbeddingService.js`
  - [ ] generateEmbedding(text) function
  - [ ] generateEmbeddings(texts) batch function
  - [ ] cosineSimilarity(a, b) function
  - [ ] embeddingToBlob(), blobToEmbedding() utilities
- [ ] Add Ollama health check
  - [ ] Create checkOllamaHealth() function
  - [ ] Expose via IPC for status display
- [ ] Test embedding generation
  - [ ] Verify 1024 dimensions returned
  - [ ] Test BLOB storage/retrieval

#### Sidebar Navigation (Days 8-9)
- [ ] Create `src/components/shared/` directory
- [ ] Create `src/components/shared/Sidebar.jsx`
  - [ ] Navigation items for all 11 modules
  - [ ] Section dividers (Main, AI, Tools, System)
  - [ ] Active state highlighting
  - [ ] Collapse/expand toggle
- [ ] Create `src/components/shared/Sidebar.css`
  - [ ] 64px collapsed width
  - [ ] 240px expanded width
  - [ ] Smooth transitions
- [ ] Update `src/App.jsx`
  - [ ] Import and use Sidebar
  - [ ] Create layout with sidebar + content area
  - [ ] Implement module routing

#### Theme System (Day 10)
- [ ] Create `src/styles/theme.css`
  - [ ] CSS custom properties for all colors
  - [ ] Background, accent, text, semantic colors
  - [ ] Memory type and energy type colors
  - [ ] Module accent colors
- [ ] Apply theme to existing components
- [ ] Update index.html with theme import

### Week 3: Shared Components

#### Core Components (Days 11-12)
- [ ] Create `src/components/shared/Card.jsx`
  - [ ] Title, subtitle, content, actions props
  - [ ] Variants: default, elevated, outlined
- [ ] Create `src/components/shared/Card.css`
- [ ] Create `src/components/shared/Modal.jsx`
  - [ ] Backdrop, header, body, footer
  - [ ] Size variants: small, medium, large
  - [ ] ESC key and click-outside handling
- [ ] Create `src/components/shared/Modal.css`

#### Form Components (Days 12-13)
- [ ] Create `src/components/shared/Input.jsx`
  - [ ] Text input with label and error
  - [ ] Icon prefix/suffix support
- [ ] Create `src/components/shared/Select.jsx`
  - [ ] Dropdown with options
  - [ ] Searchable variant
- [ ] Create `src/components/shared/Button.jsx`
  - [ ] Variants: primary, secondary, ghost, danger
  - [ ] Sizes: small, medium, large
  - [ ] Loading state

#### Feedback Components (Days 13-14)
- [ ] Create `src/components/shared/LoadingSpinner.jsx`
- [ ] Create `src/components/shared/Skeleton.jsx`
- [ ] Create `src/components/shared/Toast.jsx`
- [ ] Create `src/components/shared/ToastProvider.jsx`
  - [ ] Context and useToast() hook

#### Markdown & Utilities (Day 15)
- [ ] Install marked and dompurify
- [ ] Create `src/components/shared/MarkdownEditor.jsx`
  - [ ] Edit and preview modes
  - [ ] Toolbar with formatting buttons
- [ ] Create `src/hooks/useKeyboardShortcuts.js`
- [ ] Create utility components: Badge, Avatar, Tooltip

## Deliverables

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 1 DELIVERABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database Layer                                                 │
│  ├─ SQLite database with WAL mode                              │
│  ├─ Migration system with versioning                           │
│  ├─ All 20+ tables created                                     │
│  └─ IPC handlers for CRUD operations                           │
│                                                                 │
│  Embedding Service                                              │
│  ├─ Ollama integration working                                 │
│  ├─ 1024-dim embeddings generating                             │
│  └─ BLOB storage/retrieval functional                          │
│                                                                 │
│  Navigation                                                     │
│  ├─ Sidebar with all 11 modules                                │
│  ├─ Collapse/expand functionality                              │
│  └─ Proper routing between modules                             │
│                                                                 │
│  Shared Components                                              │
│  ├─ Card, Modal, Input, Select, Button                         │
│  ├─ LoadingSpinner, Skeleton, Toast                            │
│  ├─ MarkdownEditor                                             │
│  └─ Dark theme with CSS variables                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| sqlite-vss compilation issues | Medium | Medium | Fallback to brute-force similarity |
| better-sqlite3 Electron compatibility | Low | High | Test early, use electron-rebuild |
| Ollama not installed | Low | Medium | Document installation steps, health check |
| Performance with large datasets | Low | Medium | Add indexes, optimize queries |

## Success Criteria

- [ ] Database initializes without errors on app startup
- [ ] All migrations run successfully
- [ ] Basic CRUD operations work via IPC
- [ ] Embedding generation returns 1024-dim vectors
- [ ] Sidebar navigates between all modules
- [ ] Theme applies consistently
- [ ] All shared components render correctly
- [ ] No console errors on fresh start

## Files Created/Modified

### New Files (~25)
```
electron/database/db.cjs
electron/database/ipc.cjs
electron/database/migrations/001_initial.cjs
electron/database/migrations/002_vectors.cjs
src/services/BaseService.js
src/services/DataService.js
src/services/EmbeddingService.js
src/components/shared/Sidebar.jsx
src/components/shared/Sidebar.css
src/components/shared/Card.jsx
src/components/shared/Card.css
src/components/shared/Modal.jsx
src/components/shared/Modal.css
src/components/shared/Input.jsx
src/components/shared/Select.jsx
src/components/shared/Button.jsx
src/components/shared/LoadingSpinner.jsx
src/components/shared/Skeleton.jsx
src/components/shared/Toast.jsx
src/components/shared/ToastProvider.jsx
src/components/shared/MarkdownEditor.jsx
src/components/shared/MarkdownEditor.css
src/components/shared/Badge.jsx
src/components/shared/Avatar.jsx
src/components/shared/Tooltip.jsx
src/styles/theme.css
src/hooks/useKeyboardShortcuts.js
```

### Modified Files (~4)
```
electron/main.cjs - Database init, IPC registration
electron/preload.cjs - Database API exposure
src/App.jsx - Sidebar layout, routing
package.json - New dependencies
```

## Agent Assignment

- Primary: `electron-react-dev`
- This agent handles general development across Electron and React

---
**Notes**: Phase 1 is purely foundational. No user-visible features yet, but everything depends on this. Take time to get the database layer right - it's hard to fix schema issues later.
