# AI Command Center - Design System

**Quick Reference for Developers**

> Full asset generation details: [GPT-ASSET-GENERATION-PROMPTS.md](../GPT-ASSET-GENERATION-PROMPTS.md)

---

## Visual Identity at a Glance

```
+--------------------------------------------------+
|                  BRAND TRINITY                    |
+--------------------------------------------------+
|                                                   |
|   BRAIN          EYE           NETWORK           |
|   (Memory)      (Vision)      (Connections)      |
|                                                   |
|   Pink/Magenta   Blue         Purple/Blue        |
|   #ec4899       #3b82f6       #8b5cf6            |
|                                                   |
|        All contained within a HEXAGON            |
|                                                   |
+--------------------------------------------------+
```

### The Three Symbols

| Symbol | Module | Position | Color | Represents |
|--------|--------|----------|-------|------------|
| Brain | Memory Lane | Top-left | Pink #ec4899 | AI intelligence, learning, memory |
| Eye | Vision | Center | Blue #3b82f6 | Awareness, monitoring, observation |
| Network | Relationships | Top-right | Purple #8b5cf6 | Connections, data flow |

### Design Philosophy

- **Dark, sophisticated, professional**
- **Premium, high-end feel**
- **Futuristic but approachable** (not sci-fi)
- **Gold accents on dark backgrounds**
- **Clean line art iconography**
- **Hexagonal geometric motifs**

---

## Color Palette

### CSS Variables (Copy-Paste Ready)

```css
:root {
  /* ========================================
     PRIMARY BACKGROUNDS
     ======================================== */
  --bg-primary: #1a1a2e;      /* Main app background */
  --bg-secondary: #252540;    /* Section backgrounds */
  --bg-card: #2d2d4a;         /* Card surfaces */
  --bg-elevated: #3a3a5a;     /* Hover states, borders */

  /* ========================================
     ACCENT COLORS
     ======================================== */
  --accent-gold: #ffd700;      /* Primary accent, CTAs, highlights */
  --accent-gold-hover: #ffed4a; /* Lighter gold for hover states */

  /* ========================================
     ICON GRADIENT (for branding/logos)
     ======================================== */
  --gradient-pink: #ec4899;    /* Brain - left side */
  --gradient-purple: #8b5cf6;  /* Network - transition */
  --gradient-blue: #3b82f6;    /* Eye - right side */

  /* ========================================
     TEXT COLORS
     ======================================== */
  --text-primary: #ffffff;     /* Headings, important text */
  --text-secondary: #a0a0b0;   /* Body text */
  --text-muted: #6b6b80;       /* Labels, hints */

  /* ========================================
     STATUS COLORS
     ======================================== */
  --status-success: #22c55e;   /* Green - success states */
  --status-warning: #f59e0b;   /* Orange - warning states */
  --status-error: #ef4444;     /* Red - error states */
  --status-info: #3b82f6;      /* Blue - info states */

  /* ========================================
     MEMORY TYPE COLORS
     ======================================== */
  --memory-correction: #ef4444; /* Red */
  --memory-decision: #f59e0b;   /* Amber */
  --memory-commitment: #8b5cf6; /* Violet */
  --memory-insight: #06b6d4;    /* Cyan */
  --memory-learning: #22c55e;   /* Green */
  --memory-confidence: #3b82f6; /* Blue */
  --memory-pattern: #a855f7;    /* Purple */
  --memory-workflow: #64748b;   /* Slate */
  --memory-gap: #dc2626;        /* Dark red */

  /* ========================================
     ENERGY TYPE COLORS
     ======================================== */
  --energy-low: #6b7280;        /* Gray */
  --energy-quick-win: #22c55e;  /* Green */
  --energy-deep-work: #8b5cf6;  /* Purple */
  --energy-creative: #ec4899;   /* Pink */
  --energy-execution: #f59e0b;  /* Orange */
  --energy-people: #3b82f6;     /* Blue */

  /* ========================================
     FRESHNESS INDICATORS
     ======================================== */
  --freshness-hot: #ef4444;     /* Red - 0-7 days */
  --freshness-warm: #f59e0b;    /* Orange - 8-30 days */
  --freshness-cool: #3b82f6;    /* Blue - 31-90 days */
  --freshness-cold: #6b7280;    /* Gray - 90+ days */

  /* ========================================
     MODULE ACCENTS
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
     BORDERS & SHADOWS
     ======================================== */
  --border-color: #2a2a4a;
  --shadow-default: 0 4px 20px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 8px 30px rgba(0, 0, 0, 0.4);
}
```

---

## Icon Style Guidelines

### Line Art Specifications

```
+----------------------------------------+
|          ICON STYLE RULES              |
+----------------------------------------+
| Stroke Weight:  2px                    |
| Style:          Outline / Line art     |
| Fill:           None (transparent)     |
| Line Caps:      Rounded                |
| Corners:        2px radius             |
| Color:          White or gradient      |
+----------------------------------------+
```

### Icon Sizes

| Context | Size | Notes |
|---------|------|-------|
| Navigation tabs | 24x24px | Consistent stroke weight |
| Toolbar actions | 20x20px | Slightly lighter stroke (1.5px) |
| Memory type badges | 24x24px (16x16 variant) | Hexagonal shape |
| Energy type indicators | 20x20px (12x12 variant) | Filled with icon |
| Favicons | 16-512px | Simplify at small sizes |

### Icon Colors

| State | Color | Hex |
|-------|-------|-----|
| Default | Gray | #a0a0b0 |
| Active | Gold | #ffd700 |
| Hover | Light Gold | #ffed4a |
| Gradient (branding) | Pink -> Purple -> Blue | #ec4899 -> #8b5cf6 -> #3b82f6 |

---

## Hexagon Motif

The hexagon is the **primary shape motif** throughout the app.

### Usage

- **App icon container**: Main logo shape
- **Memory type badges**: Small hexagonal badges
- **Card accents**: Subtle hexagonal patterns
- **Section headers**: Hexagonal bullet points
- **Background patterns**: Honeycomb grid (very subtle)

### Hexagon Specifications

```
        /\
       /  \
      /    \
     |      |
      \    /
       \  /
        \/

- 6 equal sides
- Use for: badges, containers, decorative elements
- Keep proportions consistent
- 3D depth optional (subtle shadow/gradient)
```

---

## Typography

### Font Family

```css
font-family: 'Inter', 'Outfit', system-ui, -apple-system, sans-serif;
```

### Font Weights

| Use | Weight |
|-----|--------|
| Headings | 600 (semibold) |
| Body text | 400 (regular) |
| Labels | 500 (medium) |
| Emphasis | 700 (bold) |

### Font Sizes

| Element | Size | Line Height |
|---------|------|-------------|
| H1 | 24px | 1.2 |
| H2 | 20px | 1.3 |
| H3 | 16px | 1.4 |
| Body | 14px | 1.5 |
| Small | 12px | 1.4 |
| Caption | 11px | 1.3 |

### Letter Spacing

- Headings: 0.5-1px for premium feel
- Body: Normal
- Labels: 0.5px

---

## Spacing System

### Base Unit: 4px

```css
--spacing-xs: 4px;    /* 1 unit */
--spacing-sm: 8px;    /* 2 units */
--spacing-md: 16px;   /* 4 units */
--spacing-lg: 24px;   /* 6 units */
--spacing-xl: 32px;   /* 8 units */
--spacing-2xl: 48px;  /* 12 units */
```

### Component Spacing

| Component | Padding | Margin |
|-----------|---------|--------|
| Cards | 16px | 8px |
| Buttons | 8px 16px | - |
| Input fields | 8px 12px | - |
| Modals | 24px | - |
| Sidebar | 12px | - |

---

## Component Patterns

### Cards

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: var(--spacing-md);
  box-shadow: var(--shadow-default);
}

.card:hover {
  border-color: var(--accent-gold);
  background: var(--bg-elevated);
}
```

### Buttons

```css
/* Primary (Gold) */
.btn-primary {
  background: var(--accent-gold);
  color: #000000;
  border: none;
  border-radius: 6px;
  font-weight: 600;
}

.btn-primary:hover {
  background: var(--accent-gold-hover);
}

/* Secondary (Outline) */
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
```

### Inputs

```css
.input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
}

.input:focus {
  border-color: var(--accent-gold);
  outline: none;
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* Memory type badges use hexagonal shape */
.badge-hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  padding: 4px 8px;
}
```

---

## Module-Specific Design Notes

### Dashboard
- Use gold accents liberally
- Status brief card is the hero element
- Widget grid layout with consistent spacing

### Memory Lane (Brain)
- Primary color: Pink/Cyan
- Brain icon prominently featured
- Timeline visualization with type-colored dots

### Vision (Eye)
- Primary color: Blue
- Eye icon prominently featured
- Camera feed with hexagonal detection boxes
- Scan line effects for "active" state

### Relationships (Network)
- Primary color: Purple/Pink
- Network node icons
- Freshness indicators (fire/sun/cloud/snowflake)

### Projects
- Energy type color coding
- Progress bars with purple-blue gradient
- Three-tier view transition

### Chat
- Memory Lane bar at top (cyan/purple)
- Gold send button
- Subtle message bubbles

---

## Visual Consistency Checklist

Before shipping any UI component, verify:

- [ ] **Background**: Uses `--bg-primary` (#1a1a2e) or darker
- [ ] **Accents**: Gold (#ffd700) for CTAs and highlights
- [ ] **Icons**: Line art style, 2px stroke, no fills
- [ ] **Hexagons**: Used where appropriate (badges, containers)
- [ ] **Brain/Eye/Network**: Correct module gets correct symbol
- [ ] **Gradient direction**: Pink top-left to blue bottom-right
- [ ] **Professional tone**: Not playful or cartoonish
- [ ] **Small size test**: Icons work at 16px minimum
- [ ] **Hover states**: Border color changes to gold
- [ ] **Active states**: Gold accent applied

---

## Anti-Patterns (What NOT to Do)

| Avoid | Instead |
|-------|---------|
| Bright/light backgrounds | Dark navy (#1a1a2e) |
| Filled/solid icons | Line art / outline style |
| Cartoon or playful imagery | Professional, sophisticated |
| Generic tech icons | Brain/Eye/Network motifs |
| Random accent colors | Gold (#ffd700) consistently |
| Sharp corners everywhere | Rounded corners (6-8px) |
| Heavy shadows | Subtle shadows (0.3 opacity) |
| Gradient text (for body) | Reserved for headings only |

---

## Quick Reference Card

```
+--------------------------------------------------+
|            AI COMMAND CENTER DESIGN               |
+--------------------------------------------------+
|                                                   |
|  BACKGROUND:     #1a1a2e (dark navy)             |
|  ACCENT:         #ffd700 (gold)                  |
|  TEXT:           #ffffff / #a0a0b0              |
|                                                   |
|  ICONS:          Line art, 2px stroke            |
|  SHAPE MOTIF:    Hexagon                         |
|  STYLE:          Professional, premium           |
|                                                   |
|  BRAIN  = Memory Lane     = Pink #ec4899        |
|  EYE    = Vision          = Blue #3b82f6        |
|  NETWORK = Relationships  = Purple #8b5cf6      |
|                                                   |
+--------------------------------------------------+
```

---

*Last updated: 2025-12-29*
*Source: GPT-ASSET-GENERATION-PROMPTS.md*
