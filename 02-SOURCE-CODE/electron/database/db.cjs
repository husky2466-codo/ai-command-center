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

  // Check database health before opening
  checkDatabaseHealth(dbPath);

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  logger.db('WAL mode enabled', 'system');

  // Set busy timeout to handle locks better
  db.pragma('busy_timeout = 5000');

  // Checkpoint WAL on startup to prevent buildup
  try {
    const checkpoint = db.pragma('wal_checkpoint(PASSIVE)');
    logger.db('WAL checkpoint on startup', 'system', { checkpoint });
  } catch (err) {
    logger.warn('WAL checkpoint failed on startup', { error: err.message });
  }

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
    '009_saved_searches',
    '010_account_calendars',
    '011_dgx_operations',
    '012_dgx_multi_active'
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
 * Check database health and attempt auto-repair
 * @param {string} dbPath - Path to database file
 */
function checkDatabaseHealth(dbPath) {
  // If database doesn't exist yet, nothing to check
  if (!fs.existsSync(dbPath)) {
    logger.info('Database file does not exist, will be created');
    return;
  }

  logger.info('Checking database health');

  try {
    // Open in readonly mode for health check
    const testDb = new Database(dbPath, { readonly: true });

    // Run integrity check
    const integrity = testDb.pragma('integrity_check');
    testDb.close();

    if (integrity.length === 1 && integrity[0].integrity_check === 'ok') {
      logger.info('Database health check: OK');
    } else {
      logger.error('Database corruption detected', { integrity });

      // Create backup before attempting repair
      const backupPath = `${dbPath}.corrupt-${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      logger.info('Corrupted database backed up', { backupPath });

      // Attempt checkpoint repair
      attemptWALRepair(dbPath);
    }
  } catch (err) {
    logger.error('Database health check failed', { error: err.message });

    // If the error is "malformed", try WAL checkpoint repair
    if (err.message.includes('malformed') || err.message.includes('corrupt')) {
      const backupPath = `${dbPath}.corrupt-${Date.now()}`;
      try {
        fs.copyFileSync(dbPath, backupPath);
        logger.info('Corrupted database backed up', { backupPath });
      } catch (backupErr) {
        logger.error('Failed to backup corrupted database', { error: backupErr.message });
      }

      attemptWALRepair(dbPath);
    }
  }
}

/**
 * Attempt to repair database by checkpointing WAL
 * @param {string} dbPath - Path to database file
 */
function attemptWALRepair(dbPath) {
  logger.info('Attempting WAL checkpoint repair');

  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  try {
    // Open database in read-write mode
    const repairDb = new Database(dbPath);

    // Try to checkpoint the WAL
    const checkpoint = repairDb.pragma('wal_checkpoint(TRUNCATE)');
    logger.info('WAL checkpoint result', { checkpoint });

    // Verify integrity after checkpoint
    const integrity = repairDb.pragma('integrity_check');

    if (integrity.length === 1 && integrity[0].integrity_check === 'ok') {
      logger.info('✓ Database repaired successfully via WAL checkpoint');
      repairDb.close();
      return true;
    } else {
      logger.error('Database still corrupted after WAL checkpoint', { integrity });
      repairDb.close();

      // If checkpoint didn't work, delete WAL files and retry
      logger.info('Deleting WAL files to force recovery');
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

      logger.warn('WAL files deleted. Database will attempt recovery on next open.');
      return false;
    }
  } catch (err) {
    logger.error('WAL repair failed', { error: err.message });

    // Last resort: delete WAL files
    try {
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
        logger.info('Deleted WAL file');
      }
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
        logger.info('Deleted SHM file');
      }
    } catch (deleteErr) {
      logger.error('Failed to delete WAL files', { error: deleteErr.message });
    }

    return false;
  }
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    // Checkpoint WAL before closing
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      logger.db('WAL checkpointed on close', 'system');
    } catch (err) {
      logger.warn('WAL checkpoint failed on close', { error: err.message });
    }

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
