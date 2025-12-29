---
description: Pipe data to n8n webhook for workflow execution
argument-hint: <webhook-path> <message/data>
---

Send data to an n8n webhook to trigger workflow execution.

**Usage:**
- `/n8n-pipe ai-coding-job Create a Python function that validates emails`
- `/n8n-pipe claude-pipe {"task": "analyze this", "data": "some data"}`

**Arguments:** $ARGUMENTS

Parse the arguments:
1. First word = webhook path (e.g., `ai-coding-job`, `claude-pipe`)
2. Rest = message/data to send

Use curl or PowerShell to POST to: `http://localhost:5678/webhook/<webhook-path>`

**Request format:**
```json
{
  "message": "<the message/data>",
  "source": "claude-cli",
  "timestamp": "<current ISO timestamp>",
  "cwd": "<current working directory>"
}
```

If the data looks like JSON (starts with `{`), send it as-is in a `data` field instead of `message`.

Execute the POST request and return the n8n workflow response to the user.

**Error handling:**
- If webhook returns 404: "Webhook not found. Make sure the workflow is active or listening for test events."
- If connection refused: "n8n is not running. Start it with /n8n start"
