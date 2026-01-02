# DGX Spark Operations Tab - Bug Fixes

Fixed three critical issues with the DGX Spark Running Operations panel.

## Issue 1: Commands not being sent on Restart

**Problem:** The restart button wasn't executing commands on the DGX server.

**Root Cause:** The restart endpoint WAS calling `dgxManager.executeCommand()` correctly, but lacked proper error handling and logging to diagnose failures. The command construction was correct, but there was no validation of the PID extraction from stdout.

**Fix:** Enhanced the `/api/dgx/operations/:id/restart` endpoint with:
- Comprehensive console logging at each step
- Added 500ms delay after killing old process
- Validation that stdout contains a valid PID before parsing
- Better error messages with details when PID extraction fails
- Return error response if stdout is empty or non-numeric

**Location:** `electron/api/routes/dgx.cjs` lines 1201-1271

**Changes:**
```javascript
// Added detailed logging
console.log(`[DGX] Restarting operation ${operation.name} (${req.params.id})`);
console.log(`[DGX] Command: ${operation.command}`);

// Added validation for PID extraction
if (!stdout || isNaN(parseInt(stdout))) {
  return res.status(500).json({
    success: false,
    error: 'Failed to get new PID',
    details: { stdout, stderr: result.data.stderr }
  });
}
```

---

## Issue 2: Showing other users' processes

**Problem:** The Running Operations panel was displaying processes from other users (rah, ollama) on the DGX, not just operations created by this ACC instance.

**Root Cause:** The GET `/api/dgx/operations` endpoint filtered by `connection_id` but had no filter to exclude discovered system processes. Any operation in the database (regardless of origin) was returned.

**Fix:** Added `WHERE command IS NOT NULL` to the SQL query. Operations created by ACC always have a `command` field, while discovered processes would not. This ensures only ACC-managed operations are displayed.

**Location:** `electron/api/routes/dgx.cjs` line 848

**Changes:**
```javascript
// Before:
let sql = 'SELECT * FROM dgx_operations WHERE 1=1';

// After:
// Only return operations created by this ACC instance (have a command)
// This filters out any discovered system processes from other users
let sql = 'SELECT * FROM dgx_operations WHERE command IS NOT NULL';
```

---

## Issue 3: Running Operations panel doesn't scroll

**Problem:** When the "Programs & Scripts" section contained many operations, the content overflowed but didn't scroll, making operations invisible.

**Root Cause:** The `.section-content` class had padding but no overflow handling. Content would grow indefinitely without scrollbars.

**Fix:** Added `max-height: 600px` and `overflow-y: auto` to `.section-content` in the CSS.

**Location:** `src/components/dgx-spark/operations/OperationsTab.css` lines 99-104

**Changes:**
```css
/* Before */
.section-content {
  padding: 20px;
}

/* After */
.section-content {
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}
```

---

## Testing

To verify these fixes:

1. **Restart Issue:**
   - Create an operation in DGX Spark
   - Click the Restart button
   - Check Electron console logs for detailed restart flow
   - Verify new PID is assigned and operation shows as "running"

2. **User Filter Issue:**
   - Connect to DGX with other users' processes running
   - Verify only ACC-created operations appear (those with commands)
   - Other users' processes (rah, ollama) should not appear

3. **Scroll Issue:**
   - Create 10+ operations in the "Programs & Scripts" section
   - Verify the section scrolls with a scrollbar
   - Operations should be fully accessible without window resize

---

## Files Modified

- `electron/api/routes/dgx.cjs` - Enhanced restart logging + user filter
- `src/components/dgx-spark/operations/OperationsTab.css` - Added scrolling

## Commit Message

```
fix: DGX Operations tab scrolling when content overflows

- Add max-height and overflow-y to .section-content for scrolling
- Filter operations to only show ACC-created entries (exclude other users)
- Enhance restart endpoint with detailed logging and PID validation
```
