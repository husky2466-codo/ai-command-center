---
description: Update project tasks, progress, and status via AI Command Center API
argument-hint: <Project Name>
---

Update a project in AI Command Center by analyzing its current state and updating tasks, progress percentage, and status.

Project Name: $ARGUMENTS

## Instructions

Use a subagent (Task tool with subagent_type="general-purpose") to perform the following workflow:

### Step 1: Find the Project

```bash
curl http://localhost:3939/api/projects
```

Search the returned projects for one matching "$ARGUMENTS" (case-insensitive partial match).

If no match found, list available projects and ask user to clarify.

### Step 2: Get Project Details

```bash
curl http://localhost:3939/api/projects/{project_id}
```

This returns the project with all its tasks.

### Step 3: Analyze Current State

Review:
- Existing tasks and their statuses (pending, in_progress, completed, blocked)
- Current progress percentage
- Current project status (active_focus, on_deck, growing, on_hold, completed)

### Step 4: Determine Updates

Based on task completion, calculate:
- **Progress**: `completed_tasks / total_tasks * 100` (round to nearest integer)
- **Status**:
  - All tasks completed → `completed`
  - Has in_progress tasks → `active_focus`
  - All tasks pending → `on_deck`
  - Has blocked tasks → may need attention

### Step 5: Present Update Plan

Show the user:
1. Current state (tasks, progress, status)
2. Proposed updates
3. Ask for confirmation or modifications

### Step 6: Execute Updates

After user confirmation, execute:

**Update project:**
```bash
curl -X PUT http://localhost:3939/api/projects/{project_id} \
  -H "Content-Type: application/json" \
  -d '{"progress": 0.XX, "status": "new_status"}'
```

**Update tasks if needed:**
```bash
curl -X PUT http://localhost:3939/api/tasks/{task_id} \
  -H "Content-Type: application/json" \
  -d '{"status": "new_status"}'
```

### Step 7: Confirm Success

Show the updated project state to confirm changes were applied.

## API Reference

**Project Statuses:** `active_focus`, `on_deck`, `growing`, `on_hold`, `completed`

**Task Statuses:** `pending`, `in_progress`, `completed`, `blocked`

**Progress:** Float 0.0 to 1.0 (e.g., 0.75 = 75%)

## Example Usage

- `/project_update AI Command Center` - Update the AI Command Center project
- `/project_update QuoteMyAV` - Update QuoteMyAV project
- `/project_update ComfyUI` - Update ComfyUI project
