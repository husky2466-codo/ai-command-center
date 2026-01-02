# Project Watcher Progress Calculation Improvements

## Date: 2026-01-01

## Overview

Updated `electron/services/projectWatcher.cjs` to make progress calculation more flexible and accurate for diverse project structures.

---

## Changes Made

### 1. Flexible Source Code Detection

**Before:** Only recognized `src/` or `source/` directories
**After:** Recognizes multiple directory patterns AND code files in root

**New directory patterns:**
- `src/`, `source/` (original)
- `lib/`, `app/`, `electron/` (added)

**New code file detection:**
- Added `hasCodeFiles` metric
- Detects code files with extensions: `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.h`, `.hpp`
- Projects with code files in root (Electron apps, scripts) now get credit

### 2. Reduced Penalty for Missing Tests

**Before:** 10% weight for tests directory
**After:** 5% weight (tests are nice-to-have, not required for completion)

### 3. Code Files Bonus

**New feature:** If project has code files in root but no `src/` directory → +10% bonus

**Example:** Electron apps with `main.cjs`, `preload.cjs` in root now get proper credit

### 4. Minimum Progress Floor

**New feature:** Completed projects get minimum 60% progress

**Criteria:**
- Has README ✓
- Has package.json ✓
- Has .git ✓
- Has build output (build/, dist/, release/) ✓

→ Progress cannot be lower than 60% (even without tests or recent activity)

### 5. Adjusted Weight Distribution

**Before:**
- Milestones: 70%
- Activity: 30%

**After:**
- Milestones: 75%
- Activity: 25%

**Breakdown:**
- README: 10%
- package.json: 10%
- Source code: 15% (flexible)
- Build output: 15%
- Git: 10%
- Tests: 5% (reduced)
- Code files bonus: 10% (if no src/ dir)
- Recent activity: up to 25%

---

## Progress Calculation Logic

```javascript
// Example 1: Electron app with build
// main.cjs, preload.cjs in root
// README.md, package.json, .git, release/
hasReadme: 10%
hasPackageJson: 10%
hasCodeFiles: 15% (source code)
hasBuildDir: 15%
hasGit: 10%
codeFilesBonus: 10% (no src/ dir)
= 70% base → Floor applied: 70% (already above 60%)

// Example 2: Complete project without tests
// README.md, package.json, src/, dist/, .git
hasReadme: 10%
hasPackageJson: 10%
hasSrcDir: 15%
hasBuildDir: 15%
hasGit: 10%
= 60% base → Floor applied: 60%

// Example 3: Script with no build
// README.md, package.json, script.py, .git
hasReadme: 10%
hasPackageJson: 10%
hasCodeFiles: 15%
hasGit: 10%
codeFilesBonus: 10%
= 55% (no floor applied - no build output)
```

---

## Benefits

1. **Electron apps** (code in root) now properly recognized
2. **Completed projects** without tests no longer penalized heavily
3. **Scripts/utilities** without formal src/ structure get credit
4. **Minimum floor** ensures completed projects show reasonable progress
5. **Flexible detection** adapts to diverse project structures

---

## Testing Recommendations

Test with various project types:
- Electron apps (code in root)
- React/Vue apps (src/ directory)
- Python scripts (*.py in root)
- Completed projects with builds
- Active projects without builds

Expected behavior:
- Electron apps with release/ → 60-80%
- Projects with src/ + dist/ → 60-80%
- Scripts with README + code → 45-60%
- Empty projects → 0-20%

---

## Files Modified

- `electron/services/projectWatcher.cjs`
  - Updated `calculateMetrics()` - Added code file detection, expanded directory patterns
  - Updated `calculateProgress()` - New weight distribution, floor logic, bonus scoring
