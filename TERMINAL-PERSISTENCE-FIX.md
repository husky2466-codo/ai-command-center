# Terminal Persistence Fix

## Problem
Terminal component was being unmounted when switching tabs, causing:
- Terminal session to be lost
- PTY process to be killed
- User losing command history and running processes

## Root Cause
The issue was in `PaneContainer.jsx` line 228 - the ErrorBoundary had a redundant `key={tab.id}` prop that was causing React to treat hidden tabs as new components, triggering remounts.

```jsx
// BEFORE (BROKEN):
<ErrorBoundary key={tab.id}>  // ← This caused remounts!
  <AppComponent apiKeys={apiKeys} instanceId={tab.id} />
</ErrorBoundary>
```

## Solution

### 1. Fixed PaneContainer.jsx
- **Removed duplicate key** from ErrorBoundary (outer div already has the key)
- **Changed home screen condition** from `!activeTabId` to `tabs.length === 0`
- **Always render all tabs**, hiding inactive ones with CSS `display: none`

```jsx
// AFTER (FIXED):
<ErrorBoundary>  // ← No key here, uses parent's key
  <AppComponent apiKeys={apiKeys} instanceId={tab.id} />
</ErrorBoundary>
```

### 2. Enhanced Terminal.jsx
Added IntersectionObserver to detect when terminal becomes visible:
- **Refits terminal** when it becomes visible after being hidden
- **Resizes PTY** to match current dimensions
- **Ensures proper display** after tab switches

## How It Works Now

1. **Component Mount**: Terminal initializes once when first opened
   - Creates XTerm instance
   - Creates PTY process
   - Sets up copy/paste handlers
   - Registers data listener

2. **Tab Switch**: When switching away from Terminal
   - Component stays mounted (not unmounted)
   - PTY process keeps running
   - Display hidden with CSS `display: none`

3. **Tab Return**: When switching back to Terminal
   - Component already mounted (instant display)
   - IntersectionObserver detects visibility
   - Terminal refits to current dimensions
   - PTY resized to match

4. **Component Unmount**: Only happens when:
   - User closes the Terminal tab
   - User closes the entire pane
   - Cleanup kills PTY process

## Benefits

- **Session Persistence**: Terminal sessions survive tab switches
- **Running Processes**: Long-running commands continue in background
- **Command History**: Shell history preserved
- **Instant Switching**: No initialization delay when returning to terminal
- **Proper Cleanup**: PTY only killed when tab actually closed

## Testing

Build successful with no errors:
```bash
npm run build
✓ built in 3.17s
```

## Files Modified

1. `src/components/layout/PaneContainer.jsx`
   - Fixed conditional rendering logic
   - Removed duplicate ErrorBoundary key

2. `src/components/terminal/Terminal.jsx`
   - Added IntersectionObserver for visibility detection
   - Added automatic refit when terminal becomes visible
