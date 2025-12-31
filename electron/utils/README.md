# Database Repair Utility

Manual database repair tool for AI Command Center when the app is closed.

## Quick Start

```bash
# Close the app first, then run:
npm run db:checkpoint
```

This fixes most "database disk image is malformed" errors.

## Available Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run db:check` | Check database integrity | Verify if database is healthy |
| `npm run db:checkpoint` | Checkpoint WAL file | **First line of defense** - fixes most issues |
| `npm run db:vacuum` | Optimize database | After successful checkpoint |
| `npm run db:backup` | Create timestamped backup | Before risky operations |
| `npm run db:recover` | Full recovery (dump/restore) | If checkpoint fails |
| `npm run db:fresh` | Delete DB, start fresh | **Last resort** - data loss! |

## Typical Repair Flow

### 1. Quick Fix (90% of cases)

```bash
# Close app
npm run db:checkpoint
# Restart app
```

### 2. Standard Repair

```bash
# Close app
npm run db:backup
npm run db:checkpoint
npm run db:vacuum
npm run db:check
# Restart app
```

### 3. Nuclear Option

```bash
# Close app
npm run db:backup  # Save a copy first!
npm run db:fresh   # Deletes database
# Restart app (creates fresh DB)
```

## What Each Command Does

### Check
- Runs `PRAGMA integrity_check`
- Reports "ok" or lists corruption details
- Read-only, safe to run anytime

### Checkpoint
- Runs `PRAGMA wal_checkpoint(TRUNCATE)`
- Merges WAL (Write-Ahead Log) into main database
- Fixes most corruption from improper shutdown
- **Most important command**

### Vacuum
- Runs `VACUUM` and `PRAGMA optimize`
- Reclaims space, defragments database
- Use after successful checkpoint

### Backup
- Creates `database-TIMESTAMP.sqlite` in `db-backups/` folder
- Checkpoints WAL first
- Safe to run anytime

### Recover
- Exports database to SQL dump
- Creates new database from dump
- Manual file rename required (see output)
- Use if checkpoint doesn't work

### Fresh
- **WARNING: Deletes database!**
- Creates backup first
- App will create fresh database on next startup
- All data lost except backup

## Output Examples

### Healthy Database
```
============================================================
AI Command Center - Database Repair Utility
============================================================
Database: C:\Users\...\database.sqlite

[timestamp] Checking database integrity...
[timestamp] ✓ Database integrity: OK

============================================================
```

### Corruption Detected
```
[timestamp] Checking database integrity...
[timestamp] ✗ Database integrity: FAILED
  page 42 is never used
  ...more errors...
```

### Successful Repair
```
[timestamp] Attempting WAL checkpoint repair
[timestamp] WAL checkpoint result: { busy: 0, log: 128, checkpointed: 128 }
[timestamp] ✓ Database repaired successfully via WAL checkpoint
```

## Troubleshooting

### "Module was compiled against different Node.js version"

The repair utility needs Electron's Node.js. Use npm scripts (recommended):

```bash
npm run db:checkpoint  # Uses Electron's Node.js
```

Or use npx:

```bash
npx electron electron/utils/dbRepair.cjs checkpoint
```

### "Database is locked"

The app is still running. Close it completely:

1. Close app window
2. Check Task Manager for `ai-command-center.exe`
3. Kill process if found
4. Try repair command again

### "Permission denied"

Database files are read-only or antivirus is blocking:

1. Check file properties (right-click → Properties)
2. Uncheck "Read-only" if checked
3. Add `%APPDATA%\ai-command-center\` to antivirus exclusions

## Database Files

**Location**: `%APPDATA%\ai-command-center\`

- `database.sqlite` - Main database
- `database.sqlite-wal` - Write-Ahead Log (pending changes)
- `database.sqlite-shm` - Shared memory (WAL index)

**WAL Mode**: Changes go to WAL first, then checkpoint merges them into main file.

**Corruption**: Usually means WAL wasn't checkpointed before shutdown.

## Automatic Repair

The app now has **automatic repair on startup**:

1. Health check before opening database
2. Auto-checkpoint WAL
3. Auto-backup if corruption detected
4. Auto-repair via WAL checkpoint
5. Fallback: Delete WAL files, force recovery

**You should rarely need manual repair** - the app handles most issues automatically.

## When to Use Manual Repair

Use manual repair if:

1. App won't start due to database error
2. Repeated corruption after restarts
3. Auto-repair logs show failure
4. You want to verify database health
5. You need a backup before risky operation

## Logs

All operations are logged to:

- `%APPDATA%\ai-command-center\logs\combined-YYYY-MM-DD.log`
- `%APPDATA%\ai-command-center\logs\error-YYYY-MM-DD.log`

Check logs to see what automatic repair did.

## Full Documentation

See `docs/DATABASE-TROUBLESHOOTING.md` for complete guide including:
- Understanding WAL mode
- Data recovery from backups
- Advanced SQLite commands
- Prevention tips
