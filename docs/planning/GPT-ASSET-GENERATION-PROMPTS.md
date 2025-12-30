# GPT Asset Generation Prompts
## AI Command Center / JFDI System

This document contains ready-to-use prompts for generating visual assets, icons, hero images, and documentation using GPT-4 with DALL-E or similar AI image generation tools.

**IMPORTANT**: All prompts reference the existing visual language established in the current app icon and UI. Read the "Design Continuity" section first to understand the established design system before generating any assets.

---

## Table of Contents

1. [Design Continuity](#design-continuity) **READ FIRST**
2. [Brand Overview](#brand-overview)
3. [Custom Assets](#1-custom-assets)
4. [Icons](#2-icons)
5. [Hero Images](#3-hero-images)
6. [Documentation](#4-documentation)

---

## Design Continuity

### CRITICAL: Existing Visual Language

All new assets MUST maintain consistency with the established design system. Before generating any asset, reference these core elements:

### Current App Icon Analysis

The existing icon (`src/assets/icon.png`) establishes the visual foundation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXISTING ICON BREAKDOWN                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   SHAPE: Hexagon                                                         │
│   ───────────────                                                        │
│   • 3D hexagonal container with subtle depth                             │
│   • Clean geometric edges                                                │
│   • Represents "command center" / organized structure                    │
│                                                                          │
│   SYMBOLS (Three Core Elements):                                         │
│   ─────────────────────────────                                          │
│                                                                          │
│   1. BRAIN (Top Left)                                                    │
│      • Stylized brain outline                                            │
│      • Represents: Memory Lane, AI intelligence, learning                │
│      • Pink/magenta gradient tones                                       │
│                                                                          │
│   2. EYE (Center)                                                        │
│      • Prominent eye symbol                                              │
│      • Concentric circles (iris/pupil)                                   │
│      • Represents: Vision system, awareness, monitoring                  │
│      • Blue tones in the center                                          │
│                                                                          │
│   3. NETWORK NODES (Top Right)                                           │
│      • Connected dots/nodes pattern                                      │
│      • Represents: Connections, data flow, relationships                 │
│      • Purple/blue gradient                                              │
│                                                                          │
│   COLOR GRADIENT:                                                        │
│   ────────────────                                                       │
│   Pink (#ec4899) → Purple (#8b5cf6) → Blue (#3b82f6)                    │
│   Flows diagonally across the icon                                       │
│   Creates cohesive, modern tech aesthetic                                │
│                                                                          │
│   STYLE CHARACTERISTICS:                                                 │
│   ──────────────────────                                                 │
│   • Line art / outline style (not filled)                                │
│   • Clean, modern iconography                                            │
│   • 2px stroke weight approximate                                        │
│   • White/light lines on implied dark background                         │
│   • Subtle gradients for depth                                           │
│   • Professional, not playful                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design Evolution Guidelines

When creating NEW assets, you should:

1. **PRESERVE** the hexagon as a recurring shape motif
2. **MAINTAIN** the brain + eye + network trinity concept
3. **USE** the pink-purple-blue gradient for icon-related assets
4. **APPLY** the gold (#ffd700) accent for UI elements and highlights
5. **KEEP** the line-art / outline style for icons
6. **MATCH** the stroke weight and clean geometry

### Color System Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        JFDI COLOR SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ICON GRADIENT (for logo/icon variants):                                 │
│  ▓▓▓▓▓  Pink:      #ec4899                                              │
│  ▓▓▓▓▓  Purple:    #8b5cf6                                              │
│  ▓▓▓▓▓  Blue:      #3b82f6                                              │
│                                                                          │
│  UI BACKGROUNDS:                                                         │
│  ▓▓▓▓▓  Primary:   #1a1a2e (dark navy - main background)                │
│  ▓▓▓▓▓  Secondary: #252540 (lighter navy - sections)                    │
│  ▓▓▓▓▓  Card:      #2d2d4a (card surfaces)                              │
│  ▓▓▓▓▓  Elevated:  #3a3a5a (hover states, borders)                      │
│                                                                          │
│  UI ACCENTS:                                                             │
│  ▓▓▓▓▓  Gold:      #ffd700 (primary accent, CTAs, highlights)           │
│  ▓▓▓▓▓  Gold Hover:#ffed4a (lighter gold for hover)                     │
│                                                                          │
│  TEXT:                                                                   │
│  ▓▓▓▓▓  Primary:   #ffffff (white - headings, important)                │
│  ▓▓▓▓▓  Secondary: #a0a0b0 (gray - body text)                           │
│  ▓▓▓▓▓  Muted:     #6b6b80 (dark gray - labels, hints)                  │
│                                                                          │
│  STATUS COLORS:                                                          │
│  ▓▓▓▓▓  Success:   #22c55e (green)                                      │
│  ▓▓▓▓▓  Warning:   #f59e0b (orange)                                     │
│  ▓▓▓▓▓  Error:     #ef4444 (red)                                        │
│  ▓▓▓▓▓  Info:      #3b82f6 (blue)                                       │
│                                                                          │
│  MEMORY TYPE COLORS:                                                     │
│  ▓▓▓▓▓  Correction:#ef4444 (red)                                        │
│  ▓▓▓▓▓  Decision:  #f59e0b (amber)                                      │
│  ▓▓▓▓▓  Commitment:#8b5cf6 (violet)                                     │
│  ▓▓▓▓▓  Insight:   #06b6d4 (cyan)                                       │
│  ▓▓▓▓▓  Learning:  #22c55e (green)                                      │
│  ▓▓▓▓▓  Confidence:#3b82f6 (blue)                                       │
│  ▓▓▓▓▓  Pattern:   #a855f7 (purple)                                     │
│  ▓▓▓▓▓  Workflow:  #64748b (slate)                                      │
│  ▓▓▓▓▓  Gap:       #dc2626 (dark red)                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Visual Consistency Checklist

Before using any generated asset, verify:

- [ ] Hexagon shape used where appropriate (logos, badges, containers)
- [ ] Line weight matches existing icon (~2px strokes)
- [ ] Colors are from the approved palette
- [ ] Style is "outline/line art" not filled/solid for icons
- [ ] Gradient direction is consistent (pink top-left to blue bottom-right)
- [ ] Professional, not playful or cartoonish
- [ ] Works at small sizes (16px minimum)

---

## Brand Overview

### App Name
**AI Command Center** (also known as "JFDI System")

### Purpose
A comprehensive personal productivity and AI executive assistant desktop application featuring:
- Memory Lane: AI-powered memory extraction and retrieval
- Dashboard: Auto-generated daily overviews
- Project Management: Three-tier Life/Projects/Now views
- Chat Interface: Claude Code wrapper with memory integration
- Relationships CRM, Reminders, Meetings, Knowledge systems
- A2A RAG Training (Chain Runner)
- AI Vision (Camera analysis)

### Target Audience
Power users, developers, and professionals seeking AI-augmented personal productivity

### Design Philosophy
- **Dark, sophisticated, professional**
- **Futuristic but approachable** (not sci-fi)
- **Premium, high-end feel**
- **Gold accents on dark backgrounds** (for UI)
- **Pink-purple-blue gradients** (for branding/icons)
- **Clean line art iconography**
- **Hexagonal geometric motifs**

### The Three Symbols

The app identity is built on three symbolic pillars visible in the icon:

| Symbol | Represents | Features |
|--------|------------|----------|
| **Brain** | Memory Lane, AI intelligence, learning | Top-left position, pink tones |
| **Eye** | Vision system, awareness, monitoring | Center position, blue tones |
| **Network** | Connections, relationships, data flow | Top-right position, purple tones |

These three elements should appear throughout the visual system in various forms.

---

# 1. Custom Assets

## 1.1 App Logo - Primary (Evolution of Existing)

### Prompt:
```
Evolve the existing AI Command Center app icon into a refined primary logo.

EXISTING ICON REFERENCE:
The current icon features:
- Hexagonal container shape with subtle 3D depth
- Three symbols: Brain (top-left), Eye (center), Network nodes (top-right)
- Pink-purple-blue gradient flowing diagonally
- Clean line art style, approximately 2px strokes
- White/light colored lines

TASK: Create an evolved version that:

SPECIFICATIONS:
- Dimensions: 512x512 pixels (must scale cleanly to 16x16)
- Style: Line art with gradient, matching existing icon
- Gradient: Pink (#ec4899) → Purple (#8b5cf6) → Blue (#3b82f6)

EVOLUTION DIRECTIONS (create variations):

1. REFINED VERSION
   - Same hexagon + brain + eye + network concept
   - Cleaner lines, better balance
   - Improved visual hierarchy
   - Eye slightly more prominent as the "center" of command

2. DYNAMIC VERSION
   - Add subtle motion lines or glow effects
   - Suggest "active" or "processing" state
   - Energy emanating from the eye

3. SIMPLIFIED VERSION
   - Reduce to essential elements
   - Must work perfectly at 16x16 favicon size
   - Keep hexagon + one key element (eye recommended)

MAINTAIN:
- Hexagon as container shape
- Line art / outline style (NOT filled)
- Pink-purple-blue gradient
- Professional, premium aesthetic
- The brain-eye-network trinity concept

AVOID:
- Completely different concepts (stay true to existing)
- Filled/solid style icons
- Cartoon or playful interpretations
- Generic tech imagery
```

### Variations to Request:
1. "Create a gold (#ffd700) monochrome version for dark UI backgrounds"
2. "Create an all-white version for maximum contrast"
3. "Create an animated concept showing the eye 'scanning' or 'pulsing'"

---

## 1.2 App Logo - Text Lockup

### Prompt:
```
Create a horizontal text lockup combining the AI Command Center icon with text.

EXISTING ICON REFERENCE:
- Hexagonal shape containing brain, eye, and network symbols
- Pink-purple-blue gradient
- Clean line art style

SPECIFICATIONS:
- Dimensions: 400x100 pixels (horizontal lockup)
- Background: Transparent
- Icon size: Approximately 80x80 within the lockup

DESIGN:
- LEFT: The hexagon icon (scaled from existing)
- RIGHT: "AI Command Center" text

TEXT STYLING:
- Font: Modern geometric sans-serif (like Inter, Outfit, or similar)
- "AI" in gradient matching icon (pink-purple-blue) OR gold (#ffd700)
- "Command Center" in white (#ffffff)
- Slight letter spacing (0.5-1px) for premium feel
- Vertical alignment: Center with icon

VARIATIONS NEEDED:
1. Full color with gradient "AI" - for marketing materials
2. Gold "AI" + white text - for UI headers
3. All white version - for dark backgrounds
4. Compact: Icon + "AICC" abbreviation - for tight spaces

MAINTAIN:
- Visual connection to existing icon
- Professional, not playful
- Premium typography feel
```

---

## 1.3 Memory Lane Component - Brain Icon

### Prompt:
```
Create a standalone brain icon for the "Memory Lane" feature, derived from the brain element in the existing app icon.

EXISTING REFERENCE:
The app icon contains a stylized brain in the top-left of a hexagon, rendered in pink tones with line art style.

SPECIFICATIONS:
- Dimensions: 64x64 pixels (and 32x32, 24x24 variants)
- Style: Line art matching existing icon (~2px stroke)
- Primary color: Pink (#ec4899) to purple (#8b5cf6) gradient
- Alternative: Cyan (#06b6d4) for Memory Lane specific contexts

DESIGN CONCEPT:
- Extract and refine the brain from the existing icon
- Add neural connection lines emanating outward
- Optional: Small hexagon accent to tie back to main logo
- Subtle glow or pulse effect suggesting "active memory"

VARIATIONS:
1. GRADIENT VERSION - Pink to purple, for branding consistency
2. CYAN VERSION - For Memory Lane UI elements
3. GOLD ACCENT VERSION - Brain outline with gold (#ffd700) glow

USE CASES:
- Memory Lane navigation tab
- Memory Lane bar header
- Memory cards type indicator
- Loading states ("recalling...")

MAINTAIN:
- Line art style from existing icon
- Similar stroke weight
- Connection to overall brand

AVOID:
- Realistic brain imagery
- Filled/solid style
- Losing the abstract, stylized feel
```

---

## 1.4 Vision System - Eye Icon

### Prompt:
```
Create a standalone eye icon for the "Vision" feature, derived from the eye element in the existing app icon.

EXISTING REFERENCE:
The app icon features a prominent eye in the center of the hexagon, with concentric circles (iris/pupil), rendered in blue tones with line art style.

SPECIFICATIONS:
- Dimensions: 64x64 pixels (and 32x32, 24x24 variants)
- Style: Line art matching existing icon (~2px stroke)
- Primary color: Blue (#3b82f6)
- Gradient option: Purple (#8b5cf6) to blue (#3b82f6)

DESIGN CONCEPT:
- Extract and refine the eye from the existing icon
- Concentric circles for iris/pupil
- Optional: Subtle scan lines or radar effect
- Optional: Small hexagon frame to tie back to main logo

VARIATIONS:
1. STANDARD - Blue line art eye
2. SCANNING - With motion lines suggesting active viewing
3. RECORDING - With subtle red (#ef4444) indicator dot
4. GOLD HIGHLIGHT - Eye with gold (#ffd700) pupil accent

USE CASES:
- Vision app navigation tab
- Camera active indicator
- Analysis in progress states
- Vision-related notifications

MAINTAIN:
- Line art style from existing icon
- Concentric circle motif
- Connection to overall brand

AVOID:
- Creepy or surveillance-like appearance
- Overly detailed realistic eye
- Losing the clean, geometric feel
```

---

## 1.5 Network/Connections Icon

### Prompt:
```
Create a standalone network/connections icon, derived from the network nodes element in the existing app icon.

EXISTING REFERENCE:
The app icon contains connected nodes (dots with lines) in the top-right, rendered in purple-blue tones with line art style.

SPECIFICATIONS:
- Dimensions: 64x64 pixels (and 32x32, 24x24 variants)
- Style: Line art matching existing icon (~2px stroke)
- Primary color: Purple (#8b5cf6) to blue (#3b82f6) gradient

DESIGN CONCEPT:
- 3-4 nodes (circles) connected by lines
- Abstract network/constellation pattern
- Suggests relationships, connections, data flow
- Optional: One node highlighted in gold (#ffd700) as "active"

VARIATIONS:
1. STANDARD - Purple-blue gradient network
2. RELATIONSHIPS - Nodes as simplified person icons
3. DATA FLOW - Nodes with directional arrows
4. ACTIVE CONNECTION - One node pulsing/highlighted

USE CASES:
- Relationships CRM navigation tab
- Entity connections in Memory Lane
- Data sync indicators
- Network status displays

MAINTAIN:
- Line art style from existing icon
- Node + connection line motif
- Connection to overall brand
```

---

## 1.6 Dashboard Cards Background Pattern

### Prompt:
```
Create subtle, tileable background patterns for dashboard cards, consistent with the JFDI dark theme.

SPECIFICATIONS:
- Dimensions: 100x100 pixels, seamlessly tileable
- Base color: #2d2d4a (card background)
- Pattern color: #3a3a5a (10-15% lighter, very subtle)

PATTERN OPTIONS (create each):

1. WAVY LINES
   - Gentle, flowing horizontal waves
   - Inspired by the smooth curves in the brain symbol
   - Spacing: 20px between lines
   - Very subtle, barely visible

2. HEXAGON GRID
   - Tiny hexagons in a honeycomb pattern
   - References the main logo shape
   - 15px hexagon size
   - Outline only, very faint

3. DOT MATRIX
   - Small dots in a regular grid
   - Similar to network nodes concept
   - 8px spacing
   - Almost subliminal visibility

4. NEURAL NETWORK
   - Abstract connected lines
   - References brain/network from logo
   - Random-looking but tileable
   - Very subtle, tech aesthetic

IMPORTANT:
- These are BACKGROUND patterns, must be extremely subtle
- Should enhance, not distract from content
- Must feel premium and sophisticated
- Tie back to the logo's visual language
```

---

## 1.7 Memory Type Badges

### Prompt:
```
Create a set of 9 memory type indicator badges for the Memory Lane system.

DESIGN SYSTEM REFERENCE:
- Use hexagonal badge shape (referencing main logo)
- Line art style with colored fill
- Small icon inside each badge
- Consistent with existing icon aesthetic

SPECIFICATIONS:
- Dimensions: 24x24 pixels (and 16x16 variants)
- Shape: Small hexagon or rounded hexagon
- Style: Subtle fill with darker outline

THE 9 MEMORY TYPES:

1. CORRECTION (Color: #ef4444 red)
   - Icon: Simple "X" or undo arrow
   - Meaning: User corrected AI behavior

2. DECISION (Color: #f59e0b amber)
   - Icon: Fork in path or checkmark
   - Meaning: Explicit choice made

3. COMMITMENT (Color: #8b5cf6 violet)
   - Icon: Lock or promise ring
   - Meaning: User preference stated

4. INSIGHT (Color: #06b6d4 cyan)
   - Icon: Lightbulb or spark (like brain activation)
   - Meaning: Discovery made

5. LEARNING (Color: #22c55e green)
   - Icon: Open book or graduation cap
   - Meaning: Knowledge gained

6. CONFIDENCE (Color: #3b82f6 blue)
   - Icon: Shield or thumbs up
   - Meaning: High confidence in approach

7. PATTERN (Color: #a855f7 purple)
   - Icon: Repeating waves or dots (like network)
   - Meaning: Repeated behavior observed

8. WORKFLOW (Color: #64748b slate)
   - Icon: Flow arrows or steps
   - Meaning: Process observation

9. GAP (Color: #dc2626 dark red)
   - Icon: Warning triangle or missing piece
   - Meaning: Missing capability

DESIGN NOTES:
- Each badge should use hexagon shape consistently
- Icons inside should be ultra-simple line art
- Must be distinguishable at 16px
- Consistent stroke weight across all badges
```

---

## 1.8 Task Energy Type Indicators

### Prompt:
```
Create a set of 6 task energy type indicators for the project management system.

DESIGN SYSTEM REFERENCE:
- Use small hexagon or circle shape
- Simple icon inside
- Consistent with overall line art aesthetic

SPECIFICATIONS:
- Dimensions: 20x20 pixels (and 12x12 variants)
- Shape: Small hexagon with rounded corners OR filled circle
- Style: Filled background with light icon inside

THE 6 ENERGY TYPES:

1. QUICK WIN (Color: #22c55e green)
   - Icon: Lightning bolt (speed, easy)
   - Background: Green fill, white icon

2. DEEP WORK (Color: #8b5cf6 purple)
   - Icon: Focus target or brain
   - Background: Purple fill, white icon

3. CREATIVE (Color: #ec4899 pink)
   - Icon: Sparkle or paintbrush
   - Background: Pink fill, white icon

4. EXECUTION (Color: #f59e0b orange)
   - Icon: Hammer or gear
   - Background: Orange fill, white icon

5. PEOPLE WORK (Color: #3b82f6 blue)
   - Icon: Person silhouette or speech bubble
   - Background: Blue fill, white icon

6. LOW ENERGY (Color: #64748b gray)
   - Icon: Moon or battery low
   - Background: Gray fill, white icon

DESIGN NOTES:
- Should work inline with task text
- Color must be the primary differentiator
- Icons are secondary (for accessibility)
- Consistent size and padding
```

---

## 1.9 Relationship Freshness Indicators

### Prompt:
```
Create 3 relationship freshness indicator icons for the CRM system.

DESIGN SYSTEM REFERENCE:
- Simple, iconic symbols
- Match the clean line art aesthetic
- Can be slightly more expressive than other icons

SPECIFICATIONS:
- Dimensions: 16x16 pixels
- Style: Simple filled icons with clear meaning

THE 3 FRESHNESS LEVELS:

1. HOT (0-7 days since contact)
   - Symbol: Flame or fire
   - Color: Gradient from #f59e0b (orange) to #ef4444 (red)
   - Meaning: Recently in touch, active relationship

2. WARM (8-30 days since contact)
   - Symbol: Sun or warm glow
   - Color: #f59e0b (amber/orange)
   - Meaning: Still fresh, healthy connection

3. COLD (31+ days since contact)
   - Symbol: Snowflake or ice crystal
   - Color: #3b82f6 (blue)
   - Meaning: Needs attention, reaching out recommended

DESIGN NOTES:
- Should be instantly recognizable
- Work at small sizes in contact lists
- Slightly more expressive than other icons (emotional context)
- But still professional, not cartoonish
```

---

# 2. Icons

## 2.1 Navigation Tab Icons

### Prompt:
```
Create a consistent set of 10 navigation icons for the app's main navigation tabs.

DESIGN SYSTEM REFERENCE:
- Match the line art style of the existing app icon
- Use approximately 2px stroke weight
- Clean, geometric shapes
- Professional, not playful

SPECIFICATIONS:
- Dimensions: 24x24 pixels
- Style: Outline/line icons, consistent stroke weight
- Colors:
  - Default: #a0a0b0 (gray)
  - Active: #ffd700 (gold)
  - Can also use gradient (pink-purple-blue) for active state
- Background: Transparent

THE 10 NAVIGATION TABS:

1. DASHBOARD (Home)
   - Icon: Grid layout or stylized house
   - Should feel like "command center"

2. PROJECTS
   - Icon: Folder or kanban board columns
   - Organized, structured feel

3. CHAT
   - Icon: Speech bubble
   - Clean, simple communication symbol

4. REMINDERS
   - Icon: Bell or clock with alert
   - Time-sensitive feel

5. RELATIONSHIPS (CRM)
   - Icon: Two connected people or network nodes (reference logo)
   - Connection/relationship feel

6. MEETINGS
   - Icon: Calendar or video camera
   - Professional meeting context

7. KNOWLEDGE
   - Icon: Book or database symbol
   - Information storage feel

8. MEMORY LANE
   - Icon: Stylized brain (reference logo brain element)
   - Or brain inside small hexagon
   - Memory/intelligence feel

9. VISION
   - Icon: Eye (reference logo eye element)
   - Or camera/lens
   - Observation/vision feel

10. ADMIN
    - Icon: Gear/cog or sliders
    - Settings/configuration feel

DESIGN REQUIREMENTS:
- All icons MUST have identical visual weight
- Consistent corner radius (2px)
- No filled elements in default state
- Should feel cohesive as a set
- Reference the brain, eye, network motifs where appropriate
```

---

## 2.2 Toolbar Action Icons

### Prompt:
```
Create a set of 12 toolbar action icons for productivity app controls.

DESIGN SYSTEM REFERENCE:
- Match existing icon's line art style
- Slightly lighter stroke (1.5px) for toolbar context
- Clean, immediately recognizable

SPECIFICATIONS:
- Dimensions: 20x20 pixels
- Style: Minimal line icons
- Stroke: 1.5px consistent weight
- Color: #ffffff (white) default, #ffd700 (gold) on hover
- Background: Transparent

THE 12 ACTIONS:

1. ADD/PLUS - Create new item (plus in circle or hexagon)
2. SEARCH - Magnifying glass
3. FILTER - Funnel or horizontal sliders
4. SORT - Up/down arrows or A-Z indicator
5. REFRESH - Circular arrow (smooth curves like logo)
6. EXPORT - Arrow pointing out of box/hexagon
7. IMPORT - Arrow pointing into box/hexagon
8. DELETE - Trash can (simple, clean)
9. EDIT - Pencil
10. DUPLICATE - Overlapping shapes (use hexagons?)
11. ARCHIVE - Box with down arrow
12. SHARE - Connected nodes (reference network from logo)

DESIGN NOTES:
- Must be crystal clear at small size
- Consistent stroke weight throughout set
- Rounded line caps and joins
- Where possible, use hexagon shapes as container hints
- Leave breathing room within bounding box
```

---

## 2.3 Memory Lane Feature Icons

### Prompt:
```
Create a set of 8 feature-specific icons for the Memory Lane system.

DESIGN SYSTEM REFERENCE:
- These are larger, more detailed than navigation icons
- Use the pink-purple-blue gradient or cyan (#06b6d4)
- Reference brain element from main logo
- Line art with subtle gradient

SPECIFICATIONS:
- Dimensions: 32x32 pixels
- Style: Duotone or gradient line art
- Primary: Cyan (#06b6d4) or pink-purple gradient
- Secondary: Darker shade of primary

THE 8 MEMORY LANE ICONS:

1. MEMORY BROWSER
   - Concept: Grid of memory cards or list view
   - Include small brain motif

2. SESSION BROWSER
   - Concept: Chat transcript timeline
   - Stacked message bubbles or timeline

3. VISUALIZATION
   - Concept: Chart/heatmap/graph
   - Data visualization aesthetic

4. SEARCH MEMORIES
   - Concept: Brain + magnifying glass combined
   - Searching through memories

5. EXTRACT MEMORIES
   - Concept: Document with sparkles/data flowing out
   - Extraction process

6. ENTITY DETECTION
   - Concept: Objects being tagged/identified
   - Use network nodes concept

7. EMBEDDING/VECTOR
   - Concept: Abstract points in 3D space
   - Vector/spatial representation

8. FEEDBACK
   - Concept: Thumbs up/down or rating
   - User feedback mechanism

DESIGN NOTES:
- More detailed than nav icons (larger size allows)
- Should feel intelligent, data-driven
- Reference main logo elements where appropriate
- Consistent gradient direction (top-left to bottom-right)
```

---

## 2.4 Chat Interface Icons

### Prompt:
```
Create a set of 10 icons for the chat/messaging interface.

DESIGN SYSTEM REFERENCE:
- Clean line art style matching existing icon
- White default, gold accent states
- Professional chat experience

SPECIFICATIONS:
- Dimensions: 24x24 pixels
- Style: Line icons, 2px stroke
- Colors: White (#ffffff) and gold (#ffd700) variants
- Background: Transparent

THE 10 CHAT ICONS:

1. MICROPHONE
   - Voice input, simple mic shape
   - Can have sound waves when active

2. ATTACHMENT
   - Paperclip or image icon
   - File attachment indicator

3. SEND
   - Paper plane or arrow
   - Pointing right, action feel

4. COPY
   - Overlapping documents
   - Copy to clipboard

5. REGENERATE
   - Circular refresh with sparkle
   - AI regenerate response

6. STOP
   - Square stop button
   - Halt generation

7. EXPAND/COLLAPSE
   - Chevron arrows
   - Toggle visibility

8. TOKEN COUNTER
   - Coins stacked or meter gauge
   - Usage indicator

9. SESSION SWITCH
   - Clock with dropdown or history
   - Switch conversations

10. REMIND ME
    - Clock with plus or pin
    - Save for later reminder

DESIGN NOTES:
- Used in chat input bar and message actions
- Should feel responsive and tappable
- Consistent with overall line art style
- Gold highlight for active/hover states
```

---

## 2.5 System Status Icons

### Prompt:
```
Create a set of 6 system status indicator icons for the admin panel.

DESIGN SYSTEM REFERENCE:
- Simple, clear status indicators
- Status colors from the palette
- Must convey meaning at a glance

SPECIFICATIONS:
- Dimensions: 16x16 pixels
- Style: Simple filled or outlined indicators
- Colors: As specified per status

THE 6 STATUS ICONS:

1. HEALTHY/ONLINE
   - Color: #22c55e (green)
   - Icon: Checkmark in circle or hexagon
   - Meaning: All systems operational

2. WARNING
   - Color: #f59e0b (orange)
   - Icon: Exclamation in triangle
   - Meaning: Attention needed

3. ERROR/OFFLINE
   - Color: #ef4444 (red)
   - Icon: X in circle
   - Meaning: System down/error

4. SYNCING/LOADING
   - Color: #3b82f6 (blue)
   - Icon: Circular arrows or spinner
   - Meaning: Processing/syncing

5. PAUSED
   - Color: #64748b (gray)
   - Icon: Pause bars
   - Meaning: Temporarily stopped

6. UNKNOWN
   - Color: #6b6b80 (dark gray)
   - Icon: Question mark
   - Meaning: Status undetermined

DESIGN NOTES:
- Must be instantly recognizable
- Work in dense data displays
- Consistent shape (prefer circles or small hexagons)
- High contrast against dark backgrounds
```

---

## 2.6 App Favicon Set

### Prompt:
```
Create a complete favicon set based on the existing AI Command Center icon.

EXISTING ICON REFERENCE:
- Hexagon containing brain, eye, and network symbols
- Pink-purple-blue gradient
- Line art style

SPECIFICATIONS - Generate all sizes:
- 16x16 pixels (browser tab) - CRITICAL: Must be recognizable
- 32x32 pixels (desktop shortcuts)
- 48x48 pixels (Windows taskbar)
- 64x64 pixels (high DPI tabs)
- 128x128 pixels (Chrome Web Store)
- 180x180 pixels (Apple Touch Icon)
- 192x192 pixels (Android)
- 512x512 pixels (PWA)

SIMPLIFICATION STRATEGY:
At smallest sizes (16x16, 32x32):
- Keep hexagon outline
- Focus on EYE as primary symbol (most recognizable)
- Simplify or remove brain and network
- Maintain gradient coloring

At medium sizes (48-128):
- Include hexagon + eye + simplified brain
- Network can be suggested

At large sizes (180-512):
- Full detail as in existing icon

EXPORT FORMATS NEEDED:
- PNG with transparency for each size
- ICO file containing 16, 32, 48, 64
- SVG vector version
- Apple touch icon (no transparency, with background)

MAINTAIN:
- Recognizable connection to full icon
- Gradient colors
- Hexagon shape
- Professional appearance at all sizes
```

---

# 3. Hero Images

## 3.1 Landing Page Hero

### Prompt:
```
Create a hero image for the AI Command Center landing page / splash screen.

DESIGN SYSTEM REFERENCE:
- Dark background (#1a1a2e)
- Pink-purple-blue gradient accents (matching icon)
- Gold (#ffd700) for highlights and CTAs
- Incorporate hexagon, brain, eye, network motifs

SPECIFICATIONS:
- Dimensions: 1920x1080 pixels (16:9 ratio)
- Style: Dark, futuristic, sophisticated
- Color palette: Dark navy background, gradient accents, gold highlights

COMPOSITION:

CENTER-FOCUS:
- Large, glowing version of the app icon (hexagon with symbols)
- Or: Abstract visualization combining brain, eye, network
- Subtle particle effects and data streams
- Neural network patterns in background

LEFT SIDE - Floating UI previews:
- Memory card with type badge (show the hexagon badge)
- Project task with energy type indicator
- Chat bubble with Memory Lane bar
- Use actual UI colors and styling

RIGHT SIDE - Feature suggestions:
- Dashboard grid layout hint
- Vision camera feed frame
- Network of connected entities

ATMOSPHERE:
- Depth of field blur on edges
- Subtle hexagonal pattern in background
- Soft glow emanating from icon/center
- Premium, aspirational, professional

TEXT OVERLAY SPACE (center-left area):
Leave clear space for:
- "AI Command Center" heading
- "Your AI-Powered Executive Assistant" tagline
- CTA button area

VISUAL MOTIFS TO INCLUDE:
- Hexagons (various sizes, subtle)
- Brain/neural network patterns
- Eye/vision scan lines
- Connected nodes (network)
- Gold accent lines and highlights
```

---

## 3.2 Memory Lane Feature Hero

### Prompt:
```
Create a feature showcase hero for the "Memory Lane" system.

DESIGN SYSTEM REFERENCE:
- Use cyan (#06b6d4) and purple (#8b5cf6) as primary colors
- Brain symbol prominently featured
- Hexagon motifs throughout
- Dark background

SPECIFICATIONS:
- Dimensions: 1600x900 pixels
- Style: Data visualization / neural network aesthetic

VISUALIZATION CONCEPT:

LEFT HALF - "Entity-Based" Retrieval:
- Network graph of connected entities
- Nodes are small hexagons
- Lines connecting related items
- Gold (#ffd700) highlights on matched entities
- Labels: people, projects, files

RIGHT HALF - "Semantic" Retrieval:
- Vector space visualization (3D point cloud)
- Points clustering by similarity
- Gradient heat map showing relevance
- Purple-cyan color scheme

CENTER - Memory Emergence:
- 2-3 memory cards "floating" forward
- Each with hexagonal type badge
- Show confidence percentages
- Timestamps and recall counts
- Brain symbol watermark behind

BOTTOM - Timeline/River View:
- Horizontal flow of memories
- Different colors for memory types
- Density showing activity periods
- Hexagonal markers for significant memories

TOP - The Memory Lane brain icon (large, glowing)

ATMOSPHERE:
- Intelligent, thinking system vibe
- Data flowing and connecting
- Subtle animation suggested by motion blur
- Professional, not sci-fi
```

---

## 3.3 Dashboard Feature Hero

### Prompt:
```
Create a feature hero showing the auto-generated Dashboard.

DESIGN SYSTEM REFERENCE:
- Dark UI background (#1a1a2e to #252540)
- Gold accents for important items
- Card-based layout
- Hexagonal decorative elements

SPECIFICATIONS:
- Dimensions: 1600x900 pixels
- Style: Clean dashboard mockup
- Time context: Morning briefing at 8:30 AM

COMPOSITION:

TOP BAR:
- Date: "December 29, 2025"
- Greeting: "Good morning"
- App icon (small) in corner
- Gold accent line underneath

MAIN GRID:

LEFT COLUMN:
- Status Brief card (AI-generated summary text)
  - Subtle brain icon indicating AI-generated
- Schedule visualization
  - Time blocks with color coding
  - Gold highlight on current/next item
- Relationship warnings
  - Freshness indicators (fire, sun, snowflake)

RIGHT COLUMN:
- Focus recommendations
  - Priority items with energy type badges
  - Hexagonal bullet points
- Email summary
  - Count badges (urgent/action)
- Reminders list
  - Checkbox items with gold accents

BOTTOM:
- Goal progress bars
  - Purple-blue gradient fill
- Pattern detection insights
  - Brain icon with insights

DECORATIVE ELEMENTS:
- Subtle hexagon grid pattern in background
- Gold accent lines separating sections
- Brain/eye/network icons as section markers
```

---

## 3.4 Project Management Hero

### Prompt:
```
Create a feature hero for the three-tier project management system.

DESIGN SYSTEM REFERENCE:
- Dark theme with card-based UI
- Energy type colors for tasks
- Gold for primary actions
- Hexagonal accents

SPECIFICATIONS:
- Dimensions: 1600x900 pixels
- Style: Three-panel comparison view
- Shows: Life -> Projects -> Now progression

COMPOSITION - Three Vertical Panels:

PANEL 1 - "LIFE VIEW" (30,000 ft):
- Large hexagonal "spheres" representing life areas
- Labels: Work, Personal, Side Business, Andy (AI)
- Connecting lines showing workstreams
- Muted colors, overview feel
- Small eye icon (seeing the big picture)

PANEL 2 - "PROJECTS VIEW" (10,000 ft):
- Kanban-style columns
- Project cards with progress bars
- Status sections: Active Focus, On Deck, Growing
- Network icon (connections between projects)
- Gold highlights on active items

PANEL 3 - "NOW VIEW" (Ground Level):
- Task list with energy type badges (hexagonal)
- Today's focus items highlighted in gold
- Due dates and time estimates
- Brain icon (memory/focus)
- Clear action items

VISUAL FLOW:
- Arrow or path connecting the three views
- Zoom transition effect between panels
- Gold highlight on "current focus" path
- Hexagonal frames around each panel

BOTTOM - Energy Type Legend:
- Quick Win (green), Deep Work (purple), Creative (pink)
- Execution (orange), People (blue), Low Energy (gray)
- Small hexagonal badges for each
```

---

## 3.5 Chat Interface Hero

### Prompt:
```
Create a feature hero for the AI Chat Interface.

DESIGN SYSTEM REFERENCE:
- Dark theme (#1a1a2e background)
- Chat bubbles with subtle borders
- Gold accents for user actions
- Brain icon for Memory Lane integration

SPECIFICATIONS:
- Dimensions: 1600x900 pixels
- Style: Split-screen showing sidebar mode
- Context: Active conversation in progress

LAYOUT:

LEFT (60%) - Main Content Area:
- Dashboard or project view (slightly blurred)
- Shows context of what user is working on
- Subtle hexagon pattern overlay

RIGHT (40%) - Chat Sidebar:

TOP - Memory Lane Bar:
- Brain icon with glow
- "3 entity | 5 semantic" memory counts
- Expandable indicator (chevron)
- Cyan/purple color scheme

MIDDLE - Message Thread:
- User message bubble (gold accent border)
- AI response with:
  - Expandable "Used 2 tools" section
  - Tool icons (code, search, etc.)
  - Memory reference indicator
- Session todos checklist (checkboxes, some completed)

BOTTOM - Input Area:
- Text input field
- Microphone icon (white)
- Attachment icon (white)
- Send button (gold)
- Token counter (expandable)
- Git branch indicator

FLOATING ELEMENTS:
- Slash command autocomplete dropdown (partially visible)
- Tool call status indicator
- "Remind me" option

ATMOSPHERE:
- Active, productive conversation
- AI is helping with a real task
- Seamless integration with main content
- Professional, not cluttered
```

---

## 3.6 Vision System Hero

### Prompt:
```
Create a feature hero for the AI Vision camera analysis system.

DESIGN SYSTEM REFERENCE:
- Eye icon prominently featured
- Blue tones (matching eye in logo)
- Dark theme with bright analysis overlays
- Hexagonal detection boxes

SPECIFICATIONS:
- Dimensions: 1600x900 pixels
- Style: Camera/computer vision aesthetic
- Shows: Real-time analysis capabilities

COMPOSITION:

CENTER - Camera Feed Area:
- Large video feed frame (abstract workspace scene)
- No real people - show desk, monitors, objects
- Hexagonal overlay boxes on detected objects:
  - "Monitor - 94%"
  - "Keyboard - 98%"
  - "Coffee Mug - 87%"
- Subtle scan line animation (suggested)
- Eye icon watermark (large, faded in background)

LEFT SIDEBAR:
- Camera selection dropdown
- Auto-mode toggle with interval setting
- Frame counter: "Frame #245"
- Recording indicator (red dot option)

RIGHT SIDEBAR:
- Chat history with vision queries:
  - User: "What do you see?"
  - AI: "I can see a desk with..."
- Recent captures as thumbnails (hexagonal frames)
- Export/save buttons

VISUAL EFFECTS:
- Neural network pattern in background (subtle)
- Blue glow on active detection areas
- Hexagonal grid overlay (very subtle)
- "Processing" indicator near eye

BOTTOM:
- Analysis confidence bar
- Object count indicator
- Vision log access button

ATMOSPHERE:
- Intelligent, observant system
- Real-time processing feel
- Professional monitoring aesthetic
- NOT surveillance/creepy
```

---

## 3.7 App Store / Promotional Banner

### Prompt:
```
Create a promotional banner for app store listings and marketing.

DESIGN SYSTEM REFERENCE:
- Feature the hexagon icon prominently
- Pink-purple-blue gradient
- Gold accents for text/CTAs
- Dark background

SPECIFICATIONS:
- Dimensions: 1280x720 pixels (YouTube thumbnail / app store)
- Style: Bold, attention-grabbing, professional

COMPOSITION:

LEFT SIDE:
- Large app icon (hexagon with brain/eye/network)
- Glowing effect, prominent
- "AI Command Center" text below
- Tagline: "Your AI-Powered Executive Assistant"
- Gold gradient on "AI"

CENTER:
- 3D mockup of desktop app window
- Dashboard visible inside (simplified)
- Subtle reflection/shadow on surface
- Floating at slight angle

RIGHT SIDE:
- Feature highlights as hexagonal badges with icons:
  - Brain icon: "Memory Lane"
  - Grid icon: "Smart Dashboard"
  - Bubble icon: "AI Chat"
  - Eye icon: "Vision System"
- Gold connector lines between badges

BACKGROUND:
- Dark gradient: #1a1a2e to #252540
- Subtle hexagonal pattern
- Neural network lines (very faint)
- Pink-purple-blue gradient glow behind icon

TOP RIGHT CORNER:
- "Desktop App" badge
- Platform icons (Windows, macOS)

OVERALL:
- Premium, professional feel
- Clear value proposition
- App icon as hero element
- Consistent with established visual language
```

---

# 4. Documentation

## 4.1 README.md

### Prompt:
```
Write a comprehensive README.md for the AI Command Center project.

CONTEXT:
AI Command Center is an Electron desktop app with a React frontend that serves as a personal AI-powered executive assistant.

KEY VISUAL IDENTITY:
- App icon: Hexagon containing brain (memory), eye (vision), and network (connections)
- Color scheme: Dark navy backgrounds, pink-purple-blue gradients, gold accents
- Design philosophy: Professional, sophisticated, futuristic but approachable

FEATURES:
- Memory Lane: AI memory extraction and retrieval from Claude Code sessions
- Dashboard: Auto-generated daily briefings
- Project Management: Three-tier Life/Projects/Now system
- Chat Interface: Claude Code wrapper with memory integration
- Relationships CRM, Reminders, Meetings, Knowledge systems
- A2A RAG Training (Chain Runner)
- AI Vision (Camera analysis)

TECHNICAL STACK:
- Frontend: React + Vite
- Desktop: Electron
- Database: SQLite + sqlite-vss (vectors)
- AI: Claude API (Anthropic), Ollama (local embeddings)
- Styling: Custom CSS, dark theme

README STRUCTURE:

1. HEADER
   - Project name with logo/icon reference
   - Short tagline matching brand voice
   - Badges (build status, version, license)

2. SCREENSHOT
   - Reference to dashboard hero image
   - Caption describing what user sees

3. OVERVIEW
   - What is AI Command Center?
   - The three pillars: Memory (brain), Vision (eye), Connections (network)
   - Key value propositions

4. FEATURES (with icons)
   - Use brain emoji for Memory Lane
   - Use eye emoji for Vision
   - Use network/link emoji for Relationships
   - Gold star for highlights

5. INSTALLATION
   - Prerequisites (Node.js 18+, Ollama)
   - Clone and install steps
   - API key configuration
   - Ollama model setup (mxbai-embed-large)

6. QUICK START
   - First launch experience
   - Navigating the dashboard
   - Key workflows

7. ARCHITECTURE
   - ASCII diagram of system
   - Reference to existing hexagon structure
   - Component overview

8. CONFIGURATION
   - Environment variables
   - Theme customization
   - API settings

9. DEVELOPMENT
   - Running in dev mode
   - Building for production
   - Testing

10. CONTRIBUTING
    - Link to CONTRIBUTING.md
    - Code style notes

11. LICENSE

12. ACKNOWLEDGMENTS
    - Inspired by JFDI System
    - Built with Claude, Electron, React

STYLE:
- Professional, clear documentation voice
- Use the project's visual language in descriptions
- Include ASCII diagrams where helpful
- Reference the brain/eye/network trilogy
```

---

## 4.2 User Guide - Getting Started

### Prompt:
```
Write a "Getting Started" user guide for new AI Command Center users.

TARGET AUDIENCE:
Non-technical users who want to use the app for personal productivity

BRAND VOICE:
- Professional but friendly
- Empowering, not condescending
- Reference the "executive assistant" positioning
- Use the brain/eye/network concepts to explain features

DOCUMENT STRUCTURE:

1. WELCOME TO AI COMMAND CENTER
   - Your AI-powered executive assistant
   - The three core capabilities:
     - Brain (Memory Lane): Remembers everything
     - Eye (Vision): Sees and understands
     - Network (Connections): Manages relationships
   - What to expect in your first week

2. FIRST LAUNCH
   - Initial setup wizard
   - API key configuration (step-by-step, simple)
   - Connecting to Ollama (why it matters - local AI)
   - Choosing your theme (dark is default)

3. THE DASHBOARD - YOUR DAILY BRIEFING
   - Understanding the morning overview
   - Reading AI-generated summaries
   - Navigating between sections
   - Customizing your view

4. MEMORY LANE - YOUR AI MEMORY
   - What are "memories"? (Brain concept)
   - How they're automatically extracted
   - Browsing and searching memories
   - Giving feedback (thumbs up/down)
   - Why feedback improves your experience

5. VISION - YOUR AI EYES
   - Setting up your camera
   - Asking questions about what you see
   - Auto-mode for continuous monitoring
   - Privacy and when camera is active

6. PROJECTS - ORGANIZING YOUR WORK
   - The three views explained:
     - Life View (30,000 ft)
     - Projects View (10,000 ft)
     - Now View (ground level)
   - Creating projects and tasks
   - Energy types (matching your mood to tasks)

7. CHAT - TALKING TO YOUR ASSISTANT
   - Starting conversations
   - Using slash commands
   - The Memory Lane bar (seeing what AI remembers)
   - Uploading images

8. RELATIONSHIPS - YOUR CRM
   - Adding contacts
   - Understanding freshness (hot/warm/cold)
   - Tracking interactions

9. QUICK TIPS FOR POWER USERS
   - Keyboard shortcuts
   - Batch operations
   - Integration workflows

10. TROUBLESHOOTING
    - Common issues and solutions
    - Where to get help

FORMAT:
- Friendly, encouraging tone
- Step-by-step with numbered lists
- [Screenshot: Description] placeholders
- Tip boxes and warning callouts
- Max 2500 words
- Use brain/eye/network metaphors consistently
```

---

## 4.3 Developer Documentation - Architecture

### Prompt:
```
Write technical architecture documentation for AI Command Center developers.

TARGET AUDIENCE:
Developers who want to understand or contribute to the codebase

VISUAL IDENTITY CONTEXT:
Explain how the app's visual design (hexagon, brain/eye/network) maps to the technical architecture:
- Brain = Memory Lane system (extraction, storage, retrieval)
- Eye = Vision system (camera, analysis, Claude Vision API)
- Network = Relationships and entity resolution
- Hexagon = The unified container (Electron app)

DOCUMENT STRUCTURE:

1. SYSTEM OVERVIEW
   - High-level architecture diagram (ASCII with hexagon motif)
   - Technology stack summary
   - Data flow overview
   - The "hexagon" model: How components connect

2. ELECTRON LAYER (The Container)
   - Main process responsibilities
   - IPC communication patterns
   - Preload bridge API
   - File system access
   - API key management (OneDrive vault + fallback)

3. REACT FRONTEND (The Interface)
   - Component hierarchy
   - State management approach
   - Tab/routing system
   - Shared utilities and hooks
   - CSS organization (dark theme, color variables)

4. DATABASE LAYER (The Foundation)
   - SQLite schema overview
   - sqlite-vss vector storage
   - Migration strategy
   - Query patterns and optimization

5. MEMORY LANE SYSTEM (The Brain)
   - Session parsing (JSONL from Claude Code)
   - Memory extraction pipeline
   - Embedding generation (Ollama mxbai-embed-large)
   - Dual retrieval algorithm (entity + semantic)
   - Re-ranking and feedback loop
   - Entity resolution

6. VISION SYSTEM (The Eye)
   - Camera access and management
   - Frame capture and encoding
   - Claude Vision API integration
   - Auto-mode scheduling
   - Vision log storage

7. EXTERNAL INTEGRATIONS
   - Anthropic Claude API
   - OpenAI API (fallback/alternative)
   - Ollama local embeddings
   - HuggingFace (optional)

8. FEATURE MODULES
   - Memory Viewer / Memory Lane
   - Vision App
   - Chain Runner (A2A RAG)
   - Dashboard (auto-generation)
   - Projects/Tasks
   - Reminders
   - Relationships
   - Meetings
   - Knowledge

9. BUILD & DEPLOYMENT
   - Development setup
   - Build process (Vite + Electron)
   - Packaging for distribution
   - Release workflow

10. EXTENSION POINTS
    - Adding new IPC handlers
    - Creating new app tabs
    - Extending memory types
    - Custom slash commands
    - Adding new entity types

11. CODE CONVENTIONS
    - File naming patterns
    - Component structure
    - CSS organization (BEM-like)
    - Documentation standards

FORMAT:
- Technical, precise language
- ASCII diagrams (use hexagon shapes where possible)
- Code examples with syntax highlighting
- Cross-references to source files
- Architecture decision records for key choices
```

---

## 4.4 API Reference - Memory Lane

### Prompt:
```
Write an API reference for the Memory Lane system's internal APIs.

TARGET AUDIENCE:
Developers extending or integrating with Memory Lane (the "brain" of the system)

DOCUMENT STRUCTURE:

1. OVERVIEW
   - Memory Lane purpose (the AI's memory/brain)
   - Core concepts: memories, sessions, entities, embeddings
   - Service architecture diagram
   - How it connects to other systems

2. DATA TYPES

   Memory Interface:
   - id, session_id, type, category
   - title, content, source_chunk
   - embedding (1024-dim vector)
   - related_entities, confidence_score
   - times_observed, recall_count
   - feedback_up, feedback_down

   Session Interface:
   - id, session_path, project_path
   - user_messages, agent_messages
   - tool_calls, files_touched
   - timestamps

   Entity Interface:
   - id, type, slug, display_name
   - aliases, metadata

3. MEMORY SERVICE API

   getMemories(filters)
   saveMemory(memory)
   searchMemories(query, options)
   deleteMemory(id)
   updateMemoryFeedback(id, feedback)

4. EMBEDDING SERVICE API

   generateEmbedding(text)
   generateBatchEmbeddings(texts)
   cosineSimilarity(vecA, vecB)
   checkOllamaConnection()

5. EXTRACTION SERVICE API

   extractMemories(sessionData)
   parseSessionJSONL(filepath)
   MEMORY_EXTRACTION_PROMPT (template)

6. RETRIEVAL SERVICE API

   retrieveMemories(query, options)
   - Dual retrieval algorithm explained
   - Entity vs semantic modes
   - Re-ranking weights

   calculateFinalScore(memory, similarity, typesToBoost)
   - Scoring formula breakdown
   - Weight configuration

7. ENTITY RESOLUTION API

   resolveEntity(raw)
   getEntities(type)
   saveEntity(entity)
   mergeEntities(sourceId, targetId)

8. IPC HANDLERS
   - ml-get-sessions
   - ml-save-session
   - ml-get-memories
   - ml-save-memory
   - ml-vector-search
   - ml-save-feedback
   - ml-get-feedback-counts
   - ml-get-entities
   - ml-resolve-entity

9. CONFIGURATION OPTIONS
   - ENTITY_THRESHOLD (0.40)
   - SEMANTIC_THRESHOLD (0.50)
   - TYPE_BOOST_AMOUNT (0.15)
   - Feedback adjustment multipliers

10. USAGE EXAMPLES
    - Basic memory search
    - Extracting from new session
    - Adding custom memory types
    - Entity resolution flow

FORMAT:
- TypeScript-style type signatures
- Parameter tables with types and descriptions
- Return value documentation
- Code examples for each endpoint
- Error handling notes
```

---

## 4.5 Changelog Template

### Prompt:
```
Create a CHANGELOG.md template for AI Command Center following Keep a Changelog format.

BRANDING NOTE:
Use the brain/eye/network metaphors in section descriptions where appropriate.

STRUCTURE:

# Changelog

All notable changes to AI Command Center are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/)
Versioning follows [Semantic Versioning](https://semver.org/)

## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

---

## [1.0.0] - 2025-XX-XX

### The Brain (Memory Lane)
- Memory extraction from Claude Code sessions
- Dual retrieval system (entity + semantic)
- 1024-dimension embeddings via Ollama
- Thumbs up/down feedback learning
- Memory visualization (heatmap, river view)

### The Eye (Vision System)
- Camera capture with Claude Vision API
- Auto-mode for periodic analysis
- Frame saving and logging

### The Network (Connections)
- Relationships CRM with freshness tracking
- Entity resolution and disambiguation
- Meeting prep sheets with contact context

### The Dashboard
- Auto-generated daily briefings at 8:30 AM
- Focus recommendations
- Email and reminder summaries

### Project Management
- Three-tier view (Life/Projects/Now)
- Energy-based task filtering
- Progress tracking

### Chat Interface
- Claude Code wrapper
- Memory Lane bar integration
- Slash command autocomplete
- Token counter

### A2A RAG Training
- Chain Runner with batch prompts
- Quality validator (4 dimensions)
- JSONL/Markdown export

### Admin Panel
- System health monitoring
- Token usage tracking
- Session management

### Technical Foundation
- Electron + React + Vite
- SQLite + sqlite-vss for vectors
- Dark theme with gold accents
- Hexagonal design language

---

## [0.5.0] - 2025-12-18

### Added
- RAG Export Modal for Chain Runner
- Batch Prompt Generator with deduplication
- Quality Validator scoring system
- Config save/load functionality

### Fixed
- Camera rendering in Vision app
- useEffect dependencies in Chain Runner
- Panel width initialization

---

INCLUDE:
- Version number badges
- Release date format (YYYY-MM-DD)
- Links to GitHub releases
- Migration notes for breaking changes
```

---

## 4.6 Contributing Guidelines

### Prompt:
```
Write CONTRIBUTING.md guidelines for the AI Command Center project.

BRANDING CONTEXT:
Reference the project's visual identity and design system. Contributors should understand:
- The hexagon + brain + eye + network visual language
- Color palette (dark navy, pink-purple-blue gradients, gold accents)
- Line art icon style
- Professional, sophisticated aesthetic

STRUCTURE:

1. WELCOME
   - Thank contributors
   - Project vision (AI-powered executive assistant)
   - Link to code of conduct
   - Ways to contribute (code, docs, design, testing)

2. UNDERSTANDING THE PROJECT
   - The three pillars: Brain (Memory), Eye (Vision), Network (Connections)
   - Design language overview
   - Key architectural decisions
   - Where to find documentation

3. GETTING STARTED
   - Development environment setup
   - Forking and cloning
   - Installing dependencies
   - Running in dev mode
   - API key configuration

4. DESIGN SYSTEM GUIDELINES
   - Color palette (reference GPT-ASSET-GENERATION-PROMPTS.md)
   - Icon style (line art, 2px stroke, hexagon motifs)
   - Typography guidelines
   - Component patterns
   - Dark theme requirements

5. CODE STYLE
   - JavaScript/React conventions
   - CSS organization (BEM-like naming)
   - File naming patterns
   - Component structure template
   - No emoji in code (unless user-facing)

6. DEVELOPMENT WORKFLOW
   - Branch naming: feature/, fix/, docs/, design/
   - Commit message format (conventional commits)
   - Testing requirements
   - Documentation updates
   - Design asset requirements

7. SUBMITTING CHANGES
   - Pull request template
   - Required information
   - Screenshot/recording for UI changes
   - Review process
   - CI checks

8. REPORTING BUGS
   - Issue template
   - Required information
   - Steps to reproduce
   - Screenshots/logs

9. FEATURE REQUESTS
   - Discussion first approach
   - RFC process for major features
   - Design mockup requirements
   - Community input

10. DESIGN CONTRIBUTIONS
    - Asset generation guidelines
    - Reference to GPT prompts document
    - Icon and image specifications
    - Color consistency requirements

11. DOCUMENTATION
    - When to update docs
    - Style guide
    - README maintenance
    - API documentation

12. COMMUNITY
    - Communication channels
    - Response time expectations
    - Recognition and credits

TONE:
- Welcoming and inclusive
- Clear expectations
- Encouraging first-time contributors
- Professional but friendly
```

---

## Usage Instructions

### For Image Generation:

1. **Read the Design Continuity section first** - Understand the existing visual language
2. **Copy the prompt** from the desired section
3. **Use with GPT-4 + DALL-E 3** or similar image generation AI
4. **Add this context** to every image prompt:
   ```
   IMPORTANT CONTEXT: This asset is for AI Command Center, which has an
   established visual identity featuring:
   - Hexagonal shapes as a recurring motif
   - A brain + eye + network symbol trinity
   - Pink-purple-blue gradient for branding
   - Gold (#ffd700) for UI accents
   - Clean line art style (~2px strokes)
   - Dark navy backgrounds (#1a1a2e)

   Maintain visual consistency with this existing design system.
   ```
5. **Request variations**: "Give me 3 variations maintaining the hexagon motif"
6. **Verify consistency** using the checklist in Design Continuity section

### For Documentation:

1. **Copy the prompt** from the documentation section
2. **Use with GPT-4** or Claude
3. **Review output** for brand voice consistency
4. **Add actual screenshots** where placeholders are indicated
5. **Verify technical accuracy** against codebase

### Tips for Best Results:

- **Always reference the existing icon** - Describe its elements when relevant
- **Use exact hex color codes** - Ensures brand consistency
- **Request both gradient and gold versions** - For different contexts
- **Specify hexagon shapes** - Maintains visual language
- **Ask for multiple sizes** - Icons need to work at 16px through 512px
- **Iterate** - Generate variations and combine best elements

---

*Document created: 2025-12-29*
*Updated: 2025-12-29 - Added Design Continuity section, updated all prompts*
*For: AI Command Center / JFDI System*
*Based on: Existing icon analysis and MEMORY-LANE-REINVENTION-PLAN.md*
