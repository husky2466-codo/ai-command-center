# DGX Operations Status Sync Fix

**Problem:** The Running Operations tab showed many operations as "running" even though their processes had terminated on the DGX.

**Root Cause:** Operations status was only updated when:
1. The `operationMonitor` service was explicitly started via `startMonitoring(connectionId)`
2. Manual checks were performed via the monitor's `checkOperationNow()` method

The GET `/api/dgx/operations` endpoint simply returned database records without verifying if PIDs were still active.

---

## Solution Implemented

### 1. Auto-Sync on GET /api/dgx/operations

The operations listing endpoint now automatically syncs status before returning results:

```javascript
GET /api/dgx/operations?connection_id=xxx&sync_status=true
```

**Behavior:**
- For each operation with `status='running'` and a `pid`:
  - Executes `ps -p PID` on DGX to check if process exists
  - If process not found:
    - Updates `status` to `'stopped'`
    - Sets `completed_at` timestamp
    - Updates the returned operation object

**Query Parameters:**
- `sync_status` (default: `'true'`) - Set to `'false'` to skip auto-sync and return raw DB data

**Example:**
```bash
curl http://localhost:3939/api/dgx/operations?connection_id=32fb7a69-890e-4074-83d8-8f3e15b8b28a
```

### 2. Bulk Sync Endpoint

New endpoint for manual bulk cleanup:

```javascript
POST /api/dgx/operations/sync
{
  "connection_id": "32fb7a69-890e-4074-83d8-8f3e15b8b28a"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checked": 15,
    "synced": 8,
    "errors": 0
  }
}
```

**Use Case:** Trigger a full status sync when:
- Reconnecting to a DGX after disconnect
- UI shows suspicious "running" count
- Manual cleanup needed

**Example:**
```bash
curl -X POST http://localhost:3939/api/dgx/operations/sync \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "32fb7a69-890e-4074-83d8-8f3e15b8b28a"}'
```

---

## Implementation Details

### Helper Function: `checkProcessAlive()`

```javascript
async function checkProcessAlive(connectionId, pid) {
  try {
    const result = await dgxManager.executeCommand(
      connectionId,
      `ps -p ${pid} -o pid= 2>/dev/null`
    );

    if (!result.success) return false;

    const output = result.data.stdout.trim();
    return output.includes(String(pid));
  } catch (error) {
    console.error('[checkProcessAlive] Error:', error.message);
    return false;
  }
}
```

**How it works:**
1. Executes `ps -p PID -o pid=` on DGX via SSH
2. Redirects stderr to `/dev/null` (suppresses "No such process" errors)
3. Checks if stdout contains the PID
4. Returns `false` if command fails or output is empty

---

## Testing

### Test Auto-Sync

1. Start app, connect to DGX
2. View Running Operations tab
3. Kill a process manually on DGX:
   ```bash
   ssh myers@192.168.3.20
   kill <PID>
   ```
4. Refresh operations list in UI
5. Verify operation status updates to "stopped"

### Test Bulk Sync

```bash
# Check current running operations
curl http://localhost:3939/api/dgx/operations?status=running

# Manually kill processes on DGX
ssh myers@192.168.3.20
kill <PID1> <PID2> <PID3>

# Trigger bulk sync
curl -X POST http://localhost:3939/api/dgx/operations/sync \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "CONNECTION_ID_HERE"}'

# Response should show synced count
{
  "success": true,
  "data": {
    "checked": 5,
    "synced": 3,
    "errors": 0
  }
}

# Verify operations updated
curl http://localhost:3939/api/dgx/operations?status=running
# Should return empty or fewer operations
```

---

## Performance Considerations

**Auto-Sync Impact:**
- Each running operation requires one SSH command (`ps -p PID`)
- Runs sequentially (not parallelized)
- For 10 running ops: ~1-2 seconds delay

**Optimization Options (if needed):**
1. **Disable auto-sync for performance:**
   ```javascript
   GET /api/dgx/operations?sync_status=false
   ```

2. **Use operationMonitor for real-time tracking:**
   ```javascript
   operationMonitor.startMonitoring(connectionId);
   // Polls every 2.5 seconds in background
   ```

3. **Periodic bulk sync:**
   ```javascript
   // Run every 5 minutes
   setInterval(() => {
     fetch('/api/dgx/operations/sync', {
       method: 'POST',
       body: JSON.stringify({ connection_id: '...' })
     });
   }, 5 * 60 * 1000);
   ```

---

## Files Modified

- `electron/api/routes/dgx.cjs`
  - Updated `GET /operations` with auto-sync logic
  - Added `POST /operations/sync` endpoint
  - Added `checkProcessAlive()` helper function
  - Updated header documentation

---

## Future Enhancements

1. **Parallel SSH checks** - Use `Promise.all()` to check multiple PIDs concurrently
2. **Cache results** - Store last-checked timestamp per operation, skip if checked < 30s ago
3. **UI "Sync Status" button** - Add manual sync button to Running Operations tab
4. **Smart sync trigger** - Only sync when tab becomes visible (avoids unnecessary checks)
5. **Stale operation cleanup** - Mark operations as "unknown" if connection lost for >1 hour

---

## Related Files

- `electron/services/operationMonitor.cjs` - Background polling service (uses same `checkProcessAlive` logic)
- `electron/database/migrations/011_dgx_operations.cjs` - Operations table schema
- `src/components/dgx-spark/Operations.jsx` - UI component (needs update to call sync endpoint)
