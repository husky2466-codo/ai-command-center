# API Quick Start Guide

Get started with the AI Command Center HTTP API in 5 minutes.

## Prerequisites

1. AI Command Center app is running
2. API server is enabled (starts automatically)
3. Default port: `http://localhost:3939`

## Quick Test

```bash
# Health check
curl http://localhost:3939/api/health

# App status
curl http://localhost:3939/api/status
```

## Common Tasks

### Projects

**List all projects:**
```bash
curl http://localhost:3939/api/projects
```

**Create a project:**
```bash
curl -X POST http://localhost:3939/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My New Project",
    "description": "Project description",
    "status": "active_focus"
  }'
```

**Update project progress:**
```bash
curl -X PUT http://localhost:3939/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -d '{"progress": 0.75}'
```

### Tasks

**Create a task:**
```bash
curl -X POST http://localhost:3939/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PROJECT_ID",
    "title": "Implement feature X",
    "energy_type": "deep_work",
    "status": "pending"
  }'
```

**Complete a task:**
```bash
curl -X PUT http://localhost:3939/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

**List tasks for a project:**
```bash
curl "http://localhost:3939/api/tasks?project_id=PROJECT_ID"
```

### Reminders

**Create a reminder:**
```bash
curl -X POST http://localhost:3939/api/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Call John",
    "due_at": "2025-12-30T14:00:00.000Z"
  }'
```

**List active reminders:**
```bash
curl http://localhost:3939/api/reminders
```

### Knowledge Base

**Search knowledge base:**
```bash
curl -X POST http://localhost:3939/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "API documentation", "limit": 5}'
```

**Get an article:**
```bash
curl http://localhost:3939/api/knowledge/articles/ARTICLE_ID
```

## Using with Claude Code

When Claude Code is running in the AI Command Center terminal, you can control the app directly:

```bash
# From Claude Code terminal
curl http://localhost:3939/api/projects

# Create task
curl -X POST http://localhost:3939/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Task from Claude Code",
    "energy_type": "quick_win"
  }'
```

## Pretty Printing with jq

Install `jq` for formatted JSON output:

```bash
curl http://localhost:3939/api/projects | jq

# Filter specific fields
curl http://localhost:3939/api/projects | jq '.data[] | {name, status, progress}'
```

## Authentication

If you set `API_SERVER_KEY` in your `.env` file:

```bash
curl -H "X-API-Key: your-secret-key" \
     http://localhost:3939/api/health
```

## Error Handling

All errors return JSON:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request (missing fields)
- `401` - Unauthorized (invalid API key)
- `404` - Not found
- `500` - Server error

## Tips

1. **Use variables for IDs:**
   ```bash
   PROJECT_ID="abc-123"
   curl http://localhost:3939/api/projects/$PROJECT_ID
   ```

2. **Save responses:**
   ```bash
   curl http://localhost:3939/api/projects > projects.json
   ```

3. **Test in dev console:**
   ```javascript
   fetch('http://localhost:3939/api/health')
     .then(r => r.json())
     .then(console.log)
   ```

## Full Documentation

See [API-SERVER.md](./API-SERVER.md) for complete endpoint reference.

## Running Tests

```bash
npm run test:api
```

This runs the comprehensive test suite that creates, updates, and deletes test data.
