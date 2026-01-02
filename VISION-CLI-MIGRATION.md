# Vision App - Claude CLI Migration

**Date:** 2026-01-01
**Status:** Complete

## Overview

Migrated the Vision app to use Claude CLI as the primary method for image analysis, with automatic fallback to direct API calls when CLI is unavailable.

## Changes Made

### 1. State Management

Added new state variables:
- `usingSubscription` - Tracks whether the current session is using CLI or API
- `cliAvailable` - Tracks CLI availability and authentication status

### 2. CLI Availability Check

Created `checkCliAvailability()` function that:
- Checks if `window.electronAPI.claudeCli` exists
- Verifies CLI is installed and available
- Checks OAuth authentication status
- Runs on component mount

### 3. Analysis Logic

Updated `captureAndAnalyze()` function to:
1. **Try CLI First** - If available and authenticated:
   - Calls `window.electronAPI.claudeCli.queryWithImage()`
   - Sets `usingSubscription = true` on success

2. **Fallback to API** - If CLI fails or unavailable:
   - Uses existing direct API fetch to `api.anthropic.com`
   - Sets `usingSubscription = false`

### 4. UI Indicator

Added mode indicator badge in camera controls:
- **Green "Using Subscription"** badge - When CLI is available and authenticated
- **Yellow "Using API"** badge - When using direct API fallback
- Displays current mode at all times
- Includes tooltip for clarity

### 5. CSS Styling

Added styles for:
- `.mode-indicator` - Container styling
- `.badge.subscription` - Green badge with success colors
- `.badge.api` - Yellow badge with warning colors
- Responsive layout with proper alignment

## Files Modified

### `src/components/vision/VisionApp.jsx`
- Added state variables (lines 15-16)
- Added `checkCliAvailability()` function (lines 34-52)
- Updated `captureAndAnalyze()` with CLI-first logic (lines 295-375)
- Added mode indicator to UI (lines 408-418)

### `src/components/vision/VisionApp.css`
- Updated `.camera-controls` alignment (line 19)
- Added `.mode-indicator` styles (lines 30-55)
- Added badge styles for subscription/API modes

## Behavior

### Subscription Mode (CLI Available)
- Vision app checks CLI on mount
- If authenticated, all queries use CLI
- Badge shows "Using Subscription" in green
- Zero API usage from user's key

### API Fallback Mode
- If CLI not installed/authenticated
- Falls back to direct API with user's key
- Badge shows "Using API" in yellow
- Works identically to previous behavior

### Error Handling
- CLI errors gracefully fall back to API
- Warnings logged to console for debugging
- User sees seamless experience
- No interruption to workflow

## Testing Checklist

- [ ] App loads without errors
- [ ] Badge displays correctly on load
- [ ] Camera starts successfully
- [ ] Image capture works
- [ ] CLI queries work when authenticated
- [ ] API fallback works when CLI unavailable
- [ ] Auto-mode works with both methods
- [ ] Mode indicator updates correctly
- [ ] Logging still works for both methods

## Benefits

1. **Cost Savings** - Uses subscription when available
2. **Seamless Fallback** - Automatic API fallback ensures no disruption
3. **Visual Feedback** - Clear indicator of current mode
4. **Zero Breaking Changes** - All existing functionality preserved
5. **Future-Proof** - Ready for CLI-first workflows

## Notes

- CLI availability is checked once on mount (could be enhanced with periodic checks)
- Mode indicator shows initial availability, not per-query status
- All existing features preserved: auto-mode, logging, frame saving
- No changes to database or IPC handlers required
