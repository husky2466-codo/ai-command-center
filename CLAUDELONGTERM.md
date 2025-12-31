# AI Command Center - Long-Term Memory

Architecture decisions, patterns, and feature plans that persist across sessions.

---

## Recent Updates

### 2025-12-31 - Terminal Copy/Paste Implementation
- Added full clipboard support to integrated terminal (xterm.js)
- Features:
  - Selection-based auto-copy (select text = copied)
  - Keyboard shortcuts: Ctrl+C/Ctrl+V (Cmd+C/Cmd+V on Mac)
  - Right-click paste support
  - Smart Ctrl+C: copies if text selected, sends SIGINT if not
- Implementation uses Web Clipboard API (no additional packages)
- Platform detection for Mac vs Windows/Linux
- See `TERMINAL-CLIPBOARD-FIX.md` for details

---

## Architecture Decisions

### Electron + React (Vite)
- Main process handles file I/O, API keys, screen capture
- Renderer uses direct fetch to AI APIs (CORS headers enabled)
- Context bridge exposes `window.electronAPI` for IPC

### API Key Loading
- Primary: AWS Secrets Manager (`myers/anthropic`, `myers/openai`, `myers/huggingface`)
- Fallback: `~/.env` file
- Keys passed to React apps via props

### Data Storage
- User data: `%APPDATA%\ai-command-center\`
- Recordings: `<app-install-dir>\recordings\`
- Session logs: JSON with timestamp filenames

---

## Patterns & Conventions

### File Naming
- Sessions: `session_YYYYMMDD_HHMMSS.json`
- Configs: `config_<timestamp>.json`
- Recordings: `YYYYMMDD_HHMMSS_<sanitized-prompt>.webm`

### IPC Pattern
- Handler in `main.cjs`: `ipcMain.handle('channel-name', async (event, args) => {})`
- Expose in `preload.cjs`: `channelName: (args) => ipcRenderer.invoke('channel-name', args)`
- Call in renderer: `await window.electronAPI.channelName(args)`

### Component Structure
- Each app in `src/components/<app-name>/`
- Main component + CSS file
- Apps loaded once, preserved on tab switch

---

## Feature Plans

### RAG Training Export (Implemented 2025-12-18)
- Export Chain Runner outputs as training documents
- Formats: JSONL (embeddings), Markdown, plain text
- Categories: equipment_guides, event_types, venue_considerations, common_mistakes, troubleshooting
- Storage: `%APPDATA%\ai-command-center\rag-outputs\`
- Files: `ragConstants.js`, `ragExporter.js`, `RAGExportModal.jsx`

### Target Use Case
- Train "AV Savant" AI assistants for audio-visual industry
- Generate Q&A pairs from multi-agent chains
- Agent 1: Generate questions → Agent 2: Generate answers → Agent 3: Review

### RAG Parser Logic
- 2-agent chains: Agent 0 taskSpec checked for "question"/"generate" keywords
  - If found: Agent 0 output = question, Agent 1 output = answer
  - Otherwise: Agent 0 input = question, Agent 1 output = answer
- Single agent: input = question, output = answer
- Multi-iteration: Each iteration produces one Q&A pair

### Batch Prompt Generator (Implemented 2025-12-18)
- Pre-step in Chain Runner to generate prompts before running
- AI reads existing RAG outputs to avoid duplicate questions
- User selects provider/model for generation (Anthropic, OpenAI, Ollama)
- Save/load prompt lists as JSON to `%APPDATA%\ai-command-center\prompt-lists\`
- Chain Runner loops through prompt list (one per iteration)
- Files: `promptGenerator.js` (generation logic)

### Chain Runner UX Improvements (2025-12-18)
- Typewriter effect toggle - disable for faster batch processing
- Single agent support - no longer forced to have 2 agents
- Ollama support in prompt generator (local, no API key needed)

### Quality Validator (Implemented 2025-12-18)
- Optional post-chain validation step
- Scores each Q&A pair on 4 dimensions (0-1 scale):
  - Correctness: Is the answer factually accurate?
  - Completeness: Does it fully address the question?
  - Clarity: Is it easy to understand?
  - Relevance: Does it stay on topic?
- Overall score = average of all dimensions
- Configurable quality threshold (default 0.7)
- Quality badges in output view: green (>=0.8), yellow (0.6-0.8), red (<0.6)
- RAG export includes quality_score and quality_details fields
- Files: `qualityValidator.js`

### Config Save/Load (Implemented 2025-12-18)
- Save complete Chain Runner configurations to disk
- Load configurations with selection modal
- Delete saved configurations
- Storage: `%APPDATA%\ai-command-center\chain-configs\`
- Saved data includes: agents, prompt list, iterations, run mode, validator settings
- Files: `configManager.js`, `ConfigModal.jsx`

### Post-Export Navigation (2025-12-18)
- RAGExportModal returns to setup dashboard after successful export
- Uses `onExportComplete` callback prop
- 3-second delay after success message before auto-close

---

## Known Issues

- Memory Viewer previously had hardcoded paths (`C:\Users\myers\`) - fixed 2025-12-18
- Vision app camera had race condition on initialization - fixed 2025-12-18
- Autofill.enable DevTools errors are benign (Chromium feature not available)
- RAG Export React Error #31 - IPC response type mismatch - fixed 2025-12-18
- RAG Export 0 Q&A pairs - agents array not passed to modal - fixed 2025-12-18
- Database corruption "malformed disk image" - fixed 2025-12-30 with automatic repair system

---

## Related Projects

- **4Techs** (`D:\Projects\4Techs_V1`) - VectorEmbedder, RAG patterns
- **QuoteMyAV** (`D:\Projects\QuoteMyAV`) - LLM architecture, RAG knowledge base design

---

## Reference Documents

- `D:\Reference\a2a-training-research\a2a-training-research.md` - Comprehensive research on synthetic data generation, multi-agent collaboration, RAG best practices
- `D:\Reference\a2a-training-research\github-repos.md` - 29 curated repositories for A2A training systems

---

## Major Architecture Decision: Complete System Redesign (2025-12-29)

### From "Memory Lane" to "AI Command Center"

**Decision**: Transform from focused "Memory Lane" prototype into comprehensive productivity suite

**Rationale**:
- Original JFDI system (Andy's personal productivity system) provides proven architecture
- Vision and Chain Runner already working - need unified integration
- Memory Lane concept too narrow - expand to full executive assistant
- Single unified app better than fragmented tools

**Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│                  AI Command Center                       │
│                    (The Hexagon)                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Brain (Memory Lane)    Eye (Vision)    Network (CRM)   │
│  ────────────────────   ─────────────   ──────────────  │
│  • Memory extraction    • Camera feed   • Relationships │
│  • Entity resolution    • AI analysis   • Connections   │
│  • Dual retrieval       • Auto-mode     • Freshness     │
│                                                          │
│  + Dashboard + Projects + Reminders + Meetings + More   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**11 Integrated Modules**:
1. Dashboard - Daily briefings (auto-generated 8:30 AM)
2. Projects - Three-tier (Life/Projects/Now)
3. Reminders - Snooze workflow with energy types
4. Relationships - CRM with hot/warm/cold freshness
5. Meetings - Prep sheets, commitment extraction
6. Knowledge - Second brain, auto-filing
7. Chat - Claude Code wrapper with Memory Lane bar
8. Admin - System monitoring, token tracking
9. Memory Lane - Memory extraction & retrieval (Brain)
10. Vision - Camera analysis (Eye) [EXISTING]
11. Chain Runner - A2A RAG training (Network) [EXISTING]

**Technology Stack**:
- Frontend: React 18 + Vite (keep existing)
- Desktop: Electron 33 (keep existing)
- Database: SQLite + sqlite-vss (NEW - vector search)
- Embeddings: Ollama + mxbai-embed-large (NEW - local, 1024-dim)
- APIs: Anthropic Claude, OpenAI (keep existing)
- Icons: lucide-react (NEW - 1000+ clean icons)

**Design Language**:
- **Visual Trinity**: Hexagon + Brain + Eye + Network
- **Colors**: Dark navy (#1a1a2e), Gold accents (#ffd700), Pink-Purple-Blue gradients
- **Icons**: Line art style, 2px stroke, consistent with hexagon motif
- **Typography**: Modern sans-serif, professional not playful

**Database Schema** (20+ tables):
- memories (with embeddings BLOB)
- sessions, entities, entity_occurrences
- projects, tasks, reminders, snooze_records
- relationships, interactions, meetings
- knowledge_items, folders, tags
- chat_messages, feedback

**Memory System Architecture**:
- **Extraction**: Parse Claude Code JSONL sessions
- **Embeddings**: Ollama local, 1024 dimensions
- **Storage**: SQLite with sqlite-vss for vectors
- **Retrieval**: Dual mode (entity-based + semantic)
- **Re-ranking**: Multi-signal (60% similarity, 15% confidence, 10% recency, etc.)

**Implementation Timeline**:
- 7 phases over 16 weeks
- Phase 1 (Weeks 1-3): Core Infrastructure
- Phase 2 (Weeks 4-6): Memory System
- Phase 3 (Weeks 7-9): Projects & Reminders
- Phase 4 (Weeks 10-11): Relationships & Meetings
- Phase 5 (Weeks 12-13): Knowledge & Chat
- Phase 6 (Weeks 14-15): Dashboard & Admin
- Phase 7 (Week 16): Integration & Testing

**Documentation Strategy**:
- 24 spec files with task checkboxes (interactive in VS Code/GitHub)
- Complete design system (DESIGN-SYSTEM.md)
- GPT asset generation prompts (for creating matching icons/graphics)
- Design review checkpoints at end of each phase

**Design System Integration**:
- Created DESIGN-SYSTEM.md as quick reference for developers
- All 24 specs link to design system
- CSS variables spec created (00-CSS-VARIABLES.md)
- Day 1 of Phase 1: Implement CSS variables (non-negotiable)
- Design Review Checklist prevents drift

**Git Repository**:
- Live at: https://github.com/husky2466-codo/ai-command-center
- Clean history (removed 1000+ old files, videos >50MB)
- Secure .gitignore (protects API keys, env files, builds)

---

## Design Patterns Established (2025-12-29)

### Color Palette (Locked)
```css
/* Backgrounds */
--bg-primary: #1a1a2e     /* Dark navy - main */
--bg-secondary: #252540   /* Lighter navy - sections */
--bg-card: #2d2d4a        /* Card surfaces */
--bg-elevated: #3a3a5a    /* Hover states */

/* Accents */
--accent-gold: #ffd700    /* Primary accent, CTAs */
--accent-gold-hover: #ffed4a

/* Brand Gradient */
--gradient-pink: #ec4899
--gradient-purple: #8b5cf6
--gradient-blue: #3b82f6

/* Text */
--text-primary: #ffffff
--text-secondary: #a0a0b0
--text-muted: #6b6b80
```

### Icon Guidelines
- Style: Line art / outline only (NOT filled)
- Stroke: 2px consistent weight
- Size: 24x24px for navigation, 20x20px for toolbar
- Colors: Gray (#a0a0b0) default, Gold (#ffd700) active
- Source: lucide-react library

### Component Structure Convention
```
src/components/<module-name>/
├── ModuleName.jsx           # Main component
├── ModuleName.css           # Scoped styles
├── components/              # Sub-components
│   ├── SubComponent.jsx
│   └── SubComponent.css
└── utils/                   # Module-specific utilities
    └── helpers.js
```

### Service Layer Pattern
```
src/services/
├── memoryService.js         # Memory CRUD operations
├── embeddingService.js      # Ollama integration
├── databaseService.js       # SQLite wrapper
└── ...
```

### Visual Motifs
- **Hexagon**: Use for badges, containers, accents
- **Brain**: Memory Lane icon, pink tones
- **Eye**: Vision icon, blue tones
- **Network**: Connections icon, purple tones

---

## Known Issues (Updated 2025-12-29)

- Memory Viewer hardcoded paths - ✅ FIXED (2025-12-18)
- Vision camera race condition - ✅ FIXED (2025-12-18)
- RAG Export React Error #31 - ✅ FIXED (2025-12-18)
- Large files in git history blocking push - ✅ FIXED (2025-12-29, clean history created)
- No design system enforcement - ✅ FIXED (2025-12-29, integrated into all specs)

---

## Tools & Dependencies (2025-12-29)

**Installed**:
- lucide-react: 59 packages, ~500KB (icons)
- GitHub CLI (gh): v2.83.2 (authentication)

**To Install** (Phase 1):
- better-sqlite3: SQLite for Node.js
- sqlite-vss: Vector similarity search extension

**Development**:
- GitHub authenticated as: husky2466-codo
- Repository: https://github.com/husky2466-codo/ai-command-center

---

## Theme System (Implemented 2025-12-29)

### Available Themes
1. **Default** - Dark navy with gold accents (original)
2. **Cipher** - Matrix-style green on black
3. **Voltage** - Bumblebee yellow/black
4. **Evergreen** - Forest green tones
5. **Depths** - Ocean blue theme
6. **Magma** - Ember/fire orange-red

### Theme Architecture
- `src/themes/themes.js` - Theme definitions with CSS variable values
- `src/themes/ThemeContext.jsx` - React context provider
- `useTheme()` hook returns: `{ currentTheme, setTheme, theme }`
- Persistence: localStorage key `ai-command-center-theme`
- Application: CSS variables applied to `:root` via `applyTheme()`

### Theme Integration Pattern
```jsx
import { useTheme } from '../../themes/ThemeContext';
const { currentTheme } = useTheme();

// For dynamic updates (like xterm.js):
useEffect(() => {
  const bgColor = getCSSVar('--bg-primary');
  // Apply to component
}, [currentTheme]);
```

---

## Split View System (Implemented 2025-12-29)

### Library Choice
- **react-resizable-panels** (v2.1.7) - Lightweight, actively maintained
- NOT react-split-pane (abandoned 2+ years)
- NOT allotment (larger bundle, manual persistence)
- NOT golden-layout (100KB+, overkill)

### Architecture
```
src/components/layout/
├── LayoutContext.jsx    # State: panes[], splitDirection, persistence
├── SplitLayout.jsx      # Panel container with resize handles
├── PaneContainer.jsx    # Tab bar + content area per pane
└── layout.css           # Themed styling
```

### State Shape
```js
{
  panes: [
    { id: 'pane-1', tabs: [...], activeTabId: 'tab-1' },
    { id: 'pane-2', tabs: [...], activeTabId: 'tab-2' }
  ],
  splitDirection: 'horizontal' | 'vertical' | null
}
```

### Key Features
- Maximum 2 panes (can extend to grid in future)
- Each pane has independent tab management
- Layout auto-saves to localStorage: `ai-command-center-layout`
- Component instances isolated via `instanceId` prop
- Split controls only show when 1 pane exists

### CSS Requirements for Full-Width Content
All containers need `width: 100%`:
- `.split-layout`
- `.pane-container`
- `.pane-content`
- `.tab-content`
- Panel data attributes: `[data-panel-group]`, `[data-panel]`

---

## Integrated Terminal (Implemented 2025-12-29)

### Technology
- **xterm.js** (@xterm/xterm v6.0.0) - Terminal emulator
- **node-pty** (v1.1.0) - Native PTY for Windows/Mac/Linux
- **@xterm/addon-fit** - Auto-resize terminal to container

### IPC Channels
- `pty:create` - Create new PTY process, returns terminalId
- `pty:write` - Send input to PTY
- `pty:resize` - Resize PTY dimensions
- `pty:kill` - Terminate PTY process
- `pty:data` - Receive output from PTY (event-based)

### Theme Integration
Terminal reads CSS variables on init and watches for theme changes:
```jsx
const { currentTheme } = useTheme();

useEffect(() => {
  if (xtermRef.current) {
    xtermRef.current.options.theme = {
      background: getCSSVar('--bg-primary'),
      foreground: getCSSVar('--text-primary'),
      cursor: getCSSVar('--accent-primary'),
      // ...
    };
  }
}, [currentTheme]);
```

### Build Configuration
Native modules require special handling in electron-builder:
```json
"asarUnpack": [
  "node_modules/better-sqlite3/**/*",
  "node_modules/node-pty/**/*",
  "node_modules/bindings/**/*"
],
"npmRebuild": false
```

---

## Known Issues (Updated 2025-12-29)

- Stale Electron process can block new instances (single instance lock)
  - Solution: Run `cleanup-dev.ps1` to kill all Node/Electron processes
  - File: `D:\Projects\ai-command-center\cleanup-dev.ps1`
- Window maximize must happen BEFORE show to prevent flash
  - Fixed in `main.cjs`: `mainWindow.maximize()` then `mainWindow.show()`

---

## Development Scripts (2025-12-29)

### cleanup-dev.ps1
Kills stale Electron/Node processes when app won't start:
```powershell
powershell -ExecutionPolicy Bypass -File cleanup-dev.ps1
```

---

## Project File Watcher System (Implemented 2025-12-29)

### Architecture
- **Library**: chokidar (file system watcher)
- **Location**: `electron/services/projectWatcher.cjs`
- **Trigger**: Watches project `fs_path` directories from database

### Progress Calculation Algorithm
Milestone-based with activity bonus:
```javascript
const MILESTONES = {
  'README.md': 10,
  'package.json': 10,
  'src/': 20,
  'tests/': 15,
  'build/': 15,
  '.git/': 10
};
// Base progress from milestones (max 80%)
// +20% bonus for recent activity (files modified in last 7 days)
```

### IPC Channels
- `project:start-watching` - Start watching a project folder
- `project:stop-watching` - Stop watching a project folder
- `project:get-progress` - Get current calculated progress
- `project:progress-update` - Event when progress changes

### Integration Points
- `ProjectService.js` - `startWatching()`, `stopWatching()`, `getProgress()`
- `Projects.jsx` - Initializes watchers on mount, listens for updates
- `ProjectsView.jsx` - Displays real-time progress bars

---

## Email Module Architecture (Completed 2025-12-29)

### Phase 1: Core Email (Complete)
- Gmail-like interface with folder sidebar
- Email list with unread indicators
- Reading pane with HTML rendering
- Compose modal with recipients, subject, body

### Phase 2: Advanced Features (Complete)
- **Signatures**: Create/edit/default per account (`SignatureManager.jsx`)
- **Labels**: Custom labels with colors (`LabelManager.jsx`)
- **Templates**: Email templates with variable substitution (`TemplateManager.jsx`)
- **Advanced Search**: Multi-field search with saved queries (`AdvancedSearchModal.jsx`)
- **Migrations**: 007_email_signatures, 008_email_templates, 009_saved_searches

### Phase 3: UX Polish (Complete)
- **Settings Panel** (`EmailSettings.jsx`): Preferences stored in localStorage
- **Keyboard Shortcuts**: Gmail-style J/K/C/R/F navigation
- **Virtual Scrolling**: Attempted with react-window, reverted to map (API issues)

### Keyboard Shortcuts Pattern
```javascript
// useKeyboardNavigation.js - J/K navigation, X select
// useEmailKeyboardShortcuts.js - All other shortcuts
// KeyboardShortcutsHelp.jsx - Modal with grouped shortcuts

const DEFAULT_SHORTCUTS = [
  { key: 'J', description: 'Next email', category: 'Navigation' },
  // ... always provide defaults to prevent undefined.reduce()
];
```

### Settings Persistence
```javascript
const SETTINGS_KEY = 'email_settings';
// Stored: readingPanePosition, markAsReadDelay, composeFormat, syncFrequency
```

---

## Known Issues (Updated 2025-12-29)

### React Variable Ordering
Variables must be defined BEFORE hooks that use them:
```javascript
// WRONG: paginatedEmails used before defined
useKeyboardNavigation({ emails: paginatedEmails });
const paginatedEmails = emails.slice(...);

// CORRECT: Define first, then use
const paginatedEmails = emails.slice(...);
useKeyboardNavigation({ emails: paginatedEmails });
```

### Default Props for Arrays
Always provide defaults when mapping/reducing props:
```javascript
// WRONG: shortcuts might be undefined
shortcuts.reduce(...)

// CORRECT: Default parameter + guard
export default function Component({ shortcuts = DEFAULT_SHORTCUTS }) {
  const list = shortcuts || DEFAULT_SHORTCUTS;
  list.reduce(...)
}
```

### better-sqlite3 Electron Version
When NODE_MODULE_VERSION mismatches:
```bash
cd node_modules/better-sqlite3
npx node-gyp rebuild --target=33.4.11 --arch=x64 --dist-url=https://electronjs.org/headers
```

### Migration Numbering
Always check for conflicts before creating new migrations:
```bash
ls electron/database/migrations/
# Ensure no duplicate numbers (e.g., two 007_* files)
```

---

## Database Corruption & Repair System (Implemented 2025-12-30)

### Problem
SQLite WAL (Write-Ahead Logging) can become corrupted if:
- App crashes before checkpoint
- Improper shutdown (force quit)
- Multiple app instances access database
- File system errors or antivirus interference

**Symptom**: "database disk image is malformed" error

### Solution: Multi-Layer Auto-Repair

#### 1. Automatic Repair on Startup (`electron/database/db.cjs`)

**Health Check**:
```javascript
checkDatabaseHealth(dbPath)
  → PRAGMA integrity_check
  → If corrupted: auto-backup + attemptWALRepair()
```

**Auto-Checkpoint**:
- Startup: `PRAGMA wal_checkpoint(PASSIVE)` - gentle merge
- Shutdown: `PRAGMA wal_checkpoint(TRUNCATE)` - full merge + truncate WAL
- Busy timeout: 5000ms (5 seconds) for lock handling

**Auto-Repair Flow**:
1. Detect corruption → Create backup (`database.sqlite.corrupt-TIMESTAMP`)
2. Attempt WAL checkpoint (`TRUNCATE` mode)
3. Verify integrity post-checkpoint
4. If fails → Delete WAL/SHM files (forces SQLite recovery)

#### 2. Manual Repair Utility (`electron/utils/dbRepair.cjs`)

**CLI Commands** (run when app is closed):
```bash
npm run db:check       # PRAGMA integrity_check
npm run db:checkpoint  # PRAGMA wal_checkpoint(TRUNCATE)
npm run db:vacuum      # VACUUM + optimize
npm run db:backup      # Timestamped backup to db-backups/
npm run db:recover     # Full dump/restore to new database
npm run db:fresh       # DELETE DATABASE (backup first!)
```

**Typical Repair Flow**:
```bash
# Quick fix (90% of cases)
npm run db:checkpoint

# Standard repair
npm run db:backup && npm run db:checkpoint && npm run db:vacuum

# Nuclear option (data preserved in backup)
npm run db:backup && npm run db:fresh
```

#### 3. Logging Integration (Winston)

All database operations logged to:
- `%APPDATA%\ai-command-center\logs\combined-YYYY-MM-DD.log`
- `%APPDATA%\ai-command-center\logs\error-YYYY-MM-DD.log`

**Log Signatures**:
```
[INFO] Database health check: OK
[INFO] ✓ Database repaired successfully via WAL checkpoint
[ERROR] Database corruption detected
[WARN] WAL checkpoint failed on startup
```

#### 4. Prevention Measures

**App-level**:
- `busy_timeout = 5000` - Handles concurrent access
- Checkpoint on startup (PASSIVE) + shutdown (TRUNCATE)
- Single instance lock prevents multiple processes
- Error handlers for crashes (did-fail-load, crashed, unresponsive)

**User-level** (documented):
- Always close app properly (don't force-quit)
- Add `%APPDATA%\ai-command-center\` to antivirus exclusions
- Don't run multiple instances
- Check disk health if corruption persists

### Documentation

- **User Guide**: `docs/DATABASE-TROUBLESHOOTING.md` (400+ lines)
- **Utility README**: `electron/utils/README.md` (250+ lines)
- **Implementation**: `DATABASE-FIX-SUMMARY.md` (technical details)

### Database Files

**Location**: `%APPDATA%\ai-command-center\`
- `database.sqlite` - Main database
- `database.sqlite-wal` - Write-Ahead Log (pending changes)
- `database.sqlite-shm` - Shared memory (WAL index)
- `database.sqlite.corrupt-TIMESTAMP` - Auto-backup when corruption detected

**Backups**: `%APPDATA%\ai-command-center\db-backups\`
- `database-YYYY-MM-DDTHH-MM-SS.sqlite` - Manual backups
- `dump-YYYY-MM-DDTHH-MM-SS.sql` - SQL dumps from recovery

### Key Learnings

1. **WAL mode is fast but fragile** - Requires proper checkpoint discipline
2. **Auto-repair saves users** - Most corruption fixed on startup without user action
3. **Backups before repair** - Always preserve corrupted state for analysis
4. **Graceful shutdown critical** - Checkpoint WAL before close
5. **Logging essential** - Users can self-diagnose from logs

---

## CSS Patterns (2025-12-29)

### Input with Icon
Icons need explicit positioning to avoid text overlap:
```css
.input-icon-left {
  left: 12px;  /* Fixed position, not variable */
}
.input-has-icon-left {
  padding-left: 44px !important;  /* 12px + 16px icon + 16px gap */
}
```

### Toolbar Layout Fix
When buttons get cut off, use column layout:
```css
.toolbar {
  flex-direction: column;
  padding: 12px 16px;
}
.toolbar-left {
  flex-wrap: wrap;
  width: 100%;
  gap: 8px;
}
```
