# Shared Components Library

**AI Command Center - Core UI Components**

This directory contains reusable UI components used throughout the AI Command Center application. All components follow the design system defined in `specs/DESIGN-SYSTEM.md` and use CSS variables from `src/styles/variables.css`.

## Quick Start

```jsx
import { Card, Modal, Button, Input, Badge } from '@/components/shared';

function MyComponent() {
  return (
    <Card title="Example">
      <Input label="Name" placeholder="Enter name..." />
      <Button variant="primary">Save</Button>
      <Badge variant="success">Active</Badge>
    </Card>
  );
}
```

---

## Components

### Card

Dark navy card with subtle border, hover effects, and variants.

**Props:**
- `title` (string) - Card title
- `subtitle` (string) - Card subtitle
- `children` (node) - Card content
- `actions` (node) - Footer action buttons
- `header` (node) - Custom header content
- `footer` (node) - Custom footer content
- `onClick` (func) - Click handler (makes card clickable)
- `variant` ('default' | 'elevated' | 'outlined') - Visual style
- `padding` ('none' | 'sm' | 'md' | 'lg') - Internal padding
- `hoverable` (bool) - Enable hover effect
- `className` (string) - Additional CSS classes

**Examples:**

```jsx
// Basic card
<Card title="Task" subtitle="Due today">
  <p>Task description here</p>
</Card>

// Card with actions
<Card
  title="Settings"
  actions={
    <>
      <Button variant="ghost" size="sm">Cancel</Button>
      <Button variant="primary" size="sm">Save</Button>
    </>
  }
>
  <Input label="API Key" />
</Card>

// Clickable card
<Card
  hoverable
  onClick={() => navigate('/details')}
  title="Project Alpha"
>
  <p>Click to view details</p>
</Card>

// Elevated card (stronger shadow)
<Card variant="elevated" title="Important">
  <p>High priority content</p>
</Card>
```

---

### Modal

Centered overlay modal with dark backdrop, blur effect, and focus trap.

**Props:**
- `isOpen` (bool) **required** - Whether modal is visible
- `onClose` (func) **required** - Close callback
- `title` (string) - Modal title
- `children` (node) - Modal content
- `footer` (node) - Footer content (usually buttons)
- `size` ('small' | 'medium' | 'large' | 'fullscreen') - Modal size
- `showCloseButton` (bool) - Show X button (default: true)
- `closeOnBackdrop` (bool) - Close on backdrop click (default: true)
- `closeOnEsc` (bool) - Close on ESC key (default: true)
- `className` (string) - Additional CSS classes

**Features:**
- Auto focus management
- Focus trap (Tab navigation stays within modal)
- ESC key support
- Prevents background scrolling
- Smooth animations

**Examples:**

```jsx
const [isOpen, setIsOpen] = useState(false);

// Basic modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure you want to continue?</p>
</Modal>

// Modal with footer
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit Task"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave}>
        Save
      </Button>
    </>
  }
>
  <Input label="Task Name" />
  <Input label="Description" />
</Modal>

// Large modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Settings"
  size="large"
>
  <div>Lots of content here...</div>
</Modal>
```

---

### Button

Versatile button with variants, sizes, loading states, and icon support.

**Props:**
- `children` (node) - Button text
- `variant` ('primary' | 'secondary' | 'ghost' | 'danger') - Visual style
- `size` ('sm' | 'md' | 'lg') - Button size
- `loading` (bool) - Show loading spinner
- `disabled` (bool) - Disable button
- `icon` (node) - Left icon (from lucide-react)
- `iconRight` (node) - Right icon
- `onClick` (func) - Click handler
- `type` ('button' | 'submit' | 'reset') - Button type
- `fullWidth` (bool) - Full width button
- `className` (string) - Additional CSS classes

**Variants:**
- **Primary** - Gold background (CTA buttons)
- **Secondary** - Outlined (less emphasis)
- **Ghost** - Minimal (tertiary actions)
- **Danger** - Red (destructive actions)

**Examples:**

```jsx
import { Save, Search, Trash2 } from 'lucide-react';

// Primary button (gold)
<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>

// Secondary button (outlined)
<Button variant="secondary">Cancel</Button>

// Ghost button (minimal)
<Button variant="ghost">Learn More</Button>

// Danger button (red)
<Button variant="danger" icon={<Trash2 />}>
  Delete
</Button>

// With icon
<Button variant="primary" icon={<Save />}>
  Save
</Button>

// Icon on right
<Button variant="secondary" iconRight={<Search />}>
  Search
</Button>

// Loading state
<Button variant="primary" loading>
  Processing...
</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Full width
<Button variant="primary" fullWidth>
  Submit Form
</Button>

// Icon-only button
<Button variant="ghost" icon={<Search />} />
```

---

### Input

Dark-themed text input with label, error messages, and icon support.

**Props:**
- `type` ('text' | 'number' | 'email' | 'password' | 'url' | 'search') - Input type
- `value` (string | number) - Input value
- `onChange` (func) - Change handler
- `label` (string) - Label text
- `placeholder` (string) - Placeholder text
- `error` (string) - Error message (shows red border + message)
- `hint` (string) - Hint text (shown below input)
- `icon` (node) - Left icon
- `iconRight` (node) - Right icon
- `disabled` (bool) - Disable input
- `required` (bool) - Mark as required (shows asterisk)
- `fullWidth` (bool) - Full width input
- `className` (string) - Additional CSS classes
- `id` (string) - Input ID (auto-generated if omitted)
- `name` (string) - Input name

**Features:**
- Auto-generated IDs for accessibility
- Focus shows gold border
- Error state with validation message
- Icon support (prefix/suffix)
- Required field indicator

**Examples:**

```jsx
import { Mail, Search, Lock } from 'lucide-react';

// Basic input
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With icon
<Input
  label="Email Address"
  type="email"
  icon={<Mail />}
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// Password with icon
<Input
  label="Password"
  type="password"
  icon={<Lock />}
  required
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

// With error
<Input
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  error="Username is already taken"
/>

// With hint
<Input
  label="API Key"
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
  hint="You can find this in your account settings"
/>

// Search input
<Input
  type="search"
  icon={<Search />}
  placeholder="Search..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>

// Full width
<Input
  label="Description"
  placeholder="Enter description..."
  fullWidth
/>

// Disabled
<Input
  label="User ID"
  value="12345"
  disabled
/>
```

---

### Badge

Small pill-shaped badges with extensive color variants for status, memory types, energy types, and more.

**Props:**
- `children` (node) - Badge content
- `variant` (string) - Color variant (see variants below)
- `size` ('sm' | 'md') - Badge size
- `icon` (node) - Optional icon
- `hexagon` (bool) - Use hexagonal shape (for memory types)
- `className` (string) - Additional CSS classes

**Variants:**

**Status:**
- `success` - Green (success states)
- `warning` - Orange (warning states)
- `error` - Red (error states)
- `info` - Blue (info states)

**Memory Types:**
- `memory-correction` - Red
- `memory-decision` - Amber
- `memory-commitment` - Violet
- `memory-insight` - Cyan
- `memory-learning` - Green
- `memory-confidence` - Blue
- `memory-pattern` - Purple
- `memory-cross-agent` - Pink
- `memory-workflow` - Slate
- `memory-gap` - Dark red

**Energy Types:**
- `energy-low` - Gray
- `energy-quick-win` - Green
- `energy-deep-work` - Purple
- `energy-creative` - Pink
- `energy-execution` - Orange
- `energy-people` - Blue

**Freshness Indicators:**
- `freshness-hot` - Red (0-7 days)
- `freshness-warm` - Orange (8-30 days)
- `freshness-cool` - Blue (31-90 days)
- `freshness-cold` - Gray (90+ days)

**Module Accents:**
- `module-dashboard` - Gold
- `module-projects` - Purple
- `module-reminders` - Green
- `module-relationships` - Pink
- `module-meetings` - Blue
- `module-knowledge` - Cyan
- `module-chat` - Gold
- `module-memory-lane` - Rose
- `module-vision` - Purple
- `module-chain-runner` - Blue
- `module-admin` - Slate

**Examples:**

```jsx
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';

// Status badges
<Badge variant="success" icon={<CheckCircle size={12} />}>
  Success
</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>

// Memory type badges
<Badge variant="memory-correction">Correction</Badge>
<Badge variant="memory-decision">Decision</Badge>
<Badge variant="memory-insight">Insight</Badge>

// Hexagon variant (for memory types)
<Badge variant="memory-correction" hexagon>
  Correction
</Badge>

// Energy type badges
<Badge variant="energy-quick-win" icon={<Zap size={12} />}>
  Quick Win
</Badge>
<Badge variant="energy-deep-work">Deep Work</Badge>
<Badge variant="energy-creative">Creative</Badge>

// Freshness indicators
<Badge variant="freshness-hot">Hot</Badge>
<Badge variant="freshness-warm">Warm</Badge>
<Badge variant="freshness-cool">Cool</Badge>
<Badge variant="freshness-cold">Cold</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
```

---

## Design System Compliance

All components strictly follow the design system:

### Colors
- **Backgrounds**: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-elevated`
- **Accent**: `--accent-gold` (primary CTAs and highlights)
- **Text**: `--text-primary`, `--text-secondary`, `--text-muted`
- **Status**: `--status-success`, `--status-warning`, `--status-error`, `--status-info`

### Icons
- Use `lucide-react` for icons (2px stroke weight, line art style)
- Import: `import { IconName } from 'lucide-react'`
- Examples: Save, Search, Mail, Lock, AlertCircle, CheckCircle, X, Loader2

### Spacing
- Base unit: 4px
- Use CSS variables: `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl`

### Typography
- Font family: `--font-family` (Inter, Outfit)
- Sizes: `--font-size-xs` through `--font-size-3xl`
- Weights: `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`

---

## Accessibility

All components are built with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Space, ESC)
- **Focus Management**: Visible focus indicators with gold outline
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Semantic HTML**: Correct HTML elements (button, input, label, etc.)
- **Focus Trap**: Modal traps focus within dialog
- **Error Messages**: Linked to inputs via aria-describedby

---

## Component Showcase

To see all components in action, import and render the `ComponentShowcase` component:

```jsx
import ComponentShowcase from '@/components/shared/ComponentShowcase';

function App() {
  return <ComponentShowcase />;
}
```

This provides a live preview of all components with various configurations.

---

## Best Practices

### DO:
- ✅ Use CSS variables for all colors
- ✅ Import icons from `lucide-react`
- ✅ Use semantic HTML elements
- ✅ Provide accessible labels and ARIA attributes
- ✅ Test keyboard navigation
- ✅ Use the correct variant for the context (primary for CTAs, ghost for tertiary)

### DON'T:
- ❌ Hardcode colors or sizes
- ❌ Use inline styles (unless absolutely necessary)
- ❌ Skip labels on form inputs
- ❌ Ignore focus states
- ❌ Use buttons for navigation (use links instead)
- ❌ Forget to handle loading/error states

---

## Contributing

When adding new shared components:

1. Follow the existing component structure (JSX + CSS files)
2. Use CSS variables exclusively (no hardcoded colors)
3. Document props with PropTypes
4. Add examples to ComponentShowcase
5. Ensure accessibility (keyboard nav, ARIA, focus management)
6. Update this README with usage examples
7. Test on mobile (responsive design)

---

## Files

```
src/components/shared/
├── Card.jsx              # Card component
├── Card.css              # Card styles
├── Modal.jsx             # Modal dialog component
├── Modal.css             # Modal styles
├── Button.jsx            # Button component
├── Button.css            # Button styles
├── Input.jsx             # Input field component
├── Input.css             # Input styles
├── Badge.jsx             # Badge component
├── Badge.css             # Badge styles
├── ComponentShowcase.jsx # Live component demo
├── ComponentShowcase.css # Showcase styles
├── index.js              # Central export
└── README.md             # This file
```

---

**Last Updated**: 2025-12-29
**Design System**: specs/DESIGN-SYSTEM.md
**CSS Variables**: src/styles/variables.css
