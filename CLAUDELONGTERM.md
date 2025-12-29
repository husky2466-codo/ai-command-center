# AI Command Center - Long-Term Memory

Architecture decisions, patterns, and feature plans that persist across sessions.

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

---

## Related Projects

- **4Techs** (`D:\Projects\4Techs_V1`) - VectorEmbedder, RAG patterns
- **QuoteMyAV** (`D:\Projects\QuoteMyAV`) - LLM architecture, RAG knowledge base design

---

## Reference Documents

- `D:\Reference\a2a-training-research\a2a-training-research.md` - Comprehensive research on synthetic data generation, multi-agent collaboration, RAG best practices
- `D:\Reference\a2a-training-research\github-repos.md` - 29 curated repositories for A2A training systems
