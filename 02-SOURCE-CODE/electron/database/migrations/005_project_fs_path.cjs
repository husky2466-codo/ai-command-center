/**
 * Migration 005 - Add fs_path column to projects table
 * Enables tracking of projects linked to filesystem directories
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 005] Adding fs_path column to projects table...');

    // Check if column already exists
    const columns = db.prepare("PRAGMA table_info(projects)").all();
    const hasColumn = columns.some(col => col.name === 'fs_path');

    if (hasColumn) {
      console.log('[Migration 005] fs_path column already exists, skipping...');
      return;
    }

    // Add fs_path column to track filesystem location
    // Note: SQLite doesn't allow UNIQUE on ALTER TABLE with existing data (NULL violates UNIQUE)
    // We add the column without UNIQUE and create a unique index instead
    db.exec(`
      ALTER TABLE projects ADD COLUMN fs_path TEXT
    `);

    // Create unique index for faster lookups and uniqueness constraint
    // WHERE clause allows multiple NULLs (SQLite unique index behavior)
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_fs_path ON projects(fs_path) WHERE fs_path IS NOT NULL
    `);

    console.log('[Migration 005] fs_path column added successfully');
  },

  down: (db) => {
    console.log('[Migration 005] Removing fs_path column from projects table...');

    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    // For now, just drop the index (down migrations not critical for this app)
    db.exec(`
      DROP INDEX IF EXISTS idx_projects_fs_path
    `);

    console.log('[Migration 005] Index removed');
  }
};
