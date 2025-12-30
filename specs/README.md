# AI Command Center - Implementation Specs

This directory contains detailed implementation specifications for the AI Command Center system. Each spec includes checkboxes for task tracking, acceptance criteria, technical details, and implementation hints.

---

## Design System (IMPORTANT - Read First!)

> **Every component must follow the design system. Non-compliance will require rework.**

### Quick Reference Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Developer quick reference | While coding - check colors, icons, patterns |
| [GPT-ASSET-GENERATION-PROMPTS.md](../docs/planning/GPT-ASSET-GENERATION-PROMPTS.md) | Full asset generation guide | Creating new icons, images, branding assets |
| [00-CSS-VARIABLES.md](components/00-CSS-VARIABLES.md) | CSS variables spec | Setting up theme, checking variable names |

### Visual Identity Summary

```
+----------------------------------------------------------+
|                 DESIGN SYSTEM AT A GLANCE                 |
+----------------------------------------------------------+
|                                                           |
|  BACKGROUND:     #1a1a2e (dark navy)                     |
|  ACCENT:         #ffd700 (gold) - ALL CTAs               |
|  TEXT:           #ffffff primary, #a0a0b0 secondary      |
|                                                           |
|  ICONS:          Line art, 2px stroke, NO fills          |
|  SHAPE MOTIF:    Hexagon (badges, containers)            |
|  STYLE:          Professional, premium, sophisticated     |
|                                                           |
+----------------------------------------------------------+
|                                                           |
|  MODULE SYMBOLS (Brain/Eye/Network Trinity):              |
|                                                           |
|  BRAIN   = Memory Lane     = Pink   #ec4899              |
|  EYE     = Vision          = Blue   #3b82f6              |
|  NETWORK = Relationships   = Purple #8b5cf6              |
|                                                           |
+----------------------------------------------------------+
```

### Design Review Checklist

Before marking ANY component/feature complete, verify:

- [ ] **Background colors**: Uses `--bg-primary` (#1a1a2e) or darker variants
- [ ] **Accent colors**: Gold (#ffd700) for CTAs, highlights, active states
- [ ] **Text colors**: White for headings, gray for body, muted for labels
- [ ] **Icons**: Line art style, 2px stroke weight, no solid fills
- [ ] **Icon colors**: Gray default, gold on hover/active
- [ ] **Hexagon motif**: Used for badges, containers where appropriate
- [ ] **Brain/Eye/Network**: Correct symbol for correct module
- [ ] **Gradient direction**: Pink top-left to blue bottom-right (branding only)
- [ ] **Typography**: Inter/Outfit font, correct weights
- [ ] **Spacing**: Uses 4px base unit system
- [ ] **Borders**: Uses `--border-color` (#2a2a4a)
- [ ] **Hover states**: Border color changes to gold
- [ ] **Focus states**: Gold focus ring for accessibility
- [ ] **Dark theme**: NO light backgrounds anywhere
- [ ] **Professional tone**: Not playful, not cartoonish

### Common Design Mistakes to Avoid

| Mistake | Correct Approach |
|---------|------------------|
| Using bright/light backgrounds | Always use dark navy (#1a1a2e) |
| Filled/solid icons | Line art with 2px stroke |
| Random accent colors | Gold (#ffd700) consistently |
| Sharp corners everywhere | Rounded corners (6-8px radius) |
| Heavy shadows | Subtle shadows (0.3 opacity max) |
| Hardcoded color values | CSS variables from 00-CSS-VARIABLES.md |
| Generic tech icons | Brain/Eye/Network motifs |

---

## Quick Start

1. **Read [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)** before writing any CSS
2. Begin with Phase 1 (Core Infrastructure)
3. Implement [00-CSS-VARIABLES.md](components/00-CSS-VARIABLES.md) FIRST
4. Work through phases in order - each depends on previous
5. Use checkboxes to track progress
6. Run Design Review Checklist before marking complete
7. Reference component specs for detailed requirements

---

## Directory Structure

```
specs/
├── README.md                    # This file
├── DESIGN-SYSTEM.md             # Visual design quick reference
├── components/                  # Module-specific specs
│   ├── 00-CSS-VARIABLES.md     # CSS tokens (DO THIS FIRST)
│   ├── 01-DASHBOARD.md         # Home screen with status brief
│   ├── 02-PROJECTS.md          # Project management system
│   ├── 03-REMINDERS.md         # Energy-aware task system
│   ├── 04-RELATIONSHIPS.md     # CRM with freshness tracking
│   ├── 05-MEETINGS.md          # Meeting prep and notes
│   ├── 06-KNOWLEDGE.md         # Second brain with auto-filing
│   ├── 07-CHAT.md              # Claude integration with memory
│   ├── 08-ADMIN.md             # Settings and system controls
│   ├── 09-MEMORY-LANE.md       # Memory viewer and feedback
│   ├── 10-VISION.md            # Existing camera system
│   └── 11-CHAIN-RUNNER.md      # Existing RAG trainer
├── features/                    # Cross-cutting feature specs
│   ├── MEMORY-EXTRACTION.md    # Claude Code session parsing
│   ├── EMBEDDING-SYSTEM.md     # Ollama integration, vectors
│   ├── DUAL-RETRIEVAL.md       # Entity + semantic search
│   ├── DATABASE-LAYER.md       # SQLite + vss setup
│   └── SHARED-COMPONENTS.md    # Sidebar, cards, modals
└── phases/                      # Implementation timeline
    ├── PHASE-1-CORE-INFRASTRUCTURE.md   # Weeks 1-3
    ├── PHASE-2-MEMORY-SYSTEM.md         # Weeks 4-6
    ├── PHASE-3-PROJECTS-REMINDERS.md    # Weeks 7-9
    ├── PHASE-4-RELATIONSHIPS-MEETINGS.md # Weeks 10-11
    ├── PHASE-5-KNOWLEDGE-CHAT.md        # Weeks 12-13
    ├── PHASE-6-DASHBOARD-ADMIN.md       # Weeks 14-15
    └── PHASE-7-INTEGRATION-TESTING.md   # Week 16
```

---

## Implementation Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE TIMELINE (16 WEEKS)                                   │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬─────────────────┤
│  PHASE 1  │  PHASE 2  │  PHASE 3  │  PHASE 4  │  PHASE 5  │  PHASE 6  │    PHASE 7      │
│   Core    │  Memory   │  Product. │  Comms    │ Knowledge │  Dashboard│   Integration   │
│   Infra   │   Lane    │   Suite   │   Tools   │  & Chat   │  & Admin  │   & Testing     │
│           │           │           │           │           │           │                 │
│  Week 1-3 │  Week 4-6 │  Week 7-9 │ Week 10-11│ Week 12-13│ Week 14-15│   Week 16       │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼─────────────────┤
│ Database  │ Extraction│ Projects  │Relationships│Knowledge │ Dashboard │ Wire modules    │
│ Embeddings│ Retrieval │ Reminders │ Meetings  │ Chat      │ Admin     │ E2E tests       │
│ Sidebar   │ Memory UI │ Widgets   │ Prep/Notes│ SparkFile │ Analytics │ Release build   │
│ Components│           │           │           │           │           │                 │
│ DESIGN    │           │           │           │           │           │                 │
│ SYSTEM    │           │           │           │           │           │                 │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴─────────────────┘
```

---

## Module Summary

| Module | Priority | Effort | Status | Spec | Primary Color |
|--------|----------|--------|--------|------|---------------|
| CSS Variables | P0 | 0.5 days | Not Started | [00-CSS-VARIABLES.md](components/00-CSS-VARIABLES.md) | N/A (Foundation) |
| Dashboard | P1 | 5 days | Not Started | [01-DASHBOARD.md](components/01-DASHBOARD.md) | Gold #ffd700 |
| Projects | P1 | 8 days | Not Started | [02-PROJECTS.md](components/02-PROJECTS.md) | Purple #8b5cf6 |
| Reminders | P1 | 5 days | Not Started | [03-REMINDERS.md](components/03-REMINDERS.md) | Green #22c55e |
| Relationships | P1 | 6 days | Not Started | [04-RELATIONSHIPS.md](components/04-RELATIONSHIPS.md) | Pink #ec4899 |
| Meetings | P2 | 5 days | Not Started | [05-MEETINGS.md](components/05-MEETINGS.md) | Blue #3b82f6 |
| Knowledge | P2 | 6 days | Not Started | [06-KNOWLEDGE.md](components/06-KNOWLEDGE.md) | Cyan #06b6d4 |
| Chat | P0 | 8 days | Not Started | [07-CHAT.md](components/07-CHAT.md) | Gold #ffd700 |
| Admin | P2 | 4 days | Not Started | [08-ADMIN.md](components/08-ADMIN.md) | Gray #64748b |
| Memory Lane | P0 | 6 days | Not Started | [09-MEMORY-LANE.md](components/09-MEMORY-LANE.md) | Rose #f43f5e |
| Vision | P3 | 2 days | Existing | [10-VISION.md](components/10-VISION.md) | Purple #8b5cf6 |
| Chain Runner | P3 | 2 days | Existing | [11-CHAIN-RUNNER.md](components/11-CHAIN-RUNNER.md) | Blue #3b82f6 |

---

## Feature Summary

| Feature | Priority | Effort | Spec | Design Notes |
|---------|----------|--------|------|--------------|
| Database Layer | P0 | 4 days | [DATABASE-LAYER.md](features/DATABASE-LAYER.md) | N/A (backend) |
| Embedding System | P0 | 3 days | [EMBEDDING-SYSTEM.md](features/EMBEDDING-SYSTEM.md) | N/A (backend) |
| Memory Extraction | P0 | 5 days | [MEMORY-EXTRACTION.md](features/MEMORY-EXTRACTION.md) | N/A (backend) |
| Dual Retrieval | P0 | 4 days | [DUAL-RETRIEVAL.md](features/DUAL-RETRIEVAL.md) | N/A (backend) |
| Shared Components | P1 | 4 days | [SHARED-COMPONENTS.md](features/SHARED-COMPONENTS.md) | Full design system |

---

## Critical Path

The following items are P0 (Critical) and block other work:

```
┌─────────────────────────────────────────────────────────────────┐
│                       CRITICAL PATH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  00-CSS-VARIABLES ◄─── START HERE (Design Foundation)          │
│        │                                                        │
│        ▼                                                        │
│  DATABASE-LAYER ──────────────────────────────────────────┐    │
│        │                                                   │    │
│        ▼                                                   ▼    │
│  EMBEDDING-SYSTEM                              SHARED-COMPONENTS │
│        │                                         (uses design)  │
│        ▼                                                        │
│  MEMORY-EXTRACTION                                              │
│        │                                                        │
│        ▼                                                        │
│  DUAL-RETRIEVAL                                                 │
│        │                                                        │
│        ▼                                                        │
│  MEMORY-LANE-UI ◄────────────────────────────────────────────── │
│        │                                                        │
│        ▼                                                        │
│  CHAT-INTERFACE (Memory integration)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Assignments

| Agent | Purpose | Specs |
|-------|---------|-------|
| `electron-react-dev` | General development | All specs |
| `vision-tester` | Camera/Vision debugging | 10-VISION.md |
| `chain-config` | Chain Runner issues | 11-CHAIN-RUNNER.md |

---

## Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Install Ollama (for embeddings)
# Windows: Download from https://ollama.ai

# Pull embedding model
ollama pull mxbai-embed-large
```

### Development

```bash
# Start development (React only)
npm run dev

# Start development (Electron + React)
npm run dev:electron
```

### Working with Specs

1. **Read DESIGN-SYSTEM.md** before any UI work
2. **Choose a spec** based on current phase
3. **Review acceptance criteria** before starting
4. **Check dependencies** are complete
5. **Work through tasks** in order
6. **Test as you go** using testing checklist
7. **Run Design Review Checklist** before marking complete
8. **Update checkbox** when task complete

---

## Spec Format

Each spec follows this structure:

```markdown
# [Name]

**Status**: Not Started | In Progress | Complete
**Priority**: P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Estimated Effort**: X days
**Dependencies**: [List of blocking specs]

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)

## Overview
[What this component/feature does]

## Design Guidelines
[Module-specific design notes - colors, icons, patterns]

## Acceptance Criteria
- [ ] Measurable success criteria

## Tasks
### Section 1: [Name]
- [ ] Task with checkbox
  - [ ] Subtask

## Technical Details
### Files to Create/Modify
### Database Changes
### IPC Channels

## Implementation Hints
## Testing Checklist

---
**Notes**: [Additional context]
```

---

## Estimated Timeline

| Phase | Weeks | Total Days | Cumulative |
|-------|-------|------------|------------|
| Phase 1: Core Infrastructure | 1-3 | 15 days | 15 days |
| Phase 2: Memory System | 4-6 | 15 days | 30 days |
| Phase 3: Projects & Reminders | 7-9 | 15 days | 45 days |
| Phase 4: Relationships & Meetings | 10-11 | 10 days | 55 days |
| Phase 5: Knowledge & Chat | 12-13 | 10 days | 65 days |
| Phase 6: Dashboard & Admin | 14-15 | 10 days | 75 days |
| Phase 7: Integration & Testing | 16 | 5 days | 80 days |

**Total: ~80 working days / 16 weeks**

---

## Files to Create (Summary)

| Category | Count |
|----------|-------|
| CSS Variables | 1 |
| Components (JSX) | ~90 |
| Styles (CSS) | ~15 |
| Services (JS) | ~15 |
| Utilities (JS) | ~5 |
| Hooks (JS) | ~5 |
| Constants (JS) | ~3 |
| Migrations (CJS) | ~3 |
| **Total New Files** | **~140** |

---

## Quick Reference

### Design Tokens (Most Used)
```css
/* Backgrounds */
--bg-primary: #1a1a2e;
--bg-card: #2d2d4a;

/* Accent (CTAs) */
--accent-gold: #ffd700;

/* Text */
--text-primary: #ffffff;
--text-secondary: #a0a0b0;

/* Borders */
--border-color: #2a2a4a;
```

### Database Path
```
%APPDATA%\ai-command-center\database.sqlite
```

### Key IPC Channels
```
db:query, db:run, db:get
memories:*, contacts:*, projects:*, reminders:*
meetings:*, knowledge:*, chat:*, admin:*
embedding:generate, retrieval:search
```

---

## Progress Tracking

Use this checklist to track overall progress:

### Foundation
- [ ] CSS Variables file created (src/styles/variables.css)
- [ ] Design system reviewed and understood
- [ ] Theme imported in main.jsx

### Phases
- [ ] Phase 1: Core Infrastructure (Weeks 1-3)
- [ ] Phase 2: Memory System (Weeks 4-6)
- [ ] Phase 3: Projects & Reminders (Weeks 7-9)
- [ ] Phase 4: Relationships & Meetings (Weeks 10-11)
- [ ] Phase 5: Knowledge & Chat (Weeks 12-13)
- [ ] Phase 6: Dashboard & Admin (Weeks 14-15)
- [ ] Phase 7: Integration & Testing (Week 16)

### Critical Features
- [ ] SQLite + sqlite-vss database
- [ ] Ollama embedding generation
- [ ] Memory extraction pipeline
- [ ] Dual retrieval system
- [ ] Sidebar navigation
- [ ] Shared component library

### Design Compliance
- [ ] All components use CSS variables
- [ ] Gold accent on all CTAs
- [ ] Dark backgrounds throughout
- [ ] Line art icons (no fills)
- [ ] Hexagon motifs where appropriate
- [ ] Professional visual tone

### Modules Complete
- [ ] Dashboard
- [ ] Projects
- [ ] Reminders
- [ ] Relationships
- [ ] Meetings
- [ ] Knowledge
- [ ] Chat
- [ ] Admin
- [ ] Memory Lane
- [ ] Vision (integration)
- [ ] Chain Runner (integration)

---

*Generated for AI Command Center v2.0*
*Based on comprehensive plan from [AI-COMMAND-CENTER-PLAN.md](../docs/planning/AI-COMMAND-CENTER-PLAN.md)*
*Design system from [GPT-ASSET-GENERATION-PROMPTS.md](../docs/planning/GPT-ASSET-GENERATION-PROMPTS.md)*
