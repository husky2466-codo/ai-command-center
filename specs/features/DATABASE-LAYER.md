# Database Layer

**Status**: Not Started
**Priority**: P0 (Critical)
**Estimated Effort**: 4 days
**Dependencies**: None (foundational)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) - Not directly applicable (backend)

---

## Design Consistency Notes

This feature is primarily backend infrastructure with no direct UI. However:

- **Error Messages**: When database errors surface in UI, use `--status-error` (#ef4444) styling
- **Loading States**: Database operations should trigger loading spinners using shared components
- **Status Indicators**: In Admin panel, database health uses status colors:
  - Connected: `--status-success` (#22c55e)
  - Warning: `--status-warning` (#f59e0b)
  - Error: `--status-error` (#ef4444)

---

## Overview

The Database Layer provides persistent storage for AI Command Center using SQLite with the sqlite-vss extension for vector similarity search. It runs in Electron's main process and exposes IPC handlers for the renderer process to perform CRUD operations.

## Acceptance Criteria

- [ ] SQLite database initializes on app startup
- [ ] All tables created via migration system
- [ ] WAL mode enabled for performance
- [ ] sqlite-vss extension loaded for vector search
- [ ] IPC handlers for all database operations
- [ ] Graceful fallback if vss extension unavailable
- [ ] Database location: `%APPDATA%\ai-command-center\database.sqlite`

## Tasks

### Section 1: Database Setup
- [ ] Create `electron/database/` directory
- [ ] Create `electron/database/db.cjs`
  ```javascript
  const Database = require('better-sqlite3');
  const path = require('path');
  const { app } = require('electron');

  let db = null;

  function initializeDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'database.sqlite');

    db = new Database(dbPath, { verbose: console.log });

    // Enable WAL mode
    db.pragma('journal_mode = WAL');

    // Try to load sqlite-vss
    try {
      db.loadExtension('sqlite-vss');
      console.log('sqlite-vss extension loaded');
    } catch (err) {
      console.warn('sqlite-vss not available:', err.message);
    }

    // Run migrations
    runMigrations();

    return db;
  }

  function getDatabase() {
    if (!db) throw new Error('Database not initialized');
    return db;
  }

  module.exports = { initializeDatabase, getDatabase };
  ```

### Section 2: Migration System
- [ ] Create `electron/database/migrations/` directory
- [ ] Create migration runner:
  ```javascript
  function runMigrations() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied = db.prepare('SELECT name FROM migrations').all();
    const appliedNames = applied.map(m => m.name);

    const migrations = [
      '001_initial',
      '002_vectors',
      '003_chain_sessions'
    ];

    for (const name of migrations) {
      if (!appliedNames.includes(name)) {
        console.log(`Applying migration: ${name}`);
        const migration = require(`./migrations/${name}.cjs`);
        migration.up(db);
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
      }
    }
  }
  ```

### Section 3: Initial Migration (001_initial)
- [ ] Create `electron/database/migrations/001_initial.cjs`
- [ ] Include all core tables:
  - [ ] spaces, projects, tasks
  - [ ] reminders
  - [ ] contacts, contact_groups, contact_group_members, contact_interactions
  - [ ] meetings, meeting_participants
  - [ ] knowledge_folders, knowledge_articles
  - [ ] memories, session_recalls, memory_feedback
  - [ ] chat_sessions, chat_messages
  - [ ] entities
  - [ ] goals, goal_alignments
  - [ ] sync_jobs, token_usage

### Section 4: Vector Migration (002_vectors)
- [ ] Create `electron/database/migrations/002_vectors.cjs`
- [ ] Create vss virtual tables if extension available:
  ```sql
  CREATE VIRTUAL TABLE IF NOT EXISTS memories_vss USING vss0(
    embedding(1024)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_vss USING vss0(
    embedding(1024)
  );
  ```

### Section 5: Indexes
- [ ] Create all performance indexes:
  ```sql
  CREATE INDEX idx_tasks_project ON tasks(project_id);
  CREATE INDEX idx_tasks_status ON tasks(status);
  CREATE INDEX idx_tasks_due ON tasks(due_date);
  CREATE INDEX idx_tasks_energy ON tasks(energy_type);
  CREATE INDEX idx_reminders_due ON reminders(due_at);
  CREATE INDEX idx_reminders_status ON reminders(status);
  CREATE INDEX idx_contacts_slug ON contacts(slug);
  CREATE INDEX idx_contacts_last_contact ON contacts(last_contact_at);
  CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at);
  CREATE INDEX idx_memories_type ON memories(type);
  CREATE INDEX idx_memories_confidence ON memories(confidence_score);
  CREATE INDEX idx_chat_sessions_created ON chat_sessions(created_at);
  CREATE INDEX idx_entities_type ON entities(type);
  CREATE INDEX idx_entities_slug ON entities(slug);
  ```

### Section 6: IPC Handlers
- [ ] Create `electron/database/ipc.cjs`
- [ ] Implement generic query handler:
  ```javascript
  ipcMain.handle('db:query', (event, sql, params) => {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.all(...(params || []));
  });

  ipcMain.handle('db:run', (event, sql, params) => {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.run(...(params || []));
  });

  ipcMain.handle('db:get', (event, sql, params) => {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.get(...(params || []));
  });
  ```

### Section 7: Preload API
- [ ] Update `electron/preload.cjs` to expose database API:
  ```javascript
  contextBridge.exposeInMainWorld('electronAPI', {
    // ... existing APIs

    // Database
    dbQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    dbRun: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
    dbGet: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
  });
  ```

### Section 8: Base Service
- [ ] Create `src/services/BaseService.js`
  ```javascript
  export class BaseService {
    constructor(tableName) {
      this.tableName = tableName;
    }

    async getAll() {
      return window.electronAPI.dbQuery(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
      );
    }

    async getById(id) {
      return window.electronAPI.dbGet(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
    }

    async create(data) {
      const id = crypto.randomUUID();
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      await window.electronAPI.dbRun(
        `INSERT INTO ${this.tableName} (id, ${columns}) VALUES (?, ${placeholders})`,
        [id, ...values]
      );

      return this.getById(id);
    }

    async update(id, data) {
      const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(data), id];

      await window.electronAPI.dbRun(
        `UPDATE ${this.tableName} SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      return this.getById(id);
    }

    async delete(id) {
      await window.electronAPI.dbRun(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
    }
  }
  ```

### Section 9: Data Service
- [ ] Create `src/services/DataService.js`
  ```javascript
  class DataService {
    constructor() {
      this.cache = new Map();
    }

    async query(sql, params) {
      return window.electronAPI.dbQuery(sql, params);
    }

    async run(sql, params) {
      return window.electronAPI.dbRun(sql, params);
    }

    async get(sql, params) {
      return window.electronAPI.dbGet(sql, params);
    }

    async transaction(operations) {
      // Execute multiple operations atomically
      for (const op of operations) {
        await this.run(op.sql, op.params);
      }
    }
  }

  export const dataService = new DataService();
  ```

### Section 10: Error Handling
- [ ] Wrap all database operations in try/catch
- [ ] Return structured error responses
- [ ] Log database errors
- [ ] Handle constraint violations gracefully

## Technical Details

### Files to Create
- `electron/database/db.cjs` - Database connection
- `electron/database/ipc.cjs` - IPC handlers
- `electron/database/migrations/001_initial.cjs` - Core schema
- `electron/database/migrations/002_vectors.cjs` - Vector tables
- `electron/database/migrations/003_chain_sessions.cjs` - Chain Runner tables
- `src/services/BaseService.js` - Service abstraction
- `src/services/DataService.js` - Direct data access

### Files to Modify
- `electron/main.cjs` - Initialize database on startup
- `electron/preload.cjs` - Expose database API
- `package.json` - Add better-sqlite3 dependency

### Dependencies
```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "sqlite-vss": "^0.1.2-alpha.14"
  }
}
```

### Database Path
```
Windows: %APPDATA%\ai-command-center\database.sqlite
```

### IPC Channels
- `db:query` - Execute SELECT query
- `db:run` - Execute INSERT/UPDATE/DELETE
- `db:get` - Execute SELECT returning single row
- `db:health` - Check database health

## Complete Schema Reference

```sql
-- See full schema in AI-COMMAND-CENTER-PLAN.md Section 7
-- All tables are created in 001_initial migration
```

## Implementation Hints

- better-sqlite3 is synchronous - use worker threads for heavy operations
- WAL mode improves concurrent read performance
- sqlite-vss requires native module compilation
- Consider electron-rebuild for native dependencies
- BLOB columns for embeddings, JSON columns for complex objects
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Database initializes on fresh install
- [ ] Migrations run in order
- [ ] All tables created with correct schema
- [ ] CRUD operations work through IPC
- [ ] WAL mode enabled
- [ ] sqlite-vss loads (or graceful fallback)
- [ ] Error handling prevents crashes
- [ ] Database persists across app restarts
- [ ] Concurrent read operations work

---
**Notes**: The database layer is the foundation for everything. Get this right first. Use WAL mode for performance and sqlite-vss for vector search when available. The migration system ensures smooth upgrades.
