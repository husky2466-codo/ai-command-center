# Chain Runner API Documentation

Complete API reference for controlling Chain Runner programmatically via HTTP.

## Base URL

```
http://localhost:3939
```

All endpoints are localhost-only for security.

## Authentication

If `API_SERVER_KEY` is set in `.env`, include it in requests:

```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3939/api/chainrunner/status
```

---

## Configuration Management

### List All Configurations

Get all saved chain configurations.

**Endpoint:** `GET /api/chainrunner/configs`

**Response:**
```json
{
  "success": true,
  "configs": [
    {
      "filename": "my_chain_20250101_120000.json",
      "name": "My Chain",
      "createdAt": "2025-01-01T12:00:00.000Z",
      "agents": [...],
      "iterations": 1,
      "runMode": "once"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3939/api/chainrunner/configs
```

---

### Get Specific Configuration

Retrieve a configuration by name (partial match supported).

**Endpoint:** `GET /api/chainrunner/configs/:name`

**Parameters:**
- `name` (path) - Configuration name or partial name

**Response:**
```json
{
  "success": true,
  "config": {
    "name": "My Chain",
    "createdAt": "2025-01-01T12:00:00.000Z",
    "agents": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "taskSpec": "Generate a detailed question about..."
      }
    ]
  },
  "filename": "my_chain_20250101_120000.json"
}
```

**Example:**
```bash
curl http://localhost:3939/api/chainrunner/configs/my_chain
```

---

### Save Configuration

Save a new chain configuration.

**Endpoint:** `POST /api/chainrunner/configs`

**Body:**
```json
{
  "name": "RAG Generator",
  "config": {
    "agents": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "taskSpec": "Generate a detailed question about the given topic."
      },
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "taskSpec": "Answer the question thoroughly and accurately."
      }
    ],
    "iterations": 1,
    "runMode": "once",
    "enableValidator": true,
    "validatorProvider": "anthropic",
    "validatorModel": "claude-sonnet-4-20250514",
    "qualityThreshold": 0.7
  }
}
```

**Response:**
```json
{
  "success": true,
  "filename": "rag_generator_20250101_120000.json"
}
```

**Example:**
```bash
curl -X POST http://localhost:3939/api/chainrunner/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RAG Generator",
    "config": {
      "agents": [
        {
          "provider": "anthropic",
          "model": "claude-sonnet-4-20250514",
          "taskSpec": "Generate a question"
        }
      ]
    }
  }'
```

---

### Delete Configuration

Delete a saved configuration.

**Endpoint:** `DELETE /api/chainrunner/configs/:name`

**Parameters:**
- `name` (path) - Configuration name or partial name

**Response:**
```json
{
  "success": true,
  "deleted": "my_chain_20250101_120000.json"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3939/api/chainrunner/configs/my_chain
```

---

## Prompt List Management

### List Prompt Lists

Get all saved prompt lists.

**Endpoint:** `GET /api/chainrunner/prompts`

**Response:**
```json
{
  "success": true,
  "lists": [
    {
      "filename": "prompts_wireless_mics_20250101_120000.json",
      "topic": "Wireless microphone troubleshooting",
      "timestamp": "2025-01-01T12:00:00.000Z",
      "count": 10,
      "prompts": ["...", "..."]
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3939/api/chainrunner/prompts
```

---

### Get Specific Prompt List

Retrieve a prompt list by name.

**Endpoint:** `GET /api/chainrunner/prompts/:name`

**Parameters:**
- `name` (path) - Topic name or partial name

**Response:**
```json
{
  "success": true,
  "data": {
    "topic": "Wireless microphone troubleshooting",
    "timestamp": "2025-01-01T12:00:00.000Z",
    "count": 10,
    "prompts": [
      "How do you troubleshoot wireless microphone interference?",
      "What causes dropouts in wireless mic signals?"
    ]
  },
  "filename": "prompts_wireless_mics_20250101_120000.json"
}
```

**Example:**
```bash
curl http://localhost:3939/api/chainrunner/prompts/wireless_mics
```

---

### Save Prompt List

Save a list of prompts for later use.

**Endpoint:** `POST /api/chainrunner/prompts`

**Body:**
```json
{
  "topic": "Wireless microphone troubleshooting",
  "prompts": [
    "How do you troubleshoot wireless microphone interference?",
    "What causes dropouts in wireless mic signals?"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "filename": "prompts_wireless_microphone_troubleshooting_20250101_120000.json",
  "count": 2
}
```

**Example:**
```bash
curl -X POST http://localhost:3939/api/chainrunner/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Wireless mic troubleshooting",
    "prompts": ["Question 1", "Question 2"]
  }'
```

---

### Generate Prompts with AI

Use AI to generate a batch of prompts on a topic.

**Endpoint:** `POST /api/chainrunner/prompts/generate`

**Body:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "topic": "Wireless microphone troubleshooting",
  "count": 10,
  "category": "troubleshooting",
  "apiKey": "sk-ant-..."
}
```

**Parameters:**
- `provider` - AI provider: `anthropic`, `openai`, `ollama`
- `model` - Model name (optional, defaults per provider)
- `topic` - Topic for prompt generation
- `count` - Number of prompts (1-100)
- `category` - Category: `general`, `equipment_guides`, `event_types`, `venue_considerations`, `common_mistakes`, `troubleshooting`
- `apiKey` - API key (not required for Ollama)
- `ollamaUrl` - Ollama URL (optional, default: `http://localhost:11434`)

**Response:**
```json
{
  "success": true,
  "prompts": [
    "How do you troubleshoot wireless microphone interference?",
    "What causes dropouts in wireless mic signals?",
    "..."
  ],
  "count": 10
}
```

**Example:**
```bash
curl -X POST http://localhost:3939/api/chainrunner/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "topic": "Wireless microphone troubleshooting",
    "count": 10,
    "category": "troubleshooting",
    "apiKey": "sk-ant-..."
  }'
```

---

## Chain Execution

### Run Chain

Start a chain run with the given configuration and prompts.

**Endpoint:** `POST /api/chainrunner/run`

**Body:**
```json
{
  "config": {
    "agents": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "taskSpec": "Generate a detailed question about the given topic."
      },
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "taskSpec": "Answer the question thoroughly."
      }
    ],
    "iterations": 1,
    "runMode": "once",
    "enableTypewriter": false,
    "enableValidator": true,
    "validatorProvider": "anthropic",
    "validatorModel": "claude-sonnet-4-20250514",
    "qualityThreshold": 0.7
  },
  "prompts": [
    "Wireless microphone interference",
    "Audio feedback prevention"
  ],
  "apiKeys": {
    "ANTHROPIC_API_KEY": "sk-ant-...",
    "OPENAI_API_KEY": "sk-...",
    "HF_TOKEN": "hf_..."
  }
}
```

**Config Fields:**
- `agents` (required) - Array of agent configurations
  - `provider` - `anthropic`, `openai`, `huggingface`, `ollama`
  - `model` - Model identifier
  - `taskSpec` - System prompt/task specification
- `iterations` - Number of times to run (default: 1)
- `runMode` - `once`, `sessions`, `continuous`
- `enableTypewriter` - Enable typewriter effect (default: false)
- `enableValidator` - Enable quality validation (default: false)
- `validatorProvider` - Provider for validation
- `validatorModel` - Model for validation
- `qualityThreshold` - Quality score threshold 0-1 (default: 0.7)

**Response:**
```json
{
  "success": true,
  "message": "Chain run started",
  "runId": "run_1735732800000_abc123def",
  "status": "running"
}
```

**Note:** The run executes asynchronously. Use `/api/chainrunner/status` to check progress.

**Example:**
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
        }
      ]
    },
    "prompts": ["Topic 1"],
    "apiKeys": {
      "ANTHROPIC_API_KEY": "sk-ant-..."
    }
  }'
```

---

### Get Run Status

Check the status of the current or most recent chain run.

**Endpoint:** `GET /api/chainrunner/status`

**Response (Idle):**
```json
{
  "success": true,
  "status": "idle",
  "message": "No active chain run"
}
```

**Response (Running):**
```json
{
  "success": true,
  "status": "running",
  "runId": "run_1735732800000_abc123def",
  "currentIteration": 3,
  "totalIterations": 10,
  "outputCount": 6,
  "errorCount": 0,
  "startTime": "2025-01-01T12:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3939/api/chainrunner/status
```

**Polling Example:**
```bash
# Poll every 2 seconds until completed
while true; do
  STATUS=$(curl -s http://localhost:3939/api/chainrunner/status | jq -r '.status')
  echo "Status: $STATUS"
  if [ "$STATUS" != "running" ]; then
    break
  fi
  sleep 2
done
```

---

### Stop Chain

Stop the currently running chain.

**Endpoint:** `POST /api/chainrunner/stop`

**Response:**
```json
{
  "success": true,
  "message": "Chain run will stop after current agent completes"
}
```

**Error (No Active Run):**
```json
{
  "success": false,
  "error": "No active chain run to stop"
}
```

**Example:**
```bash
curl -X POST http://localhost:3939/api/chainrunner/stop
```

---

## Session Management

### List Sessions

Get all completed chain run sessions.

**Endpoint:** `GET /api/chainrunner/sessions`

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "filename": "session_20250101_120000.json",
      "id": "run_1735732800000_abc123def",
      "startTime": "2025-01-01T12:00:00.000Z",
      "endTime": "2025-01-01T12:05:30.000Z",
      "status": "completed",
      "outputCount": 20,
      "errorCount": 0
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3939/api/chainrunner/sessions
```

---

### Get Session Details

Retrieve full details of a specific session.

**Endpoint:** `GET /api/chainrunner/sessions/:id`

**Parameters:**
- `id` (path) - Run ID or partial ID

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "run_1735732800000_abc123def",
    "startTime": "2025-01-01T12:00:00.000Z",
    "endTime": "2025-01-01T12:05:30.000Z",
    "status": "completed",
    "agents": [...],
    "prompts": [...],
    "iterations": 10,
    "outputs": [
      {
        "iteration": 1,
        "promptIndex": 0,
        "promptText": "Wireless microphone interference",
        "agentIndex": 0,
        "input": "Wireless microphone interference",
        "output": "How do you troubleshoot wireless microphone interference?",
        "timestamp": "2025-01-01T12:00:05.000Z"
      },
      {
        "iteration": 1,
        "promptIndex": 0,
        "promptText": "Wireless microphone interference",
        "agentIndex": 1,
        "input": "How do you troubleshoot wireless microphone interference?",
        "output": "To troubleshoot wireless microphone interference...",
        "timestamp": "2025-01-01T12:00:15.000Z",
        "qualityScore": {
          "correctness": 0.9,
          "completeness": 0.85,
          "clarity": 0.95,
          "relevance": 1.0,
          "overall": 0.925
        }
      }
    ],
    "errors": []
  }
}
```

**Example:**
```bash
curl http://localhost:3939/api/chainrunner/sessions/run_1735732800000_abc123def
```

---

### Export Session as RAG Training Data

Export a session's outputs as formatted RAG training data.

**Endpoint:** `GET /api/chainrunner/sessions/:id/export`

**Parameters:**
- `id` (path) - Run ID or partial ID
- `format` (query) - Export format: `jsonl`, `markdown`, `txt` (default: `jsonl`)
- `category` (query) - Category label (default: `general`)
- `tags` (query) - Comma-separated tags (e.g., `troubleshooting,wireless`)

**Response:**
```json
{
  "success": true,
  "filePath": "C:\\Users\\username\\AppData\\Roaming\\ai-command-center\\rag-outputs\\troubleshooting_20250101_120530.jsonl",
  "filename": "troubleshooting_20250101_120530.jsonl",
  "pairCount": 10
}
```

**Example:**
```bash
# Export as JSONL
curl "http://localhost:3939/api/chainrunner/sessions/run_1735732800000_abc123def/export?format=jsonl&category=troubleshooting&tags=wireless,audio"

# Export as Markdown
curl "http://localhost:3939/api/chainrunner/sessions/run_1735732800000_abc123def/export?format=markdown&category=equipment_guides"
```

**JSONL Format:**
```jsonl
{"id":"uuid","category":"troubleshooting","context":"","question":"How do you troubleshoot...","answer":"To troubleshoot...","source":"chain-runner-api","timestamp":"2025-01-01T12:00:15.000Z","tags":["wireless","audio"],"quality_score":0.925,"quality_details":{"correctness":0.9,"completeness":0.85,"clarity":0.95,"relevance":1.0,"overall":0.925}}
```

**Markdown Format:**
```markdown
# RAG Training Document
Generated: 2025-01-01
Category: troubleshooting
Tags: wireless, audio

---

## Example 1

**Question:** How do you troubleshoot wireless microphone interference?

**Answer:** To troubleshoot wireless microphone interference...

**Quality Score:** 93%
- Correctness: 90%
- Completeness: 85%
- Clarity: 95%
- Relevance: 100%

**Tags:** wireless, audio

---
```

---

## Complete Workflow Example

### 1. Generate Prompts with AI

```bash
curl -X POST http://localhost:3939/api/chainrunner/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "topic": "Wireless microphone troubleshooting",
    "count": 5,
    "category": "troubleshooting",
    "apiKey": "sk-ant-..."
  }' | jq -r '.prompts[]' > prompts.txt
```

### 2. Run Chain with Generated Prompts

```bash
PROMPTS=$(cat prompts.txt | jq -R . | jq -s .)

curl -X POST http://localhost:3939/api/chainrunner/run \
  -H "Content-Type: application/json" \
  -d "{
    \"config\": {
      \"agents\": [
        {
          \"provider\": \"anthropic\",
          \"model\": \"claude-sonnet-4-20250514\",
          \"taskSpec\": \"Generate a detailed question about the given topic.\"
        },
        {
          \"provider\": \"anthropic\",
          \"model\": \"claude-sonnet-4-20250514\",
          \"taskSpec\": \"Answer the question thoroughly and accurately.\"
        }
      ],
      \"enableValidator\": true,
      \"validatorProvider\": \"anthropic\",
      \"validatorModel\": \"claude-sonnet-4-20250514\",
      \"qualityThreshold\": 0.7
    },
    \"prompts\": $PROMPTS,
    \"apiKeys\": {
      \"ANTHROPIC_API_KEY\": \"sk-ant-...\"
    }
  }"
```

### 3. Monitor Progress

```bash
watch -n 2 'curl -s http://localhost:3939/api/chainrunner/status | jq'
```

### 4. Export Results

```bash
RUN_ID=$(curl -s http://localhost:3939/api/chainrunner/sessions | jq -r '.sessions[0].id')

curl "http://localhost:3939/api/chainrunner/sessions/$RUN_ID/export?format=jsonl&category=troubleshooting&tags=wireless,audio"
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found (config/session not found)
- `409` - Conflict (chain already running)
- `500` - Internal Server Error

---

## Integration Tips

### From Bash/Terminal

```bash
# Set API key as environment variable
export ANTHROPIC_API_KEY="sk-ant-..."

# Run chain with inline config
curl -X POST http://localhost:3939/api/chainrunner/run \
  -H "Content-Type: application/json" \
  -d "{
    \"config\": $(cat config.json),
    \"prompts\": $(cat prompts.json),
    \"apiKeys\": {
      \"ANTHROPIC_API_KEY\": \"$ANTHROPIC_API_KEY\"
    }
  }"
```

### From Python

```python
import requests
import json
import time

API_BASE = "http://localhost:3939"

# Generate prompts
response = requests.post(f"{API_BASE}/api/chainrunner/prompts/generate", json={
    "provider": "anthropic",
    "topic": "Wireless microphone troubleshooting",
    "count": 5,
    "apiKey": "sk-ant-..."
})
prompts = response.json()["prompts"]

# Start chain run
response = requests.post(f"{API_BASE}/api/chainrunner/run", json={
    "config": {
        "agents": [
            {
                "provider": "anthropic",
                "model": "claude-sonnet-4-20250514",
                "taskSpec": "Generate a question"
            }
        ]
    },
    "prompts": prompts,
    "apiKeys": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
    }
})
run_id = response.json()["runId"]

# Poll status
while True:
    status = requests.get(f"{API_BASE}/api/chainrunner/status").json()
    print(f"Status: {status['status']}")
    if status["status"] != "running":
        break
    time.sleep(2)

# Export results
response = requests.get(
    f"{API_BASE}/api/chainrunner/sessions/{run_id}/export",
    params={"format": "jsonl", "category": "troubleshooting"}
)
print(f"Exported to: {response.json()['filename']}")
```

### From Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3939';

async function runChain() {
  // Generate prompts
  const { data: promptData } = await axios.post(`${API_BASE}/api/chainrunner/prompts/generate`, {
    provider: 'anthropic',
    topic: 'Wireless microphone troubleshooting',
    count: 5,
    apiKey: 'sk-ant-...'
  });

  // Start chain run
  const { data: runData } = await axios.post(`${API_BASE}/api/chainrunner/run`, {
    config: {
      agents: [{
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        taskSpec: 'Generate a question'
      }]
    },
    prompts: promptData.prompts,
    apiKeys: {
      ANTHROPIC_API_KEY: 'sk-ant-...'
    }
  });

  console.log(`Run started: ${runData.runId}`);

  // Poll status
  while (true) {
    const { data: status } = await axios.get(`${API_BASE}/api/chainrunner/status`);
    console.log(`Status: ${status.status}`);
    if (status.status !== 'running') break;
    await new Promise(r => setTimeout(r, 2000));
  }

  // Export results
  const { data: exportData } = await axios.get(
    `${API_BASE}/api/chainrunner/sessions/${runData.runId}/export`,
    { params: { format: 'jsonl', category: 'troubleshooting' } }
  );

  console.log(`Exported to: ${exportData.filename}`);
}

runChain();
```

---

## Storage Locations

All Chain Runner data is stored in `%APPDATA%\ai-command-center\`:

- `chain-configs/` - Saved configurations
- `prompt-lists/` - Saved prompt lists
- `sessions/` - Session logs (JSON)
- `rag-outputs/` - Exported RAG training data

**Windows:** `C:\Users\<username>\AppData\Roaming\ai-command-center\`
**macOS:** `~/Library/Application Support/ai-command-center/`
**Linux:** `~/.config/ai-command-center/`
