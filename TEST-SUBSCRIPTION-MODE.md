# Testing Claude Subscription Mode

This guide helps you verify that the Claude Subscription Mode is working correctly.

## Quick Test

Run the automated test suite:

```bash
node test-cli-subscription.js
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════╗
║  Claude CLI Subscription Mode - Integration Test      ║
╚════════════════════════════════════════════════════════╝

============================================================
Test 1: Check CLI Availability
============================================================

✓ Claude CLI is installed
  Version: 1.0.0

============================================================
Test 2: Check OAuth Authentication
============================================================

✓ OAuth authenticated
  Email: your-email@example.com

... (more tests)

============================================================
Test Summary
============================================================

✓ CLI Availability (required)
✓ OAuth Authentication (required)
✓ Service Status
✓ Simple Query (required)
✓ Image Query
✓ Streaming Query
✓ Concurrent Requests
✓ Cleanup

Total: 8/8 passed

✓ All tests passed! Subscription mode is ready to use.
```

## Prerequisites

Before running tests:

1. **Install Claude CLI:**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Authenticate:**
   ```bash
   claude login
   ```
   - Opens browser for OAuth flow
   - Saves tokens to `~/.claude/config.json`

3. **Verify authentication:**
   ```bash
   claude auth status
   ```
   Should show: `Authenticated as: your-email@example.com`

## Manual Testing

### Test 1: Settings UI

1. Launch AI Command Center
2. Go to **Settings** tab
3. Scroll to **Claude Subscription** section

**Expected:**
- ✅ Green "Connected" indicator
- ✅ Your email address shown
- ✅ CLI version displayed
- ✅ "Refresh Status" and "Disconnect" buttons visible

**If not connected:**
- ❌ Red "Not Connected" indicator
- Click "Connect Subscription" button
- Follow OAuth flow

### Test 2: Chat with Subscription

1. Go to **Chat** tab
2. Look for badge in header

**Expected:**
- ✅ Green "Subscription" badge (using CLI)
- ❌ Blue "API" badge (using direct API - means CLI failed)

3. Send a test message: "Say hello!"

**Expected:**
- Response appears normally
- No errors in DevTools console

**Check logs:**
- Open DevTools (Ctrl+Shift+I)
- Console should show: `CLI request successful` (not `falling back to API`)

### Test 3: Vision with Subscription

1. Go to **Vision** tab
2. Start camera
3. Look for badge below camera selector

**Expected:**
- ✅ "Using Subscription" badge (using CLI)
- ❌ "Using API" badge (using direct API)

4. Ask a question about the video feed

**Expected:**
- Analysis appears normally
- Badge confirms subscription usage

### Test 4: Chain Runner with Subscription

1. Go to **Chain Runner** tab
2. In agent configuration, click provider dropdown

**Expected:**
- Option: "Claude CLI (Subscription)" available
- Badge: "✨ Free with Pro/Max" appears when selected

3. Select "Claude CLI (Subscription)" as provider
4. Enter a simple task spec: "Respond with 'Test successful'"
5. Enter prompt: "Test"
6. Click "Run Chain"

**Expected:**
- Chain executes normally
- Output: "Test successful"
- No errors

## Troubleshooting

### Test Fails: "CLI Not Installed"

**Cause:** Claude CLI not in PATH

**Fix:**
```bash
npm install -g @anthropic-ai/claude-code
```

Verify:
```bash
claude --version
```

If still fails, add to PATH:
- **Windows:** `C:\Users\<username>\AppData\Roaming\npm`
- **Mac/Linux:** `/usr/local/bin` or `~/.npm-global/bin`

### Test Fails: "Not Authenticated"

**Cause:** OAuth token missing or expired

**Fix:**
```bash
claude logout
claude login
```

Complete OAuth flow in browser.

Verify:
```bash
claude auth status
```

### Test Fails: "Query Failed"

**Cause:** CLI works but query failed

**Check:**
1. CLI version too old: `npm update -g @anthropic-ai/claude-code`
2. Token expired: `claude logout && claude login`
3. Rate limited: Wait 60 seconds and retry
4. Network issue: Check internet connection

**Logs:**
```bash
# Run test with debug output
node test-cli-subscription.js 2>&1 | tee test-output.log
```

### App Shows "API" Badge Instead of "Subscription"

**Possible causes:**

1. **CLI not authenticated:**
   - Go to Settings → Claude Subscription
   - Should show "Connected"
   - If not: `claude login`

2. **CLI query failed, fell back to API:**
   - Open DevTools console
   - Look for: `CLI request failed, falling back to API`
   - Check error message

3. **API key takes priority:**
   - CLI is working, but app prefers API
   - Check Settings: "Prefer Subscription" should be enabled (if toggle exists)

## Performance Benchmarks

Run concurrent test to measure latency:

```bash
node test-cli-subscription.js
```

Look for "Test 7: Concurrent Requests" section.

**Typical results:**
- **CLI Mode:** ~2-3 seconds per query (subprocess overhead)
- **API Mode:** ~1-2 seconds per query (direct fetch)

**Note:** CLI adds ~300ms overhead per query due to process spawn. This is acceptable trade-off for unlimited usage.

## Cleanup

After testing, cleanup temp files:

```bash
# Windows
del %TEMP%\claude-image-*.png

# Mac/Linux
rm /tmp/claude-image-*.png
```

Or just restart the app - it auto-cleans temp files on exit.

## Advanced: Manual CLI Testing

Test the CLI directly (outside of AI Command Center):

**Text query:**
```bash
claude -p "Say hello!"
```

**Vision query:**
```bash
# Create a test image
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > test.png

# Query with image
claude -p "What color is this?" --image test.png
```

**Expected:**
- Response appears in terminal
- No auth errors
- If errors, re-authenticate: `claude login`

## Getting Help

**Claude CLI Issues:**
- GitHub: https://github.com/anthropics/claude-cli/issues
- Docs: https://docs.anthropic.com/claude/cli

**AI Command Center Issues:**
- GitHub: https://github.com/husky2466-codo/ai-command-center/issues
- Documentation: See `CLAUDE-SUBSCRIPTION-MODE.md`

**Still stuck?**
1. Check `CLAUDE-SUBSCRIPTION-MODE.md` - comprehensive troubleshooting guide
2. File a GitHub issue with test output: `node test-cli-subscription.js 2>&1 | tee test-output.log`
