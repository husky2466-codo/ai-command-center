---
description: Execute tasks on DGX Spark via SSH API
argument-hint: <task to perform on DGX>
---

Execute commands and manage tasks on the DGX Spark GPU workstation via the AI Command Center API.

User Request: $ARGUMENTS

## CRITICAL: Always Confirm Before Executing

**IMPORTANT**: Before executing ANY command on the DGX, you MUST:
1. Explain what you plan to do
2. Show the exact command(s) you will run
3. Ask for explicit user confirmation: "Should I proceed with this?"
4. Wait for user approval before executing

This applies even if bypass permissions is enabled. The DGX is a production GPU workstation and commands can have significant impact.

## Instructions

Use the Task tool with `subagent_type: "general-purpose"` to handle this DGX work. The subagent should:

1. **Check DGX Connection Status**
   ```bash
   curl http://localhost:3939/api/dgx/status
   ```

2. **Get Active Connection ID**
   ```bash
   curl http://localhost:3939/api/dgx/connections
   ```
   Look for a connected DGX (connected: true) or the most recently used connection.

3. **Analyze the User's Request**
   - Determine what commands need to be run
   - Check if this requires creating/updating projects or jobs in ACC

4. **Confirm with User**
   Before any execution, present:
   - What you understand the task to be
   - The exact command(s) you will run
   - Any projects/jobs you will create or update
   - Ask: "Should I proceed with this?"

5. **Execute Commands via API**
   ```bash
   curl -X POST http://localhost:3939/api/dgx/exec/CONNECTION_ID \
     -H "Content-Type: application/json" \
     -d '{"command": "your-command-here"}'
   ```

6. **Track Work in ACC** (when applicable)
   - Create/update DGX projects for ongoing work
   - Create jobs for training runs or long-running processes
   - Update job status as work progresses

## Available DGX API Endpoints

**Connections**
- `GET /api/dgx/connections` - List all DGX connections
- `GET /api/dgx/connections/:id` - Get specific connection
- `POST /api/dgx/connect/:id` - Connect to a DGX (SSH)
- `POST /api/dgx/disconnect/:id` - Disconnect from DGX
- `GET /api/dgx/status/:id` - Get connection status
- `GET /api/dgx/status` - Get active connection status

**Command Execution**
- `POST /api/dgx/exec/:id` - Execute command on DGX (body: `{"command": "..."}`)

**GPU Metrics**
- `GET /api/dgx/metrics/:id` - Get current GPU metrics
- `GET /api/dgx/metrics/:id/history` - Get metrics history (query: `hours=24`)

**Projects & Jobs**
- `GET /api/dgx/projects` - List DGX projects
- `POST /api/dgx/projects` - Create DGX project
- `PUT /api/dgx/projects/:id` - Update project
- `GET /api/dgx/jobs` - List training jobs
- `POST /api/dgx/jobs` - Create training job
- `PUT /api/dgx/jobs/:id` - Update job status/metrics

## DGX Workspace Structure

The DGX uses this workspace organization:
```
~/projects/
├── training/           # ML training jobs
├── inference/          # Model serving (ComfyUI, etc.)
├── data/               # Datasets
└── outputs/            # Results, checkpoints
```

## Job Statuses
`pending`, `running`, `completed`, `failed`, `cancelled`

## Project Types
`computer_vision`, `nlp`, `reinforcement_learning`, `generative`, `other`

## Connection Details (Reference)
- Host: 192.168.3.20
- User: myers
- SSH Key: C:/Users/myers/.ssh/dgx_spark_ross

## Examples

- "Check GPU usage" → Execute `nvidia-smi` and show results
- "Start ComfyUI" → Navigate to inference folder, run startup script, create job
- "List running processes" → Execute `ps aux | grep python`
- "Check disk space" → Execute `df -h` and `du -sh ~/projects/*`
- "Train a model" → Create project, create job, execute training script
