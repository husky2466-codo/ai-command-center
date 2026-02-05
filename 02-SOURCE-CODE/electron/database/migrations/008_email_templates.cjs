/**
 * Email Templates migration - Creates table for reusable email templates
 * Supports account-specific and global templates with categories
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 008] Creating email_templates table...');

    // =========================================================================
    // EMAIL TEMPLATES
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        name TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        category TEXT,
        is_favorite INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 008] email_templates table created');

    // =========================================================================
    // INDEXES
    // =========================================================================

    db.exec('CREATE INDEX IF NOT EXISTS idx_templates_account ON email_templates(account_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_templates_category ON email_templates(category)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_templates_favorite ON email_templates(is_favorite)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_templates_usage ON email_templates(usage_count DESC)');
    console.log('[Migration 008] Email template indexes created');

    console.log('[Migration 008] Email templates table created successfully');
  },

  down: (db) => {
    console.log('[Migration 008] Rolling back email_templates table...');

    // Drop indexes first
    db.exec('DROP INDEX IF EXISTS idx_templates_usage');
    db.exec('DROP INDEX IF EXISTS idx_templates_favorite');
    db.exec('DROP INDEX IF EXISTS idx_templates_category');
    db.exec('DROP INDEX IF EXISTS idx_templates_account');

    // Drop table
    db.exec('DROP TABLE IF EXISTS email_templates');

    console.log('[Migration 008] Email templates table rolled back successfully');
  }
};
