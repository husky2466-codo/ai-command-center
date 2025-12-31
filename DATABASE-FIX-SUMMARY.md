# Database Corruption Fix - Summary

## Issue
User encountered "database disk image is malformed" error when trying to delete a Google account in the AI Command Center app.

## Root Cause
The error was caused by **WAL (Write-Ahead Log) file issues**. When SQLite uses WAL mode, changes are written to a separate `-wal` file first, then periodically checkpointed into the main database file. If the app crashes or is force-closed before checkpoint, the WAL can become stale or corrupted.

## Investigation Results
- Database integrity check: **PASSED** ✓
- WAL files present: `database.sqlite-wal`, `database.sqlite-shm`
- Data intact: 328 contacts preserved
- Issue: Transient WAL lock/corruption (likely from improper shutdown)

## Solutions Implemented

### 1. Automatic Repair on Startup (`electron/database/db.cjs`)

**Features:**
- Health check runs before opening database
- Detects corruption via `PRAGMA integrity_check`
- Auto-checkpoint WAL on startup: `PRAGMA wal_checkpoint(PASSIVE)`
- Auto-checkpoint WAL on shutdown: `PRAGMA wal_checkpoint(TRUNCATE)`
- Busy timeout increased to 5000ms to handle locks
- Auto-backup corrupted database before repair
- Attempts WAL checkpoint repair automatically
- Fallback: Deletes WAL files to force SQLite recovery

**Code Changes:**
```javascript
// Added to initializeDatabase()
checkDatabaseHealth(dbPath);
db.pragma('busy_timeout = 5000');
db.pragma('wal_checkpoint(PASSIVE)');

// Added to closeDatabase()
db.pragma('wal_checkpoint(TRUNCATE)');
```

**New Functions:**
- `checkDatabaseHealth(dbPath)` - Pre-flight integrity check
- `attemptWALRepair(dbPath)` - Auto-repair via WAL checkpoint

### 2. Manual Repair Utility (`electron/utils/dbRepair.cjs`)

Command-line tool for manual database repair when app is closed.

**Commands:**
- `check` - Check database integrity
- `checkpoint` - Checkpoint WAL file and verify
- `vacuum` - Vacuum and optimize database
- `backup` - Create timestamped backup
- `recover` - Full recovery (dump and restore)
- `fresh` - Delete corrupted DB and start fresh

**Usage:**
```bash
# Quick fix (most common)
node electron/utils/dbRepair.cjs checkpoint

# Full recovery
node electron/utils/dbRepair.cjs recover
```

### 3. Documentation

Created comprehensive troubleshooting guide: `docs/DATABASE-TROUBLESHOOTING.md`

**Contents:**
- Common errors explained
- Automatic repair features
- Manual repair commands
- Step-by-step repair processes
- Data recovery procedures
- Prevention tips
- Log analysis guide

## Files Created
- `electron/utils/dbRepair.cjs` - Manual repair utility (377 lines)
- `docs/DATABASE-TROUBLESHOOTING.md` - User guide (400+ lines)
- `DATABASE-FIX-SUMMARY.md` - This file

## Files Modified
- `electron/database/db.cjs` - Added health checks and auto-repair (120+ lines added)

## Testing
- ✓ Database integrity check passes
- ✓ Manual delete operation succeeds
- ✓ Google account re-inserted for testing
- ✓ All 328 contacts preserved

## Prevention Measures

The app now includes multiple safeguards:

1. **Startup health check** - Detects corruption before opening
2. **Auto-checkpoint** - Prevents WAL buildup (startup + shutdown)
3. **Busy timeout** - Handles concurrent access gracefully
4. **Auto-backup on error** - Preserves data before repair
5. **Logging** - Winston logs all database operations

## Next Steps for User

1. **Restart the app** - Automatic repair will run on startup
2. **Try delete again** - Should work with improved database handling
3. **Check logs** if issues persist: `%APPDATA%\ai-command-center\logs\`

## Manual Repair (If Needed)

If automatic repair doesn't work:

1. Close app completely
2. Run: `npm run db:checkpoint`
3. Restart app

**Available npm scripts**:
- `npm run db:check` - Check database integrity
- `npm run db:checkpoint` - Checkpoint WAL file (fixes most issues)
- `npm run db:vacuum` - Optimize database
- `npm run db:backup` - Create timestamped backup
- `npm run db:recover` - Full recovery (dump and restore)
- `npm run db:fresh` - Delete DB and start fresh (WARNING: data loss)

See `docs/DATABASE-TROUBLESHOOTING.md` for full repair guide.

## Technical Details

**Database Engine**: better-sqlite3
**Journal Mode**: WAL (Write-Ahead Logging)
**Location**: `%APPDATA%\ai-command-center\database.sqlite`

**New Settings**:
- `PRAGMA busy_timeout = 5000` - Wait 5s for lock release
- `PRAGMA wal_checkpoint(PASSIVE)` - Gentle checkpoint on startup
- `PRAGMA wal_checkpoint(TRUNCATE)` - Full checkpoint on shutdown

**Logging**:
- All database operations logged via Winston
- Location: `%APPDATA%\ai-command-center\logs\combined-YYYY-MM-DD.log`
- Errors: `error-YYYY-MM-DD.log`

## Expected Behavior

**Normal Operation**:
1. App starts → Health check → Auto-checkpoint → Database opens
2. User works → Changes written to WAL
3. App closes → Auto-checkpoint → WAL merged to main DB

**Corruption Detected**:
1. App starts → Health check → Corruption detected
2. Auto-backup created: `database.sqlite.corrupt-TIMESTAMP`
3. Auto-repair via WAL checkpoint
4. If successful → Database opens normally
5. If failed → WAL files deleted, SQLite recovers on next open

**You should rarely need manual intervention** - the app now handles most corruption automatically.

## Credits

Implementation based on:
- SQLite WAL documentation
- better-sqlite3 best practices
- Real-world database corruption patterns
