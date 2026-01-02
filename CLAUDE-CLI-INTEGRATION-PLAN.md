# Claude Code CLI Integration Plan

## Overview

Revamp AI Command Center to use **Claude Code CLI** as the primary AI backend instead of direct API calls. This enables users with Claude Pro/Max subscriptions to use their subscription instead of paying per-token API costs.

---

## Current State Audit

### Files Using Direct AI API Calls

| File | Purpose | Current Method |
|------|---------|----------------|
| `src/components/vision/VisionApp.jsx` | Webcam image analysis | Direct Anthropic API |
| `src/services/chatService.js` | AI chat functionality | Direct Anthropic API |
| `src/services/memoryExtractionService.js` | Extract insights from memory files | Direct Anthropic API |
| `src/components/chain-runner/hooks/useChainExecution.js` | Multi-agent chains | Multi-provider (Anthropic, OpenAI, HF, Ollama) |
| `src/components/chain-runner/promptGenerator.js` | Generate prompts with AI | Multi-provider |
| `src/components/chain-runner/qualityValidator.js` | Validate Q&A quality | Multi-provider |
| `src/components/settings/Settings.jsx` | Test API keys | Direct API calls |

### Current Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
├─────────────────────────────────────────────────────────┤
│  VisionApp │ ChatApp │ ChainRunner │ MemoryExtraction   │
└──────┬─────────┬──────────┬────────────────┬────────────┘
       │         │          │                │
       ▼         ▼          ▼                ▼
┌─────────────────────────────────────────────────────────┐
│              Direct HTTP API Calls                       │
│  api.anthropic.com │ api.openai.com │ localhost:11434   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
                   $$$  Per Token
```

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
├─────────────────────────────────────────────────────────┤
│  VisionApp │ ChatApp │ ChainRunner │ MemoryExtraction   │
└──────┬─────────┬──────────┬────────────────┬────────────┘
       │         │          │                │
       ▼         ▼          ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                   IPC Bridge                             │
│              window.electronAPI.ai.*                     │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Electron Main Process                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │           ClaudeCliService.cjs                   │    │
│  │  ┌─────────────────┐  ┌───────────────────────┐ │    │
│  │  │  OAuth Token    │  │  Process Pool         │ │    │
│  │  │  Management     │  │  (spawn claude CLI)   │ │    │
│  │  └─────────────────┘  └───────────────────────┘ │    │
│  │  ┌─────────────────┐  ┌───────────────────────┐ │    │
│  │  │  Request Queue  │  │  Response Parser      │ │    │
│  │  │  & Rate Limit   │  │  (streaming support)  │ │    │
│  │  └─────────────────┘  └───────────────────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │     Fallback: Direct API (for Chain Runner)     │    │
│  │     OpenAI, HuggingFace, Ollama providers       │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   Claude Code CLI    │    │   Other Providers        │
│   (OAuth - $0)       │    │   (API Keys - $$$)       │
│                      │    │   - OpenAI               │
│   Uses Pro/Max sub   │    │   - HuggingFace          │
└──────────────────────┘    │   - Ollama (free/local)  │
                            └──────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Day 1-2)

#### 1.1 Create ClaudeCliService
**File:** `electron/services/claudeCliService.cjs`

```javascript
// Core service that wraps Claude Code CLI
const { spawn } = require('child_process');
const EventEmitter = require('events');

class ClaudeCliService extends EventEmitter {
  constructor() {
    super();
    this.oauthToken = null;
    this.activeProcesses = new Map();
  }

  // Check if Claude CLI is available
  async checkAvailability() {}

  // Get or refresh OAuth token
  async getOAuthToken() {}

  // Send a prompt and get response
  async query(prompt, options = {}) {}

  // Send with image (for Vision)
  async queryWithImage(prompt, imageBase64, options = {}) {}

  // Stream response (for chat)
  async *streamQuery(prompt, options = {}) {}

  // Cancel active request
  cancel(requestId) {}
}
```

#### 1.2 Add IPC Handlers
**File:** `electron/main.cjs` (additions)

```javascript
// New IPC channels for Claude CLI
ipcMain.handle('claude-cli:check', async () => {});
ipcMain.handle('claude-cli:query', async (event, prompt, options) => {});
ipcMain.handle('claude-cli:query-with-image', async (event, prompt, image, options) => {});
ipcMain.handle('claude-cli:stream', async (event, prompt, options) => {});
ipcMain.handle('claude-cli:cancel', async (event, requestId) => {});
ipcMain.handle('claude-cli:get-token-status', async () => {});
ipcMain.handle('claude-cli:setup-token', async () => {});
```

#### 1.3 Update Preload
**File:** `electron/preload.cjs` (additions)

```javascript
claudeCli: {
  check: () => ipcRenderer.invoke('claude-cli:check'),
  query: (prompt, options) => ipcRenderer.invoke('claude-cli:query', prompt, options),
  queryWithImage: (prompt, image, options) => ipcRenderer.invoke('claude-cli:query-with-image', prompt, image, options),
  stream: (prompt, options) => ipcRenderer.invoke('claude-cli:stream', prompt, options),
  cancel: (requestId) => ipcRenderer.invoke('claude-cli:cancel', requestId),
  getTokenStatus: () => ipcRenderer.invoke('claude-cli:get-token-status'),
  setupToken: () => ipcRenderer.invoke('claude-cli:setup-token'),
}
```

---

### Phase 2: Vision App Migration (Day 2-3)

#### 2.1 Update VisionApp.jsx
- Replace direct `fetch()` to Anthropic API with `window.electronAPI.claudeCli.queryWithImage()`
- Add fallback to API key if CLI unavailable
- Maintain existing UI/UX

**Before:**
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKeys.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: [...] }]
  })
});
```

**After:**
```javascript
const response = await window.electronAPI.claudeCli.queryWithImage(
  prompt,
  imageBase64,
  { maxTokens: 1024 }
);
```

---

### Phase 3: Chat Service Migration (Day 3-4)

#### 3.1 Update chatService.js
- Add streaming support via CLI
- Maintain conversation context
- Handle multi-turn conversations

#### 3.2 Update ChatApp.jsx
- Use new service methods
- Add visual indicator for "Using Subscription" vs "Using API"

---

### Phase 4: Memory Extraction Migration (Day 4)

#### 4.1 Update memoryExtractionService.js
- Convert to use Claude CLI
- Maintain batch processing capability

---

### Phase 5: Chain Runner Enhancement (Day 5-6)

#### 5.1 Add "Claude CLI (Subscription)" Provider
**File:** `src/components/chain-runner/hooks/useChainExecution.js`

Add new provider option alongside existing:
- Anthropic (API)
- OpenAI (API)
- HuggingFace (API)
- Ollama (Local)
- **Claude CLI (Subscription)** ← NEW

#### 5.2 Update Provider Selector UI
- Show subscription status indicator
- Display "Free with Pro/Max" badge for CLI option

---

### Phase 6: Settings & Admin (Day 6-7)

#### 6.1 Update Settings.jsx
- Add OAuth token management section
- "Connect Claude Subscription" button
- Token status display
- Option to prefer subscription over API

#### 6.2 Add Subscription Status Widget
- Show in sidebar/header
- Indicate: Connected / Not Connected / Using API Fallback

---

### Phase 7: Testing & Polish (Day 7-8)

- End-to-end testing of all AI features
- Fallback handling when CLI unavailable
- Error messages and user guidance
- Performance comparison (CLI vs API)

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `electron/services/claudeCliService.cjs` | Core CLI wrapper service |
| `src/components/settings/SubscriptionSettings.jsx` | OAuth token management UI |
| `src/hooks/useClaudeCli.js` | React hook for CLI access |

### Modified Files
| File | Changes |
|------|---------|
| `electron/main.cjs` | Add IPC handlers for CLI |
| `electron/preload.cjs` | Expose CLI methods |
| `src/components/vision/VisionApp.jsx` | Use CLI for image analysis |
| `src/services/chatService.js` | Use CLI for chat |
| `src/services/memoryExtractionService.js` | Use CLI for extraction |
| `src/components/chain-runner/hooks/useChainExecution.js` | Add CLI provider option |
| `src/components/chain-runner/ChainConfig.jsx` | Add CLI to provider dropdown |
| `src/components/settings/Settings.jsx` | Add subscription settings |
| `src/components/admin/Admin.jsx` | Show subscription status |
| `src/App.jsx` | Initialize CLI service |

---

## Claude CLI Command Reference

### Basic Query
```bash
claude -p "Your prompt here" --output-format json
```

### With Image (Vision)
```bash
claude -p "Describe this image" --image /path/to/image.png --output-format json
```

### Streaming
```bash
claude -p "Long response prompt" --stream
```

### Check Token Status
```bash
claude auth status
```

### Setup Token
```bash
claude setup-token
```

---

## Configuration Options

### New .env Variables
```env
# Claude CLI Settings
PREFER_SUBSCRIPTION=true          # Use CLI over API when available
CLAUDE_CLI_TIMEOUT=120000         # CLI response timeout (ms)
CLAUDE_CLI_MAX_CONCURRENT=3       # Max parallel CLI processes
```

### New Settings in App
```javascript
settings: {
  ai: {
    preferSubscription: true,     // Default to CLI when available
    showProviderBadge: true,      // Show "Subscription" vs "API" badge
    fallbackToApi: true,          // Use API if CLI fails
  }
}
```

---

## User Experience Changes

### Before (API Only)
- User needs API key
- Every request costs money
- Fast, direct API calls

### After (CLI + API)
- User can connect Claude subscription
- Pro/Max users: $0 per request
- Slight latency increase (~500ms spawn time)
- Fallback to API if needed
- Clear indicators of which mode is active

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CLI not installed | Check on startup, guide user to install |
| OAuth token expired | Auto-refresh, prompt re-auth |
| CLI slower than API | Cache, optimize, show loading states |
| CLI unavailable | Graceful fallback to API |
| Rate limiting | Queue requests, respect limits |

---

## Success Metrics

1. **Cost Savings**: Users with Pro/Max see $0 API costs
2. **Feature Parity**: All AI features work with CLI
3. **Performance**: <2s response time for typical queries
4. **Reliability**: 99% success rate with fallback

---

## Timeline

| Day | Phase | Deliverable |
|-----|-------|-------------|
| 1-2 | Infrastructure | ClaudeCliService + IPC |
| 2-3 | Vision | VisionApp using CLI |
| 3-4 | Chat | ChatApp using CLI |
| 4 | Memory | MemoryExtraction using CLI |
| 5-6 | Chain Runner | CLI as provider option |
| 6-7 | Settings | Token management UI |
| 7-8 | Testing | Full integration testing |

**Total: ~8 days of development**

---

## Approval Checklist

- [ ] Architecture approved
- [ ] Phase breakdown approved
- [ ] Timeline acceptable
- [ ] Begin implementation

---

*Plan created: 2026-01-01*
*For: AI Command Center v2.x*
