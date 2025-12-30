const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const logger = require('../utils/logger.cjs');

let db = null;

/**
 * Initialize the SQLite database with WAL mode and migrations
 * @returns {Database} The initialized database instance
 */
function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'database.sqlite');

  logger.info('Initializing database', { dbPath });

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  logger.db('WAL mode enabled', 'system');

  // Load sqlite-vss extension for vector search (graceful fallback if unavailable)
  try {
    db.loadExtension('sqlite-vss');
    logger.info('sqlite-vss extension loaded successfully');
  } catch (err) {
    logger.warn('sqlite-vss not available, vector search disabled', { error: err.message });
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
  logger.info('Running database migrations');

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
      logger.db('Applying migration', 'migrations', { name });
      try {
        const migrationPath = path.join(migrationsDir, `${name}.cjs`);

        // Check if migration file exists
        if (!fs.existsSync(migrationPath)) {
          logger.error('Migration file not found', { name, path: migrationPath });
          continue;
        }

        const migration = require(migrationPath);

        // Run migration in a transaction
        const applyMigration = db.transaction(() => {
          migration.up(db);
          db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
        });

        applyMigration();
        logger.db('Migration applied successfully', 'migrations', { name });
      } catch (err) {
        logger.error('Migration failed', { name, error: err.message, stack: err.stack });
        throw err;
      }
    } else {
      logger.debug('Migration already applied', { name });
    }
  }

  logger.info('All migrations completed');
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    logger.info('Database connection closed');
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};
