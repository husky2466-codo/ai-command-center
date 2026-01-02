# Testing Guide: DGX Operations Status Sync

This guide walks through testing the new auto-sync and manual sync features for DGX operations.

---

## Setup

1. Start AI Command Center
2. Connect to DGX Spark
3. Create a test operation (or use existing ComfyUI)

---

## Test 1: Auto-Sync on Operations List Load

**Goal:** Verify operations list automatically syncs status when loaded.

### Steps:

1. Navigate to DGX Spark > Running Operations tab
2. Note the current running operations
3. SSH into DGX manually:
   ```bash
   ssh myers@192.168.3.20
   ```
4. Find a running operation PID from the UI
5. Kill the process on DGX:
   ```bash
   kill <PID>
   ```
6. Back in ACC, refresh the operations tab (switch away and back, or reload)
7. Verify the operation status changed from "running" to "stopped"

**Expected Result:**
- Operation status automatically updates without manual sync
- Console shows: `[DGX Operations] Synced stale operation <name> (PID <pid>) to 'stopped'`

---

## Test 2: Manual Sync Button

**Goal:** Verify "Sync Status" button performs bulk cleanup.

### Steps:

1. Navigate to DGX Spark > Running Operations tab
2. Kill multiple operations on DGX:
   ```bash
   ssh myers@192.168.3.20
   kill <PID1> <PID2> <PID3>
   ```
3. Click "Sync Status" button in UI
4. Watch for:
   - Button shows "Syncing..." with spinning icon
   - Success message appears (e.g., "Checked 5 operations, updated 3 stale status")
   - Operations list refreshes
   - Previously running operations now show "stopped"

**Expected Result:**
- All stale operations updated in one batch
- Feedback message shows counts
- UI refreshes automatically

---

## Test 3: API Endpoint Direct Call

**Goal:** Test the API endpoint directly via curl.

### Steps:

1. Get connection ID from ACC database or UI
2. Run sync endpoint:
   ```bash
   curl -X POST http://localhost:3939/api/dgx/operations/sync \
     -H "Content-Type: application/json" \
     -d '{"connection_id": "32fb7a69-890e-4074-83d8-8f3e15b8b28a"}'
   ```
3. Check response:
   ```json
   {
     "success": true,
     "data": {
       "checked": 5,
       "synced": 3,
       "errors": 0
     }
   }
   ```

**Expected Result:**
- Returns counts of operations checked/synced
- Database updated
- UI reflects changes on next refresh

---

## Test 4: Disable Auto-Sync

**Goal:** Verify auto-sync can be disabled for performance.

### Steps:

1. Make API call with `sync_status=false`:
   ```bash
   curl "http://localhost:3939/api/dgx/operations?connection_id=xxx&sync_status=false"
   ```
2. Verify response returns raw database data without status checks

**Expected Result:**
- No SSH commands executed
- Fast response
- Stale "running" operations still show as running

---

## Test 5: Error Handling

**Goal:** Verify graceful handling when connection lost.

### Steps:

1. Disconnect from DGX (stop SSH connection)
2. Navigate to Running Operations tab
3. Operations list should show "Connect to DGX Spark" message
4. Reconnect
5. Verify auto-sync works again

**Expected Result:**
- No errors when disconnected
- Sync resumes when reconnected

---

## Test 6: Multiple Operations (Performance)

**Goal:** Test performance with many running operations.

### Steps:

1. Create 10+ operations on DGX
2. Kill half of them manually
3. Click "Sync Status"
4. Measure time to complete

**Expected Performance:**
- ~1-2 seconds for 10 operations
- No UI freezing
- All stale operations updated

---

## Verification Checklist

- [ ] Auto-sync detects stopped processes on list load
- [ ] Manual sync button works with feedback
- [ ] Spinning icon shows during sync
- [ ] Success/error messages display correctly
- [ ] Database updates persist after refresh
- [ ] No errors in console
- [ ] API endpoint responds correctly
- [ ] Performance acceptable (<3s for 10 ops)
- [ ] Works after reconnect
- [ ] Graceful when disconnected

---

## Console Logs to Watch For

**Success:**
```
[DGX Operations] Synced stale operation ComfyUI (PID 12345) to 'stopped'
[DGX Sync] Updated stale operation Training Job (PID 67890) to 'stopped'
```

**Errors:**
```
[DGX Operations] Error checking process 12345: <error message>
[checkProcessAlive] Error: <error message>
```

---

## Rollback (If Issues)

If the auto-sync causes problems:

1. Disable auto-sync by default:
   ```javascript
   // In dgx.cjs, line 844
   const { sync_status = 'false' } = req.query;
   ```

2. Update UI to explicitly enable:
   ```javascript
   // In useOperationPolling.js
   const url = `http://localhost:3939/api/dgx/operations?connection_id=${connectionId}&sync_status=true`;
   ```

---

## Next Steps After Testing

1. Monitor app logs for performance issues
2. Consider adding:
   - Cache for recent checks (skip if checked <30s ago)
   - Parallel SSH checks with `Promise.all()`
   - Periodic background sync (every 5 minutes)
3. Update CLAUDE.md with new API usage
4. Add to user documentation
