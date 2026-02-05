/**
 * Saved Searches migration - Creates table for Gmail advanced search
 * Stores user's favorite/saved search queries with Gmail operators
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 009] Creating saved_searches table...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        query TEXT NOT NULL,
        is_favorite INTEGER DEFAULT 0,
        use_count INTEGER DEFAULT 0,
        last_used_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 009] saved_searches table created');

    // Create indexes for efficient querying
    db.exec('CREATE INDEX IF NOT EXISTS idx_saved_searches_account ON saved_searches(account_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_saved_searches_favorite ON saved_searches(is_favorite DESC, last_used_at DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_saved_searches_use_count ON saved_searches(use_count DESC)');
    console.log('[Migration 009] saved_searches indexes created');

    // Create FTS5 table for email full-text search
    // This enables fast searching across subject, from, snippet, body
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS account_emails_fts USING fts5(
        subject,
        from_email,
        from_name,
        to_emails,
        snippet,
        body_text,
        content='account_emails',
        content_rowid='rowid'
      )
    `);
    console.log('[Migration 009] account_emails_fts virtual table created');

    // Create triggers to keep FTS in sync with main table
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS account_emails_ai AFTER INSERT ON account_emails BEGIN
        INSERT INTO account_emails_fts(rowid, subject, from_email, from_name, to_emails, snippet, body_text)
        VALUES (NEW.rowid, NEW.subject, NEW.from_email, NEW.from_name, NEW.to_emails, NEW.snippet, NEW.body_text);
      END
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS account_emails_ad AFTER DELETE ON account_emails BEGIN
        INSERT INTO account_emails_fts(account_emails_fts, rowid, subject, from_email, from_name, to_emails, snippet, body_text)
        VALUES ('delete', OLD.rowid, OLD.subject, OLD.from_email, OLD.from_name, OLD.to_emails, OLD.snippet, OLD.body_text);
      END
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS account_emails_au AFTER UPDATE ON account_emails BEGIN
        INSERT INTO account_emails_fts(account_emails_fts, rowid, subject, from_email, from_name, to_emails, snippet, body_text)
        VALUES ('delete', OLD.rowid, OLD.subject, OLD.from_email, OLD.from_name, OLD.to_emails, OLD.snippet, OLD.body_text);
        INSERT INTO account_emails_fts(rowid, subject, from_email, from_name, to_emails, snippet, body_text)
        VALUES (NEW.rowid, NEW.subject, NEW.from_email, NEW.from_name, NEW.to_emails, NEW.snippet, NEW.body_text);
      END
    `);
    console.log('[Migration 009] FTS triggers created');

    // Add index for email search by date range
    db.exec('CREATE INDEX IF NOT EXISTS idx_emails_search_date ON account_emails(account_id, date DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emails_search_starred ON account_emails(account_id, is_starred)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emails_search_read ON account_emails(account_id, is_read)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_emails_search_attachments ON account_emails(account_id, has_attachments)');
    console.log('[Migration 009] Additional email search indexes created');

    console.log('[Migration 009] Saved searches migration completed successfully');
  },

  down: (db) => {
    console.log('[Migration 009] Rolling back saved_searches migration...');

    // Drop triggers first
    db.exec('DROP TRIGGER IF EXISTS account_emails_au');
    db.exec('DROP TRIGGER IF EXISTS account_emails_ad');
    db.exec('DROP TRIGGER IF EXISTS account_emails_ai');

    // Drop FTS table
    db.exec('DROP TABLE IF EXISTS account_emails_fts');

    // Drop indexes
    db.exec('DROP INDEX IF EXISTS idx_emails_search_attachments');
    db.exec('DROP INDEX IF EXISTS idx_emails_search_read');
    db.exec('DROP INDEX IF EXISTS idx_emails_search_starred');
    db.exec('DROP INDEX IF EXISTS idx_emails_search_date');
    db.exec('DROP INDEX IF EXISTS idx_saved_searches_use_count');
    db.exec('DROP INDEX IF EXISTS idx_saved_searches_favorite');
    db.exec('DROP INDEX IF EXISTS idx_saved_searches_account');

    // Drop table
    db.exec('DROP TABLE IF EXISTS saved_searches');

    console.log('[Migration 009] Saved searches migration rolled back successfully');
  }
};
