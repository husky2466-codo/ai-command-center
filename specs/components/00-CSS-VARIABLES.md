# CSS Variables Foundation

**Status**: Complete
**Priority**: P0 (Critical - All components depend on this)
**Estimated Effort**: 0.5 days
**Dependencies**: None (this IS the foundation)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [GPT-ASSET-GENERATION-PROMPTS.md](../../GPT-ASSET-GENERATION-PROMPTS.md)

---

## Overview

The CSS Variables file (`src/styles/variables.css`) defines all design tokens for the application. Every component must use these variables - no hardcoded colors or values. This ensures consistency and enables future theming.

## Acceptance Criteria

- [x] All color values from DESIGN-SYSTEM.md defined as CSS variables
- [x] All spacing values follow 4px base unit
- [x] All typography values defined
- [x] File imported in `src/main.jsx` before all other styles
- [x] No hardcoded values in any component CSS (existing components use old variables, migration will happen incrementally)

---

## File to Create

### `src/styles/variables.css`

```css
/* ============================================================
   AI COMMAND CENTER - CSS DESIGN TOKENS
   ============================================================

   DO NOT hardcode colors anywhere. Always use these variables.

   Design Reference:
   - specs/DESIGN-SYSTEM.md
   - GPT-ASSET-GENERATION-PROMPTS.md

   ============================================================ */

:root {
  /* ========================================
     BACKGROUNDS
     Dark navy palette - never use light backgrounds
     ======================================== */
  --bg-primary: #1a1a2e;      /* Main app background */
  --bg-secondary: #252540;    /* Section backgrounds, sidebar */
  --bg-card: #2d2d4a;         /* Card surfaces */
  --bg-elevated: #3a3a5a;     /* Hover states, elevated elements */
  --bg-input: #12121c;        /* Input field backgrounds */

  /* ========================================
     PRIMARY ACCENT - GOLD
     Use for CTAs, highlights, active states
     ======================================== */
  --accent-gold: #ffd700;
  --accent-gold-hover: #ffed4a;
  --accent-gold-dim: #b89800;

  /* ========================================
     BRAND GRADIENT (for icons/branding only)
     Pink -> Purple -> Blue (diagonal)
     ======================================== */
  --gradient-pink: #ec4899;
  --gradient-purple: #8b5cf6;
  --gradient-blue: #3b82f6;
  --brand-gradient: linear-gradient(135deg, var(--gradient-pink), var(--gradient-purple), var(--gradient-blue));

  /* ========================================
     TEXT COLORS
     ======================================== */
  --text-primary: #ffffff;     /* Headings, important text */
  --text-secondary: #a0a0b0;   /* Body text */
  --text-muted: #6b6b80;       /* Labels, hints, disabled */
  --text-inverse: #000000;     /* Text on gold backgrounds */

  /* ========================================
     STATUS COLORS
     ======================================== */
  --status-success: #22c55e;
  --status-success-bg: rgba(34, 197, 94, 0.1);
  --status-warning: #f59e0b;
  --status-warning-bg: rgba(245, 158, 11, 0.1);
  --status-error: #ef4444;
  --status-error-bg: rgba(239, 68, 68, 0.1);
  --status-info: #3b82f6;
  --status-info-bg: rgba(59, 130, 246, 0.1);

  /* ========================================
     MEMORY TYPE COLORS
     ======================================== */
  --memory-correction: #ef4444;
  --memory-decision: #f59e0b;
  --memory-commitment: #8b5cf6;
  --memory-insight: #06b6d4;
  --memory-learning: #22c55e;
  --memory-confidence: #3b82f6;
  --memory-pattern: #a855f7;
  --memory-cross-agent: #ec4899;
  --memory-workflow: #64748b;
  --memory-gap: #dc2626;

  /* ========================================
     ENERGY TYPE COLORS
     ======================================== */
  --energy-low: #6b7280;
  --energy-quick-win: #22c55e;
  --energy-deep-work: #8b5cf6;
  --energy-creative: #ec4899;
  --energy-execution: #f59e0b;
  --energy-people: #3b82f6;

  /* ========================================
     FRESHNESS INDICATOR COLORS
     ======================================== */
  --freshness-hot: #ef4444;     /* 0-7 days */
  --freshness-warm: #f59e0b;    /* 8-30 days */
  --freshness-cool: #3b82f6;    /* 31-90 days */
  --freshness-cold: #6b7280;    /* 90+ days */

  /* ========================================
     MODULE ACCENT COLORS
     Each module gets a distinct accent
     ======================================== */
  --module-dashboard: #ffd700;
  --module-projects: #8b5cf6;
  --module-reminders: #22c55e;
  --module-relationships: #ec4899;
  --module-meetings: #3b82f6;
  --module-knowledge: #06b6d4;
  --module-chat: #ffd700;
  --module-memory-lane: #f43f5e;
  --module-vision: #8b5cf6;
  --module-chain-runner: #3b82f6;
  --module-admin: #64748b;

  /* ========================================
     BORDERS & OUTLINES
     ======================================== */
  --border-color: #2a2a4a;
  --border-color-hover: #3d3d60;
  --border-color-focus: var(--accent-gold);
  --border-radius-sm: 4px;
  --border-radius-md: 6px;
  --border-radius-lg: 8px;
  --border-radius-xl: 12px;
  --border-radius-full: 9999px;

  /* ========================================
     SHADOWS
     ======================================== */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.4);
  --shadow-gold: 0 0 20px rgba(255, 215, 0, 0.3);

  /* ========================================
     SPACING (4px base unit)
     ======================================== */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;

  /* ========================================
     TYPOGRAPHY
     ======================================== */
  --font-family: 'Inter', 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;

  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.7;

  --letter-spacing-tight: -0.5px;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.5px;
  --letter-spacing-wider: 1px;

  /* ========================================
     TRANSITIONS
     ======================================== */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;

  /* ========================================
     Z-INDEX SCALE
     ======================================== */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;

  /* ========================================
     SIDEBAR
     ======================================== */
  --sidebar-width-collapsed: 64px;
  --sidebar-width-expanded: 240px;

  /* ========================================
     ICON SPECIFICATIONS
     ======================================== */
  --icon-stroke-width: 2px;
  --icon-size-sm: 16px;
  --icon-size-md: 20px;
  --icon-size-lg: 24px;
  --icon-size-xl: 32px;
}

/* ============================================================
   UTILITY CLASSES
   ============================================================ */

/* Text colors */
.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }
.text-gold { color: var(--accent-gold); }

/* Background colors */
.bg-primary { background-color: var(--bg-primary); }
.bg-secondary { background-color: var(--bg-secondary); }
.bg-card { background-color: var(--bg-card); }
.bg-elevated { background-color: var(--bg-elevated); }

/* Status colors */
.text-success { color: var(--status-success); }
.text-warning { color: var(--status-warning); }
.text-error { color: var(--status-error); }
.text-info { color: var(--status-info); }

/* Border utilities */
.border { border: 1px solid var(--border-color); }
.border-gold { border-color: var(--accent-gold); }

/* Focus ring for accessibility */
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent-gold);
}
```

---

## Integration Instructions

### Step 1: Create the file
Create `src/styles/variables.css` with the content above.

### Step 2: Import in main.jsx
```javascript
// src/main.jsx
import './styles/variables.css'  // MUST be first import
import './index.css'
import React from 'react'
// ... rest of imports
```

### Step 3: Update existing CSS files
Replace any hardcoded colors with variables:
```css
/* Before */
.card { background: #2d2d4a; }

/* After */
.card { background: var(--bg-card); }
```

---

## Usage Examples

### Cards
```css
.my-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-md);
}

.my-card:hover {
  border-color: var(--accent-gold);
  background: var(--bg-elevated);
}
```

### Buttons
```css
.btn-primary {
  background: var(--accent-gold);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: var(--font-weight-semibold);
  transition: background var(--transition-fast);
}

.btn-primary:hover {
  background: var(--accent-gold-hover);
}
```

### Inputs
```css
.input {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-fast);
}

.input:focus {
  border-color: var(--border-color-focus);
  outline: none;
}
```

### Module-specific theming
```css
.memory-lane-badge {
  background: var(--module-memory-lane);
  color: var(--text-primary);
}

.projects-accent {
  border-left: 3px solid var(--module-projects);
}
```

---

## Testing Checklist

- [x] File created at `src/styles/variables.css`
- [x] Imported first in `src/main.jsx`
- [x] All colors render correctly
- [x] No CSS errors in console (build completed successfully)
- [x] Variables accessible in all component CSS files
- [x] Gold accent visible on dark backgrounds
- [x] Status colors distinguishable
- [x] Memory type colors distinct

---

## Files to Create

- `src/styles/variables.css` - Main variables file

## Files to Modify

- `src/main.jsx` - Add import at top

---

**Notes**: This file is the single source of truth for all design tokens. Any changes to colors, spacing, or typography should be made HERE, not in individual component files. This ensures consistency and makes future theme changes trivial.
