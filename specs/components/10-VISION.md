# Vision System (Existing)

**Status**: Partial (Existing Implementation)
**Priority**: P3 (Low - Integration Only)
**Estimated Effort**: 2 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - For saving captures to Knowledge
- `specs/components/06-KNOWLEDGE.md` - Knowledge integration
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Purple `--module-vision` (#8b5cf6)
- **Visual Symbol**: Eye icon (part of brain/eye/network trinity)
- **Visual Theme**: Camera feed, analysis results, capture gallery

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-vision` | #8b5cf6 |
| Camera frame | `--border-color` | #2a2a4a |
| Analysis text | `--text-primary` | #ffffff |
| Capture button | `--accent-gold` | #ffd700 |
| Auto-mode active | `--status-success` | #22c55e |

### Icon Style
- Line art, 2px stroke weight
- Vision icons: eye, camera, scan, image
- Action icons: capture, save, refresh

### Layout Pattern
```
+--------------------------------------------------+
| VISION                                            |
+--------------------------------------------------+
| +----------------------+  +---------------------+ |
| |                      |  | ANALYSIS            | |
| |   CAMERA FEED        |  | Detected: Office    | |
| |   [Live Preview]     |  | Objects: desk, ...  | |
| |                      |  |                     | |
| +----------------------+  +---------------------+ |
|                                                   |
| [Capture] [Auto-Mode: OFF] [Save to Knowledge]   |
+--------------------------------------------------+
```

### Visual Effects
- **Camera Feed**: Subtle purple border glow when active
- **Scan Lines**: Optional animated effect during analysis
- **Detection Boxes**: Hexagonal or rounded, purple stroke

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Eye icon used for module branding
- [ ] Purple accent for active states
- [ ] Camera frame has consistent border
- [ ] Analysis results are readable
- [ ] Gold accent for primary CTA

---

## Overview

The Vision system is an existing, functional module in AI Command Center. It provides webcam capture with Claude Vision API analysis. This spec covers only the integration points needed to connect Vision with the new modules (Knowledge, Dashboard, Memory Lane) - the core functionality is already complete.

## Current Implementation (Existing)

### Existing Features
- Webcam capture with camera selection
- Real-time video preview
- Claude Vision API integration (claude-sonnet-4-20250514)
- Auto-mode for periodic analysis
- Frame saving to `%APPDATA%\ai-command-center\latest-frame.txt`
- Vision conversation log (`vision-log.json`)

### Existing Files
- `src/components/vision/VisionApp.jsx` - Main vision component
- `src/components/vision/VisionApp.css` - Vision styling

## Integration Acceptance Criteria

- [ ] "Save to Knowledge" button captures current frame and analysis to Knowledge base
- [ ] Dashboard Vision widget shows latest capture thumbnail
- [ ] Memory Lane can extract memories from vision conversations
- [ ] Chain Runner can use vision captures as training data inputs

## Tasks

### Section 1: Knowledge Integration
- [ ] Add "Save to Knowledge" button to VisionApp
  - [ ] Capture current frame as base64
  - [ ] Include latest analysis text
  - [ ] Open modal to select folder and add title
- [ ] Create `saveVisionCapture(frame, analysis)` function
  - [ ] Create knowledge article with image
  - [ ] Auto-suggest tags from analysis
  - [ ] Store in selected folder
- [ ] Handle image storage
  - [ ] Store base64 in article content or separate file
  - [ ] Create thumbnail for preview

### Section 2: Dashboard Widget
- [ ] Create `VisionWidget.jsx` in dashboard/widgets/
  - [ ] Show latest frame thumbnail
  - [ ] Display last analysis summary (truncated)
  - [ ] "Open Vision" link
  - [ ] Last captured timestamp
- [ ] Pull data from vision-log.json or new table
- [ ] Handle case when no captures exist

### Section 3: Memory Lane Integration
- [ ] Enable memory extraction from vision conversations
  - [ ] Parse vision-log.json for memorable moments
  - [ ] Extract corrections ("that's not a cat, it's a dog")
  - [ ] Extract insights from analyses
- [ ] Add vision as source_type in memories
- [ ] Include frame reference in memory source_chunk

### Section 4: Chain Runner Integration
- [ ] Add "Use Vision Capture" option in Chain Runner
  - [ ] Select from recent captures
  - [ ] Include as context for agents
- [ ] Enable vision-based training data generation
  - [ ] "Describe this image" -> Q&A pairs

## Technical Details

### Files to Create
- `src/components/dashboard/widgets/VisionWidget.jsx` - Dashboard widget

### Files to Modify
- `src/components/vision/VisionApp.jsx` - Add Save to Knowledge button
- `src/services/KnowledgeService.js` - Add vision capture handler
- `src/services/MemoryCatcher.js` - Handle vision conversations
- `src/components/chain-runner/ChainRunner.jsx` - Vision input option

### IPC Channels (New)
- `vision:save-to-knowledge` - Save capture to knowledge base
- `vision:get-latest` - Get latest capture for widget
- `vision:get-captures` - List recent captures

## Implementation Hints

- Store images as base64 or save to filesystem with path reference
- Vision widget should be lightweight (thumbnail only)
- Consider WebP format for smaller storage
- Rate limit vision captures to avoid overwhelming knowledge base
- Agent to use: `vision-tester` for debugging, `electron-react-dev` for integration

## Testing Checklist

- [ ] Save to Knowledge creates valid article
- [ ] Dashboard widget displays latest capture
- [ ] Memory extraction finds moments from vision log
- [ ] Chain Runner can access vision captures
- [ ] Image storage handles large files gracefully
- [ ] Widget handles no-captures state

---
**Notes**: Vision is already functional - this spec focuses purely on integration with new modules. The core camera/API functionality should not be modified unless bugs are found. The integration should feel seamless - captures flow naturally into the knowledge base.
