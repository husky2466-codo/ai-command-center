/**
 * Database Repair Utility
 *
 * Run this when the app is CLOSED to repair database corruption issues.
 *
 * Usage:
 *   node electron/utils/dbRepair.cjs [command]
 *
 * Commands:
 *   check      - Check database integrity
 *   checkpoint - Checkpoint WAL file and verify
 *   vacuum     - Vacuum and optimize database
 *   backup     - Create timestamped backup
 *   recover    - Full recovery (dump and restore)
 *   fresh      - Delete corrupted DB and start fresh (WARNING: data loss)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_DIR = path.join(process.env.APPDATA || process.env.HOME, 'ai-command-center');
const DB_PATH = path.join(DB_DIR, 'database.sqlite');
const BACKUP_DIR = path.join(DB_DIR, 'db-backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function checkIntegrity() {
  log('Checking database integrity...');
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const result = db.pragma('integrity_check');
    db.close();

    if (result.length === 1 && result[0].integrity_check === 'ok') {
      log('✓ Database integrity: OK');
      return true;
    } else {
      log('✗ Database integrity: FAILED');
      result.forEach(row => log(`  ${row.integrity_check}`));
      return false;
    }
  } catch (err) {
    log(`✗ Error checking integrity: ${err.message}`);
    return false;
  }
}

function checkpointWAL() {
  log('Checkpointing WAL file...');
  try {
    const db = new Database(DB_PATH);

    // Checkpoint the WAL file
    const result = db.pragma('wal_checkpoint(TRUNCATE)');
    log(`  Checkpointed: ${result[0].busy} busy, ${result[0].log} log, ${result[0].checkpointed} checkpointed`);

    // Verify no corruption after checkpoint
    const integrity = db.pragma('integrity_check');
    db.close();

    if (integrity.length === 1 && integrity[0].integrity_check === 'ok') {
      log('✓ Checkpoint successful, database is healthy');
      return true;
    } else {
      log('✗ Database corrupted after checkpoint');
      return false;
    }
  } catch (err) {
    log(`✗ Error checkpointing: ${err.message}`);
    return false;
  }
}

function vacuum() {
  log('Vacuuming database...');
  try {
    const db = new Database(DB_PATH);
    db.pragma('analysis_limit=400');
    db.pragma('optimize');
    db.exec('VACUUM');
    db.close();
    log('✓ Vacuum successful');
    return true;
  } catch (err) {
    log(`✗ Error vacuuming: ${err.message}`);
    return false;
  }
}

function backup() {
  const backupPath = path.join(BACKUP_DIR, `database-${timestamp()}.sqlite`);
  log(`Creating backup: ${backupPath}`);

  try {
    // First checkpoint WAL
    const db = new Database(DB_PATH);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();

    // Copy database file
    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);
    log(`✓ Backup created (${(stats.size / 1024).toFixed(2)} KB)`);
    return backupPath;
  } catch (err) {
    log(`✗ Error creating backup: ${err.message}`);
    return null;
  }
}

function recover() {
  log('Starting full database recovery...');

  // Step 1: Create backup first
  const backupPath = backup();
  if (!backupPath) {
    log('✗ Cannot proceed without backup');
    return false;
  }

  // Step 2: Export data to SQL dump
  const dumpPath = path.join(BACKUP_DIR, `dump-${timestamp()}.sql`);
  log(`Exporting to SQL dump: ${dumpPath}`);

  try {
    const dumpCommand = `sqlite3 "${DB_PATH}" ".dump" > "${dumpPath}"`;
    execSync(dumpCommand, { shell: 'cmd.exe' });
    log('✓ SQL dump created');
  } catch (err) {
    log(`✗ Error creating dump: ${err.message}`);
    return false;
  }

  // Step 3: Create new database from dump
  const newDbPath = path.join(DB_DIR, `database-recovered-${timestamp()}.sqlite`);
  log(`Creating new database: ${newDbPath}`);

  try {
    const importCommand = `sqlite3 "${newDbPath}" < "${dumpPath}"`;
    execSync(importCommand, { shell: 'cmd.exe' });
    log('✓ New database created from dump');
  } catch (err) {
    log(`✗ Error importing dump: ${err.message}`);
    return false;
  }

  // Step 4: Verify new database
  try {
    const db = new Database(newDbPath, { readonly: true });
    const integrity = db.pragma('integrity_check');
    db.close();

    if (integrity.length === 1 && integrity[0].integrity_check === 'ok') {
      log('✓ Recovered database is healthy');
      log(`\nTo use the recovered database:`);
      log(`  1. Close the app completely`);
      log(`  2. Rename: ${DB_PATH} -> database.sqlite.old`);
      log(`  3. Rename: ${newDbPath} -> database.sqlite`);
      log(`  4. Restart the app`);
      return true;
    } else {
      log('✗ Recovered database is still corrupted');
      return false;
    }
  } catch (err) {
    log(`✗ Error verifying recovered database: ${err.message}`);
    return false;
  }
}

function fresh() {
  log('WARNING: This will DELETE the current database and start fresh!');
  log('All data will be lost except what is in backups.');

  // Create final backup
  const backupPath = backup();
  if (!backupPath) {
    log('✗ Cannot proceed without backup');
    return false;
  }

  log('Deleting database files...');
  try {
    // Delete main database and WAL files
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
    if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');

    log('✓ Database deleted');
    log('The app will create a fresh database on next startup.');
    log(`Backup saved at: ${backupPath}`);
    return true;
  } catch (err) {
    log(`✗ Error deleting database: ${err.message}`);
    return false;
  }
}

// Main CLI
const command = process.argv[2] || 'check';

console.log('='.repeat(60));
console.log('AI Command Center - Database Repair Utility');
console.log('='.repeat(60));
console.log(`Database: ${DB_PATH}`);
console.log('');

switch (command) {
  case 'check':
    checkIntegrity();
    break;

  case 'checkpoint':
    checkpointWAL();
    break;

  case 'vacuum':
    vacuum();
    break;

  case 'backup':
    backup();
    break;

  case 'recover':
    recover();
    break;

  case 'fresh':
    fresh();
    break;

  default:
    console.log('Unknown command. Available commands:');
    console.log('  check      - Check database integrity');
    console.log('  checkpoint - Checkpoint WAL file and verify');
    console.log('  vacuum     - Vacuum and optimize database');
    console.log('  backup     - Create timestamped backup');
    console.log('  recover    - Full recovery (dump and restore)');
    console.log('  fresh      - Delete corrupted DB and start fresh (WARNING: data loss)');
}

console.log('');
console.log('='.repeat(60));
