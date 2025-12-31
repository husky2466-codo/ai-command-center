# Database Troubleshooting Guide

This guide helps you fix database issues in AI Command Center.

## Common Error: "database disk image is malformed"

This error typically occurs due to:
1. **WAL file buildup** - Write-Ahead Log not checkpointed properly
2. **Improper shutdown** - App closed while database was writing
3. **File system issues** - Disk errors or antivirus interference
4. **Multiple instances** - Two app instances accessing same database

## Automatic Repair (Built-in)

The app now **automatically repairs** most database issues on startup:

1. **Health Check** - Runs integrity check before opening database
2. **WAL Checkpoint** - Checkpoints Write-Ahead Log to consolidate changes
3. **Auto-Backup** - Creates backup if corruption detected
4. **Auto-Repair** - Attempts repair via WAL checkpoint
5. **Fallback** - Deletes WAL files to force SQLite recovery

**Check the logs** to see what happened:
- Location: `%APPDATA%\ai-command-center\logs\combined-YYYY-MM-DD.log`
- Look for: "Database health check", "WAL checkpoint", "Database repaired"

## Manual Repair Tools

If automatic repair doesn't work, use the manual repair utility.

### Prerequisites

1. **Close the app completely** (check Task Manager for `ai-command-center.exe`)
2. Navigate to project directory: `cd D:\Projects\ai-command-center`

**Note**: The repair utility uses `better-sqlite3` which must be run with Electron's Node.js version. Use one of these methods:

**Method 1 - Use npm script (recommended)**:
```bash
npm run db:check
npm run db:checkpoint
npm run db:backup
```

**Method 2 - Use npx electron**:
```bash
npx electron electron/utils/dbRepair.cjs check
```

**Method 3 - Use sqlite3 CLI** (if installed):
```bash
sqlite3 "%APPDATA%\ai-command-center\database.sqlite" "PRAGMA wal_checkpoint(TRUNCATE);"
```

### Repair Commands

#### 1. Check Database Integrity

```bash
npm run db:check
# OR
npx electron electron/utils/dbRepair.cjs check
```

Shows if database is corrupted.

#### 2. Checkpoint WAL File

```bash
npm run db:checkpoint
```

Consolidates WAL (Write-Ahead Log) into main database. **Try this first!**

#### 3. Vacuum Database

```bash
npm run db:vacuum
```

Optimizes and defragments database. Use after checkpoint.

#### 4. Create Backup

```bash
npm run db:backup
```

Creates timestamped backup in `%APPDATA%\ai-command-center\db-backups\`

#### 5. Full Recovery (Dump & Restore)

```bash
npm run db:recover
```

Exports all data to SQL dump, creates new database from dump. **Use if checkpoint doesn't work.**

#### 6. Fresh Start (Last Resort)

```bash
npm run db:fresh
```

**WARNING: This deletes the database!** Creates backup first. App will create fresh database on next startup.

## Step-by-Step Repair Process

### Quick Fix (Most Common)

1. Close app completely
2. Run: `npm run db:checkpoint`
3. Restart app

### Standard Repair

1. Close app completely
2. Run: `npm run db:backup` (create backup first)
3. Run: `npm run db:checkpoint`
4. Run: `npm run db:vacuum`
5. Run: `npm run db:check`
6. Restart app

### Full Recovery (If Standard Fails)

1. Close app completely
2. Run: `npm run db:recover`
3. Follow instructions to rename files:
   - `database.sqlite` → `database.sqlite.old`
   - `database-recovered-TIMESTAMP.sqlite` → `database.sqlite`
4. Restart app

### Nuclear Option (Data Loss)

1. Close app completely
2. Run: `npm run db:backup` (create final backup)
3. Run: `npm run db:fresh`
4. Restart app (fresh database)
5. Re-import data if needed

## Database Files Explained

**Location**: `%APPDATA%\ai-command-center\`

- `database.sqlite` - Main database file
- `database.sqlite-wal` - Write-Ahead Log (pending changes)
- `database.sqlite-shm` - Shared memory file (index for WAL)

**WAL Mode**: SQLite writes changes to WAL first, then checkpoints to main file. If app crashes before checkpoint, WAL can become stale.

## Prevention Tips

1. **Close app properly** - Don't force-quit or kill process
2. **Single instance** - Don't run multiple app instances
3. **Antivirus exceptions** - Add `%APPDATA%\ai-command-center\` to exclusions
4. **Regular backups** - App auto-checkpoints on startup/shutdown
5. **Check logs** - Review logs if app seems slow

## Understanding Logs

**Log Location**: `%APPDATA%\ai-command-center\logs\`

**What to look for**:

```
// Healthy startup
[timestamp] Database health check: OK
[timestamp] WAL mode enabled
[timestamp] WAL checkpoint on startup

// Auto-repair happened
[timestamp] Database corruption detected
[timestamp] Corrupted database backed up
[timestamp] Attempting WAL checkpoint repair
[timestamp] ✓ Database repaired successfully via WAL checkpoint

// Failed to repair
[timestamp] Database still corrupted after WAL checkpoint
[timestamp] Deleting WAL files to force recovery
```

## Data Recovery

If database is unrecoverable, you can restore from:

1. **Auto-backups**: `%APPDATA%\ai-command-center\db-backups\`
2. **Corruption backups**: Files named `database.sqlite.corrupt-TIMESTAMP`
3. **SQL dumps**: `dump-TIMESTAMP.sql` (if you ran `recover`)

### Restore from Backup

1. Close app
2. Navigate to: `%APPDATA%\ai-command-center\`
3. Rename: `database.sqlite` → `database.sqlite.broken`
4. Copy backup: `db-backups\database-TIMESTAMP.sqlite` → `database.sqlite`
5. Restart app

## Advanced: Manual SQLite Commands

If you have `sqlite3` CLI installed:

```bash
# Navigate to database directory
cd %APPDATA%\ai-command-center

# Check integrity
sqlite3 database.sqlite "PRAGMA integrity_check;"

# Checkpoint WAL
sqlite3 database.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"

# Export to SQL dump
sqlite3 database.sqlite ".dump" > backup.sql

# Create new database from dump
sqlite3 database-new.sqlite < backup.sql
```

## Getting Help

If you're still stuck:

1. **Check logs**: `%APPDATA%\ai-command-center\logs\error-YYYY-MM-DD.log`
2. **Backup everything**: Run `node electron/utils/dbRepair.cjs backup`
3. **Share logs**: Include log excerpt when reporting issue
4. **Database stats**: Note file sizes of `database.sqlite`, `database.sqlite-wal`

## Technical Details

**Database Engine**: better-sqlite3 (synchronous Node.js SQLite)
**Journal Mode**: WAL (Write-Ahead Logging)
**Busy Timeout**: 5000ms (5 seconds)
**Auto-checkpoint**: On startup and shutdown
**Vector Search**: sqlite-vss extension (optional)

**Key Settings**:
- `PRAGMA journal_mode = WAL` - Enables concurrent reads
- `PRAGMA busy_timeout = 5000` - Waits 5s for lock release
- `PRAGMA wal_checkpoint(PASSIVE)` - Gentle checkpoint on startup
- `PRAGMA wal_checkpoint(TRUNCATE)` - Full checkpoint on shutdown

## Preventing Corruption

The app now includes multiple safeguards:

1. **Startup health check** - Detects corruption early
2. **Auto-checkpoint** - Prevents WAL buildup
3. **Busy timeout** - Handles concurrent access
4. **Graceful shutdown** - Checkpoints before close
5. **Auto-backup on error** - Preserves data

**You shouldn't need manual repairs** in normal operation. If you do, it may indicate:
- Disk issues (run `chkdsk`)
- Antivirus interference (add exclusion)
- Hardware problems (RAM/SSD errors)
