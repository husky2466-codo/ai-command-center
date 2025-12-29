# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL: Task Delegation Rule

**ALWAYS use subagents (Task tool) for any task that is NOT:**
- Answering a direct question from the user
- Restarting services on this computer
- Reading a single file for context

**Use subagents for:**
- Writing code or creating files
- Complex analysis or research
- Multi-step implementations
- Building features
- Debugging
- Planning
- Code searches across multiple files

**Why:** Subagents provide better focus, can work in parallel, and prevent context bloat.

## Build & Development Commands

```bash
# Development (React only)
npm run dev

# Development (Electron + React)
npm run dev:electron

# Build for production
npm run build
npm run build:electron  # Creates distributable in release/
```

## Architecture Overview

AI Command Center is an Electron desktop app with a React frontend (Vite), providing three AI-powered tools accessible from a tabbed interface.

### Main Components

**Electron Layer** (`electron/`)
- `main.cjs` - Main process: window management, IPC handlers for file I/O, API key loading (OneDrive vault with ~/.env fallback), screen capture
- `preload.cjs` - Context bridge exposing `window.electronAPI` to renderer

**React App** (`src/`)
- `App.jsx` - Root component managing tab state and routing between apps. Each app is loaded once and preserved while switching tabs.
- Apps receive `apiKeys` prop containing `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `HF_TOKEN`

### The Three Apps

1. **Memory Viewer** (`src/components/memory-viewer/`)
   - Monitors `C:\Users\myers\CLAUDE.md` and `CLAUDELONGTERM.md`
   - Takes snapshots, shows version history with diff view
   - Snapshots stored in `%APPDATA%\ai-command-center\snapshots\`

2. **Vision** (`src/components/vision/`)
   - Webcam capture with Claude Vision API (claude-sonnet-4-20250514)
   - Auto-mode for periodic analysis
   - Saves latest frame to `%APPDATA%\ai-command-center\latest-frame.txt` every 2s
   - Vision queries logged to `vision-log.json`

3. **Chain Runner** (`src/components/chain-runner/`)
   - Multi-agent AI chains with configurable providers (Anthropic, OpenAI, HuggingFace, Ollama)
   - Run modes: once, N sessions, continuous
   - Records sessions to webm video, logs to JSON
   - Task specs editable during execution

### Data Storage Paths

- User data: `%APPDATA%\ai-command-center\` (snapshots, sessions, configs)
- Recordings: `<app-install-dir>\recordings\`

### API Integration Pattern

All AI API calls use direct fetch from the renderer process with CORS headers (`anthropic-dangerous-direct-browser-access`). The CSP in `index.html` allows connections to:
- api.anthropic.com
- api.openai.com
- router.huggingface.co
- localhost (for Ollama)

### Path Alias

`@/` maps to `src/` in imports (configured in vite.config.js).

## Project-Specific Agents

Located in `.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| `electron-react-dev` | General development on this app - features, bugs, refactoring |
| `vision-tester` | Debug camera/Vision API issues (lightweight, uses haiku) |
| `chain-config` | Design multi-agent chains, write task specs, troubleshoot Chain Runner |

## Slash Commands

Located in `.claude/commands/`:

| Command | Usage |
|---------|-------|
| `/add-app <name>` | Scaffold a new app/tool with component, CSS, and routing |
| `/add-ipc <channel>` | Add new IPC channel across main, preload, and renderer |
| `/debug-vision` | Systematic debugging of Vision app camera/API |
| `/debug-chain` | Systematic debugging of Chain Runner |
| `/build-release` | Build and package for distribution |
| `/memorystore` | Update project CLAUDE.md and CLAUDELONGTERM.md with session notes |

---

## Recent Changes (2025-12-29)

- **Complete System Redesign**: Renamed from "Memory Lane" to "AI Command Center" with unified architecture
- **Comprehensive Planning**: Created 2105-line master plan (AI-COMMAND-CENTER-PLAN.md) covering all 11 modules
- **Implementation Specs**: 24 spec files with task checkboxes (components/, features/, phases/)
- **Design System**: Complete design documentation (DESIGN-SYSTEM.md, GPT-ASSET-GENERATION-PROMPTS.md)
- **Visual Identity**: Hexagon + Brain/Eye/Network trinity, pink-purple-blue gradients, gold accents
- **Icon Library**: Installed lucide-react for consistent icons
- **Window Behavior**: App now starts maximized by default
- **Git Repository**: Pushed to GitHub with secure .gitignore (protects env files, builds, user data)
- **Design Integration**: All 24 specs now reference design system, impossible to forget during development

## Current Status

- **Planning Phase Complete**: 7-phase roadmap (16 weeks) ready for implementation
- **Design System Locked**: Colors, icons, patterns documented and integrated into all specs
- **Repository Live**: https://github.com/husky2466-codo/ai-command-center
- **Existing Features Preserved**: Vision and Chain Runner fully functional and documented
- **Ready for Phase 1**: Core Infrastructure (database, sidebar, CSS variables)

## Next Steps

- **Phase 1 - Core Infrastructure** (Weeks 1-3):
  - Implement CSS variables from DESIGN-SYSTEM.md (Day 1 priority)
  - Set up SQLite + sqlite-vss database
  - Build sidebar navigation with lucide-react icons
  - Create shared components (Card, Modal, Button, Input)
- **Phase 2 - Memory System** (Weeks 4-6):
  - Memory extraction service
  - Ollama embedding integration
  - Dual retrieval (entity + semantic)
- See specs/phases/ for complete roadmap

---

## Session Notes

### 2025-12-18 - RAG Training Feature Research & Planning

**Discussed:**
- Adding RAG training document generation to Chain Runner
- Output formats: JSONL (for embeddings), Markdown, plain text
- Multi-agent chain patterns for Q&A generation

**Discovered:**
- 4Techs project has VectorEmbedder with 384-dim embeddings
- QuoteMyAV has full RAG architecture with categories: equipment_guides, event_types, venue_considerations, common_mistakes
- Chain Runner session logs already capture all needed data

**Planned Implementation:**
- Phase 1: Constants (categories, formats, tags)
- Phase 2: Export utilities (parser, formatters)
- Phase 3: Modal UI component
- Phase 4: Integration with ChainRunner.jsx

**Files to Create:**
- `src/components/chain-runner/ragConstants.js`
- `src/components/chain-runner/ragExporter.js`
- `src/components/chain-runner/RAGExportModal.jsx`

### 2025-12-18 (Continued) - RAG Export Implementation & Bug Fixes

**Implemented:**
- Created `ragConstants.js` - Categories, formats, tags for AV industry RAG
- Created `ragExporter.js` - Parser and formatters (JSONL, Markdown, plain text)
- Created `RAGExportModal.jsx` - Full modal UI with format selection, tagging, path picker
- Integrated "Export RAG Training" button into Chain Runner

**Bugs Fixed:**
1. **React Error #31** - `getUserDataPath()` response type mismatch
   - Added type checking: `typeof result === 'string' ? result : result?.path`
   - Added render guard for outputPath display
2. **0 Q&A Pairs Issue** - `agents` array not passed to modal
   - Fixed by constructing complete sessionLog with live agents data in prop
   - Added debug console.log in parser for troubleshooting
3. **Auto-populate Path** - Output location now auto-fills on modal open
   - Calls `getUserDataPath()` in useEffect when modal opens
   - Creates `rag-outputs` directory on app startup

**Files Modified:**
- `electron/main.cjs` - Added rag-outputs directory creation
- `src/components/chain-runner/ChainRunner.jsx` - RAGExportModal integration, agents prop fix
- `src/components/chain-runner/ChainRunner.css` - Modal styles
- `src/components/chain-runner/RAGExportModal.jsx` - Type guards, auto-path
- `src/components/chain-runner/ragExporter.js` - Debug logging, resilient parsing

**Usage Tip:**
- For Agent 1 taskSpec, include "question" or "generate" so parser identifies it as question generator
- Example: "Generate a detailed question about AV equipment based on the given topic"

### 2025-12-18 (Continued) - Batch Prompt Generator Implementation

**User Request:**
- Run chains in loops with different prompts each iteration
- Prompts generated by AI based on categories
- AI should read existing RAG outputs to avoid duplicates

**Implemented:**
- Created `promptGenerator.js` with:
  - `loadExistingRAGTopics()` - Reads all JSONL files from rag-outputs, extracts questions
  - `generatePrompts()` - Calls AI (Anthropic/OpenAI) to generate prompt array
  - `buildGeneratorSystemPrompt()` - Includes existing questions to avoid duplicates
  - `savePromptList()` / `loadPromptList()` - Persist prompt lists as JSON
- Updated `ChainRunner.jsx` with:
  - "Use Batch Prompt Generator" checkbox
  - Provider/Model selector for generation
  - Topic input + prompt count
  - Editable prompt list with add/remove
  - Save/Load buttons
  - Modified `runChain()` to iterate through prompt list
  - Progress indicator "Prompt X / Y" in output mode
- Added CSS styles for prompt generator UI
- Created `prompt-lists` directory in `%APPDATA%`

**Files Created:**
- `src/components/chain-runner/promptGenerator.js`

**Files Modified:**
- `src/components/chain-runner/ChainRunner.jsx` - State, UI, handlers, loop logic
- `src/components/chain-runner/ChainRunner.css` - Prompt generator styles
- `electron/main.cjs` - Added prompt-lists directory creation

**Usage:**
1. Enable "Use Batch Prompt Generator"
2. Select provider/model for generation
3. Enter topic (e.g., "Wireless microphone troubleshooting")
4. Set count (e.g., 10)
5. Click "Generate Prompts" - AI reads existing RAG to avoid duplicates
6. Review/edit list, optionally save for later
7. Run Chain - loops through all prompts
8. Export to RAG when done

### 2025-12-18 (Continued) - Chain Runner Enhancements

**Implemented:**
1. **Typewriter Effect Toggle**
   - Added checkbox "Typewriter Effect" in run config section
   - When unchecked: instant output display (faster for batch RAG generation)
   - State: `enableTypewriter` with conditional in runChain()

2. **Ollama Support in Prompt Generator**
   - Added Ollama API integration to `promptGenerator.js`
   - Calls `http://localhost:11434/api/chat`
   - Skips API key requirement for local Ollama
   - Updated ChainRunner.jsx to handle null API key for Ollama

3. **Single Agent Support**
   - Chain Runner now starts with 1 agent (was forced to 2)
   - Can add more agents as needed
   - Remove button disabled only when 1 agent remains
   - Panel widths initialize to 100% for single agent

**Files Modified:**
- `src/components/chain-runner/ChainRunner.jsx` - Typewriter toggle, single agent init
- `src/components/chain-runner/ChainRunner.css` - Typewriter toggle styles
- `src/components/chain-runner/promptGenerator.js` - Ollama support

### 2025-12-18 (Continued) - A2A Training Research & Quality Validator

**Research Phase:**
- Deep dive on improving A2A (AI-to-AI) training system
- Created reference documents:
  - `D:\Reference\a2a-training-research\a2a-training-research.md` - Comprehensive research
  - `D:\Reference\a2a-training-research\github-repos.md` - 29 curated repositories
- Identified top enhancements: Quality Validator, Curriculum Learning, Self-Critique Loop

**Quality Validator Implementation:**
- Created `qualityValidator.js` with:
  - `buildValidatorPrompt()` - System prompt for quality evaluation
  - `validateQAPair()` - Calls AI to score individual Q&A pair
  - `validateSession()` - Loops through all outputs, returns scores array
- Scores 4 dimensions (0-1 scale):
  - Correctness: Is the answer factually accurate?
  - Completeness: Does it fully address the question?
  - Clarity: Is it easy to understand?
  - Relevance: Does it stay on topic?
- Overall score = average of all dimensions
- Integrated into ChainRunner.jsx:
  - "Enable Quality Validator" checkbox in setup
  - Provider/Model selector for validator
  - Quality threshold slider (default 0.7)
  - Validation runs after chain completes
  - Quality badges in output view (green/yellow/red)
- Updated ragExporter.js:
  - JSONL includes quality_score and quality_details
  - Markdown and plain text show quality info

**Files Created:**
- `src/components/chain-runner/qualityValidator.js`

**Files Modified:**
- `src/components/chain-runner/ChainRunner.jsx` - Validator state, UI, integration
- `src/components/chain-runner/ChainRunner.css` - Quality badge styles
- `src/components/chain-runner/ragExporter.js` - Quality score exports

### 2025-12-18 (Continued) - Config Save/Load & Post-Export Navigation

**Config Save/Load:**
- Created `configManager.js` with:
  - `saveChainConfig()` - Save config with timestamp and name
  - `listChainConfigs()` - Get all saved configs from directory
  - `loadChainConfig()` - Load config by filename
  - `deleteChainConfig()` - Remove saved config
- Created `ConfigModal.jsx`:
  - Two modes: 'save' (name input) and 'load' (list view)
  - Load mode shows all configs with Load/Delete buttons
  - Confirms before delete
- Storage: `%APPDATA%\ai-command-center\chain-configs\`
- Config includes: agents, promptList, iterations, runMode, validator settings

**Post-Export Navigation:**
- RAGExportModal now accepts `onExportComplete` callback prop
- After successful export (3s delay), calls callback to return to setup
- ChainRunner passes `handleReturnToSetup` as callback

**Files Created:**
- `src/components/chain-runner/configManager.js`
- `src/components/chain-runner/ConfigModal.jsx`

**Files Modified:**
- `src/components/chain-runner/RAGExportModal.jsx` - onExportComplete prop
- `src/components/chain-runner/ChainRunner.jsx` - Config modal integration
- `src/components/chain-runner/ChainRunner.css` - Config modal styles
- `electron/main.cjs` - chain-configs directory creation
- `electron/preload.cjs` - deleteFile method exposed

---

### 2025-12-29 - Complete System Redesign & Planning

**Major Milestone: Transformation from "Memory Lane" to "AI Command Center"**

**User Request:**
- Rename everything from "Memory Lane" to "AI Command Center"
- Read updated JFDI-SYSTEM-ANALYSIS.md
- Replan entire application as ONE comprehensive app
- Include Vision and Chain Runner as proper tabs/modules
- Create complete architecture and implementation plan

**Planning Process:**
- Used 3 parallel agents:
  - Explore agent (a7a3133): Detailed codebase inventory
  - Architecture agent (ab9166d): Unified architecture design with ASCII diagrams
  - Project planner (ad2240a): 7-phase implementation roadmap

**Deliverables Created:**

1. **AI-COMMAND-CENTER-PLAN.md** (2105 lines)
   - 27 sections covering complete system
   - 11 integrated modules documented
   - Full database schema (20+ tables, SQLite + sqlite-vss)
   - ASCII architecture diagrams
   - UI wireframes for each module
   - Color palette and design system
   - 7-phase timeline (Weeks 1-16)
   - Code examples for services and components

2. **Implementation Specs** (24 files in specs/)
   - **Components** (11 files): 01-DASHBOARD.md through 11-CHAIN-RUNNER.md
   - **Features** (5 files): DATABASE-LAYER.md, EMBEDDING-SYSTEM.md, MEMORY-EXTRACTION.md, DUAL-RETRIEVAL.md, SHARED-COMPONENTS.md
   - **Phases** (7 files): PHASE-1 through PHASE-7
   - Each with task checkboxes, dependencies, acceptance criteria

3. **Design System Integration**
   - Created **DESIGN-SYSTEM.md** (~500 lines)
     - Developer-friendly quick reference
     - Copy-paste ready CSS variables
     - Icon style guidelines
     - Brain/Eye/Network visual language
   - Created **specs/components/00-CSS-VARIABLES.md**
     - Complete CSS variables specification
     - Ready-to-implement code
   - Updated **all 24 specs** with design guidelines
     - Module-specific colors documented
     - Icon requirements listed
     - Layout patterns included
     - Design checklist per component

4. **GPT-ASSET-GENERATION-PROMPTS.md** Integration
   - Existing 2048-line design guide preserved
   - Referenced in all specs
   - Design Review Checklist added to specs/README.md
   - Impossible to miss during development

**Architecture Highlights:**

- **11 Modules**: Dashboard, Projects, Reminders, Relationships, Meetings, Knowledge, Chat, Admin, Memory Lane, Vision (existing), Chain Runner (existing)
- **Visual Trinity**: Brain (Memory Lane), Eye (Vision), Network (Connections)
- **Color Palette**: Dark navy (#1a1a2e), Gold accents (#ffd700), Pink-Purple-Blue gradients
- **Technology Stack**: React 18 + Vite + Electron, SQLite + sqlite-vss, Ollama embeddings
- **Design Motif**: Hexagon shapes, line art icons (2px stroke)

**Development Workflow Improvements:**

- Installed **lucide-react** for consistent iconography (1000+ icons)
- Updated **electron/main.cjs**: Window starts maximized
- Created comprehensive **.gitignore**:
  - Protects .env files, API keys, secrets
  - Ignores node_modules, builds, releases
  - Excludes user data (recordings, rag-outputs, snapshots)
  - Blocks video files, reference materials

**Git Repository:**

- Cleaned up 1000+ old research files (Claude-memory-reinvent/)
- Removed large files (videos >50MB, node_modules, builds)
- Created clean commit history
- Successfully pushed to: https://github.com/husky2466-codo/ai-command-center
- GitHub CLI (gh) installed and authenticated

**Design System Workflow:**

- Agent (ad36e62) integrated design system into all specs
- Every component/feature/phase spec now links to DESIGN-SYSTEM.md
- Design Review Checkpoints added to all phase specs
- Phase 1 prioritizes CSS variables (Day 1)
- Pre-release design audit in Phase 7

**Files Created:**
- AI-COMMAND-CENTER-PLAN.md
- specs/DESIGN-SYSTEM.md
- specs/README.md
- specs/components/00-CSS-VARIABLES.md (+ 11 component specs)
- specs/features/ (5 feature specs)
- specs/phases/ (7 phase specs)

**Files Modified:**
- .gitignore (comprehensive security)
- electron/main.cjs (window maximized on startup)
- All existing spec files updated with design guidelines

**Key Decisions:**

1. **One Unified App**: All modules integrated into single architecture
2. **Preserve Existing**: Vision and Chain Runner documented as-is, integration-only specs
3. **Design First**: CSS variables must be implemented Day 1 of Phase 1
4. **16-Week Timeline**: Realistic 7-phase roadmap with dependencies
5. **Checkpoint-Based**: Design review at end of each phase prevents drift

**Tools & Setup:**

- lucide-react: 59 packages, ~500KB
- GitHub CLI: v2.83.2 installed via winget
- Git remote: SSH → HTTPS (authentication working)

**Current State:**

- Planning phase: ✅ Complete
- Design system: ✅ Locked and integrated
- Repository: ✅ Live on GitHub
- Implementation: 🔄 Ready to start Phase 1

**Next Session:**

Ready to begin **Phase 1: Core Infrastructure**
- Day 1: Implement CSS variables from DESIGN-SYSTEM.md
- Week 1-3: Database setup, sidebar navigation, shared components
