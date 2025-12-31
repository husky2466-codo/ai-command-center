# Chain Runner API - Implementation Summary

## Overview

Complete HTTP API implementation for controlling Chain Runner programmatically, enabling Claude Code (or any HTTP client) to:
- Generate prompts with AI
- Run multi-agent chains
- Monitor execution progress
- Export RAG training data
- Manage configurations and sessions

## Files Created

### 1. `electron/services/chainRunnerService.cjs` (783 lines)

Backend service handling all Chain Runner logic:
- Configuration management (list, save, load, delete)
- Prompt list management
- AI-powered prompt generation
- Chain execution with multiple providers (Anthropic, OpenAI, HuggingFace, Ollama)
- Quality validation
- Session logging and export

**Key Methods:**
- `runChain(config, prompts, apiKeys)` - Execute multi-agent chain
- `generatePrompts(options)` - AI-powered prompt generation
- `exportSession(id, format, category, tags)` - Export as JSONL/Markdown/Text
- `getStatus()` - Get current run status
- `stopChain()` - Abort current run

### 2. `electron/services/chainRunnerHelpers.cjs` (360 lines)

Helper functions adapted from frontend Chain Runner:
- `generatePrompts()` - AI API calls for prompt generation
- `parseChainOutputs()` - Parse session outputs into Q&A pairs
- `formatAsJSONL()`, `formatAsMarkdown()`, `formatAsText()` - Export formatters
- RAG categories and constants

### 3. `electron/services/apiServer.cjs` (Updated)

Added 10 new endpoints (401 lines of new code):

**Configuration:**
- `GET /api/chainrunner/configs` - List configurations
- `GET /api/chainrunner/configs/:name` - Get specific config
- `POST /api/chainrunner/configs` - Save config
- `DELETE /api/chainrunner/configs/:name` - Delete config

**Prompts:**
- `GET /api/chainrunner/prompts` - List prompt lists
- `GET /api/chainrunner/prompts/:name` - Get specific list
- `POST /api/chainrunner/prompts` - Save prompt list
- `POST /api/chainrunner/prompts/generate` - Generate with AI

**Execution:**
- `POST /api/chainrunner/run` - Start chain run (async)
- `GET /api/chainrunner/status` - Check run status
- `POST /api/chainrunner/stop` - Stop current run

**Results:**
- `GET /api/chainrunner/sessions` - List all sessions
- `GET /api/chainrunner/sessions/:id` - Get session details
- `GET /api/chainrunner/sessions/:id/export` - Export as RAG training data

### 4. `docs/CHAINRUNNER-API.md` (800+ lines)

Comprehensive API documentation with:
- Endpoint reference with request/response examples
- Complete workflow examples (Bash, Python, Node.js)
- Error handling guidance
- Integration tips
- Storage location information

### 5. `D:\Projects\CLAUDE.md` (Updated)

Added Chain Runner API quick reference with example workflow.

### 6. `.claude/commands/ACC.md` (Updated)

Added Chain Runner endpoints to slash command reference.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ HTTP API (localhost:3939)                           │
│ electron/services/apiServer.cjs                     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Chain Runner Service                                │
│ electron/services/chainRunnerService.cjs            │
│                                                      │
│  - Configuration Management                         │
│  - Prompt Generation (AI-powered)                   │
│  - Chain Execution (multi-agent)                    │
│  - Quality Validation                               │
│  - Session Logging & Export                         │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Helper Functions                                    │
│ electron/services/chainRunnerHelpers.cjs            │
│                                                      │
│  - AI API Calls (Anthropic, OpenAI, Ollama)        │
│  - Output Parsing                                   │
│  - RAG Export Formatting                            │
└─────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ File Storage (%APPDATA%\ai-command-center\)        │
│                                                      │
│  - chain-configs/     (JSON configs)                │
│  - prompt-lists/      (JSON prompt arrays)          │
│  - sessions/          (JSON session logs)           │
│  - rag-outputs/       (JSONL/MD/TXT exports)        │
└─────────────────────────────────────────────────────┘
```

## API Design Decisions

### 1. Asynchronous Execution

`POST /api/chainrunner/run` returns immediately with a run ID, allowing chains to run in the background. Clients poll `/api/chainrunner/status` for progress.

**Why:** Chain runs can take minutes/hours. Synchronous API would timeout.

### 2. Lazy Service Initialization

ChainRunnerService is initialized on first API call, not on server startup.

**Why:** Reduces startup time. Service only needed when Chain Runner endpoints are accessed.

### 3. Single Run at a Time

Only one chain can run at a time. Additional run requests return 409 Conflict.

**Why:** Prevents resource contention and simplifies state management.

### 4. Session Auto-Save

Session logs are saved automatically on completion/abort.

**Why:** Ensures data persistence even if API client disconnects.

### 5. Quality Validation Optional

Quality validation is opt-in via `enableValidator` config flag.

**Why:** Validation doubles execution time. Users choose speed vs quality.

### 6. Export Formats

Three export formats: JSONL (embeddings), Markdown (docs), Plain Text (simple).

**Why:** Different use cases: JSONL for vector DBs, Markdown for documentation, Text for simple review.

## Usage Examples

### Example 1: Generate 10 Prompts

```bash
curl -X POST http://localhost:3939/api/chainrunner/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "topic": "Wireless microphone troubleshooting",
    "count": 10,
    "apiKey": "sk-ant-..."
  }'
```

### Example 2: Run Chain with Quality Validation

```bash
curl -X POST http://localhost:3939/api/chainrunner/run \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "agents": [
        {
          "provider": "anthropic",
          "model": "claude-sonnet-4-20250514",
          "taskSpec": "Generate a question"
        },
        {
          "provider": "anthropic",
          "model": "claude-sonnet-4-20250514",
          "taskSpec": "Answer thoroughly"
        }
      ],
      "enableValidator": true,
      "validatorProvider": "anthropic",
      "validatorModel": "claude-sonnet-4-20250514",
      "qualityThreshold": 0.7
    },
    "prompts": ["Topic 1", "Topic 2", "Topic 3"],
    "apiKeys": {
      "ANTHROPIC_API_KEY": "sk-ant-..."
    }
  }'
```

### Example 3: Monitor and Export

```bash
# Monitor
while true; do
  curl -s http://localhost:3939/api/chainrunner/status | jq
  sleep 2
done

# Export when done
RUN_ID=$(curl -s http://localhost:3939/api/chainrunner/sessions | jq -r '.sessions[0].id')
curl "http://localhost:3939/api/chainrunner/sessions/$RUN_ID/export?format=jsonl&category=troubleshooting"
```

## Integration with Claude Code

Claude Code can now use Chain Runner via `/ACC` slash command:

```
/ACC Generate 10 Q&A pairs about wireless microphone troubleshooting using Chain Runner
```

The command:
1. Checks API health
2. Generates prompts with AI
3. Starts chain run
4. Polls status
5. Exports results
6. Reports file location to user

## Testing

### Manual Testing

```bash
# 1. Start AI Command Center app (API server starts automatically)

# 2. Health check
curl http://localhost:3939/api/health

# 3. Generate prompts
curl -X POST http://localhost:3939/api/chainrunner/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","topic":"Test","count":2,"apiKey":"sk-ant-..."}'

# 4. Run chain
curl -X POST http://localhost:3939/api/chainrunner/run \
  -H "Content-Type: application/json" \
  -d '{"config":{"agents":[{"provider":"anthropic","model":"claude-sonnet-4-20250514","taskSpec":"Test"}]},"prompts":["Test"],"apiKeys":{"ANTHROPIC_API_KEY":"sk-ant-..."}}'

# 5. Check status
curl http://localhost:3939/api/chainrunner/status

# 6. List sessions
curl http://localhost:3939/api/chainrunner/sessions

# 7. Export
curl "http://localhost:3939/api/chainrunner/sessions/RUN_ID/export?format=jsonl"
```

### Error Cases

```bash
# No API key
curl -X POST http://localhost:3939/api/chainrunner/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","topic":"Test","count":2}'
# Returns: {"success":false,"error":"apiKey is required for non-Ollama providers"}

# Chain already running
curl -X POST http://localhost:3939/api/chainrunner/run ...
# Returns: {"success":false,"error":"A chain run is already in progress..."}

# Invalid session ID
curl http://localhost:3939/api/chainrunner/sessions/invalid
# Returns: {"success":false,"error":"Session not found"}
```

## Performance Considerations

### Prompt Generation
- **Time:** ~5-10 seconds per request
- **Cost:** ~$0.01 per 10 prompts (Anthropic Claude Sonnet 4)
- **Optimization:** Uses existing RAG topics to avoid duplicates

### Chain Execution
- **Time:** ~10-30 seconds per iteration (2 agents)
- **Cost:** ~$0.05 per Q&A pair (with validation)
- **Optimization:**
  - Disable typewriter effect for batch runs
  - Use cheaper models for validation
  - Run without validation for speed

### Quality Validation
- **Time:** Adds 5-10 seconds per Q&A pair
- **Cost:** ~$0.01 per validation
- **Optimization:** Increase quality threshold to filter more

## Storage

All data stored in `%APPDATA%\ai-command-center\`:

```
ai-command-center/
├── chain-configs/           # Saved chain configurations
│   └── my_chain_20250101_120000.json
├── prompt-lists/            # Saved prompt lists
│   └── prompts_wireless_20250101_120000.json
├── sessions/                # Session logs
│   └── session_20250101_120000.json
├── rag-outputs/            # Exported RAG training data
│   └── troubleshooting_20250101_120000.jsonl
```

**Windows:** `C:\Users\<username>\AppData\Roaming\ai-command-center\`

## Security

- **Localhost Only:** API only accepts connections from 127.0.0.1
- **Optional API Key:** Set `API_SERVER_KEY` in `.env` to require authentication
- **API Keys in Transit:** Client must provide API keys in request body (not stored)
- **No CORS:** Restricted to localhost origin

## Future Enhancements

Potential improvements:
1. **Streaming Status:** WebSocket for real-time progress updates
2. **Batch Export:** Export multiple sessions at once
3. **Config Templates:** Pre-built configs for common use cases
4. **Metrics Dashboard:** API endpoint for execution statistics
5. **Auto-Retry:** Retry failed API calls with exponential backoff
6. **Prompt Versioning:** Track changes to prompt lists over time
7. **Multi-Run Support:** Queue multiple chains

## Troubleshooting

### API Not Responding

```bash
# Check if app is running
curl http://localhost:3939/api/health

# If not, start AI Command Center app
# API server starts automatically on app launch
```

### Chain Stuck in "running" State

```bash
# Stop the chain
curl -X POST http://localhost:3939/api/chainrunner/stop

# Check status
curl http://localhost:3939/api/chainrunner/status
```

### Session Not Found

```bash
# List all sessions
curl http://localhost:3939/api/chainrunner/sessions

# Use exact ID from list
curl http://localhost:3939/api/chainrunner/sessions/run_1735732800000_abc123def
```

### Export Failed

Check logs in `%APPDATA%\ai-command-center\logs\combined-YYYY-MM-DD.log`

## Documentation Links

- **Full API Docs:** `D:\Projects\ai-command-center\docs\CHAINRUNNER-API.md`
- **Project Guide:** `D:\Projects\CLAUDE.md`
- **App Architecture:** `D:\Projects\ai-command-center\CLAUDE.md`
- **Slash Command:** `.claude\commands\ACC.md`

## Implementation Stats

- **Total Lines:** ~1,544 lines of new code
- **API Endpoints:** 13 endpoints
- **Services:** 2 new service files
- **Documentation:** 800+ lines
- **Time Estimate:** 4-6 hours of development
- **Testing:** Manual testing completed

## Summary

The Chain Runner API provides complete programmatic control over multi-agent AI chains for RAG training data generation. Claude Code (or any HTTP client) can now:

1. Generate prompts with AI
2. Configure and run multi-agent chains
3. Monitor execution in real-time
4. Export results in multiple formats
5. Manage configurations and sessions

All operations are performed via REST API at `http://localhost:3939`, with comprehensive error handling and logging.
