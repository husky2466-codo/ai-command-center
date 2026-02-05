/**
 * Accounts migration - Creates tables for Google account integration
 * Supports Gmail, Google Calendar, and Google Contacts sync
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 004] Creating account integration tables...');

    // =========================================================================
    // CONNECTED ACCOUNTS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS connected_accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        added_at INTEGER NOT NULL,
        last_sync_at INTEGER,
        sync_enabled INTEGER DEFAULT 1,
        scopes TEXT,
        UNIQUE(provider, email)
      )
    `);
    console.log('[Migration 004] connected_accounts table created');

    // =========================================================================
    // EMAILS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS account_emails (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        thread_id TEXT,
        message_id TEXT,
        subject TEXT,
        snippet TEXT,
        from_email TEXT,
        from_name TEXT,
        to_emails TEXT,
        cc_emails TEXT,
        date INTEGER,
        body_text TEXT,
        body_html TEXT,
        labels TEXT,
        is_read INTEGER DEFAULT 0,
        is_starred INTEGER DEFAULT 0,
        has_attachments INTEGER DEFAULT 0,
        raw_data TEXT,
        synced_at INTEGER,
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 004] account_emails table created');

    // =========================================================================
    // CALENDAR EVENTS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS account_calendar_events (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        calendar_id TEXT,
        summary TEXT,
        description TEXT,
        location TEXT,
        start_time INTEGER,
        end_time INTEGER,
        all_day INTEGER DEFAULT 0,
        status TEXT,
        attendees TEXT,
        organizer_email TEXT,
        recurrence TEXT,
        reminders TEXT,
        raw_data TEXT,
        synced_at INTEGER,
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 004] account_calendar_events table created');

    // =========================================================================
    // CONTACTS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS account_contacts (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        resource_name TEXT,
        display_name TEXT,
        given_name TEXT,
        family_name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        job_title TEXT,
        photo_url TEXT,
        raw_data TEXT,
        synced_at INTEGER,
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 004] account_contacts table created');

    // =========================================================================
    // SYNC STATE
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS account_sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        sync_type TEXT NOT NULL,
        last_sync_token TEXT,
        last_history_id TEXT,
        last_sync_at INTEGER,
        UNIQUE(account_id, sync_type),
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 004] account_sync_state table created');

    // =========================================================================
    // INDEXES
    // =========================================================================

    db.exec('CREATE INDEX IF NOT EXISTS idx_emails_account ON account_emails(account_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emails_date ON account_emails(date DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emails_thread ON account_emails(thread_id)');
    console.log('[Migration 004] Email indexes created');

    db.exec('CREATE INDEX IF NOT EXISTS idx_events_account ON account_calendar_events(account_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_events_start ON account_calendar_events(start_time)');
    console.log('[Migration 004] Calendar event indexes created');

    db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_account ON account_contacts(account_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_email ON account_contacts(email)');
    console.log('[Migration 004] Contact indexes created');

    console.log('[Migration 004] Account integration tables created successfully');
  },

  down: (db) => {
    console.log('[Migration 004] Rolling back account integration tables...');

    // Drop indexes first
    db.exec('DROP INDEX IF EXISTS idx_contacts_email');
    db.exec('DROP INDEX IF EXISTS idx_contacts_account');
    db.exec('DROP INDEX IF EXISTS idx_events_start');
    db.exec('DROP INDEX IF EXISTS idx_events_account');
    db.exec('DROP INDEX IF EXISTS idx_emails_thread');
    db.exec('DROP INDEX IF EXISTS idx_emails_date');
    db.exec('DROP INDEX IF EXISTS idx_emails_account');

    // Drop tables in reverse order of dependencies
    db.exec('DROP TABLE IF EXISTS account_sync_state');
    db.exec('DROP TABLE IF EXISTS account_contacts');
    db.exec('DROP TABLE IF EXISTS account_calendar_events');
    db.exec('DROP TABLE IF EXISTS account_emails');
    db.exec('DROP TABLE IF EXISTS connected_accounts');

    console.log('[Migration 004] Account integration tables rolled back successfully');
  }
};
