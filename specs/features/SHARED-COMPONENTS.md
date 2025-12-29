# Shared Components

**Status**: Not Started
**Priority**: P1 (High)
**Estimated Effort**: 4 days
**Dependencies**:
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (MUST be implemented first)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](../components/00-CSS-VARIABLES.md)

---

## Design Consistency Notes

**CRITICAL**: Shared components are the foundation of visual consistency. They MUST use CSS variables from `00-CSS-VARIABLES.md` exclusively. No hardcoded colors.

### Core Design Principles

| Principle | Implementation |
|-----------|----------------|
| Dark Background | All components use `--bg-primary` (#1a1a2e) or darker |
| Gold Accents | CTAs and highlights use `--accent-gold` (#ffd700) |
| Line Art Icons | 2px stroke weight, no fills, rounded caps |
| Hexagon Motifs | Used for badges and accent shapes |
| Professional Tone | Clean, sophisticated, never playful |

### Component-Specific Guidelines

**Sidebar**
- Background: `--bg-secondary` (#252540)
- Active item: Gold left border + `--bg-elevated`
- Icons: 24px, line art, `--text-secondary` default, `--accent-gold` active
- Width: 64px collapsed, 240px expanded

**Cards**
- Background: `--bg-card` (#2d2d4a)
- Border: 1px `--border-color` (#2a2a4a)
- Hover: Border changes to `--accent-gold`
- Border radius: 8px

**Modals**
- Backdrop: rgba(0, 0, 0, 0.7)
- Modal background: `--bg-secondary`
- Border radius: 12px
- Shadow: `--shadow-lg`

**Buttons**
- Primary: `--accent-gold` background, black text
- Secondary: Transparent background, `--border-color` border
- Ghost: No background, no border, gold text on hover

**Inputs**
- Background: `--bg-input` (#12121c)
- Border: 1px `--border-color`
- Focus: Border changes to `--accent-gold`

### Design Checklist for Shared Components
- [ ] All colors use CSS variables (no hex codes in component CSS)
- [ ] Sidebar follows navigation pattern from DESIGN-SYSTEM.md
- [ ] Cards have consistent border radius and hover effects
- [ ] Modals properly trap focus and handle accessibility
- [ ] Buttons follow variant system (primary, secondary, ghost)
- [ ] Toast notifications use correct status colors
- [ ] Loading states are non-jarring

---

## Overview

The Shared Components library provides reusable UI components used across all AI Command Center modules. This includes the navigation sidebar, cards, modals, markdown editor, loading states, and toast notifications. A consistent design system ensures a cohesive user experience.

## Acceptance Criteria

- [ ] Sidebar navigation with all 11 modules
- [ ] Collapsible sidebar (icon-only mode)
- [ ] Card component with consistent styling
- [ ] Modal component with backdrop, close button, and animations
- [ ] Markdown editor with preview toggle
- [ ] Loading spinner and skeleton states
- [ ] Toast notifications for feedback
- [ ] Dark theme with yellow/gold accents
- [ ] Responsive design for all components

## Tasks

### Section 1: Sidebar Navigation
- [ ] Create `src/components/shared/Sidebar.jsx`
  - [ ] Vertical navigation with icons and labels
  - [ ] Section dividers for grouping
  - [ ] Active state styling
  - [ ] Collapse to icon-only mode
- [ ] Create `src/components/shared/Sidebar.css`
- [ ] Navigation structure:
  ```
  MAIN
  - Dashboard
  - Projects
  - Reminders
  - Relationships
  - Meetings
  - Knowledge

  AI
  - Chat
  - Memory Lane

  TOOLS
  - Vision
  - Chain Runner

  SYSTEM
  - Admin
  ```
- [ ] Implement keyboard navigation

### Section 2: Card Component
- [ ] Create `src/components/shared/Card.jsx`
  ```jsx
  function Card({
    title,
    subtitle,
    children,
    actions,
    onClick,
    className,
    variant = 'default' // default, elevated, outlined
  }) {
    return (
      <div className={`card card-${variant} ${className}`} onClick={onClick}>
        {(title || subtitle) && (
          <div className="card-header">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="card-content">{children}</div>
        {actions && <div className="card-actions">{actions}</div>}
      </div>
    );
  }
  ```
- [ ] Create `src/components/shared/Card.css`
- [ ] Variants: default, elevated (shadow), outlined (border)

### Section 3: Modal Component
- [ ] Create `src/components/shared/Modal.jsx`
  ```jsx
  function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'medium' // small, medium, large, fullscreen
  }) {
    if (!isOpen) return null;

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className={`modal modal-${size}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" onClick={onClose}>x</button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    );
  }
  ```
- [ ] Create `src/components/shared/Modal.css`
- [ ] Add open/close animations
- [ ] Support ESC key to close
- [ ] Focus trap within modal

### Section 4: Markdown Editor
- [ ] Create `src/components/shared/MarkdownEditor.jsx`
  - [ ] Textarea for editing
  - [ ] Preview pane (rendered markdown)
  - [ ] Toggle between edit/preview/split modes
  - [ ] Toolbar with common formatting buttons
- [ ] Create `src/components/shared/MarkdownEditor.css`
- [ ] Use `marked` for rendering
- [ ] Use `DOMPurify` for sanitization

### Section 5: Loading States
- [ ] Create `src/components/shared/LoadingSpinner.jsx`
  - [ ] Spinning animation
  - [ ] Size variants: small, medium, large
  - [ ] Optional text label
- [ ] Create `src/components/shared/Skeleton.jsx`
  - [ ] Placeholder shapes: text, circle, rectangle
  - [ ] Shimmer animation
  - [ ] Compose for complex loading states
- [ ] Create loading state CSS

### Section 6: Toast Notifications
- [ ] Create `src/components/shared/Toast.jsx`
  - [ ] Types: success, error, warning, info
  - [ ] Auto-dismiss after timeout
  - [ ] Manual dismiss button
  - [ ] Stack multiple toasts
- [ ] Create `src/components/shared/ToastProvider.jsx`
  - [ ] Context for toast management
  - [ ] `useToast()` hook for components
- [ ] Positioning: bottom-right

### Section 7: Form Components
- [ ] Create `src/components/shared/Input.jsx`
  - [ ] Text, number, email variants
  - [ ] Label and error message support
  - [ ] Icon prefix/suffix
- [ ] Create `src/components/shared/Select.jsx`
  - [ ] Dropdown with options
  - [ ] Search/filter for long lists
  - [ ] Multi-select variant
- [ ] Create `src/components/shared/Button.jsx`
  - [ ] Variants: primary, secondary, ghost, danger
  - [ ] Sizes: small, medium, large
  - [ ] Loading state

### Section 8: Theme System
- [ ] Create `src/styles/theme.css`
  ```css
  :root {
    /* Background */
    --bg-primary: #0d0d14;
    --bg-secondary: #151520;
    --bg-tertiary: #1a1a28;
    --bg-card: #12121c;

    /* Accent */
    --accent-primary: #fbbf24;
    --accent-hover: #f59e0b;
    --accent-muted: #d97706;

    /* Text */
    --text-primary: #e8e8e8;
    --text-secondary: #a0a0a0;
    --text-muted: #666666;

    /* Semantic */
    --success: #22c55e;
    --warning: #f59e0b;
    --error: #ef4444;
    --info: #3b82f6;

    /* Memory Types */
    --memory-decision: #3b82f6;
    --memory-correction: #ef4444;
    --memory-learning: #22c55e;
    --memory-insight: #8b5cf6;

    /* Energy Types */
    --energy-low: #6b7280;
    --energy-deep: #8b5cf6;
    --energy-creative: #ec4899;
    --energy-quick: #22c55e;

    /* Module Accents */
    --accent-dashboard: #fbbf24;
    --accent-projects: #8b5cf6;
    --accent-reminders: #22c55e;
    --accent-relations: #ec4899;
    --accent-meetings: #3b82f6;
    --accent-knowledge: #06b6d4;
    --accent-chat: #fbbf24;
    --accent-admin: #64748b;
    --accent-memory: #f43f5e;
    --accent-vision: #8b5cf6;
    --accent-chain: #3b82f6;

    /* Borders & Shadows */
    --border-color: #2a2a4a;
    --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  ```

### Section 9: Utility Components
- [ ] Create `src/components/shared/Badge.jsx`
  - [ ] Colored label badges
  - [ ] Icon support
- [ ] Create `src/components/shared/Avatar.jsx`
  - [ ] Image or initials
  - [ ] Size variants
  - [ ] Online status indicator
- [ ] Create `src/components/shared/Tooltip.jsx`
  - [ ] Hover trigger
  - [ ] Positioning (top, right, bottom, left)

### Section 10: Keyboard Shortcuts Hook
- [ ] Create `src/hooks/useKeyboardShortcuts.js`
  ```javascript
  export function useKeyboardShortcuts(shortcuts) {
    useEffect(() => {
      function handler(e) {
        for (const [combo, callback] of Object.entries(shortcuts)) {
          if (matchesCombo(e, combo)) {
            e.preventDefault();
            callback();
          }
        }
      }

      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [shortcuts]);
  }
  ```
- [ ] Support: Cmd/Ctrl+key, Shift+key combinations

## Technical Details

### Files to Create
- `src/components/shared/Sidebar.jsx`
- `src/components/shared/Sidebar.css`
- `src/components/shared/Card.jsx`
- `src/components/shared/Card.css`
- `src/components/shared/Modal.jsx`
- `src/components/shared/Modal.css`
- `src/components/shared/MarkdownEditor.jsx`
- `src/components/shared/MarkdownEditor.css`
- `src/components/shared/LoadingSpinner.jsx`
- `src/components/shared/Skeleton.jsx`
- `src/components/shared/Toast.jsx`
- `src/components/shared/ToastProvider.jsx`
- `src/components/shared/Input.jsx`
- `src/components/shared/Select.jsx`
- `src/components/shared/Button.jsx`
- `src/components/shared/Badge.jsx`
- `src/components/shared/Avatar.jsx`
- `src/components/shared/Tooltip.jsx`
- `src/styles/theme.css`
- `src/hooks/useKeyboardShortcuts.js`

### Files to Modify
- `src/App.jsx` - Import theme, use Sidebar layout
- `src/main.jsx` - Wrap with ToastProvider

### Dependencies
```json
{
  "dependencies": {
    "marked": "^11.0.0",
    "dompurify": "^3.0.6"
  }
}
```

### CSS Variables Usage
```css
.my-component {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.my-component:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-primary);
}
```

## Component API Examples

### Card
```jsx
<Card title="Task" subtitle="Due today" variant="elevated">
  <p>Task content here</p>
</Card>
```

### Modal
```jsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Edit Task"
  footer={<Button onClick={handleSave}>Save</Button>}
>
  <Input label="Task Name" value={name} onChange={setName} />
</Modal>
```

### Toast
```jsx
const { addToast } = useToast();
addToast({ type: 'success', message: 'Saved successfully' });
```

## Implementation Hints

- Use CSS custom properties for themability
- Modal should portal to document.body
- Toast stack should have max visible count (3-5)
- Sidebar width: 64px collapsed, 240px expanded
- Use CSS transitions for smooth animations
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Sidebar navigates between modules
- [ ] Sidebar collapses to icon-only mode
- [ ] Card renders with all variants
- [ ] Modal opens/closes with animations
- [ ] Modal traps focus and handles ESC
- [ ] Markdown editor renders preview
- [ ] Loading states display correctly
- [ ] Toast notifications appear and dismiss
- [ ] Theme variables apply consistently
- [ ] Keyboard shortcuts trigger callbacks

---
**Notes**: These components form the visual foundation of AI Command Center. Invest time in getting them right - they'll be used everywhere. The dark theme with gold accents should feel professional and modern.
