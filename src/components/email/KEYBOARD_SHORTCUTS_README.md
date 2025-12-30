# Email Keyboard Shortcuts

## Overview

Comprehensive keyboard shortcuts for the Email module, providing Gmail-style navigation and actions.

## Files Created

1. **useEmailKeyboardShortcuts.js** - Custom React hook handling all keyboard shortcuts
2. **KeyboardShortcutsHelp.jsx** - Modal component displaying shortcuts reference
3. **KeyboardShortcutsHelp.css** - Styles for help modal and toast notifications
4. **KEYBOARD_SHORTCUTS_INTEGRATION.md** - Step-by-step integration guide for Email.jsx

## Features

### Smart Shortcut Handling
- **Context-aware**: Shortcuts disabled when typing in input/textarea/contenteditable
- **Modal-aware**: Shortcuts disabled when modals are open
- **Key sequences**: Supports Gmail-style sequences like G+I for refresh
- **Visual feedback**: Toast notifications for all actions

### Keyboard Shortcuts

#### Navigation
| Shortcut | Action |
|----------|--------|
| `J` | Select next email in list |
| `K` | Select previous email in list |
| `/` | Focus search input |
| `G` then `I` | Refresh inbox (Gmail-style sequence) |

#### Actions
| Shortcut | Action |
|----------|--------|
| `C` | Compose new email |
| `R` | Reply to selected email |
| `Shift+R` | Reply all |
| `F` | Forward selected email |
| `E` | Archive selected email |
| `#` or `Delete` | Move to trash |
| `Shift+I` | Mark as read |
| `Shift+U` | Mark as unread |
| `S` | Toggle star |

#### Selection
| Shortcut | Action |
|----------|--------|
| `X` | Toggle email selection checkbox |
| `Ctrl+A` | Select all visible emails |
| `Esc` | Clear selection / Close modals |

#### Help
| Shortcut | Action |
|----------|--------|
| `?` | Show keyboard shortcuts help modal |

## Integration Steps

See **KEYBOARD_SHORTCUTS_INTEGRATION.md** for complete step-by-step integration guide.

### Quick Summary

1. Add imports: `useRef`, `Keyboard` icon, hook, help modal, CSS
2. Add state: `showKeyboardHelp`, `searchInputRef`
3. Initialize hook with all handlers
4. Add `ref={searchInputRef}` to search Input
5. Add keyboard shortcuts button to toolbar
6. Add `<KeyboardShortcutsHelp>` modal at end

## Architecture

### useEmailKeyboardShortcuts Hook

**Purpose**: Centralized keyboard event handling with smart filtering

**Features**:
- Single event listener for all shortcuts
- Debounced key sequence detection (1 second timeout)
- Automatic toast notifications
- Returns shortcuts array for help modal

**Handler Requirements**:
All handlers passed to the hook should be:
- Memoized or stable references (to prevent re-renders)
- Async-safe (hook handles promises)
- Null-safe (hook checks if handler exists)

### KeyboardShortcutsHelp Component

**Purpose**: User-friendly shortcuts reference modal

**Features**:
- Shortcuts grouped by category (Navigation, Actions, Selection, Help)
- Keyboard key styling (`<kbd>` elements)
- Handles key combinations (Shift+R) and sequences (G then I)
- Responsive grid layout

### Toast Notifications

**Purpose**: Visual feedback for keyboard actions

**Features**:
- Auto-positioned at bottom center
- 2-second display duration
- Smooth fade in/out animations
- Stacks multiple toasts vertically
- Non-blocking (pointer-events: auto)

## Implementation Notes

### Why useRef for Search Input?

The `/` shortcut needs to programmatically focus the search input. Using `useRef` provides:
- Direct DOM access for `.focus()`
- No re-renders when ref changes
- Type-safe way to access input element

### Why Custom Event for Help?

The `?` shortcut triggers a custom event (`email:show-shortcuts-help`) instead of calling state setter directly because:
- Hook doesn't have direct access to `setShowKeyboardHelp`
- Decouples shortcut logic from component state
- Allows other components to trigger help modal if needed

### Preventing Default Behavior

Most shortcuts call `e.preventDefault()` to:
- Stop browser default actions (Ctrl+A selects all text, not emails)
- Prevent form submissions
- Block scroll behavior (J/K shouldn't scroll page)

### Modifier Key Detection

```javascript
const isShift = e.shiftKey;
const isCtrl = e.ctrlKey || e.metaKey;  // Cross-platform (Cmd on Mac)
```

### Input Type Detection

```javascript
const isTyping =
  target.tagName === 'INPUT' ||
  target.tagName === 'TEXTAREA' ||
  target.isContentEditable;
```

Prevents shortcuts when user is actively typing (except `/` for search focus).

## Customization

### Adding New Shortcuts

1. Add case to switch statement in hook
2. Call appropriate handler
3. Add to shortcuts array for help modal
4. Update this README

Example:
```javascript
case 'a':
  if (!isCtrl && isShift) {
    e.preventDefault();
    if (onArchiveAll) {
      onArchiveAll();
      showToast('Archived all');
    }
  }
  break;
```

### Changing Keyboard Bindings

Edit the switch statement in `useEmailKeyboardShortcuts.js`:
```javascript
// Change from 'C' to 'N' for compose
case 'n':
case 'N':
  if (!isCtrl && !isShift) {
    e.preventDefault();
    if (onCompose) onCompose();
    showToast('Composing new email');
  }
  break;
```

Remember to update shortcuts array and help modal!

### Disabling Specific Shortcuts

Wrap handler check in condition:
```javascript
case 'c':
  if (!isCtrl && !isShift && enableComposeShortcut) {  // Add flag
    e.preventDefault();
    if (onCompose) onCompose();
    showToast('Composing new email');
  }
  break;
```

### Custom Toast Styling

Edit `.email-toast` in `KeyboardShortcutsHelp.css`:
```css
.email-toast {
  background: var(--accent);  /* Change color */
  color: white;
  padding: 16px 24px;  /* Bigger padding */
  border-radius: 12px;  /* Rounder corners */
  /* ... */
}
```

## Testing

### Manual Testing Checklist

- [ ] Press `?` to open help modal
- [ ] Press `C` to compose (modal should open)
- [ ] Press `R` on selected email (reply modal)
- [ ] Press `Shift+R` on selected email (reply all modal)
- [ ] Press `F` on selected email (forward modal)
- [ ] Press `J` to navigate down email list
- [ ] Press `K` to navigate up email list
- [ ] Press `/` to focus search input
- [ ] Type in search, verify shortcuts disabled
- [ ] Press `S` to star/unstar email
- [ ] Press `Shift+I` to mark as read
- [ ] Press `Shift+U` to mark as unread
- [ ] Press `#` to trash email
- [ ] Press `X` to toggle selection
- [ ] Press `Ctrl+A` to select all
- [ ] Press `Esc` to clear selection
- [ ] Press `G` then `I` within 1 second (inbox refresh)
- [ ] Press `G` then wait 2 seconds (sequence should reset)
- [ ] Open modal, verify shortcuts disabled
- [ ] Verify toast notifications appear for all actions

### Edge Cases

1. **No email selected**: Shortcuts requiring selection should be no-ops
2. **Empty inbox**: J/K navigation should not error
3. **Modal open**: No shortcuts should fire
4. **Input focused**: Only `/` should work
5. **Rapid key presses**: Should not queue actions
6. **Sequence timeout**: G without I in 1 second should reset

## Accessibility

- Help modal uses semantic HTML (`<kbd>` for keys)
- Toast notifications use `role="status"` implicitly
- Shortcuts don't interfere with screen readers
- All actions have mouse alternatives
- Help modal clearly documents all shortcuts

## Browser Compatibility

Tested on:
- Chrome/Edge (Electron environment)
- Firefox (via web fallback)
- Safari (via web fallback)

Key sequence detection uses `Date.now()` for cross-browser compatibility.

## Performance

- Single event listener (not one per shortcut)
- Debounced sequence detection
- Toast elements removed from DOM after fade
- useEffect cleanup prevents memory leaks
- No re-renders from keyboard events (handlers only)

## Future Enhancements

Possible additions:
- [ ] Customizable key bindings (user preferences)
- [ ] Vim-style shortcuts (gg for top, G for bottom)
- [ ] Multi-character sequences (like Gmail's gl for labels)
- [ ] Shortcut recording/practice mode
- [ ] Export shortcuts as PDF/cheat sheet
- [ ] Undo last action (Ctrl+Z)
- [ ] Quick reply templates (1-9 keys)

## Troubleshooting

### Shortcuts not working
- Check browser console for errors
- Verify hook is initialized with all handlers
- Ensure `isModalOpen` is correctly calculated
- Check if input is focused (disable shortcuts)

### Toast not showing
- Verify `KeyboardShortcutsHelp.css` is imported
- Check if toast container is created in DOM
- Inspect z-index conflicts with other elements

### Help modal empty
- Verify `shortcuts` array is passed from hook
- Check if shortcuts array has correct structure
- Ensure categories match in help component

### Ref not focusing search
- Verify Input component uses forwardRef
- Check if ref is attached: `console.log(searchInputRef.current)`
- Ensure Input is rendered before shortcut fires

## License

Part of AI Command Center. See main project LICENSE.
