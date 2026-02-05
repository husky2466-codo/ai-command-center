/**
 * Email Signatures migration - Creates table for managing email signatures
 * Supports multiple signatures per account with default selection and auto-insert settings
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 007] Creating email_signatures table...');

    // =========================================================================
    // EMAIL SIGNATURES
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS email_signatures (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        use_for_new INTEGER DEFAULT 1,
        use_for_reply INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('[Migration 007] email_signatures table created');

    // =========================================================================
    // INDEXES
    // =========================================================================

    db.exec('CREATE INDEX IF NOT EXISTS idx_signatures_account ON email_signatures(account_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_signatures_default ON email_signatures(account_id, is_default)');
    console.log('[Migration 007] Signature indexes created');

    console.log('[Migration 007] Email signatures table created successfully');
  },

  down: (db) => {
    console.log('[Migration 007] Rolling back email_signatures table...');

    // Drop indexes first
    db.exec('DROP INDEX IF EXISTS idx_signatures_default');
    db.exec('DROP INDEX IF EXISTS idx_signatures_account');

    // Drop table
    db.exec('DROP TABLE IF EXISTS email_signatures');

    console.log('[Migration 007] Email signatures table rolled back successfully');
  }
};
