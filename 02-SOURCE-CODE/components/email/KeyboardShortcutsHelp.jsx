import React from 'react';
import { Keyboard, X } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import './KeyboardShortcutsHelp.css';

// Default shortcuts list
const DEFAULT_SHORTCUTS = [
  { key: 'J', description: 'Next email', category: 'Navigation' },
  { key: 'K', description: 'Previous email', category: 'Navigation' },
  { key: '/', description: 'Focus search', category: 'Navigation' },
  { key: 'C', description: 'Compose new email', category: 'Actions' },
  { key: 'R', description: 'Reply', category: 'Actions' },
  { key: 'Shift+R', description: 'Reply all', category: 'Actions' },
  { key: 'F', description: 'Forward', category: 'Actions' },
  { key: 'E', description: 'Archive', category: 'Actions' },
  { key: '#', description: 'Move to trash', category: 'Actions' },
  { key: 'Shift+I', description: 'Mark as read', category: 'Actions' },
  { key: 'Shift+U', description: 'Mark as unread', category: 'Actions' },
  { key: 'S', description: 'Toggle star', category: 'Actions' },
  { key: 'X', description: 'Select/deselect email', category: 'Selection' },
  { key: 'Ctrl+A', description: 'Select all', category: 'Selection' },
  { key: 'Esc', description: 'Clear selection', category: 'Selection' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'Help' },
];

/**
 * KeyboardShortcutsHelp - Modal displaying all available keyboard shortcuts
 * Organized by category for easy reference
 */
export default function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts = DEFAULT_SHORTCUTS }) {
  // Guard against undefined/null shortcuts
  const shortcutsList = shortcuts || DEFAULT_SHORTCUTS;

  // Group shortcuts by category
  const groupedShortcuts = shortcutsList.reduce((acc, shortcut) => {
    const category = shortcut.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {});

  // Define category order
  const categoryOrder = ['Navigation', 'Actions', 'Selection', 'Help'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="shortcuts-help-title">
          <Keyboard size={20} />
          <span>Keyboard Shortcuts</span>
        </div>
      }
      size="medium"
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="shortcuts-help-content">
        <p className="shortcuts-help-intro">
          Use these keyboard shortcuts to navigate and manage your emails faster.
        </p>

        <div className="shortcuts-categories">
          {categoryOrder.map(category => {
            const categoryShortcuts = groupedShortcuts[category];
            if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

            return (
              <div key={category} className="shortcuts-category">
                <h3 className="shortcuts-category-title">{category}</h3>
                <div className="shortcuts-list">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="shortcut-item">
                      <div className="shortcut-keys">
                        {renderShortcutKey(shortcut.key)}
                      </div>
                      <div className="shortcut-description">
                        {shortcut.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="shortcuts-help-footer-note">
          <strong>Tip:</strong> Press <kbd>?</kbd> anytime to open this help dialog.
        </div>
      </div>
    </Modal>
  );
}

/**
 * Render keyboard key(s) with proper styling
 * Handles multi-key combinations like "Shift+R" and sequences like "G then I"
 */
function renderShortcutKey(keyString) {
  // Handle sequences (e.g., "G then I")
  if (keyString.includes(' then ')) {
    const keys = keyString.split(' then ');
    return (
      <div className="shortcut-sequence">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd>{key.trim()}</kbd>
            {i < keys.length - 1 && <span className="then-text">then</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Handle combinations (e.g., "Shift+R", "Ctrl+A")
  if (keyString.includes('+')) {
    const keys = keyString.split('+');
    return (
      <div className="shortcut-combination">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd>{key.trim()}</kbd>
            {i < keys.length - 1 && <span className="plus-text">+</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Single key
  return <kbd>{keyString}</kbd>;
}
