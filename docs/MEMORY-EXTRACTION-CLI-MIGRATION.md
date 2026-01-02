# Memory Extraction Service - Claude CLI Migration

## Overview

The Memory Extraction Service has been migrated to use Claude CLI as the primary AI provider, with automatic fallback to direct API calls when CLI is unavailable.

## Architecture

### Before Migration
```
extractMemoriesFromChunk()
  └─> Direct Anthropic API call (always)
```

### After Migration
```
extractMemoriesFromChunk()
  ├─> checkCliAvailability()
  │   ├─> Is CLI installed?
  │   └─> Is OAuth authenticated?
  │
  ├─> extractWithCli() (if available)
  │   ├─> Success: Return memories
  │   └─> Failure: Log and fall back
  │
  └─> extractWithApi() (fallback)
      ├─> Success: Return memories
      └─> Failure: Return empty array
```

## New Methods

### `checkCliAvailability()`
Checks if Claude CLI is installed and authenticated.

**Returns:**
```javascript
{
  available: boolean,      // Is CLI installed?
  authenticated: boolean,  // Is OAuth configured?
  method: string          // 'cli' | 'none'
}
```

### `extractWithCli(conversationChunk, systemPrompt)`
Extract memories using Claude CLI.

**Parameters:**
- `conversationChunk` (string) - Formatted conversation text
- `systemPrompt` (string) - System prompt with extraction rules

**Returns:**
```javascript
{
  success: boolean,
  memories: Array,
  method: 'cli',
  error?: string
}
```

### `extractWithApi(conversationChunk, systemPrompt, apiKey)`
Extract memories using direct Anthropic API (fallback method).

**Parameters:**
- `conversationChunk` (string) - Formatted conversation text
- `systemPrompt` (string) - System prompt with extraction rules
- `apiKey` (string) - Anthropic API key

**Returns:**
```javascript
{
  success: boolean,
  memories: Array,
  method: 'api',
  error?: string
}
```

## Usage

### Existing Code (No Changes Required)

The public API remains unchanged. Existing code continues to work:

```javascript
const memories = await memoryExtractionService.extractMemoriesFromChunk(
  conversationText,
  apiKey
);
```

### Internal Flow

1. **Check CLI availability** - Verifies CLI is installed and authenticated
2. **Try CLI first** - If available, uses `claudeCli.query()`
3. **Log success/failure** - Console logs which method was used
4. **Fallback to API** - If CLI fails or unavailable, uses direct API
5. **Return memories** - Same format as before

## Benefits

### 1. **No API Key Required (When CLI Available)**
- Users with Claude CLI installed don't need to configure API keys
- OAuth handles authentication automatically

### 2. **Resilient Fallback**
- CLI failure doesn't break functionality
- Automatically falls back to API if CLI unavailable

### 3. **Better Logging**
- Console logs show which method was used
- Clear error messages for debugging

### 4. **Future-Proof**
- Easy to add more AI providers (OpenAI, Ollama, etc.)
- Centralized extraction logic

## Console Output Examples

### Success with CLI
```
Using Claude CLI for memory extraction
CLI extraction successful: 3 memories found
```

### Fallback to API
```
Using Claude CLI for memory extraction
CLI extraction failed, falling back to API: CLI query failed
API extraction successful: 3 memories found
```

### CLI Not Available
```
Claude CLI not available, using direct API
API extraction successful: 3 memories found
```

### Both Failed
```
Using Claude CLI for memory extraction
CLI extraction failed, falling back to API: Connection timeout
Both CLI and API extraction failed: Network error
```

## Configuration

### Enable Claude CLI
1. Install Claude CLI: `npm install -g @anthropic/claude-cli`
2. Authenticate: `claude auth login`
3. Verify: `claude --version`

The service will automatically detect and use CLI.

### Disable CLI (Force API)
If you need to force API usage, you can:
- Uninstall Claude CLI
- Sign out: `claude auth logout`
- Or modify `checkCliAvailability()` to always return false

## Error Handling

### CLI Errors
- Connection failures → Fallback to API
- Authentication expired → Fallback to API
- Rate limits → Fallback to API

### API Errors
- No API key provided → Return empty array
- API failures → Return empty array
- Both methods fail → Return empty array

## Performance

### CLI Advantages
- No API key management
- OAuth token refresh handled automatically
- May have better rate limits for authenticated users

### API Advantages
- More control over request parameters
- Can specify custom headers
- Works without CLI installation

## Migration Checklist

- [x] Split extraction logic into CLI and API methods
- [x] Add CLI availability check
- [x] Implement automatic fallback
- [x] Preserve existing API compatibility
- [x] Add comprehensive logging
- [x] Document new architecture
- [ ] Test with CLI available
- [ ] Test with CLI unavailable
- [ ] Test with CLI auth expired
- [ ] Test API fallback scenarios

## Testing

### Test CLI Path
```javascript
// Ensure CLI is installed and authenticated
const cliStatus = await memoryExtractionService.checkCliAvailability();
console.log('CLI Status:', cliStatus);

// Extract memories (should use CLI)
const memories = await memoryExtractionService.extractMemoriesFromChunk(
  "User: Fix the bug\nAssistant: I'll use the new approach we discussed",
  null // No API key needed
);
```

### Test API Fallback
```javascript
// Sign out of CLI
// Run: claude auth logout

// Extract memories (should fall back to API)
const memories = await memoryExtractionService.extractMemoriesFromChunk(
  "User: Fix the bug\nAssistant: I'll use the new approach we discussed",
  'your-api-key-here'
);
```

## Known Issues

None at this time.

## Future Enhancements

1. **Provider Selection** - Allow users to choose CLI vs API
2. **Multiple Providers** - Support OpenAI, Ollama, etc.
3. **Cost Tracking** - Track API costs vs CLI usage
4. **Cache Results** - Cache extraction results to reduce AI calls
5. **Batch Processing** - Extract multiple chunks in parallel

## Related Files

- `src/services/memoryExtractionService.js` - Main service
- `electron/preload.cjs` - Claude CLI IPC methods
- `electron/main.cjs` - Claude CLI handlers
- `electron/services/claudeCliManager.cjs` - CLI wrapper

## Support

For issues related to:
- **Claude CLI** - See `docs/CLAUDE-CLI-INTEGRATION.md`
- **Memory Extraction** - See `specs/features/MEMORY-EXTRACTION.md`
- **API Keys** - See `.env.example`
