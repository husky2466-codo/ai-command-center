# Chain Runner (Existing)

**Status**: Partial (Existing Implementation)
**Priority**: P3 (Low - Integration Only)
**Estimated Effort**: 2 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - For session tracking
- `specs/components/08-ADMIN.md` - Token usage tracking
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Blue `--module-chain-runner` (#3b82f6)
- **Visual Theme**: Multi-agent chains, RAG training, quality metrics

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-chain-runner` | #3b82f6 |
| Agent panels | `--bg-card` | #2d2d4a |
| Quality high (>0.8) | `--status-success` | #22c55e |
| Quality medium (0.5-0.8) | `--status-warning` | #f59e0b |
| Quality low (<0.5) | `--status-error` | #ef4444 |
| Run button | `--accent-gold` | #ffd700 |

### Provider Colors
```css
/* API Provider indicators */
.provider-anthropic { color: #d97706; }  /* Amber */
.provider-openai { color: #10b981; }     /* Green */
.provider-huggingface { color: #fbbf24; } /* Yellow */
.provider-ollama { color: #6b7280; }     /* Gray */
```

### Icon Style
- Line art, 2px stroke weight
- Chain icons: link, git-branch, play, stop
- Agent icons: bot, cpu, brain

### Layout Pattern
```
+--------------------------------------------------+
| CHAIN RUNNER                                      |
+--------------------------------------------------+
| SETUP MODE                                        |
| +------------+  +------------+  +------------+   |
| | AGENT 1    |  | AGENT 2    |  | AGENT 3    |   |
| | [Anthropic]|  | [OpenAI]   |  | [Ollama]   |   |
| | Task Spec  |  | Task Spec  |  | Task Spec  |   |
| +------------+  +------------+  +------------+   |
|                                                   |
| Prompts: [Generate] [Load] [Save]                |
| [x] Quality Validator  Threshold: [0.7]          |
+--------------------------------------------------+
| [RUN CHAIN]                                       |
+--------------------------------------------------+
```

### Quality Badge Colors
| Score | Color | Badge |
|-------|-------|-------|
| 0.8+ | Green #22c55e | High Quality |
| 0.5-0.8 | Yellow #f59e0b | Acceptable |
| <0.5 | Red #ef4444 | Low Quality |

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Blue accent for module highlights
- [ ] Quality badges use correct colors
- [ ] Agent panels are clearly separated
- [ ] Run button uses gold accent
- [ ] Output displays with typewriter effect (optional)

---

## Overview

Chain Runner is an existing, sophisticated multi-agent AI system already built into AI Command Center. It enables multi-agent chains for RAG data generation with features like batch prompt generation, quality validation, config save/load, and RAG export. This spec covers only the integration points needed to connect Chain Runner with the new modules.

## Current Implementation (Existing)

### Existing Features
- Multi-agent AI chains with configurable providers (Anthropic, OpenAI, HuggingFace, Ollama)
- Run modes: once, N sessions, continuous
- Batch prompt generator with duplicate detection
- Quality validator with 4-dimension scoring
- RAG export to JSONL, Markdown, plain text
- Config save/load system
- Typewriter effect toggle
- Session recording to webm

### Existing Files
- `src/components/chain-runner/ChainRunner.jsx` - Main component (~1500 lines)
- `src/components/chain-runner/ChainRunner.css` - Styling
- `src/components/chain-runner/ragExporter.js` - RAG export utilities
- `src/components/chain-runner/ragConstants.js` - Categories and formats
- `src/components/chain-runner/promptGenerator.js` - Batch prompt generation
- `src/components/chain-runner/qualityValidator.js` - Q&A scoring
- `src/components/chain-runner/configManager.js` - Config persistence
- `src/components/chain-runner/RAGExportModal.jsx` - Export UI
- `src/components/chain-runner/ConfigModal.jsx` - Config UI

## Integration Acceptance Criteria

- [ ] Chain sessions logged to database with token usage
- [ ] Dashboard widget shows recent training sessions
- [ ] Memory Lane can extract patterns from successful chains
- [ ] Admin panel tracks Chain Runner token usage
- [ ] RAG exports can be saved to Knowledge base

## Tasks

### Section 1: Session Logging to Database
- [ ] Create chain_sessions table
  ```sql
  CREATE TABLE chain_sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      config TEXT, -- JSON
      prompt_count INTEGER,
      completed_count INTEGER,
      average_quality REAL,
      total_tokens INTEGER,
      status TEXT CHECK(status IN ('running', 'completed', 'failed')),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
  );
  ```
- [ ] Log session start/end to database
- [ ] Track token usage per session
- [ ] Store quality scores summary

### Section 2: Token Usage Integration
- [ ] Add token tracking to Chain Runner
  - [ ] Count tokens per agent response
  - [ ] Sum total for session
  - [ ] Write to token_usage table
- [ ] Format: provider, model, input_tokens, output_tokens, session_id
- [ ] Feed into Admin token analytics

### Section 3: Dashboard Widget
- [ ] Create `ChainRunnerWidget.jsx` in dashboard/widgets/
  - [ ] Show recent sessions (last 5)
  - [ ] Display: name, prompt count, quality, status
  - [ ] "Start New Chain" link
  - [ ] "Open Chain Runner" link
- [ ] Pull data from chain_sessions table

### Section 4: Memory Lane Integration
- [ ] Extract patterns from high-quality chains
  - [ ] When average_quality > 0.8, analyze for patterns
  - [ ] Create pattern_seed memories
- [ ] Learn from successful prompt/response pairs
  - [ ] What makes a good Q&A pair?
  - [ ] Store as learning memories

### Section 5: Knowledge Export Integration
- [ ] Add "Export to Knowledge" option in RAGExportModal
  - [ ] Create knowledge article from RAG data
  - [ ] Auto-categorize by content
  - [ ] Include quality metadata
- [ ] Suggest folder based on RAG categories

### Section 6: Admin Panel Integration
- [ ] Add Chain Runner section to token usage
  - [ ] Filter by chain sessions
  - [ ] Show cost per chain
- [ ] Add chain session browser
  - [ ] List all chain sessions
  - [ ] View details and outputs

## Technical Details

### Files to Create
- `src/components/dashboard/widgets/ChainRunnerWidget.jsx` - Dashboard widget

### Files to Modify
- `src/components/chain-runner/ChainRunner.jsx` - Add session logging
- `src/components/chain-runner/RAGExportModal.jsx` - Add Knowledge export
- `src/services/AdminService.js` - Add chain session methods
- `electron/database/migrations/*.cjs` - Add chain_sessions table

### Database Tables
```sql
-- New table
CREATE TABLE chain_sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    config TEXT,
    prompt_count INTEGER,
    completed_count INTEGER,
    average_quality REAL,
    total_tokens INTEGER,
    status TEXT,
    started_at DATETIME,
    completed_at DATETIME
);

-- Use existing token_usage with session_id reference
INSERT INTO token_usage (session_id, provider, model, input_tokens, output_tokens)
VALUES (?, ?, ?, ?, ?);
```

### IPC Channels (New)
- `chain:log-session-start` - Start session tracking
- `chain:log-session-end` - Complete session tracking
- `chain:get-sessions` - List chain sessions
- `chain:export-to-knowledge` - Save RAG to knowledge

## Implementation Hints

- Minimize changes to existing ChainRunner.jsx (it's complex)
- Add hooks at session start/end for tracking
- Token counting should be non-blocking
- Widget can poll for running sessions
- Agent to use: `chain-config` for chain logic, `electron-react-dev` for integration

## Testing Checklist

- [ ] Session logging creates database records
- [ ] Token usage accumulates correctly
- [ ] Dashboard widget displays sessions
- [ ] Memory extraction creates valid memories
- [ ] Knowledge export creates articles
- [ ] Admin panel shows chain statistics
- [ ] Existing Chain Runner functionality unaffected

---
**Notes**: Chain Runner is a sophisticated, working system. Integration should be minimal and non-invasive. The goal is to connect its outputs (sessions, tokens, RAG data) to the broader AI Command Center ecosystem without breaking existing functionality.
