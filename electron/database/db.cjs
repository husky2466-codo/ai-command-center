const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db = null;

/**
 * Initialize the SQLite database with WAL mode and migrations
 * @returns {Database} The initialized database instance
 */
function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'database.sqlite');

  console.log(`[Database] Initializing database at: ${dbPath}`);

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  console.log('[Database] WAL mode enabled');

  // Load sqlite-vss extension for vector search (graceful fallback if unavailable)
  try {
    db.loadExtension('sqlite-vss');
    console.log('[Database] sqlite-vss extension loaded successfully');
  } catch (err) {
    console.warn('[Database] sqlite-vss not available, vector search disabled:', err.message);
    console.warn('[Database] App will continue without vector search capabilities');
  }

  // Run migrations
  runMigrations();

  return db;
}

/**
 * Get the database instance (must be initialized first)
 * @returns {Database} The database instance
 * @throws {Error} If database not initialized
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Run all pending migrations in order
 */
function runMigrations() {
  console.log('[Database] Running migrations...');

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of already applied migrations
  const applied = db.prepare('SELECT name FROM migrations').all();
  const appliedNames = new Set(applied.map(m => m.name));

  // Define migrations in order
  const migrations = [
    '001_initial',
    '002_vectors',
    '003_indexes',
    '004_accounts',
    '005_project_fs_path',
    '006_dgx_spark',
    '007_email_signatures',
    '008_email_templates',
    '009_saved_searches'
  ];

  const migrationsDir = path.join(__dirname, 'migrations');

  // Apply pending migrations
  for (const name of migrations) {
    if (!appliedNames.has(name)) {
      console.log(`[Database] Applying migration: ${name}`);
      try {
        const migrationPath = path.join(migrationsDir, `${name}.cjs`);

        // Check if migration file exists
        if (!fs.existsSync(migrationPath)) {
          console.error(`[Database] Migration file not found: ${migrationPath}`);
          continue;
        }

        const migration = require(migrationPath);

        // Run migration in a transaction
        const applyMigration = db.transaction(() => {
          migration.up(db);
          db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
        });

        applyMigration();
        console.log(`[Database] Migration ${name} applied successfully`);
      } catch (err) {
        console.error(`[Database] Migration ${name} failed:`, err.message);
        throw err;
      }
    } else {
      console.log(`[Database] Migration ${name} already applied`);
    }
  }

  console.log('[Database] All migrations completed');
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    console.log('[Database] Connection closed');
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};
