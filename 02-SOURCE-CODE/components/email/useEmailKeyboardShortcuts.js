import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for Email keyboard shortcuts
 * Provides Gmail-style keyboard navigation and actions
 */
export default function useEmailKeyboardShortcuts({
  selectedEmail,
  emails,
  onCompose,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onMarkRead,
  onMarkUnread,
  onToggleStar,
  onSelectEmail,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onRefresh,
  searchInputRef,
  isModalOpen
}) {
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [lastKey, setLastKey] = useState('');
  const sequenceTimeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle shortcuts when modal is open
      if (isModalOpen) return;

      // Don't handle shortcuts when typing in input/textarea/contenteditable
      const target = e.target;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow '/' to focus search even when not typing
      if (e.key !== '/' && isTyping) return;

      // Get the key and check for modifiers
      const key = e.key;
      const isShift = e.shiftKey;
      const isCtrl = e.ctrlKey || e.metaKey;

      // Track key sequences (like g+i for Gmail)
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime;

      // Helper to find email index
      const findEmailIndex = () => {
        if (!selectedEmail) return -1;
        return emails.findIndex(e => e.id === selectedEmail.id);
      };

      // Handle key sequences (G then I)
      if (key.toLowerCase() === 'g' && !isShift && !isCtrl) {
        e.preventDefault();
        setLastKey('g');
        setLastKeyTime(now);

        // Clear sequence after 1 second
        if (sequenceTimeoutRef.current) {
          clearTimeout(sequenceTimeoutRef.current);
        }
        sequenceTimeoutRef.current = setTimeout(() => {
          setLastKey('');
        }, 1000);
        return;
      }

      // Complete g+i sequence for refresh
      if (lastKey === 'g' && key.toLowerCase() === 'i' && timeSinceLastKey < 1000) {
        e.preventDefault();
        setLastKey('');
        if (onRefresh) onRefresh();
        showToast('Refreshing inbox...');
        return;
      }

      // Single key shortcuts
      switch (key) {
        // Compose new email
        case 'c':
        case 'C':
          if (!isCtrl && !isShift) {
            e.preventDefault();
            if (onCompose) onCompose();
            showToast('Composing new email');
          }
          break;

        // Reply
        case 'r':
          if (isShift) {
            // Reply all
            e.preventDefault();
            if (selectedEmail && onReplyAll) {
              onReplyAll();
              showToast('Reply all');
            }
          } else if (!isCtrl) {
            // Reply
            e.preventDefault();
            if (selectedEmail && onReply) {
              onReply();
              showToast('Reply');
            }
          }
          break;

        case 'R':
          if (!isCtrl) {
            e.preventDefault();
            if (selectedEmail && onReplyAll) {
              onReplyAll();
              showToast('Reply all');
            }
          }
          break;

        // Forward
        case 'f':
        case 'F':
          if (!isCtrl) {
            e.preventDefault();
            if (selectedEmail && onForward) {
              onForward();
              showToast('Forward');
            }
          }
          break;

        // Archive
        case 'e':
        case 'E':
          if (!isCtrl) {
            e.preventDefault();
            if (selectedEmail && onArchive) {
              onArchive();
              showToast('Archived');
            }
          }
          break;

        // Delete/Trash
        case '#':
        case 'Delete':
          e.preventDefault();
          if (selectedEmail && onDelete) {
            onDelete();
            showToast('Moved to trash');
          }
          break;

        // Mark as read
        case 'I':
          if (isShift && !isCtrl) {
            e.preventDefault();
            if (selectedEmail && onMarkRead) {
              onMarkRead();
              showToast('Marked as read');
            }
          }
          break;

        // Mark as unread
        case 'U':
          if (isShift && !isCtrl) {
            e.preventDefault();
            if (selectedEmail && onMarkUnread) {
              onMarkUnread();
              showToast('Marked as unread');
            }
          }
          break;

        // Toggle star
        case 's':
        case 'S':
          if (!isCtrl) {
            e.preventDefault();
            if (selectedEmail && onToggleStar) {
              onToggleStar();
              showToast(selectedEmail.starred ? 'Unstarred' : 'Starred');
            }
          }
          break;

        // Focus search
        case '/':
          e.preventDefault();
          if (searchInputRef && searchInputRef.current) {
            searchInputRef.current.focus();
            showToast('Search emails');
          }
          break;

        // Next email
        case 'j':
        case 'J':
          if (!isCtrl) {
            e.preventDefault();
            const currentIndex = findEmailIndex();
            if (currentIndex < emails.length - 1 && onSelectEmail) {
              onSelectEmail(emails[currentIndex + 1]);
            }
          }
          break;

        // Previous email
        case 'k':
        case 'K':
          if (!isCtrl) {
            e.preventDefault();
            const currentIndex = findEmailIndex();
            if (currentIndex > 0 && onSelectEmail) {
              onSelectEmail(emails[currentIndex - 1]);
            }
          }
          break;

        // Toggle selection
        case 'x':
        case 'X':
          if (!isCtrl) {
            e.preventDefault();
            if (selectedEmail && onToggleSelect) {
              onToggleSelect(selectedEmail.id);
              showToast('Toggled selection');
            }
          }
          break;

        // Select all
        case 'a':
          if (isCtrl) {
            e.preventDefault();
            if (onSelectAll) {
              onSelectAll();
              showToast('Selected all');
            }
          }
          break;

        // Clear selection / Close modal
        case 'Escape':
          e.preventDefault();
          if (onClearSelection) {
            onClearSelection();
            showToast('Cleared selection');
          }
          break;

        // Help
        case '?':
          e.preventDefault();
          // This will be handled by the component to open help modal
          window.dispatchEvent(new CustomEvent('email:show-shortcuts-help'));
          break;

        default:
          // Reset sequence if not a valid follow-up
          if (lastKey === 'g' && timeSinceLastKey < 1000) {
            setLastKey('');
          }
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [
    selectedEmail,
    emails,
    onCompose,
    onReply,
    onReplyAll,
    onForward,
    onArchive,
    onDelete,
    onMarkRead,
    onMarkUnread,
    onToggleStar,
    onSelectEmail,
    onToggleSelect,
    onSelectAll,
    onClearSelection,
    onRefresh,
    searchInputRef,
    isModalOpen,
    lastKeyTime,
    lastKey
  ]);

  // Helper function to show toast notification
  function showToast(message) {
    // Create or get existing toast container
    let toastContainer = document.getElementById('email-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'email-toast-container';
      toastContainer.className = 'email-toast-container';
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'email-toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after 2 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    }, 2000);
  }

  // Return shortcut reference data
  return {
    shortcuts: [
      { category: 'Navigation', key: 'J', description: 'Next email' },
      { category: 'Navigation', key: 'K', description: 'Previous email' },
      { category: 'Navigation', key: '/', description: 'Focus search' },
      { category: 'Navigation', key: 'G then I', description: 'Refresh inbox' },
      { category: 'Actions', key: 'C', description: 'Compose new email' },
      { category: 'Actions', key: 'R', description: 'Reply' },
      { category: 'Actions', key: 'Shift+R', description: 'Reply all' },
      { category: 'Actions', key: 'F', description: 'Forward' },
      { category: 'Actions', key: 'E', description: 'Archive' },
      { category: 'Actions', key: '#', description: 'Move to trash' },
      { category: 'Actions', key: 'Delete', description: 'Move to trash' },
      { category: 'Actions', key: 'Shift+I', description: 'Mark as read' },
      { category: 'Actions', key: 'Shift+U', description: 'Mark as unread' },
      { category: 'Actions', key: 'S', description: 'Toggle star' },
      { category: 'Selection', key: 'X', description: 'Toggle selection' },
      { category: 'Selection', key: 'Ctrl+A', description: 'Select all' },
      { category: 'Selection', key: 'Esc', description: 'Clear selection / Close' },
      { category: 'Help', key: '?', description: 'Show keyboard shortcuts' }
    ]
  };
}
