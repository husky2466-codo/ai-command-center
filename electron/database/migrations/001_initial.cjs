/**
 * Initial migration - Creates all core tables
 * Based on AI-COMMAND-CENTER-PLAN.md Database Schema
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 001] Creating core tables...');

    // =========================================================================
    // SPACES & PROJECTS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#8b5cf6',
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
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
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
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
      )
    `);

    // =========================================================================
    // REMINDERS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS reminders (
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
      )
    `);

    // =========================================================================
    // RELATIONSHIPS (CRM)
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
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
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_group_members (
        contact_id TEXT REFERENCES contacts(id),
        group_id TEXT REFERENCES contact_groups(id),
        PRIMARY KEY (contact_id, group_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_interactions (
        id TEXT PRIMARY KEY,
        contact_id TEXT REFERENCES contacts(id),
        type TEXT CHECK(type IN ('email', 'meeting', 'call', 'message', 'in_person')),
        summary TEXT,
        occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // =========================================================================
    // MEETINGS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS meetings (
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
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        meeting_id TEXT REFERENCES meetings(id),
        contact_id TEXT REFERENCES contacts(id),
        role TEXT,
        PRIMARY KEY (meeting_id, contact_id)
      )
    `);

    // =========================================================================
    // KNOWLEDGE BASE
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_folders (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES knowledge_folders(id),
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_articles (
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
      )
    `);

    // =========================================================================
    // MEMORY LANE
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
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
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS session_recalls (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES chat_sessions(id),
        memory_id TEXT REFERENCES memories(id),
        query_text TEXT,
        similarity_score REAL,
        final_rank INTEGER,
        was_useful INTEGER,
        recalled_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_feedback (
        id TEXT PRIMARY KEY,
        memory_id TEXT REFERENCES memories(id),
        session_id TEXT,
        query_context TEXT,
        feedback_type TEXT CHECK(feedback_type IN ('positive', 'negative')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // =========================================================================
    // CHAT SESSIONS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
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
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES chat_sessions(id),
        role TEXT CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT,
        tool_calls TEXT,
        token_count INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // =========================================================================
    // ENTITY RESOLUTION
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        type TEXT CHECK(type IN ('person', 'project', 'business', 'location')),
        canonical_name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        aliases TEXT,
        linked_contact_id TEXT REFERENCES contacts(id),
        linked_project_id TEXT REFERENCES projects(id),
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // =========================================================================
    // GOALS & TRACKING
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        target_percentage REAL,
        current_progress REAL DEFAULT 0,
        time_window_days INTEGER DEFAULT 90,
        start_date DATE,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_alignments (
        goal_id TEXT REFERENCES goals(id),
        project_id TEXT REFERENCES projects(id),
        weight REAL DEFAULT 1.0,
        PRIMARY KEY (goal_id, project_id)
      )
    `);

    // =========================================================================
    // ADMIN & SYSTEM
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_jobs (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        last_run_at DATETIME,
        next_run_at DATETIME,
        error_message TEXT,
        metadata TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        provider TEXT CHECK(provider IN ('anthropic', 'openai', 'ollama', 'huggingface')),
        model TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        estimated_cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[Migration 001] Core tables created successfully');
  }
};
