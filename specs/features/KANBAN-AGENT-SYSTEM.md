# Kanban Board + Agent Automation System

> **Feature Specification for AI Command Center**
>
> Extends the existing project/task system with Kanban visualization and Claude Agent automation for parallel task execution.

---

## Executive Summary

This specification adds two major capabilities to ACC's project management:
1. **Kanban Board View** - Visual task management with drag-and-drop columns
2. **Agent Automation** - Assign Claude Code agents to tasks for autonomous execution

The system leverages git worktrees for isolation and uses the existing Claude CLI subscription infrastructure for cost-effective AI execution.

---

## Visual Overview

```
+============================================================================+
|                        KANBAN + AGENT ARCHITECTURE                          |
+============================================================================+

                           +-------------------+
                           |   ACC Frontend    |
                           |                   |
                           | +-------+-------+ |
                           | |Kanban | Agent | |
                           | | View  | Panel | |
                           | +-------+-------+ |
                           +--------+----------+
                                    |
                          +---------v----------+
                          |    ACC API Server   |
                          |   localhost:3939    |
                          +----+--------+------+
                               |        |
              +----------------+        +----------------+
              |                                          |
    +---------v----------+                  +-----------v---------+
    |  SQLite Database   |                  |  Agent Orchestrator  |
    |                    |                  |                      |
    | - tasks (extended) |                  | - Process Pool (12)  |
    | - agent_sessions   |                  | - Worktree Manager   |
    | - worktrees        |                  | - QA Validator       |
    +--------------------+                  +-----------+----------+
                                                        |
                    +-----------------------------------+
                    |                                   |
         +----------v---------+              +----------v---------+
         |   Claude CLI       |              |   Git Worktrees    |
         |   (Subscription)   |              |                    |
         |                    |              | project/           |
         | - OAuth tokens     |              | ├── .git/          |
         | - Process spawn    |              | ├── worktrees/     |
         | - Streaming        |              | │   ├── task-001/  |
         +--------------------+              | │   ├── task-002/  |
                                             | │   └── task-003/  |
                                             +--------------------+

+============================================================================+
|                          KANBAN WORKFLOW                                    |
+============================================================================+

  +---------+    +-------------+    +-----------+    +-------------+    +------+
  |Planning |    |In Progress  |    | AI Review |    |Human Review |    | Done |
  |         | -> |             | -> |           | -> |             | -> |      |
  +---------+    +-------------+    +-----------+    +-------------+    +------+
       |              |                  |                  |              |
       |              |                  |                  |              |
  +----v----+    +----v----+        +----v----+        +----v----+    +----v----+
  | Tasks   |    | Agent   |        | QA      |        | Human   |    |Completed|
  | waiting |    | working |        | check   |        | verify  |    | tasks   |
  | assign  |    | in      |        | quality |        | & merge |    |         |
  +---------+    | worktree|        +---------+        +---------+    +---------+
                 +---------+

+============================================================================+
|                      AGENT TERMINAL GRID (up to 12)                         |
+============================================================================+

  +------------------+  +------------------+  +------------------+
  | Agent 1          |  | Agent 2          |  | Agent 3          |
  | Task: Add login  |  | Task: Fix bug #23|  | Task: Add tests  |
  | Status: Running  |  | Status: Running  |  | Status: Idle     |
  | Worktree: wt-001 |  | Worktree: wt-002 |  | Worktree: wt-003 |
  |------------------|  |------------------|  |------------------|
  | > Analyzing...   |  | > Writing fix... |  | Waiting for task |
  | > Creating file..|  | > Running tests..|  |                  |
  +------------------+  +------------------+  +------------------+

  +------------------+  +------------------+  +------------------+
  | Agent 4          |  | Agent 5          |  | Agent 6          |
  | [Available]      |  | [Available]      |  | [Available]      |
  +------------------+  +------------------+  +------------------+
```

---

## TODO Checklist

### Phase 1: Database Schema (Week 1)

- [ ] **Migration 012: Kanban Columns**
  - [ ] Create `kanban_columns` table (id, project_id, name, position, color, wip_limit)
  - [ ] Create default columns for each project (Planning, In Progress, AI Review, Human Review, Done)
  - [ ] Add `kanban_column_id` to tasks table
  - [ ] Add `kanban_position` to tasks for ordering within column

- [ ] **Migration 013: Agent System Tables**
  - [ ] Create `agent_sessions` table (id, task_id, worktree_id, status, started_at, completed_at)
  - [ ] Create `agent_logs` table (id, session_id, type, content, timestamp)
  - [ ] Create `worktrees` table (id, project_id, task_id, path, branch_name, status)
  - [ ] Create `agent_config` table (id, name, value) for global settings

- [ ] **Extend tasks table**
  - [ ] Add `agent_assignable` BOOLEAN DEFAULT 0
  - [ ] Add `agent_instructions` TEXT (task-specific prompt/context)
  - [ ] Add `agent_session_id` TEXT (current active session)
  - [ ] Add `agent_status` TEXT CHECK(IN 'idle', 'queued', 'running', 'review', 'completed', 'failed')
  - [ ] Add `agent_result` TEXT (JSON summary of agent work)
  - [ ] Add `agent_quality_score` REAL (0-1 from QA validator)

### Phase 2: Backend Services (Week 2-3)

- [ ] **Worktree Manager Service** (`electron/services/worktreeManager.cjs`)
  - [ ] `createWorktree(projectId, taskId, branchName)` - Creates isolated git worktree
  - [ ] `deleteWorktree(worktreeId)` - Cleans up worktree and branch
  - [ ] `getWorktreeStatus(worktreeId)` - Returns git status for worktree
  - [ ] `mergeWorktree(worktreeId, targetBranch)` - Merges completed work
  - [ ] `listWorktrees(projectId)` - Lists all worktrees for project
  - [ ] Automatic cleanup of stale worktrees on startup

- [ ] **Agent Orchestrator Service** (`electron/services/agentOrchestrator.cjs`)
  - [ ] `MAX_CONCURRENT_AGENTS = 12` (configurable)
  - [ ] `agentPool` - Map of active agent processes
  - [ ] `startAgent(taskId)` - Spawns Claude CLI in worktree context
  - [ ] `stopAgent(sessionId)` - Gracefully stops agent
  - [ ] `getAgentStatus(sessionId)` - Returns agent status and recent output
  - [ ] `queueTask(taskId)` - Adds task to agent queue
  - [ ] EventEmitter for agent lifecycle events
  - [ ] Automatic retry on failure (max 3 attempts)

- [ ] **Agent Session Manager**
  - [ ] Session state machine: `created -> running -> review -> completed/failed`
  - [ ] Log streaming to database (agent_logs)
  - [ ] Time tracking (started_at, completed_at, duration)
  - [ ] Output capture and parsing

- [ ] **QA Validator Integration**
  - [ ] Reuse existing `qualityValidator.js` patterns
  - [ ] Validate agent output against task requirements
  - [ ] Score dimensions: correctness, completeness, code_quality, test_coverage
  - [ ] Auto-transition to Human Review if score >= threshold

### Phase 3: API Endpoints (Week 3-4)

- [ ] **Kanban Endpoints** (`electron/api/routes/kanban.cjs`)
  - [ ] `GET /api/kanban/:projectId/columns` - Get columns with tasks
  - [ ] `POST /api/kanban/:projectId/columns` - Create custom column
  - [ ] `PUT /api/kanban/:projectId/columns/:id` - Update column (name, position, WIP limit)
  - [ ] `DELETE /api/kanban/:projectId/columns/:id` - Delete column (move tasks first)
  - [ ] `PUT /api/kanban/tasks/:taskId/move` - Move task between columns/positions
  - [ ] `GET /api/kanban/:projectId/metrics` - WIP stats, cycle time, throughput

- [ ] **Agent Endpoints** (`electron/api/routes/agents.cjs`)
  - [ ] `POST /api/agents/assign/:taskId` - Assign agent to task
  - [ ] `DELETE /api/agents/unassign/:taskId` - Remove agent from task
  - [ ] `POST /api/agents/start/:taskId` - Start agent execution
  - [ ] `POST /api/agents/stop/:sessionId` - Stop running agent
  - [ ] `GET /api/agents/status` - Get all active agent statuses
  - [ ] `GET /api/agents/session/:sessionId` - Get session details with logs
  - [ ] `GET /api/agents/logs/:sessionId` - Stream agent logs (SSE)
  - [ ] `POST /api/agents/queue` - Batch queue multiple tasks

- [ ] **Worktree Endpoints** (`electron/api/routes/worktrees.cjs`)
  - [ ] `GET /api/worktrees/:projectId` - List worktrees for project
  - [ ] `POST /api/worktrees/:projectId` - Create worktree for task
  - [ ] `DELETE /api/worktrees/:id` - Delete worktree
  - [ ] `GET /api/worktrees/:id/status` - Git status for worktree
  - [ ] `POST /api/worktrees/:id/merge` - Merge worktree to target branch

### Phase 4: Frontend Components (Week 4-6)

- [ ] **KanbanView Component** (`src/components/projects/KanbanView.jsx`)
  - [ ] Drag-and-drop columns using react-beautiful-dnd or dnd-kit
  - [ ] Column headers with task count and WIP indicators
  - [ ] Task cards with agent status badges
  - [ ] Add column button (with color picker)
  - [ ] Column settings (WIP limit, auto-assign agents)
  - [ ] View toggle button in Projects toolbar (List/Kanban)

- [ ] **KanbanColumn Component** (`src/components/projects/KanbanColumn.jsx`)
  - [ ] Droppable zone for tasks
  - [ ] WIP limit enforcement (visual warning, optional block)
  - [ ] Collapse/expand for long columns
  - [ ] Column menu (rename, set WIP, delete)
  - [ ] Quick-add task input at bottom

- [ ] **KanbanCard Component** (`src/components/projects/KanbanCard.jsx`)
  - [ ] Task title and description preview
  - [ ] Agent status indicator (Bot icon with status color)
  - [ ] Energy type badge
  - [ ] Due date indicator
  - [ ] Assignee avatar (if agent: robot icon)
  - [ ] Quick actions (start agent, view logs, edit)
  - [ ] Click to open TaskDetailModal

- [ ] **AgentPanel Component** (`src/components/projects/AgentPanel.jsx`)
  - [ ] Collapsible right sidebar panel
  - [ ] Grid of agent terminal tiles (3x4 or 4x3)
  - [ ] Each tile shows: task name, status, recent output
  - [ ] Click tile to expand full terminal view
  - [ ] Global controls: Start All, Stop All, Clear Queue
  - [ ] Queue display with pending tasks

- [ ] **AgentTerminalTile Component** (`src/components/projects/AgentTerminalTile.jsx`)
  - [ ] Mini terminal output (last 10 lines)
  - [ ] Status indicator (idle/running/completed/failed)
  - [ ] Progress indicator if available
  - [ ] Stop/Restart buttons
  - [ ] Expand to full AgentTerminalModal

- [ ] **AgentTerminalModal Component** (`src/components/projects/AgentTerminalModal.jsx`)
  - [ ] Full terminal output with scroll
  - [ ] Real-time log streaming via SSE
  - [ ] Task context panel (title, description, instructions)
  - [ ] Git diff preview panel
  - [ ] Approve/Reject buttons for Human Review stage
  - [ ] Quality score display

- [ ] **TaskDetailModal Enhancements**
  - [ ] Add "Agent Settings" tab
  - [ ] Toggle: "Allow Agent Automation"
  - [ ] Agent Instructions textarea
  - [ ] Agent History (past sessions for this task)
  - [ ] "Assign to Agent" button

### Phase 5: Integration & Polish (Week 6-7)

- [ ] **View Toggle Integration**
  - [ ] Add view mode state to Projects.jsx (list/kanban)
  - [ ] Persist view preference to localStorage
  - [ ] Smooth transition animation between views
  - [ ] Sync selection state between views

- [ ] **Agent Queue System**
  - [ ] Priority queue implementation
  - [ ] Task dependencies (wait for prerequisite tasks)
  - [ ] Batch execution mode
  - [ ] Scheduling (start at specific time)

- [ ] **Notifications**
  - [ ] Desktop notifications for agent completion
  - [ ] In-app notification for Human Review needed
  - [ ] Agent failure alerts

- [ ] **Keyboard Shortcuts**
  - [ ] `A` - Assign agent to selected task
  - [ ] `S` - Start agent on selected task
  - [ ] `X` - Stop running agent
  - [ ] `R` - Open agent review modal
  - [ ] Arrow keys for Kanban navigation

---

## Detailed Phase Breakdown

### Phase 1: Database Schema

**Objective**: Extend database to support Kanban columns and agent automation.

**Prerequisites**: Existing tasks and projects tables.

**Migration 012: kanban_columns.cjs**

```javascript
module.exports = {
  up: (db) => {
    // Kanban columns table
    db.exec(`
      CREATE TABLE IF NOT EXISTS kanban_columns (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        color TEXT DEFAULT '#6366f1',
        wip_limit INTEGER DEFAULT 0,
        is_done_column INTEGER DEFAULT 0,
        is_agent_column INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_kanban_columns_project ON kanban_columns(project_id);
    `);

    // Extend tasks table for Kanban
    db.exec(`
      ALTER TABLE tasks ADD COLUMN kanban_column_id TEXT REFERENCES kanban_columns(id);
      ALTER TABLE tasks ADD COLUMN kanban_position INTEGER DEFAULT 0;
    `);
  }
};
```

**Migration 013: agent_system.cjs**

```javascript
module.exports = {
  up: (db) => {
    // Worktrees tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS worktrees (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES tasks(id),
        path TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        base_branch TEXT DEFAULT 'main',
        status TEXT CHECK(status IN ('active', 'merged', 'abandoned')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        merged_at DATETIME
      );

      CREATE INDEX idx_worktrees_project ON worktrees(project_id);
      CREATE INDEX idx_worktrees_task ON worktrees(task_id);
    `);

    // Agent sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        worktree_id TEXT REFERENCES worktrees(id),
        status TEXT CHECK(status IN ('created', 'running', 'review', 'completed', 'failed', 'cancelled')) DEFAULT 'created',
        started_at DATETIME,
        completed_at DATETIME,
        duration_seconds INTEGER,
        exit_code INTEGER,
        quality_score REAL,
        quality_details TEXT,
        summary TEXT,
        files_changed TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_agent_sessions_task ON agent_sessions(task_id);
      CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
    `);

    // Agent logs
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
        type TEXT CHECK(type IN ('stdout', 'stderr', 'system', 'tool_use', 'error')) DEFAULT 'stdout',
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_agent_logs_session ON agent_logs(session_id);
    `);

    // Extend tasks for agent automation
    db.exec(`
      ALTER TABLE tasks ADD COLUMN agent_assignable INTEGER DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN agent_instructions TEXT;
      ALTER TABLE tasks ADD COLUMN agent_session_id TEXT REFERENCES agent_sessions(id);
      ALTER TABLE tasks ADD COLUMN agent_status TEXT CHECK(agent_status IN ('idle', 'queued', 'running', 'review', 'completed', 'failed'));
    `);

    // Agent configuration
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_config (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Default configuration
      INSERT OR IGNORE INTO agent_config (id, name, value) VALUES
        ('cfg_max_agents', 'max_concurrent_agents', '12'),
        ('cfg_quality_threshold', 'quality_threshold', '0.7'),
        ('cfg_auto_merge', 'auto_merge_on_approval', 'false'),
        ('cfg_retry_count', 'max_retry_attempts', '3');
    `);
  }
};
```

**Deliverables**:
- Two migration files in `electron/database/migrations/`
- Updated db.cjs to include new migrations
- Default Kanban columns seeded for existing projects

**Acceptance Criteria**:
- [x] Migrations run without errors
- [x] Existing tasks remain intact
- [x] Default columns created for projects
- [x] Agent tables properly indexed

---

### Phase 2: Backend Services

**Objective**: Create core services for worktree management and agent orchestration.

**Prerequisites**: Phase 1 complete, existing claudeCliService.cjs.

#### WorktreeManager Service

```javascript
// electron/services/worktreeManager.cjs

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { getDatabase } = require('../database/db.cjs');

const execAsync = promisify(exec);

class WorktreeManager {
  constructor() {
    this.worktreesDir = 'worktrees'; // Relative to project root
  }

  /**
   * Create a new git worktree for a task
   * @param {string} projectPath - Path to the project repository
   * @param {string} projectId - Project UUID
   * @param {string} taskId - Task UUID
   * @param {string} branchName - Name for the new branch
   */
  async createWorktree(projectPath, projectId, taskId, branchName) {
    const db = getDatabase();
    const id = crypto.randomUUID();

    // Sanitize branch name
    const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const worktreePath = path.join(projectPath, this.worktreesDir, `task-${taskId.slice(0, 8)}`);

    try {
      // Create worktrees directory if needed
      await fs.mkdir(path.join(projectPath, this.worktreesDir), { recursive: true });

      // Get current branch as base
      const { stdout: baseBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectPath
      });

      // Create worktree with new branch
      await execAsync(
        `git worktree add -b ${safeBranchName} "${worktreePath}"`,
        { cwd: projectPath }
      );

      // Record in database
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO worktrees (id, project_id, task_id, path, branch_name, base_branch, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(id, projectId, taskId, worktreePath, safeBranchName, baseBranch.trim(), now);

      return {
        success: true,
        data: {
          id,
          path: worktreePath,
          branchName: safeBranchName,
          baseBranch: baseBranch.trim()
        }
      };
    } catch (error) {
      console.error('[WorktreeManager] Create error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a worktree and optionally its branch
   */
  async deleteWorktree(worktreeId, deleteBranch = true) {
    const db = getDatabase();

    try {
      const worktree = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId);
      if (!worktree) {
        return { success: false, error: 'Worktree not found' };
      }

      // Get project path from worktree path
      const projectPath = path.dirname(path.dirname(worktree.path));

      // Remove worktree
      await execAsync(`git worktree remove "${worktree.path}" --force`, {
        cwd: projectPath
      });

      // Delete branch if requested
      if (deleteBranch) {
        await execAsync(`git branch -D ${worktree.branch_name}`, {
          cwd: projectPath
        }).catch(() => {}); // Ignore if branch already deleted
      }

      // Update database
      db.prepare('UPDATE worktrees SET status = ? WHERE id = ?').run('abandoned', worktreeId);

      return { success: true };
    } catch (error) {
      console.error('[WorktreeManager] Delete error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge worktree branch to target branch
   */
  async mergeWorktree(worktreeId, targetBranch = null) {
    const db = getDatabase();

    try {
      const worktree = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId);
      if (!worktree) {
        return { success: false, error: 'Worktree not found' };
      }

      const projectPath = path.dirname(path.dirname(worktree.path));
      const target = targetBranch || worktree.base_branch;

      // Checkout target branch
      await execAsync(`git checkout ${target}`, { cwd: projectPath });

      // Merge worktree branch
      await execAsync(`git merge ${worktree.branch_name} --no-ff -m "Merge task: ${worktree.task_id}"`, {
        cwd: projectPath
      });

      // Update database
      const now = new Date().toISOString();
      db.prepare('UPDATE worktrees SET status = ?, merged_at = ? WHERE id = ?')
        .run('merged', now, worktreeId);

      return { success: true, data: { mergedTo: target } };
    } catch (error) {
      console.error('[WorktreeManager] Merge error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get git status for a worktree
   */
  async getStatus(worktreeId) {
    const db = getDatabase();

    try {
      const worktree = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId);
      if (!worktree) {
        return { success: false, error: 'Worktree not found' };
      }

      const { stdout: status } = await execAsync('git status --porcelain', {
        cwd: worktree.path
      });

      const { stdout: diffStat } = await execAsync('git diff --stat HEAD', {
        cwd: worktree.path
      });

      return {
        success: true,
        data: {
          status: status.trim().split('\n').filter(Boolean),
          diffStat: diffStat.trim(),
          hasChanges: status.trim().length > 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List all worktrees for a project
   */
  listWorktrees(projectId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM worktrees WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId);
  }

  /**
   * Cleanup stale worktrees on startup
   */
  async cleanupStale() {
    const db = getDatabase();
    const staleWorktrees = db.prepare(
      "SELECT * FROM worktrees WHERE status = 'active' AND created_at < datetime('now', '-7 days')"
    ).all();

    for (const wt of staleWorktrees) {
      console.log(`[WorktreeManager] Cleaning up stale worktree: ${wt.id}`);
      await this.deleteWorktree(wt.id, true);
    }
  }
}

module.exports = new WorktreeManager();
```

#### AgentOrchestrator Service

```javascript
// electron/services/agentOrchestrator.cjs

const { spawn } = require('child_process');
const EventEmitter = require('events');
const crypto = require('crypto');
const { getDatabase } = require('../database/db.cjs');
const worktreeManager = require('./worktreeManager.cjs');
const claudeCliService = require('./claudeCliService.cjs');

class AgentOrchestrator extends EventEmitter {
  constructor() {
    super();

    this.maxConcurrent = 12;
    this.activeAgents = new Map(); // sessionId -> { process, task, worktree }
    this.taskQueue = [];
    this.qualityThreshold = 0.7;

    this._loadConfig();
  }

  _loadConfig() {
    try {
      const db = getDatabase();
      const configs = db.prepare('SELECT name, value FROM agent_config').all();

      for (const cfg of configs) {
        switch (cfg.name) {
          case 'max_concurrent_agents':
            this.maxConcurrent = parseInt(cfg.value) || 12;
            break;
          case 'quality_threshold':
            this.qualityThreshold = parseFloat(cfg.value) || 0.7;
            break;
        }
      }
    } catch (error) {
      console.error('[AgentOrchestrator] Failed to load config:', error);
    }
  }

  /**
   * Queue a task for agent execution
   */
  async queueTask(taskId, priority = 0) {
    const db = getDatabase();

    // Validate task exists and is agent-assignable
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (!task.agent_assignable) {
      return { success: false, error: 'Task is not configured for agent automation' };
    }

    // Check if already queued or running
    if (task.agent_status === 'queued' || task.agent_status === 'running') {
      return { success: false, error: 'Task is already queued or running' };
    }

    // Update task status
    db.prepare('UPDATE tasks SET agent_status = ? WHERE id = ?').run('queued', taskId);

    // Add to queue with priority
    this.taskQueue.push({ taskId, priority });
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    this.emit('task-queued', { taskId });

    // Try to process queue
    this._processQueue();

    return { success: true, data: { position: this.taskQueue.findIndex(t => t.taskId === taskId) + 1 } };
  }

  /**
   * Start agent execution for a task
   */
  async startAgent(taskId) {
    const db = getDatabase();

    if (this.activeAgents.size >= this.maxConcurrent) {
      return { success: false, error: 'Maximum concurrent agents reached' };
    }

    const task = db.prepare(`
      SELECT t.*, p.fs_path, p.id as project_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (!task.fs_path) {
      return { success: false, error: 'Project has no filesystem path' };
    }

    try {
      // Create worktree
      const branchName = `agent/${task.id.slice(0, 8)}/${Date.now()}`;
      const worktreeResult = await worktreeManager.createWorktree(
        task.fs_path,
        task.project_id,
        task.id,
        branchName
      );

      if (!worktreeResult.success) {
        return { success: false, error: `Worktree creation failed: ${worktreeResult.error}` };
      }

      // Create agent session
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO agent_sessions (id, task_id, worktree_id, status, started_at, created_at)
        VALUES (?, ?, ?, 'running', ?, ?)
      `).run(sessionId, taskId, worktreeResult.data.id, now, now);

      // Update task
      db.prepare(`
        UPDATE tasks SET agent_status = 'running', agent_session_id = ? WHERE id = ?
      `).run(sessionId, taskId);

      // Build agent prompt
      const prompt = this._buildAgentPrompt(task, worktreeResult.data);

      // Spawn Claude CLI process
      const process = this._spawnAgent(sessionId, worktreeResult.data.path, prompt);

      // Track active agent
      this.activeAgents.set(sessionId, {
        process,
        task,
        worktree: worktreeResult.data,
        startTime: Date.now()
      });

      this.emit('agent-started', { sessionId, taskId });

      return {
        success: true,
        data: {
          sessionId,
          worktreeId: worktreeResult.data.id,
          worktreePath: worktreeResult.data.path
        }
      };
    } catch (error) {
      console.error('[AgentOrchestrator] Start error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop a running agent
   */
  async stopAgent(sessionId) {
    const agent = this.activeAgents.get(sessionId);
    if (!agent) {
      return { success: false, error: 'Agent session not found' };
    }

    try {
      // Kill process
      agent.process.kill('SIGTERM');

      // Update database
      const db = getDatabase();
      const now = new Date().toISOString();
      const duration = Math.floor((Date.now() - agent.startTime) / 1000);

      db.prepare(`
        UPDATE agent_sessions
        SET status = 'cancelled', completed_at = ?, duration_seconds = ?
        WHERE id = ?
      `).run(now, duration, sessionId);

      db.prepare(`
        UPDATE tasks SET agent_status = 'idle', agent_session_id = NULL
        WHERE id = ?
      `).run(agent.task.id);

      this.activeAgents.delete(sessionId);
      this.emit('agent-stopped', { sessionId, taskId: agent.task.id });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get status of all active agents
   */
  getStatus() {
    const agents = [];

    for (const [sessionId, agent] of this.activeAgents) {
      agents.push({
        sessionId,
        taskId: agent.task.id,
        taskTitle: agent.task.title,
        worktreePath: agent.worktree.path,
        startTime: agent.startTime,
        runningSeconds: Math.floor((Date.now() - agent.startTime) / 1000)
      });
    }

    return {
      activeCount: this.activeAgents.size,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.taskQueue.length,
      agents
    };
  }

  /**
   * Build the agent prompt with task context
   * @private
   */
  _buildAgentPrompt(task, worktree) {
    return `You are working on the following task in an isolated git worktree.

## Task
**Title:** ${task.title}
**Description:** ${task.description || 'No description provided'}

## Custom Instructions
${task.agent_instructions || 'No additional instructions'}

## Context
- You are working in: ${worktree.path}
- Branch: ${worktree.branchName}
- Base branch: ${worktree.baseBranch}

## Guidelines
1. Complete the task as described
2. Make atomic, well-documented commits
3. Write tests if applicable
4. Ensure code follows project conventions
5. When done, summarize what you accomplished

Begin working on the task now.`;
  }

  /**
   * Spawn Claude CLI process for agent work
   * @private
   */
  _spawnAgent(sessionId, workingDir, prompt) {
    const db = getDatabase();

    // Spawn claude CLI with working directory set to worktree
    const process = spawn('claude', ['-p', prompt, '--allowedTools', 'Bash,Read,Write,Edit,Glob,Grep'], {
      cwd: workingDir,
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        // Remove API key to force OAuth/subscription auth
        ANTHROPIC_API_KEY: undefined
      }
    });

    let output = '';

    process.stdout.on('data', (data) => {
      const content = data.toString();
      output += content;

      // Log to database
      db.prepare(`
        INSERT INTO agent_logs (id, session_id, type, content, timestamp)
        VALUES (?, ?, 'stdout', ?, ?)
      `).run(crypto.randomUUID(), sessionId, content, new Date().toISOString());

      this.emit('agent-output', { sessionId, type: 'stdout', content });
    });

    process.stderr.on('data', (data) => {
      const content = data.toString();

      db.prepare(`
        INSERT INTO agent_logs (id, session_id, type, content, timestamp)
        VALUES (?, ?, 'stderr', ?, ?)
      `).run(crypto.randomUUID(), sessionId, content, new Date().toISOString());

      this.emit('agent-output', { sessionId, type: 'stderr', content });
    });

    process.on('close', async (code) => {
      await this._handleAgentComplete(sessionId, code, output);
    });

    process.on('error', (error) => {
      db.prepare(`
        INSERT INTO agent_logs (id, session_id, type, content, timestamp)
        VALUES (?, ?, 'error', ?, ?)
      `).run(crypto.randomUUID(), sessionId, error.message, new Date().toISOString());

      this.emit('agent-error', { sessionId, error: error.message });
    });

    return process;
  }

  /**
   * Handle agent process completion
   * @private
   */
  async _handleAgentComplete(sessionId, exitCode, output) {
    const agent = this.activeAgents.get(sessionId);
    if (!agent) return;

    const db = getDatabase();
    const now = new Date().toISOString();
    const duration = Math.floor((Date.now() - agent.startTime) / 1000);

    try {
      // Determine status based on exit code
      let status = exitCode === 0 ? 'review' : 'failed';

      // Get git diff for summary
      const diffResult = await worktreeManager.getStatus(agent.worktree.id);
      const filesChanged = diffResult.success ? JSON.stringify(diffResult.data.status) : null;

      // Update session
      db.prepare(`
        UPDATE agent_sessions
        SET status = ?, completed_at = ?, duration_seconds = ?, exit_code = ?, files_changed = ?
        WHERE id = ?
      `).run(status, now, duration, exitCode, filesChanged, sessionId);

      // Update task status
      db.prepare(`
        UPDATE tasks SET agent_status = ? WHERE id = ?
      `).run(status === 'review' ? 'review' : 'failed', agent.task.id);

      // If successful, move task to AI Review column
      if (exitCode === 0) {
        const reviewColumn = db.prepare(`
          SELECT id FROM kanban_columns
          WHERE project_id = ? AND name LIKE '%Review%' AND is_agent_column = 1
          LIMIT 1
        `).get(agent.task.project_id);

        if (reviewColumn) {
          db.prepare('UPDATE tasks SET kanban_column_id = ? WHERE id = ?')
            .run(reviewColumn.id, agent.task.id);
        }
      }

      this.activeAgents.delete(sessionId);
      this.emit('agent-completed', { sessionId, taskId: agent.task.id, exitCode, status });

      // Process queue for next task
      this._processQueue();

    } catch (error) {
      console.error('[AgentOrchestrator] Complete handler error:', error);
    }
  }

  /**
   * Process the task queue
   * @private
   */
  async _processQueue() {
    while (this.activeAgents.size < this.maxConcurrent && this.taskQueue.length > 0) {
      const { taskId } = this.taskQueue.shift();
      await this.startAgent(taskId);
    }
  }

  /**
   * Stop all agents and clean up
   */
  async stopAll() {
    const promises = [];
    for (const [sessionId] of this.activeAgents) {
      promises.push(this.stopAgent(sessionId));
    }
    await Promise.allSettled(promises);
    this.taskQueue = [];
  }
}

// Export singleton
const orchestrator = new AgentOrchestrator();
module.exports = orchestrator;
```

**Deliverables**:
- `electron/services/worktreeManager.cjs`
- `electron/services/agentOrchestrator.cjs`
- Updated `electron/main.cjs` with IPC handlers and event forwarding

**Acceptance Criteria**:
- [x] Worktrees create/delete correctly
- [x] Agents spawn and capture output
- [x] Queue respects max concurrent limit
- [x] Session state transitions work correctly
- [x] Events emit to renderer process

---

### Phase 3: API Endpoints

**Objective**: Expose Kanban and Agent functionality via HTTP API.

**Prerequisites**: Phase 2 services complete.

**Files to Create**:
- `electron/api/routes/kanban.cjs`
- `electron/api/routes/agents.cjs`
- `electron/api/routes/worktrees.cjs`

**Key Endpoints Summary**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kanban/:projectId/columns` | Get columns with tasks |
| PUT | `/api/kanban/tasks/:taskId/move` | Move task to column/position |
| POST | `/api/agents/assign/:taskId` | Enable agent for task |
| POST | `/api/agents/start/:taskId` | Start agent execution |
| POST | `/api/agents/stop/:sessionId` | Stop running agent |
| GET | `/api/agents/status` | Get all agent statuses |
| GET | `/api/agents/logs/:sessionId` | SSE stream of logs |
| GET | `/api/worktrees/:projectId` | List project worktrees |
| POST | `/api/worktrees/:id/merge` | Merge worktree |

**Deliverables**:
- Three route files in `electron/api/routes/`
- Updated `electron/api/routes/index.cjs` to mount new routes
- SSE endpoint for real-time log streaming

---

### Phase 4: Frontend Components

**Objective**: Build Kanban view and agent management UI.

**Prerequisites**: Phase 3 API complete.

**Component Hierarchy**:

```
Projects.jsx
├── ProjectsView.jsx (existing list view)
├── KanbanView.jsx (new)
│   ├── KanbanColumn.jsx
│   │   └── KanbanCard.jsx
│   └── AgentPanel.jsx
│       ├── AgentTerminalTile.jsx
│       └── AgentTerminalModal.jsx
└── TaskDetailModal.jsx (enhanced)
```

**Styling Notes** (from DESIGN-SYSTEM.md):
- Module color: `--color-projects` (#6366f1)
- Use lucide-react icons: `Bot`, `GitBranch`, `Terminal`, `Play`, `Square`
- Cards follow existing Card component patterns
- Drag-drop uses gold accent color for drop zones

**Deliverables**:
- 7 new component files in `src/components/projects/`
- Updated Projects.jsx with view toggle
- Updated Projects.css with Kanban styles
- Agent service in `src/services/AgentService.js`

---

### Phase 5: Integration & Polish

**Objective**: Connect all pieces and add polish features.

**Key Integration Points**:

1. **View Toggle**
   - Button in Projects toolbar: List | Kanban
   - State persisted to localStorage
   - Both views share same data, synced on changes

2. **Agent Events in Electron**
   - Forward orchestrator events via IPC
   - Renderer subscribes via `window.electronAPI.onAgentEvent`
   - Real-time UI updates

3. **Notifications**
   - Electron notification API for desktop alerts
   - In-app toast notifications
   - Sound effects (optional)

4. **Keyboard Navigation**
   - Global shortcuts registered in App.jsx
   - Context-aware (only active in Kanban view)

---

## Dependencies Map

```
+---------------+     +------------------+     +------------------+
| Phase 1       |     | Phase 2          |     | Phase 3          |
| DB Schema     |---->| Backend Services |---->| API Endpoints    |
+---------------+     +------------------+     +------------------+
                              |                        |
                              v                        v
                      +------------------+     +------------------+
                      | claudeCliService |     | Phase 4          |
                      | (existing)       |     | Frontend         |
                      +------------------+     +------------------+
                                                       |
                                                       v
                                               +------------------+
                                               | Phase 5          |
                                               | Integration      |
                                               +------------------+
```

---

## Risk Notes

### Technical Risks

1. **Git Worktree Limitations**
   - Windows path length limits (use shorter branch names)
   - Worktree state can become corrupted if process killed
   - Mitigation: Robust cleanup on startup, shorter task ID prefixes

2. **Claude CLI Process Management**
   - Long-running processes may timeout
   - Memory usage with 12 concurrent agents
   - Mitigation: Configurable timeouts, process monitoring

3. **SQLite Concurrency**
   - Multiple agent processes writing logs simultaneously
   - Mitigation: WAL mode already enabled, use write queue if needed

### User Experience Risks

1. **Learning Curve**
   - Kanban + agents is complex feature set
   - Mitigation: Progressive disclosure, good defaults

2. **Agent Failures**
   - AI can make mistakes, users need clear feedback
   - Mitigation: QA validation, human review stage mandatory

---

## Key Insights & Recommendations

### Quick Wins

1. **Start with Kanban only** - Kanban view provides immediate value without agent complexity
2. **Default columns** - Pre-populate sensible columns, let users customize later
3. **Agent opt-in** - Require explicit "Enable Agent" toggle per task

### Architecture Decisions

1. **Worktrees over branches** - True isolation prevents conflicts
2. **Subscription mode** - Leverages existing infrastructure, no API costs
3. **Event-driven** - Loose coupling between orchestrator and UI
4. **Queue system** - Graceful handling of concurrent limits

### Future Enhancements

1. **Agent Templates** - Pre-built prompts for common task types
2. **Learning from History** - Track which prompts work best
3. **Multi-agent Collaboration** - Agents that work together on complex tasks
4. **Custom Agent Personalities** - Different styles for different task types

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1 | 1 week | Database migrations, schema ready |
| 2 | 2 weeks | WorktreeManager, AgentOrchestrator services |
| 3 | 1 week | REST API endpoints, SSE streaming |
| 4 | 2 weeks | Kanban UI, Agent panel, Terminal views |
| 5 | 1 week | Integration, notifications, shortcuts |

**Total: 7 weeks**

---

## Related Documentation

- [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) - Visual design guidelines
- [02-PROJECTS.md](../components/02-PROJECTS.md) - Existing projects spec
- [AI-AGENT-SERVICE.md](./AI-AGENT-SERVICE.md) - Related agent patterns
- [CLAUDE-SUBSCRIPTION-MODE.md](../../CLAUDE-SUBSCRIPTION-MODE.md) - CLI authentication

---

## Appendix: Database Schema Diagram

```
+------------------+       +------------------+       +------------------+
|     projects     |       |    kanban_       |       |      tasks       |
|------------------|       |    columns       |       |------------------|
| id               |<------| project_id       |       | id               |
| name             |       | name             |<------| kanban_column_id |
| fs_path          |       | position         |       | kanban_position  |
| ...              |       | wip_limit        |       | agent_assignable |
+------------------+       | is_agent_column  |       | agent_status     |
        |                  +------------------+       | agent_session_id |
        |                                             +--------+---------+
        |                                                      |
        v                                                      v
+------------------+       +------------------+       +------------------+
|    worktrees     |       |  agent_sessions  |       |   agent_logs     |
|------------------|       |------------------|       |------------------|
| id               |<------| worktree_id      |       | session_id       |
| project_id       |       | task_id          |------>| type             |
| task_id          |       | status           |       | content          |
| path             |       | quality_score    |       | timestamp        |
| branch_name      |       | started_at       |       +------------------+
| status           |       | completed_at     |
+------------------+       +------------------+
```
