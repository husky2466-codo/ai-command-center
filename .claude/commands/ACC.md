---
description: Use AI Command Center API to manage projects, tasks, reminders, knowledge
argument-hint: <Context of task to perform in AI command center>
---

Interact with the AI Command Center application via its local API at http://localhost:3939.

User Request: $ARGUMENTS

## Instructions

1. First, check if the API server is running:
```bash
curl http://localhost:3939/api/health
```

2. Based on the user's request, determine which API endpoint(s) to use:

### Available Endpoints

**System**
- `GET /api/health` - Health check
- `GET /api/status` - App status with counts

**Projects**
- `GET /api/projects` - List projects (filter: `status`, `space_id`, `limit`)
- `GET /api/projects/:id` - Get project with tasks
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

**Tasks**
- `GET /api/tasks` - List tasks (filter: `project_id`, `status`, `energy_type`, `limit`)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Reminders**
- `GET /api/reminders` - List reminders (filter: `status`, `limit`)
- `POST /api/reminders` - Create reminder
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

**Knowledge**
- `GET /api/knowledge/folders` - List folders
- `GET /api/knowledge/articles` - List articles
- `POST /api/knowledge/articles` - Create article
- `PUT /api/knowledge/articles/:id` - Update article
- `POST /api/knowledge/search` - Search articles (body: `{"query": "...", "limit": 20}`)

**Contacts**
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact

**Memories**
- `GET /api/memories` - List memories (filter: `type`, `limit`)
- `POST /api/memories` - Create memory/decision log

**Calendar & Email** (requires Google account)
- `GET /api/calendar/events` - List meetings
- `GET /api/emails` - List emails

**Chain Runner** (RAG training data generation)
- `GET /api/chainrunner/configs` - List saved configurations
- `POST /api/chainrunner/configs` - Save a configuration
- `GET /api/chainrunner/prompts` - List saved prompt lists
- `POST /api/chainrunner/prompts/generate` - Generate prompts with AI
- `POST /api/chainrunner/run` - Start a chain run
- `GET /api/chainrunner/status` - Get current run status
- `POST /api/chainrunner/stop` - Stop current run
- `GET /api/chainrunner/sessions` - List sessions
- `GET /api/chainrunner/sessions/:id/export` - Export as RAG training data

### Energy Types (for tasks)
`low`, `medium`, `deep_work`, `creative`, `quick_win`, `execution`, `people_work`

### Project Statuses
`active_focus`, `on_deck`, `growing`, `on_hold`, `completed`

### Task Statuses
`pending`, `in_progress`, `completed`, `blocked`

### Memory Types
`correction`, `decision`, `commitment`, `insight`, `learning`, `confidence`, `pattern_seed`, `cross_agent`, `workflow_note`, `gap`

## Response Format

All API responses follow this format:
```json
// Success
{"success": true, "data": {...}}

// Error
{"success": false, "error": "Error message"}
```

## Execution

3. Execute the appropriate curl command(s) to fulfill the user's request
4. Parse the JSON response and present results clearly to the user
5. If creating/updating items, confirm the action was successful
6. If the API is not running, inform the user to start the AI Command Center app

## Examples

- "Show my active projects" → GET /api/projects?status=active_focus
- "Create a task to review code" → POST /api/tasks with title "Review code"
- "Set a reminder for tomorrow" → POST /api/reminders with due_at
- "Search knowledge for React" → POST /api/knowledge/search with query "React"
- "Log a decision about architecture" → POST /api/memories with type "decision"
