/**
 * Indexes migration - Creates performance indexes for all tables
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 003] Creating performance indexes...');

    // Tasks indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_energy ON tasks(energy_type)');
    console.log('[Migration 003] Tasks indexes created');

    // Reminders indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_reminders_snoozed ON reminders(snoozed_until)');
    console.log('[Migration 003] Reminders indexes created');

    // Contacts indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_slug ON contacts(slug)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority)');
    console.log('[Migration 003] Contacts indexes created');

    // Meetings indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status)');
    console.log('[Migration 003] Meetings indexes created');

    // Memories indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_confidence ON memories(confidence_score)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_first_observed ON memories(first_observed_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_memories_last_observed ON memories(last_observed_at)');
    console.log('[Migration 003] Memories indexes created');

    // Chat sessions indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_chat_sessions_created ON chat_sessions(created_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_chat_sessions_claude_id ON chat_sessions(claude_session_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)');
    console.log('[Migration 003] Chat sessions indexes created');

    // Entities indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_entities_slug ON entities(slug)');
    console.log('[Migration 003] Entities indexes created');

    // Knowledge indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_articles_folder ON knowledge_articles(folder_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_articles_spark ON knowledge_articles(is_spark)');
    console.log('[Migration 003] Knowledge indexes created');

    // Projects indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_space ON projects(space_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
    console.log('[Migration 003] Projects indexes created');

    console.log('[Migration 003] All performance indexes created successfully');
  }
};
