# AI Command Center - Comprehensive System Plan

**Date**: 2025-12-29
**Version**: 2.0 (Unified Architecture)
**Status**: Planning Phase
**Based on**: Andy's JFDI System + Existing AI Command Center Features

---

## Table of Contents

### Part 1: Vision & Overview
1. [Executive Summary](#1-executive-summary)
2. [Design Philosophy](#2-design-philosophy)
3. [Application Modules](#3-application-modules)

### Part 2: System Architecture
4. [Full System Architecture](#4-full-system-architecture)
5. [Module Interconnections](#5-module-interconnections)
6. [Technology Stack](#6-technology-stack)

### Part 3: Database Layer
7. [Database Schema](#7-database-schema)
8. [SQLite + Vector Search Setup](#8-sqlite--vector-search-setup)

### Part 4: Memory System
9. [Memory Extraction Service](#9-memory-extraction-service)
10. [Embedding Service](#10-embedding-service)
11. [Dual Retrieval System](#11-dual-retrieval-system)

### Part 5: Application Modules
12. [Dashboard (Home)](#12-dashboard-home)
13. [Projects System](#13-projects-system)
14. [Reminders System](#14-reminders-system)
15. [Relationships (CRM)](#15-relationships-crm)
16. [Meetings System](#16-meetings-system)
17. [Knowledge System](#17-knowledge-system)
18. [Chat Interface](#18-chat-interface)
19. [Admin Panel](#19-admin-panel)
20. [Memory Lane UI](#20-memory-lane-ui)
21. [Vision System (Existing)](#21-vision-system-existing)
22. [Chain Runner (Existing)](#22-chain-runner-existing)

### Part 6: UI/UX Design
23. [Design System](#23-design-system)
24. [Navigation & Layout](#24-navigation--layout)

### Part 7: Implementation
25. [File Structure](#25-file-structure)
26. [Implementation Phases](#26-implementation-phases)
27. [Code Examples](#27-code-examples)

---

## 1. Executive Summary

### What is AI Command Center?

AI Command Center is a **comprehensive AI-powered executive assistant** built as an Electron desktop application. It transforms how you work by:

- **Remembering everything** - Extracts and retrieves memories from Claude Code sessions
- **Organizing your life** - Projects, tasks, and reminders with energy-aware scheduling
- **Managing relationships** - CRM focused on depth over sales
- **Capturing knowledge** - Auto-filing second brain
- **AI vision** - Real-time camera analysis with Claude Vision
- **Training AI** - Multi-agent chains for RAG data generation

### Creator's Vision (from JFDI System)

> "It doesn't do the work for me, but it helps me do the work better, faster, and more consistently. It helps me show up for people better and more consistently. It helps me have better ideas of my own rather than feeling like I need to rely on it for ideas."

**Core Problem Being Solved:**
- Executive function challenges: open loops, difficulty delegating
- Need for "a system I trust to make sure that if the ball gets dropped somewhere else, it doesn't make my life difficult"
- Project management tools "great at making me feel overwhelmed, but never great at making me feel like I know what I should be doing next"

**The Dream:** "An assistant who you wake up in the morning and your day is prepared for you"

### Current State vs Target State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CURRENT STATE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │Memory Viewer │  │   Vision     │  │ Chain Runner │                  │
│  │  (Basic)     │  │  (Camera)    │  │ (A2A RAG)    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
│  - Simple file watching                                                 │
│  - No memory extraction                                                 │
│  - Isolated apps (not connected)                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ TRANSFORM
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        TARGET STATE                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Dashboard│ │Projects │ │Reminders│ │Relations│ │Meetings │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Knowledge│ │  Chat   │ │  Admin  │ │ Memory  │ │ Vision  │          │
│  │         │ │         │ │  Panel  │ │  Lane   │ │         │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │                    Chain Runner                          │           │
│  │               (A2A RAG Training System)                  │           │
│  └─────────────────────────────────────────────────────────┘           │
│                                                                         │
│  - All modules interconnected                                           │
│  - AI-powered memory extraction & retrieval                             │
│  - Auto-generated daily dashboards                                      │
│  - Energy-based task management                                         │
│  - Full CRM with relationship freshness                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Philosophy

### Core Principles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DESIGN PRINCIPLES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. INVISIBLE SYSTEMS                                                   │
│     ─────────────────                                                   │
│     "The system should be invisible and therefore feel like magic"      │
│     • Auto-file knowledge without categorization decisions              │
│     • Extract memories without manual tagging                           │
│     • Generate daily briefs without user intervention                   │
│                                                                         │
│  2. INTEGRATION OVER ISOLATION                                          │
│     ─────────────────────────────                                       │
│     Everything connects to everything else                              │
│     • Reminders link to Projects, People, and Meetings                  │
│     • Knowledge auto-suggests relevant contacts                         │
│     • Chat has full context from all systems                            │
│                                                                         │
│  3. PROACTIVE NOT REACTIVE                                              │
│     ───────────────────────────                                         │
│     System prepares the day, surfaces what matters                      │
│     • Dashboard generated before you wake up                            │
│     • Relationship staleness alerts                                     │
│     • Meeting prep sheets auto-generated                                │
│                                                                         │
│  4. ENERGY-AWARE WORK                                                   │
│     ────────────────────                                                │
│     Match tasks to mood/energy rather than arbitrary priorities         │
│     • Quick Win, Deep Work, Creative, Execution, People Work            │
│     • "Be proactive with energy rather than reactive to it"             │
│                                                                         │
│  5. SOP GENERATION                                                      │
│     ───────────────                                                     │
│     Everything becomes teachable instructions                           │
│     • Pattern seeds become documented workflows                         │
│     • Corrections become learning for future sessions                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Application Modules

### Module Overview

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **Dashboard** | Daily command center | Auto-generated overview, goal tracking, schedule |
| **Projects** | Work organization | Life/Projects/Now views, energy-based filtering |
| **Reminders** | Time-based tasks | Snooze workflow, natural language, mobile-first |
| **Relationships** | People management | CRM with freshness tracking, depth over sales |
| **Meetings** | Meeting management | Auto prep sheets, note processing, commitments |
| **Knowledge** | Second brain | Auto-filing, tag extraction, relationship links |
| **Chat** | AI interface | Claude Code wrapper, Memory Lane integration |
| **Admin** | System monitoring | Sessions, tokens, MCP servers, sync status |
| **Memory Lane** | AI memory | Extraction, retrieval, feedback, visualization |
| **Vision** | Camera AI | Webcam capture, Claude Vision, auto-save frames |
| **Chain Runner** | AI training | Multi-agent chains, RAG export, quality validation |

---

## 4. Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI COMMAND CENTER - SYSTEM ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         ELECTRON APP (React UI)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                         NAVIGATION SIDEBAR                              ││
│  │  [Dashboard] [Projects] [Reminders] [Relationships] [Meetings]         ││
│  │  [Knowledge] [Chat] [Admin] [Memory] [Vision] [Chain Runner]           ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Dashboard │ │ Projects │ │Reminders │ │Relations │ │    Meetings      │ │
│  │  Home    │ │Life/Now  │ │  Snooze  │ │   CRM    │ │  Prep & Notes    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Knowledge │ │   Chat   │ │  Admin   │ │  Memory  │ │     Vision       │ │
│  │ 2nd Brain│ │ Claude   │ │  Panel   │ │   Lane   │ │   Camera AI      │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        CHAIN RUNNER                                      ││
│  │   Multi-Agent AI Chains | RAG Export | Quality Validation | Batch Prompts││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │MemoryService    │ │EmbeddingService │ │ RetrievalService│               │
│  │• Extract        │ │• Ollama API     │ │• Entity search  │               │
│  │• Store          │ │• mxbai-embed    │ │• Semantic search│               │
│  │• Update         │ │• 1024 dims      │ │• Re-ranking     │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │ DashboardService│ │ ProjectService  │ │ ReminderService │               │
│  │• Generate daily │ │• CRUD tasks     │ │• Snooze logic   │               │
│  │• Goal tracking  │ │• Energy filter  │ │• Recurrence     │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         ELECTRON MAIN PROCESS                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │ IPC Handlers    │ │ File System     │ │ Screen Capture  │               │
│  │• Database ops   │ │• JSONL parsing  │ │• Vision frames  │               │
│  │• API key vault  │ │• Config files   │ │• Screenshots    │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                    LOCAL STORAGE (SQLite + sqlite-vss)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │memories │ │sessions │ │projects │ │ tasks   │ │reminders│ │relations│ │
│  │+vectors │ │         │ │         │ │         │ │         │ │         │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │meetings │ │knowledge│ │entities │ │ recalls │ │feedback │             │
│  │         │ │         │ │         │ │         │ │         │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Ollama (Local)    │ │   Claude Code       │ │   AI APIs           │
│   mxbai-embed-large │ │   Headless Mode     │ │   Anthropic         │
│   1024 dimensions   │ │   Session ID        │ │   OpenAI            │
│                     │ │   Hooks             │ │   HuggingFace       │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## 5. Module Interconnections

### Data Flow Between Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW DIAGRAM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLAUDE CODE SESSIONS                      MEMORY EXTRACTION                │
│  ┌─────────────────────┐                  ┌─────────────────────┐          │
│  │ ~/.claude/projects/ │                  │   Memory Catcher    │          │
│  │ ai-command-center/  │ ───────────────▶ │   (Every 15 min)    │          │
│  │ .sessions/*.jsonl   │     JSONL        │                     │          │
│  └─────────────────────┘                  └──────────┬──────────┘          │
│                                                      │                      │
│                                                      ▼                      │
│                                           ┌─────────────────────┐          │
│                                           │   Memory Storage    │          │
│                                           │   (SQLite + vss)    │          │
│                                           └──────────┬──────────┘          │
│                                                      │                      │
│     ┌────────────────────────────────────────────────┼──────────────────┐  │
│     │                                                │                  │  │
│     ▼                                                ▼                  │  │
│  ┌─────────────────────┐                  ┌─────────────────────┐      │  │
│  │      CHAT           │ ◀─── Memories ──▶│    MEMORY LANE      │      │  │
│  │  Memory Lane Bar    │                  │   Visualization     │      │  │
│  │  Entity Search      │                  │   Browse/Filter     │      │  │
│  └──────────┬──────────┘                  └─────────────────────┘      │  │
│             │                                                          │  │
│             │ Commands/Queries                                         │  │
│             ▼                                                          │  │
│  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │                     DASHBOARD                                    │  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │  │  │
│  │  │  Schedule   │  │   Focus     │  │   Goals     │             │  │  │
│  │  │  (from      │  │   (from     │  │   (from     │             │  │  │
│  │  │  Meetings)  │  │  Projects)  │  │  Projects)  │             │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │  │  │
│  │  │ Reminders   │  │Relationships│  │   Vision    │             │  │  │
│  │  │  Widget     │  │   Widget    │  │   Widget    │             │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │  │  │
│  └─────────────────────────────────────────────────────────────────┘  │  │
│                                                                       │  │
│             ┌─────────────────────────────────────────────────────────┘  │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────┐       ┌─────────────────────┐                  │
│  │     PROJECTS        │ ◀───▶ │     REMINDERS       │                  │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │                  │
│  │  │ Tasks linked  │  │       │  │ Task-linked   │  │                  │
│  │  │ to reminders  │  │       │  │ reminders     │  │                  │
│  │  └───────────────┘  │       │  └───────────────┘  │                  │
│  └──────────┬──────────┘       └──────────┬──────────┘                  │
│             │                             │                              │
│             └──────────┬──────────────────┘                              │
│                        │                                                 │
│                        ▼                                                 │
│             ┌─────────────────────┐                                      │
│             │   RELATIONSHIPS     │                                      │
│             │  ┌───────────────┐  │                                      │
│             │  │ People linked │  │                                      │
│             │  │ to projects,  │  │                                      │
│             │  │ meetings,     │  │                                      │
│             │  │ knowledge     │  │                                      │
│             │  └───────────────┘  │                                      │
│             └──────────┬──────────┘                                      │
│                        │                                                 │
│          ┌─────────────┼─────────────┐                                   │
│          │             │             │                                   │
│          ▼             ▼             ▼                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                        │
│  │  MEETINGS   │ │  KNOWLEDGE  │ │   VISION    │                        │
│  │  Prep from  │ │  Auto-link  │ │  Capture to │                        │
│  │  Relations  │ │  to people  │ │  Knowledge  │                        │
│  └─────────────┘ └─────────────┘ └─────────────┘                        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      CHAIN RUNNER                                │    │
│  │  Training data → Knowledge | Quality scores → Memory Lane        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cross-Module Features

| Feature | Modules Involved | Description |
|---------|-----------------|-------------|
| **Meeting Prep** | Meetings, Relationships, Projects | Auto-generate prep sheets with attendee context |
| **Commitment Extraction** | Meetings, Reminders, Projects | Extract commitments → create tasks/reminders |
| **Knowledge Sharing** | Knowledge, Relationships | Suggest people who'd be interested in article |
| **Memory Context** | Chat, Memory Lane, All | Inject relevant memories into conversations |
| **Goal Tracking** | Dashboard, Projects | Progress bars from project completion |
| **Freshness Alerts** | Dashboard, Relationships | Surface stale relationships |
| **Vision Captures** | Vision, Knowledge, Chain Runner | Save captures to knowledge, use in training |

---

## 6. Technology Stack

### Core Technologies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TECHNOLOGY STACK                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                                                                   │
│  ───────────────────────────────────────────────────────────────────────── │
│  • React 18+ with Hooks                                                     │
│  • Vite for bundling                                                        │
│  • CSS Modules / Plain CSS                                                  │
│  • Path alias: @/ → src/                                                    │
│                                                                             │
│  ELECTRON                                                                   │
│  ───────────────────────────────────────────────────────────────────────── │
│  • Electron 28+                                                             │
│  • Main process: main.cjs                                                   │
│  • Preload: preload.cjs (context bridge)                                    │
│  • IPC for file system, database, screen capture                            │
│                                                                             │
│  DATABASE                                                                   │
│  ───────────────────────────────────────────────────────────────────────── │
│  • SQLite3 (better-sqlite3)                                                 │
│  • sqlite-vss for vector similarity search                                  │
│  • Location: %APPDATA%/ai-command-center/database.sqlite                   │
│                                                                             │
│  EMBEDDINGS                                                                 │
│  ───────────────────────────────────────────────────────────────────────── │
│  • Ollama (local inference)                                                 │
│  • Model: mxbai-embed-large                                                 │
│  • Dimensions: 1024                                                         │
│  • Endpoint: http://localhost:11434/api/embed                               │
│                                                                             │
│  AI PROVIDERS                                                               │
│  ───────────────────────────────────────────────────────────────────────── │
│  • Anthropic (Claude) - Primary for extraction, chat, vision                │
│  • OpenAI - Alternative provider for chains                                 │
│  • HuggingFace - Additional models                                          │
│  • Ollama - Local models (llama, mixtral, etc.)                            │
│                                                                             │
│  CLAUDE CODE INTEGRATION                                                    │
│  ───────────────────────────────────────────────────────────────────────── │
│  • Headless mode with session ID persistence                                │
│  • Hooks: UserPromptSubmit, PostToolUse                                     │
│  • Custom agents and slash commands                                         │
│  • JSONL session transcript parsing                                         │
│                                                                             │
│  STORAGE PATHS                                                              │
│  ───────────────────────────────────────────────────────────────────────── │
│  • User data: %APPDATA%/ai-command-center/                                 │
│  • Database: %APPDATA%/ai-command-center/database.sqlite                   │
│  • Frames: %APPDATA%/ai-command-center/latest-frame.txt                    │
│  • Sessions: %APPDATA%/ai-command-center/sessions/                         │
│  • Knowledge: %APPDATA%/ai-command-center/knowledge/                       │
│  • Relationships: %APPDATA%/ai-command-center/relationships/               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Dependencies Required

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "sqlite-vss": "^0.1.2-alpha.14",
    "zustand": "^4.5.0",
    "date-fns": "^3.0.0",
    "uuid": "^9.0.0",
    "node-cron": "^3.0.3",
    "marked": "^11.0.0",
    "dompurify": "^3.0.6"
  }
}
```

---

## 7. Database Schema

### Complete Schema

```sql
-- ============================================================================
-- AI COMMAND CENTER - SQLite Database Schema
-- Uses: better-sqlite3 + sqlite-vss extension for vector search
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SPACES & PROJECTS
-- ---------------------------------------------------------------------------

CREATE TABLE spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8b5cf6',
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    space_id TEXT REFERENCES spaces(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('active_focus', 'on_deck', 'growing', 'on_hold', 'completed')) DEFAULT 'on_deck',
    progress REAL DEFAULT 0,
    deadline DATE,
    planning_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    energy_type TEXT CHECK(energy_type IN ('low', 'medium', 'deep_work', 'creative', 'quick_win', 'execution', 'people_work')),
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
    due_date DATETIME,
    sort_order INTEGER DEFAULT 0,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- REMINDERS
-- ---------------------------------------------------------------------------

CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_at DATETIME,
    is_recurring INTEGER DEFAULT 0,
    recurrence_rule TEXT,
    snooze_count INTEGER DEFAULT 0,
    snoozed_until DATETIME,
    status TEXT CHECK(status IN ('pending', 'completed', 'snoozed')) DEFAULT 'pending',
    source_type TEXT,
    source_id TEXT,
    url TEXT,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- RELATIONSHIPS (CRM)
-- ---------------------------------------------------------------------------

CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    title TEXT,
    location TEXT,
    priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    context TEXT,
    professional_background TEXT,
    notes TEXT,
    social_links TEXT,
    last_contact_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE contact_group_members (
    contact_id TEXT REFERENCES contacts(id),
    group_id TEXT REFERENCES contact_groups(id),
    PRIMARY KEY (contact_id, group_id)
);

CREATE TABLE contact_interactions (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id),
    type TEXT CHECK(type IN ('email', 'meeting', 'call', 'message', 'in_person')),
    summary TEXT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- MEETINGS
-- ---------------------------------------------------------------------------

CREATE TABLE meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at DATETIME,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    calendar_link TEXT,
    prep_sheet TEXT,
    post_notes TEXT,
    status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meeting_participants (
    meeting_id TEXT REFERENCES meetings(id),
    contact_id TEXT REFERENCES contacts(id),
    role TEXT,
    PRIMARY KEY (meeting_id, contact_id)
);

-- ---------------------------------------------------------------------------
-- KNOWLEDGE BASE
-- ---------------------------------------------------------------------------

CREATE TABLE knowledge_folders (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES knowledge_folders(id),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE knowledge_articles (
    id TEXT PRIMARY KEY,
    folder_id TEXT REFERENCES knowledge_folders(id),
    title TEXT NOT NULL,
    content TEXT,
    source_url TEXT,
    tags TEXT,
    is_spark INTEGER DEFAULT 0,
    embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- MEMORY LANE
-- ---------------------------------------------------------------------------

CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN (
        'correction', 'decision', 'commitment', 'insight',
        'learning', 'confidence', 'pattern_seed', 'cross_agent',
        'workflow_note', 'gap'
    )) NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_chunk TEXT,
    embedding BLOB,
    related_entities TEXT,
    target_agents TEXT,
    confidence_score REAL CHECK(confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT,
    evidence TEXT,
    times_observed INTEGER DEFAULT 1,
    recall_count INTEGER DEFAULT 0,
    positive_feedback INTEGER DEFAULT 0,
    negative_feedback INTEGER DEFAULT 0,
    first_observed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_observed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_recalls (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES chat_sessions(id),
    memory_id TEXT REFERENCES memories(id),
    query_text TEXT,
    similarity_score REAL,
    final_rank INTEGER,
    was_useful INTEGER,
    recalled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memory_feedback (
    id TEXT PRIMARY KEY,
    memory_id TEXT REFERENCES memories(id),
    session_id TEXT,
    query_context TEXT,
    feedback_type TEXT CHECK(feedback_type IN ('positive', 'negative')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- CHAT SESSIONS
-- ---------------------------------------------------------------------------

CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    claude_session_id TEXT,
    title TEXT,
    first_message TEXT,
    last_message TEXT,
    message_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    importance TEXT CHECK(importance IN ('low', 'medium', 'high')),
    sentiment TEXT,
    work_type TEXT,
    files_touched TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES chat_sessions(id),
    role TEXT CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT,
    tool_calls TEXT,
    token_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- ENTITY RESOLUTION
-- ---------------------------------------------------------------------------

CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('person', 'project', 'business', 'location')),
    canonical_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    aliases TEXT,
    linked_contact_id TEXT REFERENCES contacts(id),
    linked_project_id TEXT REFERENCES projects(id),
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- GOALS & TRACKING
-- ---------------------------------------------------------------------------

CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    target_percentage REAL,
    current_progress REAL DEFAULT 0,
    time_window_days INTEGER DEFAULT 90,
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goal_alignments (
    goal_id TEXT REFERENCES goals(id),
    project_id TEXT REFERENCES projects(id),
    weight REAL DEFAULT 1.0,
    PRIMARY KEY (goal_id, project_id)
);

-- ---------------------------------------------------------------------------
-- ADMIN & SYSTEM
-- ---------------------------------------------------------------------------

CREATE TABLE sync_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed')),
    last_run_at DATETIME,
    next_run_at DATETIME,
    error_message TEXT,
    metadata TEXT
);

CREATE TABLE token_usage (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    provider TEXT CHECK(provider IN ('anthropic', 'openai', 'ollama', 'huggingface')),
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

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

---

## 8. SQLite + Vector Search Setup

### Initialization Code

```javascript
// electron/database/db.cjs
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'database.sqlite');

  db = new Database(dbPath, { verbose: console.log });

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Load sqlite-vss extension for vector search
  try {
    db.loadExtension('sqlite-vss');
    console.log('sqlite-vss extension loaded');
  } catch (err) {
    console.warn('sqlite-vss not available, vector search disabled:', err.message);
  }

  // Run migrations
  runMigrations();

  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

module.exports = { initializeDatabase, getDatabase };
```

---

## 9. Memory Extraction Service

### Memory Types Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MEMORY TYPE HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  HIGH PRIORITY (Always Extract)                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  correction  │ User corrected agent behavior                    │   │
│  │  decision    │ Explicit choice with reasoning                   │   │
│  │  commitment  │ User expressed preference/commitment             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  MEDIUM PRIORITY (Extract if Clear)                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  insight     │ Non-obvious discovery or connection              │   │
│  │  learning    │ New knowledge gained                              │   │
│  │  confidence  │ Strong confidence in approach/outcome            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  LOWER PRIORITY (Context Dependent)                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  pattern_seed   │ Repeated behavior worth formalizing           │   │
│  │  cross_agent    │ Info relevant to other agents                 │   │
│  │  workflow_note  │ Process observation                            │   │
│  │  gap            │ Missing capability or limitation               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Extraction Prompt

```javascript
// src/services/MemoryCatcher.js
const EXTRACTION_PROMPT = `
You are analyzing a conversation to extract memorable moments.
Look for these types of consequential decisions or events:

HIGH PRIORITY:
- correction: User corrected agent behavior (either direction!)
- decision: Explicit choice with reasoning
- commitment: User preference expressed

MEDIUM PRIORITY:
- insight: Non-obvious discovery
- learning: New knowledge gained
- confidence: Strong confidence in approach

LOWER PRIORITY:
- pattern_seed: Repeated behavior to formalize
- gap: Parts of system not talking to each other

TRIGGERS TO WATCH:
1. Recovery patterns: error → workaround → success
2. User corrections: "I want it this other way"
3. Enthusiasm: "that's exactly what I wanted!"
4. Negative reactions: "never do that"
5. Repeated requests: same workflow multiple times

For each memory found, return JSON:
{
  type: string,
  category: string,
  title: string (max 100 chars),
  content: string (full description),
  source_chunk: string (verbatim from conversation),
  related_entities: [{type, raw, slug}],
  confidence_score: 0-100,
  reasoning: string
}
`;
```

---

## 10. Embedding Service

### Ollama Integration

```javascript
// src/services/EmbeddingService.js
const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embed';
const MODEL = 'mxbai-embed-large';

export async function generateEmbedding(text) {
  const response = await fetch(OLLAMA_EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings[0]; // 1024-dim float array
}

export function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## 11. Dual Retrieval System

### Re-Ranking Algorithm

```javascript
// src/utils/memoryRetrieval.js
function calculateFinalScore(memory, similarity, query, feedbackHistory) {
  const weights = {
    vectorSimilarity: 0.60,
    recency: 0.10,
    confidence: 0.15,
    observationCount: 0.10,
    typeBoost: 0.05
  };

  // Base score from vector similarity
  let score = similarity * weights.vectorSimilarity;

  // Recency decay (4 weeks half-life)
  const daysSince = (Date.now() - new Date(memory.last_observed_at)) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.exp(-daysSince / 28);
  score += recencyScore * weights.recency;

  // Confidence score
  score += memory.confidence_score * weights.confidence;

  // Observation count (capped at 10)
  const obsScore = Math.min(memory.times_observed / 10, 1);
  score += obsScore * weights.observationCount;

  // Type boost for high-priority types
  const highPriorityTypes = ['correction', 'decision', 'commitment'];
  if (highPriorityTypes.includes(memory.type)) {
    score += weights.typeBoost;
  }

  // Query-aware type boosting (+15%)
  const typeBoostKeywords = {
    'mistake|wrong|error': ['correction', 'gap'],
    'decided|chose|decision': ['decision'],
    'always|usually|prefer': ['commitment', 'pattern_seed'],
    'learned|realized': ['learning', 'insight']
  };

  for (const [pattern, types] of Object.entries(typeBoostKeywords)) {
    if (new RegExp(pattern, 'i').test(query) && types.includes(memory.type)) {
      score += 0.15;
      break;
    }
  }

  // Feedback adjustment (+/- 5% per vote)
  const netFeedback = memory.positive_feedback - memory.negative_feedback;
  score += netFeedback * 0.05;

  return Math.min(Math.max(score, 0), 1);
}
```

---

## 12. Dashboard (Home)

### Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Status Brief - December 29, 2025                    [◀ 1/10 ▶] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  OVERVIEW                       │  │  TODAY'S SCHEDULE           │  │
│  │                                 │  │                             │  │
│  │  AI-generated summary of the   │  │  09:00 ▓▓▓▓▓ Deep Work     │  │
│  │  day based on all data sources │  │  10:30 ━━━━━ Meeting: XYZ   │  │
│  │                                 │  │  12:00 ░░░░░ Lunch          │  │
│  │                                 │  │  14:00 ▓▓▓▓▓ Focus Block    │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  FOCUS & PRIORITIES            │  │  REMINDERS                   │  │
│  │                                 │  │                             │  │
│  │  ● Project Alpha   [Due Today] │  │  Overdue (3)                │  │
│  │    87% confidence              │  │  ○ Call back John           │  │
│  │                                 │  │  ○ Submit report            │  │
│  │  ● Client Meeting             │  │                             │  │
│  │    94% confidence              │  │  Due Today (5)              │  │
│  │                                 │  │  ○ Review PR                │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  RELATIONSHIPS                  │  │  GOAL ALIGNMENT             │  │
│  │                                 │  │                             │  │
│  │  ⚠️ 64 warnings                 │  │  Growing AI Command Center  │  │
│  │                                 │  │  ████████████░░░░░░░░ 60%   │  │
│  │  Needs Attention:              │  │                             │  │
│  │  • Sarah (32 days)             │  │  Client Work                │  │
│  │  • Mike (45 days)              │  │  ██████░░░░░░░░░░░░░░ 35%   │  │
│  │                                 │  │                             │  │
│  │  Patterns Detected:            │  │  Personal Development       │  │
│  │  • Less outreach this month    │  │  ██████████████░░░░░░ 70%   │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Projects System

### Three-Tier View

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PROJECTS                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  [Life] [Projects] [Now]                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LIFE VIEW (30,000 ft)                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                 │
│  │  AI Systems   │ │   Work        │ │   Personal    │                 │
│  │  3 projects   │ │   5 projects  │ │   2 projects  │                 │
│  │               │ │               │ │               │                 │
│  └───────────────┘ └───────────────┘ └───────────────┘                 │
│                                                                         │
│  PROJECTS VIEW (10,000 ft)                                              │
│  Sort: [Next Action ▼]                                                  │
│                                                                         │
│  Active Focus ─────────────────────────────────────────                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  AI Command Center                              [AI Systems]     │   │
│  │  ████████████████████░░░░░░░░░░░░ 65%          10/15 tasks      │   │
│  │  Next: Implement Memory Lane extraction    [Attention]          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  NOW VIEW (Ground Level)                                                │
│  [All (14)] [Quick Win (3)] [Deep Work (3)] [Creative (2)]             │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ☐ Implement database schema          [Deep Work] Due: Today    │   │
│  │  ☐ Write embedding service            [Deep Work]               │   │
│  │  ☐ Fix camera bug                     [Quick Win]               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Energy Types

```javascript
const ENERGY_TYPES = {
  low: { label: 'Low', color: '#6b7280', description: 'Minimal mental effort' },
  medium: { label: 'Medium', color: '#3b82f6', description: 'Moderate focus' },
  deep_work: { label: 'Deep Work', color: '#7c3aed', description: 'Extended concentration' },
  creative: { label: 'Creative', color: '#ec4899', description: 'Open, exploratory' },
  quick_win: { label: 'Quick Win', color: '#22c55e', description: 'Fast, satisfying' },
  execution: { label: 'Execution', color: '#f97316', description: 'Methodical' },
  people_work: { label: 'People Work', color: '#14b8a6', description: 'Collaboration' }
};
```

---

## 14. Reminders System

### Reminders Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REMINDERS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  [All] [Overdue] [Today] [Next 3 Days] [This Week] [Later] [Anytime]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Overdue (3) ──────────────────────────────────────────────            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ○ Call back John about the proposal                           │   │
│  │    Due: Dec 27, 2:00 PM (2 days overdue)                       │   │
│  │    [Snooze ▼] [Complete ✓]                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Today (5) ────────────────────────────────────────────────            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ○ Review PR for Chain Runner                                   │   │
│  │    Due: Today, 5:00 PM                                          │   │
│  │    Link: github.com/...                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Anytime (8) ──────────────────────────────────────────────            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ○ Clean up old recordings                                      │   │
│  │    No due date                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                                           [+ Add] ⬤    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Relationships (CRM)

### CRM Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       RELATIONSHIPS                                      │
├───────────────────────┬─────────────────────────────────────────────────┤
│  Contact List         │  Contact Detail                                 │
├───────────────────────┼─────────────────────────────────────────────────┤
│                       │                                                 │
│  Search...            │  Alex Developer                                 │
│                       │  ──────────────────────────────────            │
│  Sort: [Last Contact] │  🔥 Hot (2 days)  |  Priority: High            │
│                       │  Last Contact: Dec 27, 2025                     │
│  ─────────────────── │                                                 │
│                       │  Contact Information                            │
│  ● Alex     🔥 Hot    │  Email: alex@example.com                       │
│  ● Beth     🌤 Warm   │  Company: TechCorp                             │
│  ● Carl     ❄️ Cold   │  Title: Senior Engineer                        │
│  ● Diana    🔥 Hot    │  Location: San Francisco                       │
│                       │                                                 │
│  Groups ▼             │  Context                                        │
│  ├─ Team              │  ┌─────────────────────────────────────────┐   │
│  ├─ Clients           │  │ Met at ReactConf 2024. Working on       │   │
│  └─ Mentors           │  │ similar AI projects. Very collaborative │   │
│                       │  │ and responsive. Shares good resources.  │   │
│                       │  └─────────────────────────────────────────┘   │
│                       │                                                 │
│                       │  Social                                         │
│                       │  [Twitter] [LinkedIn] [GitHub]                  │
│                       │                                                 │
└───────────────────────┴─────────────────────────────────────────────────┘
```

### Freshness Calculation

```javascript
function calculateFreshness(lastContactDate) {
  const daysSince = Math.floor((Date.now() - lastContactDate) / (1000 * 60 * 60 * 24));

  if (daysSince <= 7) return { label: 'Hot', color: '#ef4444', icon: '🔥' };
  if (daysSince <= 30) return { label: 'Warm', color: '#f59e0b', icon: '🌤' };
  if (daysSince <= 90) return { label: 'Cool', color: '#3b82f6', icon: '🌥' };
  return { label: 'Cold', color: '#6b7280', icon: '❄️' };
}
```

---

## 16. Meetings System

### Meetings Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MEETINGS                                        │
├───────────────────────┬─────────────────────────────────────────────────┤
│  Meeting List         │  Meeting Detail                                 │
├───────────────────────┼─────────────────────────────────────────────────┤
│                       │                                                 │
│  Recent               │  Team Sync - December 29                        │
│  ─────────────────── │  ──────────────────────────────────            │
│                       │  Participants: Alex, Beth, Carl                 │
│  Dec 29               │  +5 more                                        │
│  ● Team Sync          │                                                 │
│                       │  Post-Meeting Summary                           │
│  Dec 28               │  ┌─────────────────────────────────────────┐   │
│  ● 1:1 with Sarah     │  │ 3 Most Important Takeaways:             │   │
│  ● Client Review      │  │ 1. Memory Lane feature approved         │   │
│                       │  │ 2. Target launch: Q1 2026               │   │
│  Dec 27               │  │ 3. Need additional API budget           │   │
│  ● Sprint Planning    │  │                                         │   │
│                       │  │ Key Decisions:                          │   │
│  Search...            │  │ • Use SQLite over PostgreSQL            │   │
│                       │  │ • Deploy to Windows first               │   │
│                       │  └─────────────────────────────────────────┘   │
│                       │                                                 │
│                       │  Pre-Meeting Checklist                          │
│                       │  ☑ Review last meeting notes                   │
│                       │  ☑ Prepare demo                                │
│                       │  ☐ Share agenda with team                      │
│                       │                                                 │
└───────────────────────┴─────────────────────────────────────────────────┘
```

---

## 17. Knowledge System

### Knowledge Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          KNOWLEDGE                                       │
├───────────────────────┬─────────────────────────────────────────────────┤
│  Folders              │  Document View                                  │
├───────────────────────┼─────────────────────────────────────────────────┤
│                       │                                                 │
│  ▶ Articles           │  # React Best Practices 2025                   │
│  ▶ Code Snippets      │  ──────────────────────────────────            │
│  ▼ Frameworks         │                                                 │
│    └─ React           │  ## Key Insights                               │
│    └─ Electron        │                                                 │
│  ▶ Resources          │  1. Use Server Components where possible       │
│  ▶ Stories            │  2. Prefer Zustand over Redux for small apps   │
│  ▶ Tools              │  3. CSS Modules still beat CSS-in-JS           │
│  ▶ Transcripts        │                                                 │
│                       │  ## Code Example                               │
│  [+ New Folder]       │                                                 │
│                       │  ```jsx                                        │
│  ─────────────────── │  function useStore() {                         │
│                       │    return useContext(StoreContext);            │
│  SparkFile (Quick)    │  }                                              │
│  ● 12 sparks          │  ```                                           │
│                       │                                                 │
│                       │  Tags: [react] [2025] [best-practices]          │
│                       │                                                 │
│                       │  Share with: Alex? Beth?                       │
│                       │                                                 │
└───────────────────────┴─────────────────────────────────────────────────┘
```

### Default Folders

```javascript
const DEFAULT_FOLDERS = [
  'Articles',
  'Code Snippets',
  'Content Ideas',
  'Courses',
  'Frameworks',
  'Newsletters',
  'Research',
  'Resources',
  'Social Media',
  'SparkFile',
  'Stories',
  'Tools',
  'Transcripts'
];
```

---

## 18. Chat Interface

### Chat Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CHAT                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Memory Lane: [3 entity 🧠] [7 semantic 🧠] - click to expand    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  User: Help me plan the Memory Lane implementation              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Assistant:                                                      │   │
│  │  I'll help you plan the Memory Lane implementation...           │   │
│  │                                                                  │   │
│  │  [Used 2 tools ▼]                                               │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ Read: CLAUDE.md ✓                                        │    │   │
│  │  │ Grep: "memory" - 15 matches ✓                           │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  Based on the existing codebase, here's my recommendation...    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Session Todos:                                                  │   │
│  │  ☑ Read CLAUDE.md                                               │   │
│  │  ☑ Search for existing patterns                                 │   │
│  │  ☐ Create implementation plan                                   │   │
│  │  ☐ Start Phase 1                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /                          │ What do you want to JFDI?  [Send] │   │
│  │  [Images: 0] [Quick Spark] [Remind] [Voice]    Tokens: 12,450   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Sessions: [Current ▼]                      Model: claude-sonnet-4     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 19. Admin Panel

### Admin Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ADMIN PANEL                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  [Overview] [Memory] [Sessions] [Tokens] [Sync] [Environment]           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OVERVIEW                                                               │
│  ─────────────────────────────────────────────────────                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐              │
│  │ Memories  │ │ Sessions  │ │  Tokens   │ │ Services  │              │
│  │    234    │ │    45     │ │   1.2M    │ │   4/4     │              │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘              │
│                                                                         │
│  Sync Jobs: All 10 healthy                                             │
│  Job Queue: Empty                                                       │
│  MCP Servers: 6/6 connected                                            │
│                                                                         │
│  MEMORY BROWSER                                                         │
│  ─────────────────────────────────────────────────────                 │
│  Filter: [All Types ▼] [All Categories ▼]                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [Decision] Project structure for AI Command Center      95%     │   │
│  │ Formed: 2h ago | Recalled: 5 times | 👍 3 👎 0                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ [Correction] API format: prefer JSON over FormData      87%     │   │
│  │ Formed: 1d ago | Recalled: 12 times | 👍 8 👎 1                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ [Learning] React hooks dependency patterns              82%     │   │
│  │ Formed: 3d ago | Recalled: 3 times | 👍 2 👎 0                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 20. Memory Lane UI

### Memory Lane Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       MEMORY LANE                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  [List] [Visualization] [Entity Queue]                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Memory Card (Expanded from Memory Lane Bar)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [Correction] 79%                                    👍 👎       │   │
│  │                                                                  │   │
│  │ User prefers casual tone in emails to Amy                       │   │
│  │                                                                  │   │
│  │ Source: "Actually, I'd like you to be more casual when         │   │
│  │         writing to Amy. She's a friend, not a client."         │   │
│  │                                                                  │   │
│  │ Formed: 16h ago                                                  │   │
│  │ Recalled: 3 minutes ago (this session)                          │   │
│  │                                                                  │   │
│  │ Related: Amy (person), Email (category)                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Visualization (River View)                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │     ●                    ●●●                                    │   │
│  │   ●●●●●                 ●●●●●                    ●              │   │
│  │  ●●●●●●●●             ●●●●●●●●                 ●●●●             │   │
│  │ ●●●●●●●●●●           ●●●●●●●●●●               ●●●●●●            │   │
│  │  ●●●●●●●●●●         ●●●●●●●●●●●●             ●●●●●●●●           │   │
│  │   ●●●●●●●●●●       ●●●●●●●●●●●●●●           ●●●●●●●●●●          │   │
│  │    ●●●●●●●●●●●   ●●●●●●●●●●●●●●●●●         ●●●●●●●●●●●●         │   │
│  │─────────────────────────────────────────────────────────────────│   │
│  │     Week 1            Week 2                 Week 3             │   │
│  │                                                                  │   │
│  │  Legend: ● correction ● decision ● learning ● insight ● pattern │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 21. Vision System (Existing)

### Current Implementation

The Vision system is already functional with these features:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VISION                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────┐  ┌─────────────────────────────┐│
│  │                                   │  │  Claude Vision              ││
│  │         Camera Feed               │  │                             ││
│  │                                   │  │  User: What do you see?     ││
│  │       [Live Video Stream]         │  │                             ││
│  │                                   │  │  Claude: I can see a desk   ││
│  │                                   │  │  with a monitor showing...  ││
│  │  Frames saved: 1,247              │  │                             ││
│  └───────────────────────────────────┘  │  [Image thumbnail]          ││
│                                          │                             ││
│  Camera: [Razer Kiyo ▼]                 │                             ││
│  [Start Camera] [Stop Camera]            │                             ││
│                                          │                             ││
│  ☐ Auto Mode  Every [10] sec            │  Ask about what you see... ││
│                                          │  [Send]                     ││
│                                          │                             ││
│  Frames saved to:                        │  [Clear Chat]               ││
│  %APPDATA%\ai-command-center\            │                             ││
│                                          └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/components/vision/VisionApp.jsx` | Main vision component |
| `src/components/vision/VisionApp.css` | Vision styling |

### Integration Points with New System

- **Knowledge**: Save interesting captures to Knowledge base
- **Dashboard**: Widget showing latest capture and analysis
- **Memory Lane**: Extract memories from vision conversations
- **Chain Runner**: Use captures as training data inputs

---

## 22. Chain Runner (Existing)

### Current Implementation

The Chain Runner is a sophisticated multi-agent system already built:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CHAIN RUNNER                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SETUP MODE                                                             │
│  ──────────────────────────────────────────                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Agent 1                  │  Agent 2                              │ │
│  │  Provider: [Anthropic ▼]  │  Provider: [OpenAI ▼]                 │ │
│  │  Model: [claude-sonnet ▼] │  Model: [gpt-4o ▼]                    │ │
│  │                           │                                       │ │
│  │  Task Spec:               │  Task Spec:                          │ │
│  │  ┌─────────────────────┐  │  ┌─────────────────────┐             │ │
│  │  │ Generate a question │  │  │ Answer the question │             │ │
│  │  │ about AV equipment  │  │  │ with expert detail  │             │ │
│  │  └─────────────────────┘  │  └─────────────────────┘             │ │
│  │  [Duplicate] [Remove]     │  [Duplicate] [Remove]                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  [+ Add Agent]                                                          │
│                                                                         │
│  ☐ Use Batch Prompt Generator                                          │
│  ☐ Enable Quality Validator (threshold: 0.7)                           │
│  ☐ Typewriter Effect                                                   │
│                                                                         │
│  Run Mode: [Once ▼]  Sessions: [5]                                      │
│                                                                         │
│  [Run Chain]  [Save Config]  [Load Config]                             │
│                                                                         │
│  OUTPUT MODE                                                            │
│  ──────────────────────────────────────────                            │
│  Prompt 3/10: "What are common wireless microphone issues?"             │
│                                                                         │
│  Agent 1 Output:              Agent 2 Output:                          │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐ │
│  │ Question: What are the  │  │ Answer: Common wireless microphone  │ │
│  │ most common issues...   │  │ issues include RF interference,     │ │
│  │                         │  │ battery failures, dropouts...       │ │
│  │                         │  │                         Quality: 89%│ │
│  └─────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                         │
│  [Export RAG Training]  [Return to Setup]                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/components/chain-runner/ChainRunner.jsx` | Main component (1500+ lines) |
| `src/components/chain-runner/ChainRunner.css` | Styling |
| `src/components/chain-runner/ragExporter.js` | RAG export utilities |
| `src/components/chain-runner/ragConstants.js` | Categories and formats |
| `src/components/chain-runner/promptGenerator.js` | Batch prompt generation |
| `src/components/chain-runner/qualityValidator.js` | Q&A scoring |
| `src/components/chain-runner/configManager.js` | Save/load configs |
| `src/components/chain-runner/RAGExportModal.jsx` | Export UI |
| `src/components/chain-runner/ConfigModal.jsx` | Config UI |

### Integration Points with New System

- **Knowledge**: Export RAG training data to Knowledge base
- **Dashboard**: Widget showing recent training sessions
- **Memory Lane**: Extract patterns from successful chains
- **Admin**: Token usage tracking per chain session

---

## 23. Design System

### Color Palette

```css
:root {
  /* Primary Background (JFDI-inspired dark theme) */
  --bg-primary: #0d0d14;        /* Near black */
  --bg-secondary: #151520;       /* Card background */
  --bg-tertiary: #1a1a28;        /* Elevated elements */
  --bg-card: #12121c;            /* Content cards */

  /* Yellow/Gold Accent System */
  --accent-primary: #fbbf24;     /* Primary gold */
  --accent-hover: #f59e0b;       /* Darker gold */
  --accent-muted: #d97706;       /* Subdued gold */
  --accent-subtle: rgba(251, 191, 36, 0.1);  /* Background tint */

  /* Text Colors */
  --text-primary: #e8e8e8;       /* Main text */
  --text-secondary: #a0a0a0;     /* Secondary text */
  --text-muted: #666666;         /* Muted text */

  /* Semantic Colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Memory Type Colors */
  --memory-decision: #3b82f6;
  --memory-correction: #ef4444;
  --memory-learning: #22c55e;
  --memory-insight: #8b5cf6;
  --memory-pattern: #06b6d4;
  --memory-gap: #6b7280;

  /* Energy Type Colors */
  --energy-low: #6b7280;
  --energy-medium: #3b82f6;
  --energy-deep: #8b5cf6;
  --energy-creative: #ec4899;
  --energy-quick: #22c55e;
  --energy-execution: #f97316;
  --energy-people: #14b8a6;

  /* Module Accent Colors */
  --accent-dashboard: #fbbf24;
  --accent-projects: #8b5cf6;
  --accent-reminders: #22c55e;
  --accent-relations: #ec4899;
  --accent-meetings: #3b82f6;
  --accent-knowledge: #06b6d4;
  --accent-chat: #fbbf24;
  --accent-admin: #64748b;
  --accent-memory: #f43f5e;
  --accent-vision: #8b5cf6;
  --accent-chain: #3b82f6;

  /* Borders & Shadows */
  --border-color: #2a2a4a;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

---

## 24. Navigation & Layout

### Sidebar Navigation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LAYOUT                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┬────────────────────────────────────────────────────────┐ │
│  │          │                                                        │ │
│  │  [Logo]  │                                                        │ │
│  │          │                                                        │ │
│  │ ──────── │                                                        │ │
│  │          │                                                        │ │
│  │ 🏠 Dash  │                    MAIN CONTENT AREA                   │ │
│  │ 📋 Proj  │                                                        │ │
│  │ ⏰ Remind│                    (Active Module View)                │ │
│  │ 👥 Relat │                                                        │ │
│  │ 📅 Meet  │                                                        │ │
│  │ 📚 Know  │                                                        │ │
│  │          │                                                        │ │
│  │ ──────── │                                                        │ │
│  │          │                                                        │ │
│  │ 💬 Chat  │                                                        │ │
│  │ 🧠 Memory│                                                        │ │
│  │          │                                                        │ │
│  │ ──────── │                                                        │ │
│  │          │                                                        │ │
│  │ 📷 Vision│                                                        │ │
│  │ ⛓️ Chain │                                                        │ │
│  │          │                                                        │ │
│  │ ──────── │                                                        │ │
│  │          │                                                        │ │
│  │ ⚙️ Admin │                                                        │ │
│  │          │                                                        │ │
│  └──────────┴────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Sidebar: 64px fixed | Main: flex-1                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 25. File Structure

### Complete Project Structure

```
D:\Projects\ai-command-center\
├── electron/
│   ├── main.cjs                    [MODIFY - add DB, IPC, jobs]
│   ├── preload.cjs                 [MODIFY - expose new APIs]
│   └── database/
│       ├── db.cjs                  [CREATE - SQLite connection]
│       └── migrations/
│           ├── 001_initial.cjs     [CREATE - core tables]
│           └── 002_vectors.cjs     [CREATE - embeddings]
├── src/
│   ├── App.jsx                     [MODIFY - routing, sidebar]
│   ├── main.jsx
│   ├── context/
│   │   └── ServiceContext.jsx      [CREATE]
│   ├── services/
│   │   ├── BaseService.js          [CREATE]
│   │   ├── DataService.js          [CREATE]
│   │   ├── EmbeddingService.js     [CREATE]
│   │   ├── SessionService.js       [CREATE]
│   │   ├── MemoryService.js        [CREATE]
│   │   ├── MemoryCatcher.js        [CREATE]
│   │   ├── EntityResolver.js       [CREATE]
│   │   ├── ProjectService.js       [CREATE]
│   │   ├── ReminderService.js      [CREATE]
│   │   ├── DashboardService.js     [CREATE]
│   │   ├── ChatService.js          [CREATE]
│   │   ├── RelationshipService.js  [CREATE]
│   │   ├── MeetingService.js       [CREATE]
│   │   ├── KnowledgeService.js     [CREATE]
│   │   ├── SparkService.js         [CREATE]
│   │   └── AdminService.js         [CREATE]
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Sidebar.jsx         [CREATE]
│   │   │   ├── Card.jsx            [CREATE]
│   │   │   ├── Modal.jsx           [CREATE]
│   │   │   ├── MarkdownEditor.jsx  [CREATE]
│   │   │   ├── LoadingSpinner.jsx  [CREATE]
│   │   │   └── Toast.jsx           [CREATE]
│   │   ├── dashboard/              [CREATE - 7 files]
│   │   ├── projects/               [CREATE - 8 files]
│   │   ├── reminders/              [CREATE - 4 files]
│   │   ├── chat/                   [CREATE - 10 files]
│   │   ├── relationships/          [CREATE - 5 files]
│   │   ├── meetings/               [CREATE - 5 files]
│   │   ├── knowledge/              [CREATE - 5 files]
│   │   ├── sparkfile/              [CREATE - 4 files]
│   │   ├── memory-lane/            [CREATE - 5 files]
│   │   ├── admin/                  [CREATE - 6 files]
│   │   ├── onboarding/             [CREATE - 2 files]
│   │   ├── vision/                 [EXISTING - minimal changes]
│   │   ├── chain-runner/           [EXISTING - minimal changes]
│   │   ├── memory-viewer/          [EXISTING - integrate/retire]
│   │   └── settings/               [EXISTING - expand]
│   ├── hooks/
│   │   └── useKeyboardShortcuts.js [CREATE]
│   ├── utils/
│   │   ├── dateParser.js           [CREATE]
│   │   ├── memoryRetrieval.js      [CREATE]
│   │   └── notifications.js        [CREATE]
│   ├── constants/
│   │   └── memoryTypes.js          [CREATE]
│   └── styles/
│       └── theme.css               [CREATE]
├── CLAUDE.md                       [MODIFY]
├── AI-COMMAND-CENTER-PLAN.md       [THIS FILE]
└── package.json                    [MODIFY]

Total new files: ~80
Total modified files: ~6
```

---

## 26. Implementation Phases

### Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PHASE TIMELINE                                         │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬─────────────────┤
│  PHASE 1  │  PHASE 2  │  PHASE 3  │  PHASE 4  │  PHASE 5  │  PHASE 6  │    PHASE 7      │
│   Core    │  Memory   │  Product. │  Comms    │ Knowledge │   Admin   │   Integration   │
│   Infra   │   Lane    │   Suite   │   Tools   │   Mgmt    │  & Polish │   & Testing     │
│           │           │           │           │           │           │                 │
│  Week 1-2 │  Week 3-4 │  Week 5-7 │ Week 8-10 │ Week 11-12│ Week 13-14│   Week 15-16    │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴─────────────────┘
```

### Phase 1: Core Infrastructure (Week 1-2)

**Objective:** Establish foundational infrastructure for all modules.

**Tasks:**
- Set up SQLite + sqlite-vss in Electron main process
- Create database initialization and migration system
- Implement all table schemas
- Add new IPC handlers for database operations
- Create base service class with CRUD operations
- Set up Ollama embedding service
- Update navigation to sidebar with 11+ modules
- Create shared UI components (Card, Modal, MarkdownEditor)
- Implement dark theme with yellow accents

**Deliverables:**
- Working SQLite database with migrations
- Service layer abstraction
- Embedding generation via Ollama
- New sidebar navigation
- Shared component library

### Phase 2: Memory Lane System (Week 3-4)

**Objective:** Build the intelligent memory system.

**Tasks:**
- Create session logging service
- Build memory extraction pipeline (Memory Catcher)
- Implement memory types and categorization
- Create entity extraction and resolution
- Build hybrid retrieval (entity + semantic)
- Implement re-ranking algorithm
- Add Memory Lane bar for chat
- Create Memory cards with feedback buttons
- Build Memories admin browser

**Deliverables:**
- Automatic memory extraction from conversations
- Semantic and entity-based retrieval
- Feedback loop for memory ranking
- Memory Lane UI components

### Phase 3: Productivity Suite (Week 5-7)

**Objective:** Build core productivity tools.

**Tasks:**
- Create Dashboard with widget system
- Implement auto-generated daily brief (8:30 AM)
- Build Projects with Life/Projects/Now views
- Implement energy-based task filtering
- Create Reminders with snooze workflow
- Add natural language date parsing
- Implement recurring reminders
- Connect projects, tasks, and reminders

**Deliverables:**
- Functional Dashboard aggregating all data
- Complete project management system
- Full reminders system with snooze

### Phase 4: Communication Tools (Week 8-10)

**Objective:** Build communication layer.

**Tasks:**
- Create Chat interface wrapping Claude Code
- Implement Memory Lane integration in chat
- Add slash command autocomplete
- Build tool call visibility UI
- Create Relationships CRM
- Implement freshness tracking
- Build Meetings system
- Link participants to contacts
- Create meeting prep sheets

**Deliverables:**
- Rich chat interface with memory injection
- Complete CRM with freshness
- Meeting management with prep/notes

### Phase 5: Knowledge Management (Week 11-12)

**Objective:** Build knowledge capture system.

**Tasks:**
- Create Knowledge base with folder tree
- Implement document view and editor
- Add auto-filing based on content
- Create tag extraction
- Implement relationship suggestions
- Build SparkFile for quick ideas
- Add Quick Spark button to chat

**Deliverables:**
- Full knowledge management system
- SparkFile for idea capture
- Integration with other modules

### Phase 6: Admin & Polish (Week 13-14)

**Objective:** Complete admin panel and polish UI.

**Tasks:**
- Create Admin overview dashboard
- Build memory browser
- Add session viewer
- Create token usage analytics
- Implement loading states everywhere
- Add error handling UI
- Create keyboard shortcuts
- Build onboarding flow

**Deliverables:**
- Complete Admin panel
- Polished UI with loading/error states
- Keyboard shortcuts
- Onboarding wizard

### Phase 7: Integration & Testing (Week 15-16)

**Objective:** Wire everything together and test.

**Tasks:**
- Connect Dashboard to all data sources
- Implement memory injection in chat
- Link meetings to relationships
- Connect projects to reminders
- Wire knowledge to relationship suggestions
- Run E2E test suite
- Performance testing
- Update documentation
- Create release build

**Deliverables:**
- Fully integrated system
- Tested and documented
- Release package

---

## 27. Code Examples

### Service Layer Pattern

```javascript
// src/services/BaseService.js
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
    return window.electronAPI.dbQuery(
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

### Memory Retrieval Hook

```javascript
// src/hooks/useMemoryRetrieval.js
import { useState, useCallback } from 'react';
import { generateEmbedding, cosineSimilarity } from '../services/EmbeddingService';

export function useMemoryRetrieval() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);

  const retrieveMemories = useCallback(async (query) => {
    setLoading(true);
    try {
      // Generate query embedding
      const queryEmbedding = await generateEmbedding(query);

      // Get all memories with embeddings
      const allMemories = await window.electronAPI.dbQuery(
        'SELECT * FROM memories WHERE embedding IS NOT NULL'
      );

      // Calculate similarity scores
      const scored = allMemories.map(memory => {
        const memoryEmbedding = new Float32Array(memory.embedding);
        const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
        return { ...memory, similarity };
      });

      // Filter and re-rank
      const relevant = scored
        .filter(m => m.similarity > 0.4)
        .map(m => ({
          ...m,
          finalScore: calculateFinalScore(m, m.similarity, query)
        }))
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 10);

      setMemories(relevant);
    } finally {
      setLoading(false);
    }
  }, []);

  return { memories, loading, retrieveMemories };
}
```

### Dashboard Widget Example

```jsx
// src/components/dashboard/widgets/RemindersWidget.jsx
import React from 'react';
import { useReminders } from '../../../hooks/useReminders';

export function RemindersWidget() {
  const { reminders, loading } = useReminders({
    filter: ['overdue', 'today']
  });

  const overdue = reminders.filter(r => r.status === 'overdue');
  const today = reminders.filter(r => r.status === 'today');

  return (
    <div className="widget reminders-widget">
      <h3>Reminders</h3>

      {overdue.length > 0 && (
        <div className="widget-section">
          <h4>Overdue ({overdue.length})</h4>
          {overdue.slice(0, 3).map(reminder => (
            <ReminderItem key={reminder.id} reminder={reminder} />
          ))}
        </div>
      )}

      {today.length > 0 && (
        <div className="widget-section">
          <h4>Due Today ({today.length})</h4>
          {today.slice(0, 3).map(reminder => (
            <ReminderItem key={reminder.id} reminder={reminder} />
          ))}
        </div>
      )}

      {!loading && reminders.length === 0 && (
        <p className="empty">No reminders</p>
      )}
    </div>
  );
}

function ReminderItem({ reminder }) {
  return (
    <div className="reminder-item">
      <span className="reminder-title">{reminder.title}</span>
      <span className="reminder-due">{formatDue(reminder.due_at)}</span>
    </div>
  );
}
```

---

## Summary

This plan transforms AI Command Center from a 3-app utility into a comprehensive JFDI-style executive assistant with 11 integrated modules:

1. **Dashboard** - Auto-generated daily overview
2. **Projects** - Three-tier view with energy filtering
3. **Reminders** - Snooze-based system
4. **Relationships** - CRM with freshness tracking
5. **Meetings** - Prep sheets and notes
6. **Knowledge** - Auto-filing second brain
7. **Chat** - Claude Code wrapper with Memory Lane
8. **Admin** - System monitoring
9. **Memory Lane** - AI memory extraction and retrieval
10. **Vision** - Existing camera AI (enhanced integration)
11. **Chain Runner** - Existing A2A training (enhanced integration)

The implementation follows a 7-phase approach over 15-16 weeks, building from core infrastructure through to full integration and testing.

---

*Document created: 2025-12-29*
*Based on: JFDI System Analysis + Existing AI Command Center Codebase*
