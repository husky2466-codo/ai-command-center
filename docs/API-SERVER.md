# HTTP API Server Documentation

The AI Command Center includes a local HTTP API server that allows external tools (like Claude Code running in the terminal) to control the app programmatically.

## Configuration

The API server is configured via environment variables in your `.env` file:

```env
API_SERVER_PORT=3939  # Default port
API_SERVER_KEY=your-secret-key  # Optional API key for authentication
```

### Security

- **Localhost only**: The server only accepts connections from `127.0.0.1`
- **Optional authentication**: Set `API_SERVER_KEY` to require an API key header
- **Auto-start**: Server starts automatically when the app launches
- **All requests logged**: Every API call is logged to the console

## Authentication

If you set `API_SERVER_KEY` in your `.env` file, all requests must include the API key header:

```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3939/api/health
```

If `API_SERVER_KEY` is not set, authentication is disabled.

## API Endpoints

### System

#### Health Check
```bash
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-29T10:30:00.000Z",
    "version": "2.0.0"
  }
}
```

#### App Status
```bash
GET /api/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "connected",
    "projects": 5,
    "tasks": 12,
    "activeReminders": 3,
    "contacts": 8,
    "knowledgeArticles": 24,
    "timestamp": "2025-12-29T10:30:00.000Z"
  }
}
```

---

### Projects

#### List Projects
```bash
GET /api/projects?status=active_focus&limit=100
```

**Query Parameters:**
- `status` (optional): Filter by status (`active_focus`, `on_deck`, `growing`, `on_hold`, `completed`)
- `space_id` (optional): Filter by space ID
- `limit` (optional): Max results (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "space_id": "uuid",
      "name": "Build API Server",
      "description": "Add HTTP API to AI Command Center",
      "status": "active_focus",
      "progress": 0.75,
      "deadline": "2025-12-31",
      "planning_notes": "...",
      "created_at": "2025-12-29T10:00:00.000Z",
      "updated_at": "2025-12-29T10:30:00.000Z"
    }
  ]
}
```

#### Get Project
```bash
GET /api/projects/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Build API Server",
    "description": "...",
    "status": "active_focus",
    "tasks": [
      {
        "id": "uuid",
        "title": "Create Express server",
        "status": "completed"
      }
    ]
  }
}
```

#### Create Project
```bash
POST /api/projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "space_id": "uuid",
  "status": "on_deck",
  "deadline": "2025-12-31",
  "planning_notes": "Initial notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Project",
    "status": "on_deck",
    ...
  }
}
```

#### Update Project
```bash
PUT /api/projects/:id
Content-Type: application/json

{
  "status": "active_focus",
  "progress": 0.5
}
```

**Allowed Fields:**
- `name`, `description`, `status`, `progress`, `deadline`, `planning_notes`, `space_id`

#### Delete Project
```bash
DELETE /api/projects/:id
```

---

### Tasks

#### List Tasks
```bash
GET /api/tasks?project_id=uuid&status=pending&limit=100
```

**Query Parameters:**
- `project_id` (optional): Filter by project
- `status` (optional): Filter by status (`pending`, `in_progress`, `completed`, `blocked`)
- `energy_type` (optional): Filter by energy type
- `limit` (optional): Max results (default: 100)

#### Create Task
```bash
POST /api/tasks
Content-Type: application/json

{
  "project_id": "uuid",
  "title": "Implement feature X",
  "description": "Detailed description",
  "energy_type": "deep_work",
  "status": "pending",
  "due_date": "2025-12-30T18:00:00.000Z",
  "sort_order": 0
}
```

**Energy Types:**
- `low`, `medium`, `deep_work`, `creative`, `quick_win`, `execution`, `people_work`

#### Update Task
```bash
PUT /api/tasks/:id
Content-Type: application/json

{
  "status": "completed"
}
```

**Note:** Setting `status` to `completed` automatically sets `completed_at` timestamp.

---

### Reminders

#### List Reminders
```bash
GET /api/reminders?status=pending&limit=100
```

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `completed`, `snoozed`)
- `limit` (optional): Max results (default: 100)

**Note:** By default, only non-completed reminders are returned.

#### Create Reminder
```bash
POST /api/reminders
Content-Type: application/json

{
  "title": "Call John",
  "description": "Discuss project timeline",
  "due_at": "2025-12-30T14:00:00.000Z",
  "is_recurring": 0,
  "source_type": "manual",
  "url": "https://example.com"
}
```

#### Update Reminder
```bash
PUT /api/reminders/:id
Content-Type: application/json

{
  "status": "completed"
}
```

---

### Knowledge

#### List Folders
```bash
GET /api/knowledge/folders
```

#### List Articles
```bash
GET /api/knowledge/articles?folder_id=uuid&limit=100
```

**Note:** Article content is excluded from list view. Use get single article for full content.

#### Get Article
```bash
GET /api/knowledge/articles/:id
```

**Response includes full content:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "folder_id": "uuid",
    "title": "How to use API",
    "content": "Full markdown content...",
    "source_url": "https://docs.example.com",
    "tags": "api,docs,tutorial",
    "is_spark": 0,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### Search Articles
```bash
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "API authentication",
  "limit": 20
}
```

**Note:** Searches in title, content, and tags fields.

---

### Contacts

#### List Contacts
```bash
GET /api/contacts?limit=100
```

#### Get Contact
```bash
GET /api/contacts/:id
```

**Note:** Can use `id` or `slug` in URL.

**Response includes recent interactions:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "john-doe",
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "title": "CTO",
    "priority": "high",
    "interactions": [
      {
        "id": "uuid",
        "type": "email",
        "summary": "Discussed API integration",
        "occurred_at": "2025-12-28T10:00:00.000Z"
      }
    ]
  }
}
```

#### Create Contact
```bash
POST /api/contacts
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "company": "Tech Co",
  "title": "CEO",
  "location": "San Francisco",
  "priority": "high",
  "context": "Met at conference",
  "notes": "Interested in collaboration"
}
```

---

### Spaces

#### List Spaces
```bash
GET /api/spaces
```

#### Create Space
```bash
POST /api/spaces
Content-Type: application/json

{
  "name": "Work",
  "description": "Professional projects",
  "color": "#8b5cf6",
  "icon": "briefcase",
  "sort_order": 0
}
```

---

### Memories

#### List Memories
```bash
GET /api/memories?type=decision&limit=100
```

**Memory Types:**
- `correction`, `decision`, `commitment`, `insight`, `learning`, `confidence`
- `pattern_seed`, `cross_agent`, `workflow_note`, `gap`

#### Create Memory
```bash
POST /api/memories
Content-Type: application/json

{
  "type": "decision",
  "category": "architecture",
  "title": "Chose Express for API server",
  "content": "Decided to use Express.js because...",
  "source_chunk": "Original conversation text",
  "related_entities": "api-server,express",
  "target_agents": "electron-react-dev",
  "confidence_score": 0.95,
  "reasoning": "Well-documented choice",
  "evidence": "Used in similar projects successfully"
}
```

---

### Calendar

**Note:** These endpoints require Google account connection.

#### Get Calendar Events
```bash
GET /api/calendar/events?limit=20
```

Returns upcoming meetings from the database. Full Google Calendar sync requires account setup.

#### Create Calendar Event
```bash
POST /api/calendar/events
```

**Status:** Not yet implemented (501). Requires Google account connection.

---

### Email

**Note:** All email endpoints require a connected Google account with Gmail sync enabled.

#### List Emails
```bash
GET /api/emails?account_id=<uuid>&folder=inbox&limit=50&unread_only=true&offset=0
```

**Query Parameters:**
- `account_id` (required): Connected Google account ID
- `folder` (optional): `inbox`, `sent`, `starred`, `trash`, `drafts`, `spam`, `important` (default: `inbox`)
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `unread_only` (optional): Filter to unread only (default: false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "email-id",
      "thread_id": "thread-id",
      "subject": "Meeting tomorrow",
      "snippet": "Just wanted to confirm...",
      "from_email": "sender@example.com",
      "from_name": "John Doe",
      "to_emails": "you@example.com",
      "date": 1703865600000,
      "is_read": 0,
      "is_starred": 0,
      "has_attachments": 0,
      "labels": "INBOX,UNREAD"
    }
  ]
}
```

#### Get Single Email
```bash
GET /api/emails/:id?account_id=<uuid>
```

**Query Parameters:**
- `account_id` (required): Connected Google account ID

**Response includes full body:**
```json
{
  "success": true,
  "data": {
    "id": "email-id",
    "thread_id": "thread-id",
    "subject": "Meeting tomorrow",
    "from_email": "sender@example.com",
    "from_name": "John Doe",
    "to_emails": "you@example.com",
    "body_text": "Full plain text body...",
    "body_html": "<html>Full HTML body...</html>",
    "date": 1703865600000,
    "is_read": 0,
    "is_starred": 0,
    "raw_data": { ... }
  }
}
```

#### Send Email
```bash
POST /api/emails/send
Content-Type: application/json

{
  "account_id": "uuid",
  "to": "recipient@example.com",
  "cc": "cc@example.com",
  "bcc": "bcc@example.com",
  "subject": "Hello from API",
  "body": "Plain text email body"
}
```

**Required Fields:**
- `account_id`: Connected Google account ID
- `to`: Recipient email address
- `subject`: Email subject
- `body` or `html`: Email content (at least one required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sent-email-id",
    "threadId": "thread-id"
  }
}
```

#### Search Emails
```bash
POST /api/emails/search
Content-Type: application/json

{
  "account_id": "uuid",
  "query": "meeting",
  "limit": 20
}
```

**Note:** Searches in subject, sender, and body text. For Gmail-style operators (from:, has:attachment, after:), first sync emails then use local search.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "email-id",
      "subject": "Meeting notes",
      "from_email": "sender@example.com",
      "snippet": "Here are the notes from...",
      "date": 1703865600000
    }
  ]
}
```

#### Batch Operations
```bash
POST /api/emails/batch
Content-Type: application/json

{
  "account_id": "uuid",
  "email_ids": ["id1", "id2", "id3"],
  "action": "mark_read"
}
```

**Actions:**
- `mark_read` - Mark emails as read
- `mark_unread` - Mark emails as unread
- `star` - Add star to emails
- `unstar` - Remove star from emails
- `trash` - Move emails to trash
- `delete` - Permanently delete emails

**Response:**
```json
{
  "success": true,
  "data": {
    "modified": 3,
    "total": 3,
    "errors": []
  }
}
```

#### Reply to Email
```bash
POST /api/emails/:id/reply
Content-Type: application/json

{
  "account_id": "uuid",
  "body": "Thanks for the message! I'll get back to you soon."
}
```

**Required Fields:**
- `account_id`: Connected Google account ID
- `body`: Reply content

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "reply-email-id",
    "threadId": "thread-id"
  }
}
```

#### Forward Email
```bash
POST /api/emails/:id/forward
Content-Type: application/json

{
  "account_id": "uuid",
  "to": "forward-to@example.com",
  "body": "FYI - see below"
}
```

**Required Fields:**
- `account_id`: Connected Google account ID
- `to`: Recipient email address

**Optional Fields:**
- `body`: Message to prepend (default: empty)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "forwarded-email-id",
    "threadId": "thread-id"
  }
}

---

## Using from Claude Code

### Example: List Projects

```bash
curl http://localhost:3939/api/projects
```

### Example: Create Task

```bash
curl -X POST http://localhost:3939/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "title": "Implement feature X",
    "energy_type": "deep_work",
    "status": "pending"
  }'
```

### Example: Complete Task

```bash
curl -X PUT http://localhost:3939/api/tasks/task-id \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Example: Search Knowledge Base

```bash
curl -X POST http://localhost:3939/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "API authentication", "limit": 5}'
```

### Example: List Emails

```bash
# First, get the connected account ID
curl http://localhost:3939/api/status

# Then list emails from inbox
curl "http://localhost:3939/api/emails?account_id=YOUR_ACCOUNT_ID&folder=inbox&limit=10"
```

### Example: Search Emails

```bash
curl -X POST http://localhost:3939/api/emails/search \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "query": "invoice",
    "limit": 20
  }'
```

### Example: Send Email

```bash
curl -X POST http://localhost:3939/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "to": "recipient@example.com",
    "subject": "Hello from Claude Code",
    "body": "This email was sent via the AI Command Center API."
  }'
```

### Example: Reply to Email

```bash
curl -X POST http://localhost:3939/api/emails/EMAIL_ID/reply \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "body": "Thanks for your message! I will review and get back to you."
  }'
```

### Example: Batch Mark as Read

```bash
curl -X POST http://localhost:3939/api/emails/batch \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "email_ids": ["email-id-1", "email-id-2", "email-id-3"],
    "action": "mark_read"
  }'
```

### With API Key Authentication

```bash
curl -H "X-API-Key: your-secret-key" \
     http://localhost:3939/api/projects
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing API key)
- `404` - Not Found
- `500` - Internal Server Error
- `501` - Not Implemented

---

## Controlling the Server

You can control the API server from within the app using IPC:

### Check Status
```javascript
const status = await window.electronAPI.apiServerStatus();
console.log(status); // { running: true, port: 3939, address: "127.0.0.1" }
```

### Start Server
```javascript
await window.electronAPI.apiServerStart(3939);
```

### Stop Server
```javascript
await window.electronAPI.apiServerStop();
```

---

## Development Tips

### Testing Endpoints

Use `curl`, `httpie`, or any HTTP client:

```bash
# Health check
curl http://localhost:3939/api/health

# Pretty print with jq
curl http://localhost:3939/api/projects | jq

# Using httpie
http localhost:3939/api/status
```

### Logging

All API requests are logged to the Electron console:

```
[API Server] 2025-12-29T10:30:00.000Z GET /api/projects
[API Server] 2025-12-29T10:30:01.000Z POST /api/tasks
```

### Port in Use

If port 3939 is already in use, set a different port in `.env`:

```env
API_SERVER_PORT=4040
```

---

## Security Best Practices

1. **API Key**: Set `API_SERVER_KEY` in production
2. **Localhost Only**: Server only accepts local connections
3. **HTTPS**: Not needed for localhost (already encrypted on machine)
4. **Rate Limiting**: Not implemented (localhost only)
5. **Validation**: All inputs are validated before database operations

---

## Future Enhancements

Planned improvements:

- [ ] WebSocket support for real-time updates
- [ ] Batch operations endpoint
- [ ] File upload/download endpoints
- [ ] Full-text search using FTS5
- [ ] GraphQL endpoint option
- [ ] OpenAPI/Swagger documentation
- [ ] Rate limiting for external access
- [ ] OAuth2 flow for external apps
