# DGX Spark Endpoint Selector - Chain Runner Integration

## Summary

Added DGX Spark endpoint selection to the Chain Runner module, allowing users to choose between local Ollama (localhost:11434) and DGX Spark's tunneled Ollama (localhost:11435) when using the Ollama provider.

## Implementation Date

2025-12-29

## Changes Made

### 1. ChainRunner.jsx

**State Management:**
- Added `ollamaEndpoint` state (values: 'local' or 'dgx')
- Added `dgxConnected` state to track DGX connection status

**DGX Connection Monitoring:**
- Added useEffect hook to check DGX connection status every 5 seconds
- Uses `window.electronAPI.dgxCheckStatus('active')` to verify connection
- Automatically updates UI when DGX connects/disconnects

**Ollama URL Management:**
- Added `getOllamaUrl()` helper function:
  - Returns `http://localhost:11435` when DGX endpoint selected
  - Returns `http://localhost:11434` for local Ollama
- Updated `callApi()` to use dynamic URL: `${getOllamaUrl()}/api/chat`

**UI Components:**
- Added endpoint selector dropdown in agent config section
- Shows "Local (localhost:11434)" option always
- Shows "DGX Spark (via tunnel)" option only when DGX is connected
- Displays green checkmark "✓ Connected" when DGX endpoint is active
- Endpoint selector only appears when Ollama provider is selected

**Configuration Persistence:**
- Added `ollamaEndpoint` to `getCurrentConfig()` for saving
- Added `ollamaEndpoint` to `handleLoadConfig()` for loading
- Endpoint preference is now saved/loaded with other chain settings

**Integration Points:**
- Prompt Generator: Passes `ollamaUrl: getOllamaUrl()` to `generatePrompts()`
- Quality Validator: Passes `getOllamaUrl()` to `validateQAPair()`

### 2. ChainRunner.css

**New Styles:**
```css
/* Endpoint Selector */
.endpoint-selector {
  position: relative;
}

.endpoint-selector select {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px;
  border-radius: 6px;
}

.dgx-indicator {
  color: #22c55e;
  font-size: 0.85rem;
  font-weight: 500;
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

### 3. promptGenerator.js

**Function Signature Update:**
```javascript
export async function generatePrompts(options) {
  const {
    topic,
    category,
    count,
    provider,
    apiKey,
    model,
    existingTopics = [],
    ollamaUrl = 'http://localhost:11434' // NEW
  } = options;
```

**Ollama API Call Update:**
```javascript
response = await fetch(`${ollamaUrl}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
});
```

### 4. qualityValidator.js

**Function Signature Update:**
```javascript
export async function validateQAPair(
  question,
  answer,
  provider,
  apiKey,
  model,
  ollamaUrl = 'http://localhost:11434' // NEW
) {
```

**Ollama API Call Update:**
```javascript
response = await fetch(`${ollamaUrl}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
});
```

## Architecture

### DGX Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Chain Runner Component                                      │
│                                                               │
│  useEffect (every 5s)                                        │
│    ├─> window.electronAPI.dgxCheckStatus('active')          │
│    └─> setDgxConnected(result?.connected || false)          │
│                                                               │
│  When DGX Connected:                                         │
│    ├─> Show "DGX Spark (via tunnel)" option in dropdown     │
│    └─> Display "✓ Connected" indicator                      │
│                                                               │
│  When Ollama endpoint selected:                              │
│    ├─> getOllamaUrl() returns appropriate URL               │
│    ├─> callApi() uses dynamic URL                           │
│    ├─> generatePrompts() receives ollamaUrl                 │
│    └─> validateQAPair() receives ollamaUrl                  │
└─────────────────────────────────────────────────────────────┘
```

### Endpoint Selection Logic

```
┌────────────────────────────────────────────────────────────┐
│ getOllamaUrl()                                             │
│                                                             │
│  if (ollamaEndpoint === 'dgx')                             │
│    return 'http://localhost:11435'  ← DGX Tunnel          │
│  else                                                       │
│    return 'http://localhost:11434'  ← Local Ollama         │
└────────────────────────────────────────────────────────────┘
```

## Usage

### User Workflow

1. **Open Chain Runner module**
2. **Configure agent with Ollama provider:**
   - Select "Ollama" from Provider dropdown
   - Select model (mistral, llama3.2, etc.)
3. **Choose endpoint:**
   - If DGX is connected: "DGX Spark (via tunnel)" option appears
   - Select desired endpoint from dropdown
   - Green checkmark appears when DGX is selected and connected
4. **Run chain normally:**
   - All Ollama API calls automatically route to selected endpoint
   - Applies to: Agent execution, Prompt Generator, Quality Validator

### Configuration Persistence

Endpoint selection is saved with chain configurations:
- **Save Config**: Stores current `ollamaEndpoint` value
- **Load Config**: Restores saved endpoint preference
- Works seamlessly with existing config save/load system

## DGX Requirements

For DGX endpoint to be available:
1. DGX connection must be established via Admin module
2. SSH tunnel must be active on port 11435
3. Connection ID must be 'active' (or modify polling to check specific ID)

## Benefits

1. **Seamless DGX Integration**: Users can switch between local and DGX Ollama without reconfiguration
2. **Real-time Status**: Connection indicator updates automatically every 5 seconds
3. **Smart UI**: DGX option only appears when actually connected
4. **Consistent Experience**: Works across all Ollama features (agents, prompt generation, validation)
5. **Persistent Settings**: Endpoint preference saves with chain configurations

## Technical Notes

### Connection Polling
- Polls `dgxCheckStatus('active')` every 5 seconds
- Gracefully handles missing electronAPI (web-only mode)
- Automatically hides DGX option when connection drops

### Backward Compatibility
- Default endpoint is 'local' (localhost:11434)
- Existing configs without `ollamaEndpoint` default to local
- No breaking changes to existing functionality

### Error Handling
- If DGX disconnects during chain execution, fetch will fail
- Error handling in callApi catches connection errors
- User should switch to local endpoint if DGX becomes unavailable

## Testing

**Build Status:** ✅ Successful
- No syntax errors
- No TypeScript/JSX errors
- Bundle size: 988.71 kB (within acceptable range)

**Manual Testing Checklist:**
- [ ] Endpoint selector appears when Ollama selected
- [ ] DGX option appears when connected
- [ ] DGX option disappears when disconnected
- [ ] Green checkmark shows for DGX endpoint
- [ ] Agent execution routes to correct endpoint
- [ ] Prompt generator uses correct endpoint
- [ ] Quality validator uses correct endpoint
- [ ] Config save/load preserves endpoint
- [ ] Connection status updates in real-time

## Future Enhancements

1. **Multiple DGX Units**: Support selecting from multiple DGX connections
2. **Port Configuration**: Allow custom tunnel ports in settings
3. **Connection Indicator**: Visual indicator in header showing active endpoint
4. **Fallback Logic**: Auto-switch to local if DGX disconnects mid-chain
5. **Endpoint Testing**: "Test Connection" button to verify Ollama is responding

## Files Modified

1. `src/components/chain-runner/ChainRunner.jsx` - Main component logic
2. `src/components/chain-runner/ChainRunner.css` - Endpoint selector styles
3. `src/components/chain-runner/promptGenerator.js` - Dynamic URL support
4. `src/components/chain-runner/qualityValidator.js` - Dynamic URL support

## Related Documentation

- **DGX Spark Integration**: See `specs/components/10-DGX-SPARK.md`
- **Chain Runner Spec**: See `specs/components/11-CHAIN-RUNNER.md`
- **API Server**: See `docs/API-SERVER.md`
- **CLAUDE.md**: Project instructions at root

---

**Implementation Complete** - Ready for testing with DGX Spark connection active.
