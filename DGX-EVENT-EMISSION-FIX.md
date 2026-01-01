# DGX Command Event Emission Fix

## Problem

DGX commands executed via HTTP API (`/api/dgx/exec/:id`) were not emitting events to the renderer process, causing the UI to miss command execution notifications. Only commands executed via IPC (`dgx:exec-command`) were emitting events.

**Root Cause:** HTTP API calls bypassed the IPC handler that was manually emitting events. dgxManager.executeCommand() stored command history but had no way to notify listeners.

## Solution

Implemented an EventEmitter pattern in dgxManager so it can notify listeners regardless of how commands are executed (HTTP API or IPC).

## Changes Made

### 1. electron/services/dgxManager.cjs

**Added EventEmitter:**
```javascript
const EventEmitter = require('events');

// Event emitter for command execution notifications
const dgxEvents = new EventEmitter();
```

**Emit event after storing command:**
```javascript
// Store last command for reference
module.exports.commandHistory.push(commandEvent);

// Emit event for listeners (main.cjs will forward to renderer)
dgxEvents.emit('command-executed', commandEvent);
```

**Export dgxEvents:**
```javascript
module.exports = {
  // ... existing exports
  dgxEvents
};
```

### 2. electron/main.cjs

**Subscribe to dgxEvents after createWindow():**
```javascript
createWindow();

// Subscribe to DGX command events and forward to renderer
dgxManager.dgxEvents.on('command-executed', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('dgx:command-executed', data);
  }
});
```

**Remove duplicate emission from IPC handler:**
```javascript
// Before:
ipcMain.handle('dgx:exec-command', async (event, connectionId, command) => {
  const result = await dgxManager.executeCommand(connectionId, command);

  // Manual event emission (removed)
  mainWindow.webContents.send('dgx:command-executed', {...});

  return result;
});

// After:
ipcMain.handle('dgx:exec-command', async (event, connectionId, command) => {
  // dgxManager.executeCommand will emit the event via dgxEvents
  return await dgxManager.executeCommand(connectionId, command);
});
```

## How It Works

1. **Command Execution:**
   - HTTP API route calls `dgxManager.executeCommand()`
   - OR IPC handler calls `dgxManager.executeCommand()`

2. **Event Emission:**
   - `executeCommand()` stores command in history
   - Emits `'command-executed'` event via `dgxEvents`

3. **Event Forwarding:**
   - main.cjs listener receives event
   - Forwards to renderer via `mainWindow.webContents.send('dgx:command-executed', data)`

4. **UI Updates:**
   - Renderer process receives event
   - DGX Spark UI updates command history in real-time

## Benefits

- **Single Source of Truth:** All command executions emit events through dgxManager
- **HTTP API Support:** Events now work for both IPC and HTTP API calls
- **No Duplicate Code:** Removed manual event emission from IPC handler
- **Decoupled Design:** dgxManager doesn't need access to mainWindow

## Testing

Commands executed via both methods now emit events:

```bash
# HTTP API (now emits events)
curl -X POST http://localhost:3939/api/dgx/exec/CONNECTION_ID \
  -H "Content-Type: application/json" \
  -d '{"command": "nvidia-smi"}'

# IPC (still emits events)
electronAPI.dgx.executeCommand(connectionId, 'nvidia-smi')
```

## Files Modified

- `electron/services/dgxManager.cjs` - Added EventEmitter, emit events
- `electron/main.cjs` - Subscribe to dgxEvents, remove duplicate emission

## Build Status

✅ Build succeeds with no errors
