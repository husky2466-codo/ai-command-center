# Claude Subscription Mode

AI Command Center supports using your **Claude Pro or Claude Max subscription** ($200/month) instead of pay-per-token API billing. This provides unlimited AI queries across all features for a flat monthly rate.

## Overview

**How it Works:**
- AI Command Center can shell out to the `claude` CLI instead of calling the Anthropic API directly
- When ANTHROPIC_API_KEY is removed from the subprocess environment, the CLI automatically uses OAuth authentication from `~/.claude/`
- Your subscription queries are tracked separately from API usage
- Automatic fallback to API if CLI is unavailable

**Benefits:**
- ✅ Free AI queries (uses your Pro/Max subscription)
- ✅ No API key required for AI features
- ✅ Works with Vision, Chat, Chain Runner, and Memory Extraction
- ✅ Automatic fallback to API if subscription unavailable
- ✅ Process pool management (max 3 concurrent requests)
- ✅ Streaming support for chat
- ✅ Image analysis support for Vision

**Comparison:**

| Feature | API Mode | Subscription Mode |
|---------|----------|-------------------|
| Cost | Pay per token (~$3-15 per million tokens) | $200/month unlimited |
| Setup | ANTHROPIC_API_KEY in .env | `claude login` via CLI |
| Speed | Direct API (faster) | CLI subprocess (slightly slower) |
| Rate Limits | Based on API tier | Based on subscription tier |
| Fallback | None (errors if API key invalid) | Falls back to API if CLI fails |

---

## Setup Instructions

### 1. Install Claude Code CLI

The Claude CLI is the official CLI from Anthropic. Install it globally:

```bash
npm install -g @anthropic-ai/claude-code
```

Or download from: https://claude.ai/download

**Verify installation:**
```bash
claude --version
```

### 2. Authenticate with Your Subscription

Log in with your Claude Pro/Max account:

```bash
claude login
```

This will:
1. Open your browser
2. Prompt you to authorize the CLI
3. Save OAuth tokens to `~/.claude/config.json`

**Verify authentication:**
```bash
claude auth status
```

You should see: `Authenticated as: your-email@example.com`

### 3. Enable Subscription Mode in AI Command Center

1. Launch AI Command Center
2. Go to **Settings** tab
3. Scroll to **Claude Subscription** section
4. You should see:
   - ✅ **Connected** (green indicator)
   - Your email address
   - CLI version

**If not connected:**
- Click "Connect Subscription"
- Follow the prompts
- Or manually run `claude login` in terminal

---

## How It Works Internally

### Architecture

```
┌─────────────────┐
│  React UI       │
│  (Chat/Vision)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     IPC      ┌──────────────────┐
│  chatService.js │──────────────▶│   main.cjs       │
│  VisionApp.jsx  │◀──────────────│   (Electron)     │
└─────────────────┘              └────────┬─────────┘
         │                                │
         │                                ▼
         │                       ┌────────────────────┐
         │                       │ claudeCliService   │
         │                       │   .cjs             │
         │                       └────────┬───────────┘
         │                                │
         │                                ▼
         │                       ┌────────────────────┐
         │                       │  child_process     │
         │                       │  spawn('claude')   │
         │                       └────────┬───────────┘
         │                                │
         │                                ▼
         │                       ┌────────────────────┐
         │                       │  Claude CLI        │
         │                       │  (OAuth tokens)    │
         │                       └────────────────────┘
         │
         ▼ (Fallback)
┌─────────────────┐
│  Anthropic API  │
│  (Direct fetch) │
└─────────────────┘
```

### Environment Stripping

The `claudeCliService.cjs` strips `ANTHROPIC_API_KEY` from the subprocess environment:

```javascript
_stripApiKey(env) {
  const cleanEnv = { ...env };
  delete cleanEnv.ANTHROPIC_API_KEY;
  delete cleanEnv.ANTHROPIC_API_KEY_SECRET;
  return cleanEnv;
}
```

This forces the CLI to use OAuth instead of the API key.

### Automatic Fallback

All AI-powered components check CLI availability first, then fall back to API:

**Chat Service (chatService.js):**
```javascript
// Try Claude CLI first if preferred and available
if (preferCli) {
  const cliAvailable = await this.checkCliAvailability();
  if (cliAvailable && window.electronAPI?.claudeCli) {
    try {
      return await this._sendViaCli(message, contextPrompt, onChunk, onComplete);
    } catch (cliErr) {
      console.warn('CLI request failed, falling back to API:', cliErr);
      // Fall through to API
    }
  }
}

// Fallback to direct API
return await this._sendViaApi(message, conversationHistory, systemPrompt, onChunk, onComplete);
```

**Vision App (VisionApp.jsx):**
```javascript
// Try CLI first if available
if (cliAvailable && window.electronAPI?.claudeCli) {
  try {
    const result = await window.electronAPI.claudeCli.queryWithImage(prompt, base64, { maxTokens: 1024 });
    if (result.success) {
      assistantText = result.content;
      usedCli = true;
      setUsingSubscription(true);
    }
  } catch (cliErr) {
    console.warn('CLI query failed, falling back to API:', cliErr);
    // Fall through to API
  }
}

// Fallback to direct API
if (!usedCli) {
  const response = await fetch('https://api.anthropic.com/v1/messages', { ... });
}
```

**Chain Runner (useChainExecution.js):**
```javascript
if (provider === 'claude-cli') {
  if (!window.electronAPI?.claudeCli?.query) {
    throw new Error('Claude CLI is not available');
  }

  const cliResult = await window.electronAPI.claudeCli.query(
    `${taskSpec}\n\n${input}`,
    { maxTokens: 4096 }
  );

  if (cliResult.success) {
    return cliResult.content || 'No response';
  }
  throw new Error(cliResult.error || 'Claude CLI query failed');
}
```

---

## Usage in Each Component

### 1. Chat App

**Location:** Chat tab

**Behavior:**
- Automatically checks CLI availability on mount
- Displays "Subscription" badge when using CLI
- Displays "API" badge when using direct API
- Prefers CLI by default (`preferCli = true`)
- Falls back to API silently if CLI unavailable

**User Experience:**
- No changes needed - works automatically
- Green "Subscription" badge = using your Pro/Max
- Blue "API" badge = using pay-per-token API

### 2. Vision App

**Location:** Vision tab

**Behavior:**
- Checks CLI availability on mount
- Tries CLI first for image analysis
- Falls back to API if CLI unavailable
- Shows "Using Subscription" or "Using API" badge

**User Experience:**
- Start camera and ask questions
- Look for "Using Subscription" badge to confirm free usage
- Temp image files created/deleted automatically

### 3. Chain Runner

**Location:** Chain Runner tab

**Behavior:**
- Adds "Claude CLI (Subscription)" as provider option
- Shows "✨ Free with Pro/Max" badge
- No model selection needed (uses default)
- Supports batch prompts, quality validation

**User Experience:**
1. Select provider: "Claude CLI (Subscription)"
2. Badge shows "✨ Free with Pro/Max"
3. No model dropdown (uses default claude-sonnet-4)
4. Run chain as normal

**Supported in:**
- Main agent chains
- Batch prompt generator
- Quality validator

---

## Troubleshooting

### CLI Not Detected

**Symptoms:**
- Settings shows "CLI Not Installed"
- API badge instead of Subscription badge

**Solutions:**
1. Verify CLI is installed: `claude --version`
2. Ensure it's in PATH: `where claude` (Windows) or `which claude` (Mac/Linux)
3. Restart AI Command Center after installing CLI

### Not Authenticated

**Symptoms:**
- Settings shows "Not Connected"
- Error: "Not authenticated"

**Solutions:**
1. Run: `claude login`
2. Complete OAuth flow in browser
3. Verify: `claude auth status`
4. Click "Refresh Status" in Settings

### CLI Query Fails, Fallback to API

**Symptoms:**
- Console warning: "CLI request failed, falling back to API"
- API badge shown despite CLI being connected

**Solutions:**
1. Check CLI is working: `claude -p "Hello"`
2. Verify OAuth token is valid: `claude auth status`
3. Check logs in DevTools console for detailed error
4. Re-authenticate: `claude logout && claude login`

### Process Pool Full

**Symptoms:**
- Slow response times
- Delayed queries

**Solutions:**
- Wait for active requests to complete (max 3 concurrent)
- Check active requests: Settings → Subscription → shows "Active Requests"
- Restart app if processes are stuck

### Temp File Cleanup Issues

**Symptoms:**
- Vision queries fail
- Error: "Failed to write temp file"

**Solutions:**
1. Check temp directory permissions: `%TEMP%` (Windows) or `/tmp` (Mac/Linux)
2. Clear temp files manually: Look for `claude-image-*.png`
3. Restart app to cleanup temp files

---

## Advanced Configuration

### Environment Variables

Configure Claude CLI service behavior via `.env`:

```env
# Max concurrent CLI processes (default: 3)
CLAUDE_CLI_MAX_CONCURRENT=3

# Request timeout in milliseconds (default: 120000 = 2 minutes)
CLAUDE_CLI_TIMEOUT=120000
```

### Forcing API Mode

To temporarily disable CLI and force API mode:

1. Set in Settings: Uncheck "Prefer Subscription" (if toggle exists)
2. Or manually disconnect: `claude logout`
3. Or remove CLI: `npm uninstall -g @anthropic-ai/claude-code`

### Monitoring Usage

**Check active processes:**
```javascript
const status = await window.electronAPI.claudeCli.getStatus();
console.log(status);
// {
//   available: true,
//   version: "1.0.0",
//   authenticated: true,
//   email: "user@example.com",
//   activeRequests: 2,
//   maxConcurrent: 3,
//   queuedRequests: 0
// }
```

**Listen for events:**
```javascript
// In main process (electron/main.cjs)
const claudeCliService = require('./services/claudeCliService.cjs');

claudeCliService.on('ready', () => {
  console.log('Claude CLI service ready');
});

claudeCliService.on('request-cancelled', (requestId) => {
  console.log('Request cancelled:', requestId);
});

claudeCliService.on('slot-released', ({ requestId, active }) => {
  console.log(`Slot released. Active: ${active}`);
});
```

---

## API Reference

### IPC Methods (Exposed via preload.cjs)

```javascript
// Check if CLI is installed
await window.electronAPI.claudeCli.check();
// → { available: boolean, version: string, error: string }

// Check OAuth status
await window.electronAPI.claudeCli.checkOAuth();
// → { authenticated: boolean, email: string, error: string }

// Get full status
await window.electronAPI.claudeCli.getStatus();
// → { available, version, authenticated, email, activeRequests, maxConcurrent, queuedRequests }

// Query (text-only)
await window.electronAPI.claudeCli.query(prompt, options);
// → { success: boolean, content: string, error: string }

// Query with image (Vision)
await window.electronAPI.claudeCli.queryWithImage(prompt, imageBase64, options);
// → { success: boolean, content: string, error: string }

// Stream query (for chat)
await window.electronAPI.claudeCli.stream(prompt, options);
// → { success: boolean, error: string }

// Listen for stream chunks
const cleanup = window.electronAPI.claudeCli.onStreamChunk((chunk) => {
  console.log('Chunk:', chunk);
});
// Call cleanup() when done to remove listener

// Cancel active request
await window.electronAPI.claudeCli.cancel(requestId);
// → boolean (true if cancelled)

// Setup OAuth token (interactive)
await window.electronAPI.claudeCli.setupToken();
// → { success: boolean, error: string }
```

### Options Object

```typescript
interface QueryOptions {
  maxTokens?: number;      // Max tokens in response (default: 4096)
  timeout?: number;        // Request timeout in ms (default: 120000)
  model?: string;          // Model to use (if CLI supports it)
}
```

---

## Performance Considerations

**CLI vs API Latency:**
- CLI adds ~100-300ms overhead due to subprocess spawn
- Streaming helps mitigate this for long responses
- Process pool (max 3) limits concurrent overhead

**When to Use CLI:**
- High-volume usage (100+ queries/day)
- Long conversations (token costs add up)
- Batch operations (Chain Runner)
- Development/testing (unlimited queries)

**When to Use API:**
- Low latency critical
- One-off queries
- No subscription available
- API quota still available

---

## Security Notes

**OAuth Token Storage:**
- Tokens stored in `~/.claude/config.json`
- Not accessible to renderer process (only main process)
- Encrypted by OS file permissions

**API Key Protection:**
- API key explicitly stripped from CLI subprocess environment
- Never passed to Claude CLI
- Still required for API fallback mode

**Temp File Security:**
- Vision images saved to OS temp directory
- Deleted immediately after query completes
- Filenames use UUIDs (not predictable)

---

## Subscription Tiers

**Claude Pro ($20/month):**
- 5x more usage than free tier
- Priority access during high traffic
- Early access to new features

**Claude Max ($200/month):**
- Highest usage limits
- Access to extended context (200K tokens)
- Priority support

**Which Should You Use?**
- **API billing**: Pay-as-you-go, best for occasional use
- **Claude Pro**: Good for regular personal use
- **Claude Max**: Best for AI Command Center power users (recommended)

---

## FAQ

**Q: Does this work with the free Claude tier?**
A: No, you need Claude Pro ($20/month) or Claude Max ($200/month) subscription.

**Q: Can I use both API and subscription?**
A: Yes! The app automatically uses subscription when available, falls back to API otherwise.

**Q: What happens if I run out of subscription quota?**
A: The CLI will return an error, and the app will fall back to API mode (if API key is configured).

**Q: Does this work on all platforms?**
A: Yes - Windows, Mac, and Linux are all supported by the Claude CLI.

**Q: Can I use this for Chain Runner batch jobs?**
A: Yes! Select "Claude CLI (Subscription)" as the provider and run unlimited chains.

**Q: Is streaming supported?**
A: Yes for Chat. Vision and Chain Runner use non-streaming queries for simplicity.

**Q: How do I switch back to API mode?**
A: Just run `claude logout` in your terminal, or the app will fall back automatically if CLI is unavailable.

---

## Support

**Issues:**
- AI Command Center issues: https://github.com/husky2466-codo/ai-command-center/issues
- Claude CLI issues: https://github.com/anthropics/claude-cli/issues

**Documentation:**
- Claude CLI docs: https://docs.anthropic.com/claude/cli
- AI Command Center docs: See `CLAUDE.md` and `CLAUDELONGTERM.md`

**Contact:**
- For subscription billing: support@anthropic.com
- For app bugs: File GitHub issue
