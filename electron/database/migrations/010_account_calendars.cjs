/**
 * Migration 010: Account Calendars Table
 *
 * Creates table to store metadata about calendars linked to Google accounts.
 * Supports multiple calendars per account (primary, shared, app-created like Lasso).
 */

module.exports = {
  id: '010_account_calendars',
  name: 'Add account calendars table',

  up: (db) => {
    console.log('[Migration 010] Creating account_calendars table...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS account_calendars (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        calendar_id TEXT NOT NULL,
        summary TEXT,
        description TEXT,
        location TEXT,
        time_zone TEXT,
        color_id TEXT,
        background_color TEXT,
        foreground_color TEXT,
        access_role TEXT,
        is_primary INTEGER DEFAULT 0,
        is_selected INTEGER DEFAULT 1,
        synced_at INTEGER,
        raw_data TEXT,
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE,
        UNIQUE(account_id, calendar_id)
      )
    `);

    // Create indexes for faster queries
    db.exec('CREATE INDEX IF NOT EXISTS idx_calendars_account ON account_calendars(account_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_calendars_selected ON account_calendars(is_selected)');

    console.log('[Migration 010] account_calendars table created');
  },

  down: (db) => {
    console.log('[Migration 010] Dropping account_calendars table...');
    db.exec('DROP TABLE IF EXISTS account_calendars');
    console.log('[Migration 010] account_calendars table dropped');
  }
};
