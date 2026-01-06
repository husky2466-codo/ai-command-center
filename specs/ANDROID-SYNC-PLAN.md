# AI Command Center - Android Mobile App & Sync System

**Comprehensive Implementation Plan**

**Created:** 2026-01-03
**Status:** Planning Phase

---

## Executive Summary

This document outlines the complete architecture and implementation plan for an Android companion app for AI Command Center with bi-directional sync capabilities. The mobile app will enable users to manage projects, tasks, reminders, and knowledge on-the-go, with configurable sync intervals and offline-first operation.

---

## Table of Contents

1. [Technology Selection](#1-technology-selection)
2. [Architecture Overview](#2-architecture-overview)
3. [Sync Protocol Design](#3-sync-protocol-design)
4. [Database Schema](#4-database-schema)
5. [API Extensions](#5-api-extensions)
6. [Mobile UI Design](#6-mobile-ui-design)
7. [Settings & Configuration](#7-settings--configuration)
8. [Security Considerations](#8-security-considerations)
9. [Implementation Phases](#9-implementation-phases)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Technology Selection

### Framework Comparison

```
+==================================================================================+
|                    MOBILE FRAMEWORK COMPARISON (2025-2026)                        |
+==================================================================================+
|                                                                                   |
|  CRITERIA          | REACT NATIVE      | FLUTTER           | KOTLIN (NATIVE)    |
|-------------------|-------------------|-------------------|---------------------|
|  Performance      |  Good (New Arch)  |  Excellent        |  Excellent          |
|  Dev Speed        |  Fast             |  Fast             |  Moderate           |
|  Team Skills      |  JS/TS (ACC has)  |  Dart (new)       |  Kotlin (new)       |
|  SQLite Support   |  Excellent (JSI)  |  Good             |  Excellent          |
|  Offline-First    |  Excellent        |  Good             |  Excellent          |
|  Code Reuse       |  ~40% from ACC    |  0%               |  0%                 |
|  Bundle Size      |  ~15-25 MB        |  ~8-15 MB         |  ~5-10 MB           |
|  Community        |  Very Large       |  Large            |  Large              |
|  GitHub Stars     |  121k             |  170k             |  48k (KMP)          |
|  Market Share     |  35%              |  46%              |  23%                |
|                                                                                   |
+==================================================================================+
```

### Recommendation: React Native

**Primary Reasons:**
1. **Code Reuse**: Existing ACC services, utilities, and business logic written in JavaScript can be shared
2. **Team Expertise**: ACC is built with React - same paradigm, same state management patterns
3. **SQLite JSI Libraries**: Modern JSI-native libraries (op-sqlite, react-native-nitro-sqlite) offer near-native performance
4. **Ecosystem Maturity**: Well-documented patterns for offline-first apps
5. **Faster Development**: Single codebase enables simultaneous iOS support in the future

**SQLite Library Choice:** `op-sqlite` (JSI-native, synchronous queries, best performance)

---

## 2. Architecture Overview

### High-Level System Architecture

```
+====================================================================================+
|                           SYSTEM ARCHITECTURE                                       |
+====================================================================================+
|                                                                                     |
|  +---------------------------+          +---------------------------+              |
|  |    DESKTOP (ELECTRON)     |          |     ANDROID (REACT       |              |
|  |                           |          |         NATIVE)          |              |
|  |  +---------------------+  |          |  +---------------------+  |              |
|  |  |   React Frontend    |  |          |  |   React Native UI   |  |              |
|  |  +---------------------+  |          |  +---------------------+  |              |
|  |            |              |          |            |              |              |
|  |  +---------------------+  |          |  +---------------------+  |              |
|  |  |   API Server        |  |          |  |   Sync Service      |  |              |
|  |  |   (Express.js)      |  |          |  |   (Background)      |  |              |
|  |  |   Port: 3939        |  |          |  +---------------------+  |              |
|  |  +---------------------+  |          |            |              |              |
|  |            |              |          |  +---------------------+  |              |
|  |  +---------------------+  |          |  |   SQLite Database   |  |              |
|  |  |   SQLite Database   |  |          |  |   (Local Mirror)    |  |              |
|  |  |   (Primary)         |  |          |  +---------------------+  |              |
|  |  +---------------------+  |          |                           |              |
|  +---------------------------+          +---------------------------+              |
|             ^                                       ^                              |
|             |                                       |                              |
|             |    +---------------------------+      |                              |
|             |    |     SYNC LAYER            |      |                              |
|             +--->|                           |<-----+                              |
|                  |  - Delta Detection        |                                     |
|                  |  - Conflict Resolution    |                                     |
|                  |  - Version Vectors        |                                     |
|                  |  - Batch Operations       |                                     |
|                  +---------------------------+                                     |
|                               |                                                    |
|                  +---------------------------+                                     |
|                  |     NETWORK LAYER         |                                     |
|                  |                           |                                     |
|                  |  - WiFi (Local Network)   |                                     |
|                  |  - HTTPS (Remote/VPN)     |                                     |
|                  |  - mDNS Discovery         |                                     |
|                  +---------------------------+                                     |
|                                                                                    |
+====================================================================================+
```

### Data Flow Architecture

```
+====================================================================================+
|                             DATA FLOW                                              |
+====================================================================================+
|                                                                                    |
|                           USER ACTION (Mobile)                                     |
|                                  |                                                 |
|                                  v                                                 |
|                    +------------------------+                                      |
|                    |  Local SQLite Write    |                                      |
|                    +------------------------+                                      |
|                                  |                                                 |
|                                  v                                                 |
|                    +------------------------+                                      |
|                    |  Create Sync Delta     |                                      |
|                    |  (operation_log)       |                                      |
|                    +------------------------+                                      |
|                                  |                                                 |
|                         [Network Available?]                                       |
|                          /             \                                           |
|                         NO             YES                                         |
|                         |               |                                          |
|                         v               v                                          |
|        +------------------+    +------------------+                                 |
|        | Queue for Later  |    | Send to Desktop  |                                 |
|        | (pending_sync)   |    | POST /api/sync   |                                 |
|        +------------------+    +------------------+                                 |
|                                         |                                          |
|                                         v                                          |
|                              +------------------+                                   |
|                              | Desktop Process  |                                   |
|                              | Apply Changes    |                                   |
|                              +------------------+                                   |
|                                         |                                          |
|                                         v                                          |
|                              +------------------+                                   |
|                              | Return ACK +     |                                   |
|                              | Desktop Changes  |                                   |
|                              +------------------+                                   |
|                                         |                                          |
|                                         v                                          |
|                              +------------------+                                   |
|                              | Mobile Applies   |                                   |
|                              | Desktop Changes  |                                   |
|                              +------------------+                                   |
|                                                                                    |
+====================================================================================+
```

### Component Architecture (Mobile)

```
+====================================================================================+
|                       REACT NATIVE COMPONENT STRUCTURE                             |
+====================================================================================+
|                                                                                    |
|  src/                                                                              |
|  +-- app/                                                                          |
|  |   +-- (tabs)/                     # Tab-based navigation                        |
|  |   |   +-- index.tsx               # Dashboard                                   |
|  |   |   +-- projects.tsx            # Projects list                               |
|  |   |   +-- tasks.tsx               # Tasks list                                  |
|  |   |   +-- reminders.tsx           # Reminders                                   |
|  |   |   +-- knowledge.tsx           # Knowledge base                              |
|  |   +-- project/[id].tsx            # Project detail                              |
|  |   +-- task/[id].tsx               # Task detail                                 |
|  |   +-- settings/                   # Settings screens                            |
|  |       +-- index.tsx               # Settings home                               |
|  |       +-- sync.tsx                # Sync configuration                          |
|  |       +-- connection.tsx          # Desktop connection                          |
|  |                                                                                 |
|  +-- components/                                                                   |
|  |   +-- ui/                         # Reusable UI components                      |
|  |   +-- projects/                   # Project-specific components                 |
|  |   +-- tasks/                      # Task-specific components                    |
|  |   +-- sync/                       # Sync status indicators                      |
|  |                                                                                 |
|  +-- services/                                                                     |
|  |   +-- database/                                                                 |
|  |   |   +-- db.ts                   # Database initialization                     |
|  |   |   +-- migrations/             # Schema migrations                           |
|  |   |   +-- repositories/           # Data access layer                           |
|  |   +-- sync/                                                                     |
|  |   |   +-- SyncService.ts          # Main sync orchestrator                      |
|  |   |   +-- DeltaManager.ts         # Change detection                            |
|  |   |   +-- ConflictResolver.ts     # Conflict resolution                         |
|  |   |   +-- NetworkManager.ts       # Connection handling                         |
|  |   +-- api/                                                                      |
|  |       +-- DesktopClient.ts        # Desktop API client                          |
|  |                                                                                 |
|  +-- hooks/                                                                        |
|  |   +-- useProjects.ts                                                            |
|  |   +-- useTasks.ts                                                               |
|  |   +-- useReminders.ts                                                           |
|  |   +-- useSyncStatus.ts                                                          |
|  |                                                                                 |
|  +-- stores/                         # Zustand stores                              |
|  |   +-- projectStore.ts                                                           |
|  |   +-- syncStore.ts                                                              |
|  |                                                                                 |
|  +-- constants/                                                                    |
|      +-- colors.ts                   # Design system colors                        |
|      +-- syncIntervals.ts            # Sync configuration options                  |
|                                                                                    |
+====================================================================================+
```

---

## 3. Sync Protocol Design

### Sync Model: Delta-Based with Last-Write-Wins

We use a **delta-based sync** model with **Last-Write-Wins (LWW)** conflict resolution. This approach:
- Minimizes data transfer (only changed records sync)
- Works reliably offline
- Is simpler to implement than full CRDT
- Handles most real-world conflicts gracefully

### Sync Metadata Schema

Every syncable entity includes these metadata fields:

```
+--------------------+-----------------------------------------------------------+
| Field              | Purpose                                                   |
+--------------------+-----------------------------------------------------------+
| sync_id            | Globally unique ID (ULID format)                         |
| sync_version       | Monotonic counter, incremented on each change            |
| sync_modified_at   | ISO8601 timestamp of last modification                   |
| sync_device_id     | Device that made the last change                         |
| sync_status        | 'synced' | 'pending' | 'conflict'                       |
| sync_deleted       | Soft delete flag (1 = deleted)                           |
+--------------------+-----------------------------------------------------------+
```

### Operation Log Structure

```sql
CREATE TABLE operation_log (
    id TEXT PRIMARY KEY,                    -- ULID
    entity_type TEXT NOT NULL,              -- 'project', 'task', 'reminder', etc.
    entity_id TEXT NOT NULL,                -- ID of the modified entity
    operation TEXT NOT NULL,                -- 'create', 'update', 'delete'
    changes TEXT,                           -- JSON: { field: { old: x, new: y } }
    device_id TEXT NOT NULL,                -- Device that made the change
    created_at TEXT NOT NULL,               -- ISO8601 timestamp
    synced_at TEXT,                         -- NULL until synced
    ack_received INTEGER DEFAULT 0          -- 1 when desktop acknowledged
);
```

### Sync Protocol Flow

```
+====================================================================================+
|                           SYNC PROTOCOL SEQUENCE                                   |
+====================================================================================+
|                                                                                    |
|  MOBILE                                DESKTOP                                     |
|    |                                      |                                        |
|    |  1. POST /api/sync/init              |                                        |
|    |  { device_id, last_sync_token }      |                                        |
|    |------------------------------------->|                                        |
|    |                                      |                                        |
|    |  2. Response: { session_id,          |                                        |
|    |     desktop_version }                |                                        |
|    |<-------------------------------------|                                        |
|    |                                      |                                        |
|    |  3. POST /api/sync/push              |                                        |
|    |  { session_id, operations: [...] }   |                                        |
|    |------------------------------------->|                                        |
|    |                                      |                                        |
|    |            [Desktop processes changes, detects conflicts]                     |
|    |                                      |                                        |
|    |  4. Response: { applied: [...],      |                                        |
|    |     conflicts: [...] }               |                                        |
|    |<-------------------------------------|                                        |
|    |                                      |                                        |
|    |  5. GET /api/sync/pull               |                                        |
|    |  { session_id, since_version }       |                                        |
|    |------------------------------------->|                                        |
|    |                                      |                                        |
|    |  6. Response: { changes: [...],      |                                        |
|    |     new_sync_token }                 |                                        |
|    |<-------------------------------------|                                        |
|    |                                      |                                        |
|    |  7. POST /api/sync/ack               |                                        |
|    |  { session_id, received_ids: [...] } |                                        |
|    |------------------------------------->|                                        |
|    |                                      |                                        |
|    |  8. Response: { complete: true }     |                                        |
|    |<-------------------------------------|                                        |
|    |                                      |                                        |
+====================================================================================+
```

### Conflict Resolution Strategy

```
+====================================================================================+
|                         CONFLICT RESOLUTION RULES                                  |
+====================================================================================+
|                                                                                    |
|  CONFLICT TYPE              | RESOLUTION STRATEGY                                  |
|----------------------------|-----------------------------------------------------|
|  Same field, different     | Last-Write-Wins (by sync_modified_at)               |
|  values                    |                                                     |
|                            |                                                     |
|  Record deleted on one     | Delete wins (tombstone preserved for 30 days)       |
|  device, modified on other |                                                     |
|                            |                                                     |
|  New records with same ID  | Should not happen (ULIDs are unique)                |
|  (impossible with ULIDs)   |                                                     |
|                            |                                                     |
|  Parent deleted, child     | Orphan child (set parent_id to NULL)                |
|  still references it       |                                                     |
|                            |                                                     |
|  Status changes            | More "complete" status wins:                        |
|                            | pending < in_progress < completed                   |
|                            |                                                     |
+====================================================================================+
|                                                                                    |
|  CONFLICT DETECTION:                                                               |
|                                                                                    |
|  if (mobile.sync_version != desktop.sync_version) {                               |
|      if (mobile.sync_modified_at > desktop.sync_modified_at) {                    |
|          // Mobile wins                                                            |
|          apply_mobile_changes();                                                   |
|      } else {                                                                      |
|          // Desktop wins                                                           |
|          send_desktop_version_to_mobile();                                        |
|      }                                                                             |
|  }                                                                                 |
|                                                                                    |
+====================================================================================+
```

### Sync Intervals Configuration

```
+---------------------------+--------------------------------------------------+
| Interval Option           | Use Case                                         |
+---------------------------+--------------------------------------------------+
| Manual Only               | Full user control, battery saver                 |
| 30 minutes                | Active work session                              |
| 1 hour                    | Moderate activity (default)                      |
| 2 hours                   | Light use                                        |
| 4 hours                   | Background sync only                             |
| Daily (once per day)      | Minimal sync, maximum battery                    |
| On WiFi Only              | Preserve mobile data                             |
+---------------------------+--------------------------------------------------+
```

---

## 4. Database Schema

### Mobile Database Schema (Mirrors Desktop with Sync Metadata)

```sql
-- ==========================================================================
-- SYNC METADATA TABLE
-- ==========================================================================

CREATE TABLE sync_metadata (
    id INTEGER PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE,           -- This device's unique ID
    device_name TEXT,                         -- User-friendly name
    desktop_url TEXT,                         -- Desktop connection URL
    last_sync_at TEXT,                        -- ISO8601
    last_sync_token TEXT,                     -- Checkpoint token
    sync_interval TEXT DEFAULT '1h',          -- Configured interval
    selective_sync TEXT                       -- JSON: which entities to sync
);

-- ==========================================================================
-- PROJECTS (with sync metadata)
-- ==========================================================================

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    space_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('active_focus', 'on_deck', 'growing', 'on_hold', 'completed')) DEFAULT 'on_deck',
    progress REAL DEFAULT 0,
    deadline TEXT,
    planning_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync metadata
    sync_version INTEGER DEFAULT 1,
    sync_modified_at TEXT DEFAULT (datetime('now')),
    sync_device_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    sync_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_projects_sync ON projects(sync_status, sync_modified_at);
CREATE INDEX idx_projects_status ON projects(status);

-- ==========================================================================
-- TASKS (with sync metadata)
-- ==========================================================================

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    energy_type TEXT CHECK(energy_type IN ('low', 'medium', 'deep_work', 'creative', 'quick_win', 'execution', 'people_work')),
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
    due_date TEXT,
    sort_order INTEGER DEFAULT 0,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync metadata
    sync_version INTEGER DEFAULT 1,
    sync_modified_at TEXT DEFAULT (datetime('now')),
    sync_device_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    sync_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_tasks_sync ON tasks(sync_status, sync_modified_at);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ==========================================================================
-- REMINDERS (with sync metadata)
-- ==========================================================================

CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_at TEXT,
    is_recurring INTEGER DEFAULT 0,
    recurrence_rule TEXT,
    snooze_count INTEGER DEFAULT 0,
    snoozed_until TEXT,
    status TEXT CHECK(status IN ('pending', 'completed', 'snoozed')) DEFAULT 'pending',
    source_type TEXT,
    source_id TEXT,
    url TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync metadata
    sync_version INTEGER DEFAULT 1,
    sync_modified_at TEXT DEFAULT (datetime('now')),
    sync_device_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    sync_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_reminders_sync ON reminders(sync_status, sync_modified_at);
CREATE INDEX idx_reminders_due ON reminders(due_at);

-- ==========================================================================
-- KNOWLEDGE ARTICLES (with sync metadata)
-- ==========================================================================

CREATE TABLE knowledge_articles (
    id TEXT PRIMARY KEY,
    folder_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    source_url TEXT,
    tags TEXT,
    is_spark INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync metadata
    sync_version INTEGER DEFAULT 1,
    sync_modified_at TEXT DEFAULT (datetime('now')),
    sync_device_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    sync_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_knowledge_sync ON knowledge_articles(sync_status, sync_modified_at);

-- ==========================================================================
-- KNOWLEDGE FOLDERS (with sync metadata)
-- ==========================================================================

CREATE TABLE knowledge_folders (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES knowledge_folders(id),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,

    -- Sync metadata
    sync_version INTEGER DEFAULT 1,
    sync_modified_at TEXT DEFAULT (datetime('now')),
    sync_device_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    sync_deleted INTEGER DEFAULT 0
);

-- ==========================================================================
-- SPACES (with sync metadata)
-- ==========================================================================

CREATE TABLE spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8b5cf6',
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync metadata
    sync_version INTEGER DEFAULT 1,
    sync_modified_at TEXT DEFAULT (datetime('now')),
    sync_device_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    sync_deleted INTEGER DEFAULT 0
);

-- ==========================================================================
-- OPERATION LOG (for sync)
-- ==========================================================================

CREATE TABLE operation_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    changes TEXT,
    device_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    ack_received INTEGER DEFAULT 0
);

CREATE INDEX idx_oplog_pending ON operation_log(synced_at) WHERE synced_at IS NULL;
CREATE INDEX idx_oplog_entity ON operation_log(entity_type, entity_id);

-- ==========================================================================
-- SYNC CONFLICTS (for user review)
-- ==========================================================================

CREATE TABLE sync_conflicts (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_data TEXT NOT NULL,
    remote_data TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    resolved_at TEXT,
    resolution TEXT                           -- 'local', 'remote', 'merged', 'ignored'
);
```

### Desktop Schema Additions

The desktop database needs these new tables added via migration:

```sql
-- Migration: 012_sync_support.cjs

-- Device registry (track all connected mobile devices)
CREATE TABLE sync_devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,                   -- 'android', 'ios'
    last_seen_at TEXT,
    last_sync_at TEXT,
    sync_version INTEGER DEFAULT 0,
    is_authorized INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Sync sessions (track active sync operations)
CREATE TABLE sync_sessions (
    id TEXT PRIMARY KEY,
    device_id TEXT REFERENCES sync_devices(id),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    operations_pushed INTEGER DEFAULT 0,
    operations_pulled INTEGER DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'              -- 'active', 'completed', 'failed'
);

-- Add sync columns to existing tables
ALTER TABLE projects ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN sync_modified_at TEXT;
ALTER TABLE projects ADD COLUMN sync_device_id TEXT;

ALTER TABLE tasks ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN sync_modified_at TEXT;
ALTER TABLE tasks ADD COLUMN sync_device_id TEXT;

ALTER TABLE reminders ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE reminders ADD COLUMN sync_modified_at TEXT;
ALTER TABLE reminders ADD COLUMN sync_device_id TEXT;

ALTER TABLE knowledge_articles ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE knowledge_articles ADD COLUMN sync_modified_at TEXT;
ALTER TABLE knowledge_articles ADD COLUMN sync_device_id TEXT;

ALTER TABLE knowledge_folders ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE knowledge_folders ADD COLUMN sync_modified_at TEXT;
ALTER TABLE knowledge_folders ADD COLUMN sync_device_id TEXT;

ALTER TABLE spaces ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE spaces ADD COLUMN sync_modified_at TEXT;
ALTER TABLE spaces ADD COLUMN sync_device_id TEXT;
```

---

## 5. API Extensions

### New Sync Endpoints for Desktop

```
+====================================================================================+
|                         SYNC API ENDPOINTS                                         |
+====================================================================================+
|                                                                                    |
|  ENDPOINT                          | METHOD | PURPOSE                              |
|-----------------------------------|--------|--------------------------------------|
|  /api/sync/discover               | GET    | mDNS discovery endpoint              |
|  /api/sync/pair                   | POST   | Initiate device pairing              |
|  /api/sync/pair/confirm           | POST   | Confirm pairing with code            |
|  /api/sync/init                   | POST   | Start sync session                   |
|  /api/sync/push                   | POST   | Push mobile changes to desktop       |
|  /api/sync/pull                   | GET    | Pull desktop changes to mobile       |
|  /api/sync/ack                    | POST   | Acknowledge received changes         |
|  /api/sync/status                 | GET    | Get sync status for device           |
|  /api/sync/devices                | GET    | List all paired devices              |
|  /api/sync/devices/:id            | DELETE | Unpair a device                      |
|  /api/sync/settings               | GET    | Get sync configuration               |
|  /api/sync/settings               | PUT    | Update sync configuration            |
|                                                                                    |
+====================================================================================+
```

### Endpoint Specifications

#### POST /api/sync/pair
```json
// Request
{
    "device_id": "ulid_device_123",
    "device_name": "Ross's Pixel 8",
    "platform": "android",
    "app_version": "1.0.0"
}

// Response
{
    "success": true,
    "data": {
        "pairing_code": "847293",
        "expires_at": "2026-01-03T10:35:00Z",
        "desktop_name": "Ross's Desktop"
    }
}
```

#### POST /api/sync/init
```json
// Request
{
    "device_id": "ulid_device_123",
    "last_sync_token": "token_abc123",
    "client_version": "1.0.0"
}

// Response
{
    "success": true,
    "data": {
        "session_id": "sync_session_456",
        "desktop_version": "2.0.0",
        "server_time": "2026-01-03T10:30:00Z",
        "pending_changes_count": 47
    }
}
```

#### POST /api/sync/push
```json
// Request
{
    "session_id": "sync_session_456",
    "operations": [
        {
            "id": "op_001",
            "entity_type": "task",
            "entity_id": "task_abc",
            "operation": "update",
            "changes": {
                "status": { "old": "pending", "new": "completed" },
                "completed_at": { "old": null, "new": "2026-01-03T09:15:00Z" }
            },
            "sync_version": 3,
            "sync_modified_at": "2026-01-03T09:15:00Z"
        }
    ]
}

// Response
{
    "success": true,
    "data": {
        "applied": ["op_001"],
        "conflicts": [],
        "rejected": []
    }
}
```

#### GET /api/sync/pull
```json
// Request Query Params
// ?session_id=sync_session_456&since_version=42&limit=100

// Response
{
    "success": true,
    "data": {
        "changes": [
            {
                "entity_type": "project",
                "entity_id": "proj_xyz",
                "operation": "update",
                "data": {
                    "name": "AI Command Center",
                    "progress": 0.75,
                    "sync_version": 15
                },
                "sync_modified_at": "2026-01-03T08:00:00Z"
            }
        ],
        "has_more": false,
        "new_sync_token": "token_def456",
        "server_version": 89
    }
}
```

---

## 6. Mobile UI Design

### Navigation Structure

```
+====================================================================================+
|                           MOBILE APP NAVIGATION                                    |
+====================================================================================+
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                         HEADER BAR                                    |        |
|  |  [<]  AI Command Center                              [Sync] [Settings]|        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |                         CONTENT AREA                                  |        |
|  |                                                                       |        |
|  |     (Dashboard / Projects / Tasks / Reminders / Knowledge)            |        |
|  |                                                                       |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |   [Home]    [Projects]    [Tasks]    [Reminders]    [Knowledge]       |        |
|  |     O          #            v            !              ?             |        |
|  +-----------------------------------------------------------------------+        |
|                           BOTTOM TAB BAR                                          |
|                                                                                    |
+====================================================================================+
```

### Dashboard Screen

```
+====================================================================================+
|                              DASHBOARD                                             |
+====================================================================================+
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  | AI Command Center                                    [Synced 5m ago] |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------+  +--------------------------------+        |
|  |          ACTIVE FOCUS             |  |         QUICK STATS           |        |
|  |  +-----------------------------+  |  |                                |        |
|  |  | Mobile App Project      75% |  |  |   Projects: 12                 |        |
|  |  | [====================   ]   |  |  |   Tasks Due: 5                 |        |
|  |  +-----------------------------+  |  |   Reminders: 3                 |        |
|  |                                   |  |   Knowledge: 47                |        |
|  +-----------------------------------+  +--------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                        TODAY'S TASKS                                  |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  [ ] Review pull request #234                          Deep Work     |        |
|  |  [ ] Update documentation                              Quick Win     |        |
|  |  [x] Team standup                                      People Work   |        |
|  |  [ ] Fix sync bug                                      Execution     |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                      UPCOMING REMINDERS                               |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  [!] Call client @ 2:00 PM                             [Snooze]      |        |
|  |  [!] Submit report                      Due Tomorrow   [Snooze]      |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-------+   +----------+   +-------+   +-----------+   +-----------+            |
|  | Home  |   | Projects |   | Tasks |   | Reminders |   | Knowledge |            |
|  |   *   |   |          |   |       |   |           |   |           |            |
|  +-------+   +----------+   +-------+   +-----------+   +-----------+            |
|                                                                                    |
+====================================================================================+
```

### Projects List Screen

```
+====================================================================================+
|                              PROJECTS                                              |
+====================================================================================+
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  | Projects                                    [Filter v] [+ New Project]|        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  | [Search projects...]                                                  |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                        ACTIVE FOCUS (2)                               |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  +-------------------------------------------------------------------+|        |
|  |  | AI Command Center                                                 ||        |
|  |  | [===================    ] 75%                                     ||        |
|  |  | 5 tasks remaining  |  Due: Jan 15                                 ||        |
|  |  +-------------------------------------------------------------------+|        |
|  |                                                                       |        |
|  |  +-------------------------------------------------------------------+|        |
|  |  | Mobile App Development                                            ||        |
|  |  | [=========                ] 35%                                   ||        |
|  |  | 12 tasks remaining  |  Due: Feb 28                                ||        |
|  |  +-------------------------------------------------------------------+|        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                          ON DECK (4)                                  |        |
|  +-----------------------------------------------------------------------+        |
|  |  [collapsed - tap to expand]                                          |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-------+   +----------+   +-------+   +-----------+   +-----------+            |
|  | Home  |   | Projects |   | Tasks |   | Reminders |   | Knowledge |            |
|  |       |   |    *     |   |       |   |           |   |           |            |
|  +-------+   +----------+   +-------+   +-----------+   +-----------+            |
|                                                                                    |
+====================================================================================+
```

### Task Detail Screen

```
+====================================================================================+
|                              TASK DETAIL                                           |
+====================================================================================+
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  | [<] Task                                              [Edit] [Delete] |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Review pull request #234                                             |        |
|  |                                                                       |        |
|  |  +----------------------------------+                                 |        |
|  |  | Status: [ ] Pending              |                                 |        |
|  |  |         [ ] In Progress          |                                 |        |
|  |  |         [*] Completed            |                                 |        |
|  |  +----------------------------------+                                 |        |
|  |                                                                       |        |
|  |  Project:   AI Command Center                                         |        |
|  |  Energy:    [###] Deep Work                                           |        |
|  |  Due:       Jan 5, 2026                                               |        |
|  |                                                                       |        |
|  |  +---------------------------------------------------------------+   |        |
|  |  | Description                                                    |   |        |
|  |  |                                                                |   |        |
|  |  | Review the sync implementation PR. Check for:                  |   |        |
|  |  | - Edge cases in conflict resolution                            |   |        |
|  |  | - Error handling                                               |   |        |
|  |  | - Test coverage                                                |   |        |
|  |  |                                                                |   |        |
|  |  +---------------------------------------------------------------+   |        |
|  |                                                                       |        |
|  |  +---------------------------------------------------------------+   |        |
|  |  |               [Mark Complete]                                  |   |        |
|  |  +---------------------------------------------------------------+   |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  Sync Status: Pending (will sync in 45m)                                          |
|                                                                                    |
+====================================================================================+
```

### Sync Status Indicator

```
+====================================================================================+
|                           SYNC STATUS STATES                                       |
+====================================================================================+
|                                                                                    |
|  STATE 1: SYNCED                                                                   |
|  +------------------------------------------+                                      |
|  |  [checkmark]  Synced 5 minutes ago       |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
|  STATE 2: SYNCING                                                                  |
|  +------------------------------------------+                                      |
|  |  [spinner]  Syncing... 23/47             |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
|  STATE 3: PENDING                                                                  |
|  +------------------------------------------+                                      |
|  |  [clock]  3 changes pending              |                                      |
|  |           Next sync in 45m               |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
|  STATE 4: OFFLINE                                                                  |
|  +------------------------------------------+                                      |
|  |  [cloud-off]  Offline                    |                                      |
|  |               12 changes queued          |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
|  STATE 5: CONFLICT                                                                 |
|  +------------------------------------------+                                      |
|  |  [warning]  2 conflicts need review      |                                      |
|  |             [Resolve Now]                |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
|  STATE 6: ERROR                                                                    |
|  +------------------------------------------+                                      |
|  |  [error]  Sync failed                    |                                      |
|  |           Connection refused             |                                      |
|  |           [Retry] [Details]              |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
+====================================================================================+
```

---

## 7. Settings & Configuration

### Desktop Sync Settings Screen

```
+====================================================================================+
|                      DESKTOP: SYNC SETTINGS (in Admin)                             |
+====================================================================================+
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  | [<] Settings                                                          |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                         MOBILE SYNC                                   |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Enable Mobile Sync                                    [Toggle: ON]  |        |
|  |                                                                       |        |
|  |  API Port: 3939                                                       |        |
|  |  (Sync uses the existing API server)                                  |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                       PAIRED DEVICES                                  |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  +-------------------------------------------------------------------+|        |
|  |  | Ross's Pixel 8                                                    ||        |
|  |  | Android  |  Last sync: 5 min ago  |  Status: Active               ||        |
|  |  |                                                    [Unpair]       ||        |
|  |  +-------------------------------------------------------------------+|        |
|  |                                                                       |        |
|  |  +-------------------------------------------------------------------+|        |
|  |  | iPad Pro                                                          ||        |
|  |  | iOS  |  Last sync: 2 days ago  |  Status: Inactive                ||        |
|  |  |                                                    [Unpair]       ||        |
|  |  +-------------------------------------------------------------------+|        |
|  |                                                                       |        |
|  |                [+ Pair New Device]                                    |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                     SYNC CONFIGURATION                                |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  What to Sync:                                                        |        |
|  |    [x] Projects and Tasks                                             |        |
|  |    [x] Reminders                                                      |        |
|  |    [x] Knowledge Base                                                 |        |
|  |    [ ] DGX Spark Data                                                 |        |
|  |    [ ] Chat History                                                   |        |
|  |    [ ] Memories                                                       |        |
|  |                                                                       |        |
|  |  Conflict Resolution:                                                 |        |
|  |    (*) Last-write-wins (automatic)                                    |        |
|  |    ( ) Always prefer desktop                                          |        |
|  |    ( ) Always prefer mobile                                           |        |
|  |    ( ) Ask me every time                                              |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                    ADVANCED OPTIONS                                   |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Network Discovery (mDNS):                            [Toggle: ON]   |        |
|  |  (Allows mobile to find desktop on local network)                     |        |
|  |                                                                       |        |
|  |  Require Authentication:                              [Toggle: ON]   |        |
|  |  (Mobile must enter pairing code)                                     |        |
|  |                                                                       |        |
|  |  Keep Deleted Records For:                            [30 days v]    |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
+====================================================================================+
```

### Mobile Sync Settings Screen

```
+====================================================================================+
|                        MOBILE: SYNC SETTINGS                                       |
+====================================================================================+
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  | [<] Sync Settings                                                     |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                     CONNECTION STATUS                                 |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Desktop: Ross's Desktop                                              |        |
|  |  Status:  [*] Connected                                               |        |
|  |  Address: 192.168.1.100:3939                                          |        |
|  |                                                                       |        |
|  |                    [Disconnect]  [Re-pair]                            |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                      SYNC INTERVAL                                    |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Auto-sync frequency:                                                 |        |
|  |                                                                       |        |
|  |  ( ) Manual only                                                      |        |
|  |  ( ) Every 30 minutes                                                 |        |
|  |  (*) Every hour                                                       |        |
|  |  ( ) Every 2 hours                                                    |        |
|  |  ( ) Every 4 hours                                                    |        |
|  |  ( ) Once daily                                                       |        |
|  |                                                                       |        |
|  |  [x] Only sync on WiFi                                                |        |
|  |  [x] Sync when app opens                                              |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                      SELECTIVE SYNC                                   |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Choose what to sync:                                                 |        |
|  |                                                                       |        |
|  |  [x] Projects (12)                                                    |        |
|  |  [x] Tasks (47)                                                       |        |
|  |  [x] Reminders (8)                                                    |        |
|  |  [x] Knowledge Articles (156)                                         |        |
|  |  [ ] Knowledge (full content)                    ~45 MB               |        |
|  |                                                                       |        |
|  |  Total sync size: ~2.3 MB                                             |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                         ACTIONS                                       |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |              [Sync Now]                                               |        |
|  |                                                                       |        |
|  |              [View Sync History]                                      |        |
|  |                                                                       |        |
|  |              [Reset Local Data]                                       |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                       SYNC STATS                                      |        |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Last sync: Jan 3, 2026 10:25 AM                                      |        |
|  |  Records synced: 223                                                  |        |
|  |  Conflicts resolved: 0                                                |        |
|  |  Errors: 0                                                            |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
+====================================================================================+
```

### Mobile Pairing Flow

```
+====================================================================================+
|                         PAIRING FLOW (MOBILE)                                      |
+====================================================================================+
|                                                                                    |
|  STEP 1: SCAN/ENTER                                                                |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |              Connect to Desktop                                       |        |
|  |                                                                       |        |
|  |  +-----------------------------------------------------------+       |        |
|  |  |                                                           |       |        |
|  |  |                   [QR Code Scanner]                       |       |        |
|  |  |                                                           |       |        |
|  |  |              Scan QR code from desktop                    |       |        |
|  |  |                                                           |       |        |
|  |  +-----------------------------------------------------------+       |        |
|  |                                                                       |        |
|  |                         - OR -                                        |        |
|  |                                                                       |        |
|  |  Enter desktop address manually:                                      |        |
|  |  +-----------------------------------------------------------+       |        |
|  |  |  192.168.1.100:3939                                       |       |        |
|  |  +-----------------------------------------------------------+       |        |
|  |                                                                       |        |
|  |                     [Connect]                                         |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  STEP 2: VERIFY                                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |              Enter Pairing Code                                       |        |
|  |                                                                       |        |
|  |  A 6-digit code is shown on your desktop.                             |        |
|  |  Enter it below to confirm the connection.                            |        |
|  |                                                                       |        |
|  |  +-----------------------------------------------------------+       |        |
|  |  |                                                           |       |        |
|  |  |               [8] [4] [7] [2] [9] [3]                     |       |        |
|  |  |                                                           |       |        |
|  |  +-----------------------------------------------------------+       |        |
|  |                                                                       |        |
|  |                     [Verify]                                          |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  STEP 3: INITIAL SYNC                                                              |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |              Initial Sync                                             |        |
|  |                                                                       |        |
|  |              [====================    ] 78%                           |        |
|  |                                                                       |        |
|  |              Syncing projects...                                      |        |
|  |              178 of 223 records                                       |        |
|  |                                                                       |        |
|  |              This may take a few minutes on first sync.               |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  STEP 4: COMPLETE                                                                  |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |              [checkmark] Connected!                                   |        |
|  |                                                                       |        |
|  |  You're now connected to:                                             |        |
|  |  Ross's Desktop                                                       |        |
|  |                                                                       |        |
|  |  223 records synced                                                   |        |
|  |  Auto-sync: Every hour                                                |        |
|  |                                                                       |        |
|  |                     [Get Started]                                     |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
+====================================================================================+
```

---

## 8. Security Considerations

### Authentication & Authorization

```
+====================================================================================+
|                        SECURITY ARCHITECTURE                                       |
+====================================================================================+
|                                                                                    |
|  LAYER 1: DEVICE PAIRING                                                           |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  - 6-digit pairing code (expires in 5 minutes)                        |        |
|  |  - Code displayed on desktop, entered on mobile                       |        |
|  |  - Prevents unauthorized device connections                           |        |
|  |  - Rate limited: 3 attempts per minute                                |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  LAYER 2: DEVICE AUTHENTICATION                                                    |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  - Ed25519 keypair generated on device during pairing                 |        |
|  |  - Public key stored on desktop, private key on mobile                |        |
|  |  - All sync requests signed with device private key                   |        |
|  |  - Desktop verifies signature before processing                       |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  LAYER 3: TRANSPORT SECURITY                                                       |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Local Network (same WiFi):                                           |        |
|  |    - HTTP with signed requests (keypair auth)                         |        |
|  |    - mDNS for discovery                                               |        |
|  |                                                                       |        |
|  |  Remote Access (over internet):                                       |        |
|  |    - HTTPS required (self-signed cert or user-provided)               |        |
|  |    - VPN or Tailscale recommended for direct connection               |        |
|  |    - Optional: Cloudflare Tunnel for public access                    |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
|  LAYER 4: DATA PROTECTION                                                          |
|  +-----------------------------------------------------------------------+        |
|  |                                                                       |        |
|  |  Mobile Database:                                                     |        |
|  |    - SQLCipher encryption (AES-256)                                   |        |
|  |    - Encryption key derived from device secure enclave                |        |
|  |    - Database wiped on 10 failed unlock attempts                      |        |
|  |                                                                       |        |
|  |  Sensitive Data:                                                      |        |
|  |    - API keys never synced to mobile                                  |        |
|  |    - OAuth tokens never synced to mobile                              |        |
|  |    - Passwords never synced to mobile                                 |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
+====================================================================================+
```

### Threat Model

```
+====================================================================================+
|                           THREAT MODEL                                             |
+====================================================================================+
|                                                                                    |
|  THREAT                    | MITIGATION                                            |
|---------------------------|-----------------------------------------------------|
|  Rogue device connects    | Pairing code + device keypair authentication         |
|                           |                                                       |
|  Man-in-the-middle        | Signed requests + HTTPS for remote                   |
|                           |                                                       |
|  Lost/stolen phone        | SQLCipher encryption + remote wipe capability        |
|                           |                                                       |
|  Malicious app access     | Android Keystore for private key storage             |
|                           |                                                       |
|  Data exfiltration        | Selective sync (sensitive data excluded)             |
|                           |                                                       |
|  Replay attacks           | Timestamp + nonce in signed requests                 |
|                           |                                                       |
|  Brute force pairing      | Rate limiting + exponential backoff                  |
|                           |                                                       |
+====================================================================================+
```

### Data Classification

```
+====================================================================================+
|                        DATA SYNC CLASSIFICATION                                    |
+====================================================================================+
|                                                                                    |
|  GREEN (Always Sync):                                                              |
|    - Projects (name, description, status, progress)                                |
|    - Tasks (title, description, status, due date)                                  |
|    - Reminders (title, description, due date)                                      |
|    - Knowledge folders (name, hierarchy)                                           |
|    - Knowledge articles (title, content, tags)                                     |
|    - Spaces (name, color, icon)                                                    |
|                                                                                    |
|  YELLOW (Optional Sync, User Choice):                                              |
|    - Full knowledge article content (can be large)                                 |
|    - Contact information                                                           |
|    - Meeting notes                                                                 |
|    - Chat history (text only)                                                      |
|                                                                                    |
|  RED (Never Sync):                                                                 |
|    - API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)                           |
|    - OAuth tokens (Google, etc.)                                                   |
|    - SSH keys                                                                      |
|    - DGX connection credentials                                                    |
|    - Email content (synced via Google directly)                                    |
|    - Embeddings (BLOB data)                                                        |
|    - Raw data fields                                                               |
|                                                                                    |
+====================================================================================+
```

---

## 9. Implementation Phases

### Phase Overview

```
+====================================================================================+
|                        IMPLEMENTATION TIMELINE                                     |
+====================================================================================+
|                                                                                    |
|  +--------+--------+--------+--------+--------+--------+--------+--------+        |
|  | Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Week 6 | Week 7 | Week 8 |        |
|  +--------+--------+--------+--------+--------+--------+--------+--------+        |
|  |                                                                       |        |
|  |  PHASE 1: Desktop Sync API                                            |        |
|  |  [==================]                                                 |        |
|  |                                                                       |        |
|  |            PHASE 2: Mobile Foundation                                 |        |
|  |            [===================]                                      |        |
|  |                                                                       |        |
|  |                       PHASE 3: Core Features                          |        |
|  |                       [===================]                           |        |
|  |                                                                       |        |
|  |                                  PHASE 4: Sync Integration            |        |
|  |                                  [===============]                    |        |
|  |                                                                       |        |
|  |                                           PHASE 5: Polish & Release   |        |
|  |                                           [================]          |        |
|  |                                                                       |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
+====================================================================================+
```

### Phase 1: Desktop Sync API (Weeks 1-2)

**Objective:** Add sync infrastructure to the desktop app

```markdown
## Phase 1 Tasks

### Week 1: Database & Core APIs

- [ ] Create migration 012_sync_support.cjs
  - [ ] Add sync_devices table
  - [ ] Add sync_sessions table
  - [ ] Add sync columns to projects, tasks, reminders, knowledge_articles, spaces
  - [ ] Create indexes for sync queries

- [ ] Create electron/api/routes/sync.cjs
  - [ ] GET /api/sync/discover (mDNS info)
  - [ ] POST /api/sync/pair (initiate pairing)
  - [ ] POST /api/sync/pair/confirm (verify pairing code)

- [ ] Create electron/services/syncService.cjs
  - [ ] Device registration logic
  - [ ] Pairing code generation (6-digit, 5-min expiry)
  - [ ] Device keypair storage

### Week 2: Sync Protocol Implementation

- [ ] Complete sync.cjs routes
  - [ ] POST /api/sync/init (start session)
  - [ ] POST /api/sync/push (receive changes)
  - [ ] GET /api/sync/pull (send changes)
  - [ ] POST /api/sync/ack (acknowledge receipt)
  - [ ] GET /api/sync/status
  - [ ] GET /api/sync/devices
  - [ ] DELETE /api/sync/devices/:id

- [ ] Implement conflict detection in syncService.cjs
  - [ ] Version comparison logic
  - [ ] Last-write-wins resolution
  - [ ] Conflict logging

- [ ] Add sync triggers to existing routes
  - [ ] Update projects.cjs to increment sync_version
  - [ ] Update tasks.cjs to increment sync_version
  - [ ] Update reminders.cjs to increment sync_version
  - [ ] Update knowledge.cjs to increment sync_version

- [ ] Create desktop sync settings UI
  - [ ] Add SyncSettings.jsx to Admin module
  - [ ] Display paired devices
  - [ ] Pairing code display modal
  - [ ] Selective sync configuration
```

**Deliverables:**
- Functional sync API endpoints
- Desktop sync settings panel
- Device pairing system
- Database schema with sync metadata

### Phase 2: Mobile Foundation (Weeks 2-4)

**Objective:** Set up React Native project with core infrastructure

```markdown
## Phase 2 Tasks

### Week 2-3: Project Setup

- [ ] Initialize React Native project
  - [ ] npx create-expo-app acc-mobile
  - [ ] Configure TypeScript
  - [ ] Set up ESLint + Prettier

- [ ] Install core dependencies
  - [ ] op-sqlite (JSI SQLite)
  - [ ] @react-navigation/native
  - [ ] @react-navigation/bottom-tabs
  - [ ] zustand (state management)
  - [ ] react-native-mmkv (secure storage)

- [ ] Set up project structure
  - [ ] Create app/, components/, services/, hooks/, stores/
  - [ ] Configure path aliases

- [ ] Implement design system
  - [ ] Create constants/colors.ts (from ACC design system)
  - [ ] Create base UI components (Button, Card, Input, etc.)
  - [ ] Implement theme provider

### Week 3-4: Database Layer

- [ ] Create database service
  - [ ] services/database/db.ts
  - [ ] Initialize op-sqlite with encryption (SQLCipher)
  - [ ] Migration runner

- [ ] Implement migrations
  - [ ] 001_initial.ts (all tables from schema)
  - [ ] Create migration runner

- [ ] Create repositories
  - [ ] ProjectRepository.ts
  - [ ] TaskRepository.ts
  - [ ] ReminderRepository.ts
  - [ ] KnowledgeRepository.ts
  - [ ] SyncMetadataRepository.ts
  - [ ] OperationLogRepository.ts

- [ ] Create React hooks
  - [ ] useProjects.ts
  - [ ] useTasks.ts
  - [ ] useReminders.ts
  - [ ] useKnowledgeArticles.ts
```

**Deliverables:**
- React Native project with navigation
- SQLite database with encryption
- Repository pattern for data access
- Base UI components matching design system

### Phase 3: Core Features (Weeks 4-6)

**Objective:** Build main app screens with offline-first data

```markdown
## Phase 3 Tasks

### Week 4-5: Screen Development

- [ ] Dashboard screen
  - [ ] Active focus project card
  - [ ] Today's tasks list
  - [ ] Upcoming reminders
  - [ ] Quick stats

- [ ] Projects screens
  - [ ] Projects list with filtering
  - [ ] Project detail screen
  - [ ] Create/edit project form
  - [ ] Task list within project

- [ ] Tasks screens
  - [ ] All tasks list
  - [ ] Task detail screen
  - [ ] Create/edit task form
  - [ ] Status toggle (checkmark)
  - [ ] Energy type selector

- [ ] Reminders screens
  - [ ] Reminders list
  - [ ] Create/edit reminder form
  - [ ] Snooze functionality
  - [ ] Due date picker

### Week 5-6: Knowledge & Settings

- [ ] Knowledge screens
  - [ ] Folders tree view
  - [ ] Articles list
  - [ ] Article detail (read-only initially)
  - [ ] Search functionality

- [ ] Settings screens
  - [ ] Settings home
  - [ ] Sync configuration (placeholder)
  - [ ] Connection status (placeholder)
  - [ ] About screen

- [ ] Cross-cutting features
  - [ ] Pull-to-refresh on lists
  - [ ] Empty states
  - [ ] Loading states
  - [ ] Error handling UI
```

**Deliverables:**
- All main screens functional with local data
- CRUD operations for all entities
- Offline-capable app

### Phase 4: Sync Integration (Weeks 6-7)

**Objective:** Connect mobile app to desktop sync API

```markdown
## Phase 4 Tasks

### Week 6: Sync Service Core

- [ ] Create network services
  - [ ] services/api/DesktopClient.ts
  - [ ] mDNS discovery (react-native-zeroconf)
  - [ ] HTTP client with retry logic

- [ ] Create sync service
  - [ ] services/sync/SyncService.ts
  - [ ] services/sync/DeltaManager.ts
  - [ ] services/sync/ConflictResolver.ts

- [ ] Implement pairing flow
  - [ ] QR code scanner (react-native-camera)
  - [ ] Manual address entry
  - [ ] Pairing code input
  - [ ] Device keypair generation

### Week 7: Sync Features

- [ ] Implement push/pull sync
  - [ ] Collect pending operations
  - [ ] Push to desktop
  - [ ] Process push response
  - [ ] Pull desktop changes
  - [ ] Apply changes locally

- [ ] Background sync
  - [ ] react-native-background-fetch setup
  - [ ] Configurable intervals
  - [ ] WiFi-only option

- [ ] Sync UI components
  - [ ] Sync status indicator
  - [ ] Sync progress overlay
  - [ ] Conflict resolution modal

- [ ] Complete settings screens
  - [ ] Sync interval selector
  - [ ] Selective sync checkboxes
  - [ ] Sync history view
  - [ ] Manual sync button
```

**Deliverables:**
- Working bi-directional sync
- Background sync support
- Conflict resolution UI
- Complete sync settings

### Phase 5: Polish & Release (Weeks 7-8)

**Objective:** Finalize app for release

```markdown
## Phase 5 Tasks

### Week 7-8: Testing & Polish

- [ ] Testing
  - [ ] Unit tests for repositories
  - [ ] Unit tests for sync service
  - [ ] Integration tests for sync flow
  - [ ] Manual testing checklist

- [ ] Performance optimization
  - [ ] List virtualization (FlashList)
  - [ ] Image optimization
  - [ ] Database query optimization
  - [ ] Memory profiling

- [ ] Error handling
  - [ ] Network error recovery
  - [ ] Database corruption recovery
  - [ ] Sync failure handling

- [ ] UX Polish
  - [ ] Animations and transitions
  - [ ] Haptic feedback
  - [ ] Accessibility (a11y)
  - [ ] Dark mode support

### Week 8: Release Preparation

- [ ] App store preparation
  - [ ] App icons (all sizes)
  - [ ] Screenshots for store listing
  - [ ] App description
  - [ ] Privacy policy

- [ ] Build configuration
  - [ ] Production signing keys
  - [ ] Version numbering
  - [ ] Release build testing

- [ ] Documentation
  - [ ] User guide
  - [ ] Troubleshooting guide
  - [ ] Desktop setup instructions

- [ ] Beta release
  - [ ] Internal testing
  - [ ] Google Play internal track
  - [ ] Collect feedback
```

**Deliverables:**
- Production-ready mobile app
- Test coverage
- App store listing
- User documentation

---

## 10. Risk Assessment

### Risk Matrix

```
+====================================================================================+
|                              RISK ASSESSMENT                                       |
+====================================================================================+
|                                                                                    |
|  RISK                      | LIKELIHOOD | IMPACT | MITIGATION                      |
|---------------------------|------------|--------|----------------------------------|
|  Network connectivity     | High       | Medium | Offline-first architecture,      |
|  issues                   |            |        | queue operations                 |
|                           |            |        |                                  |
|  Sync conflicts           | Medium     | Medium | LWW resolution, user review      |
|  causing data loss        |            |        | for critical conflicts           |
|                           |            |        |                                  |
|  Battery drain from       | Medium     | High   | Configurable intervals,          |
|  background sync          |            |        | WiFi-only option                 |
|                           |            |        |                                  |
|  Desktop not running      | High       | Low    | Queue until available,           |
|  when mobile syncs        |            |        | graceful degradation             |
|                           |            |        |                                  |
|  Schema changes           | Medium     | High   | Versioned migrations,            |
|  breaking sync            |            |        | backward compatibility           |
|                           |            |        |                                  |
|  Security breach          | Low        | High   | Encryption, keypair auth,        |
|  (unauthorized access)    |            |        | pairing codes                    |
|                           |            |        |                                  |
|  Large data sets          | Medium     | Medium | Pagination, incremental sync,    |
|  causing slow sync        |            |        | selective sync                   |
|                           |            |        |                                  |
|  React Native            | Low        | High   | Use stable RN version,           |
|  breaking changes         |            |        | lock dependencies                |
|                           |            |        |                                  |
+====================================================================================+
```

### Contingency Plans

1. **If sync proves too complex:** Implement simpler "export/import" functionality first
2. **If performance issues:** Move to incremental sync only (no full sync)
3. **If RN causes issues:** Evaluate Expo managed workflow for simpler builds
4. **If battery drain severe:** Default to manual-only sync

---

## Dependencies & Prerequisites

### Desktop App Requirements

Before mobile development begins:
- [ ] Desktop API server fully functional (port 3939)
- [ ] All CRUD endpoints working for projects, tasks, reminders, knowledge
- [ ] Desktop running Node.js 18+ (for native module compatibility)

### Development Environment

- Node.js 18+
- React Native CLI or Expo CLI
- Android Studio (for emulator and builds)
- Physical Android device for testing
- Same WiFi network for local sync testing

### Third-Party Services

- Google Play Developer Account ($25 one-time)
- Optional: Firebase for crash reporting

---

## Appendix

### A. Useful Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| SQLite | op-sqlite | JSI-native, best performance |
| Navigation | @react-navigation | Industry standard |
| State | Zustand | Lightweight, React hooks |
| Secure Storage | react-native-mmkv | Fast key-value store |
| Background Tasks | react-native-background-fetch | Periodic background sync |
| QR Scanning | react-native-camera | For pairing |
| mDNS | react-native-zeroconf | Desktop discovery |
| Lists | @shopify/flash-list | Performant lists |
| Encryption | react-native-quick-crypto | For signing requests |

### B. ULID Format

ULIDs (Universally Unique Lexicographically Sortable Identifiers) are used throughout:
- 26 characters, base32 encoded
- First 10 chars: timestamp (millisecond precision)
- Last 16 chars: random
- Example: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

Benefits:
- Sortable by creation time
- No coordination needed (can generate offline)
- URL-safe

### C. References

- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [op-sqlite Documentation](https://github.com/nickkatsios/op-sqlite)
- [Local-First Software Principles](https://www.inkandswitch.com/local-first/)
- [CRDT Basics](https://crdt.tech/)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Author:** Planning Agent

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Approve technology choices** (React Native recommended)
3. **Begin Phase 1** - Desktop sync API implementation
4. **Set up React Native development environment** in parallel

This plan is ready for implementation upon approval.
