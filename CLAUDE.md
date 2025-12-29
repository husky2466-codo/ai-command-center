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

## Recent Changes (2025-12-18)

- **Memory Viewer**: Added project folder selector with browse button, dynamic paths (no longer hardcoded), localStorage persistence for recent/custom projects
- **Vision App**: Fixed camera not rendering - added explicit `.play()`, `loadedmetadata` listener, ready state validation
- **Chain Runner**: Fixed useEffect dependencies, panel width initialization
- **Chain Runner RAG Export**: Full implementation completed (see session notes below)
- **Settings**: Fixed console interception memory leak
- **App.jsx**: Added API key validation banner, Error Boundaries around each app
- **IPC**: Added `select-folder` handler for native folder picker

## Current Status

- App builds and runs successfully from desktop shortcut
- All three apps functional (Memory Viewer, Vision, Chain Runner)
- RAG Export feature fully implemented in Chain Runner
- **Batch Prompt Generator** fully implemented in Chain Runner
- **Quality Validator** fully implemented - scores Q&A pairs automatically
- **Config Save/Load** - Save and load complete Chain Runner configurations
- Distribution build at `release/win-unpacked/AI Command Center.exe`

## Next Steps

- Test full A2A training workflow with quality validation
- Implement semantic deduplication (embedding-based)
- Add question type diversity (factual, comparison, troubleshooting)

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
