import { useEffect } from 'react';

/**
 * useKeyboardNavigation - Gmail-style keyboard shortcuts for email navigation
 *
 * Keyboard shortcuts:
 * - J: Next email
 * - K: Previous email
 * - X: Toggle select current email
 * - S: Toggle star on current email
 */
export function useKeyboardNavigation({
  emails,
  selectedEmail,
  onEmailClick,
  onToggleSelect,
  onToggleStar,
  modalStates
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if no modal is open and not typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Check if any modal is open
      const anyModalOpen = Object.values(modalStates).some(state => state === true);
      if (anyModalOpen) {
        return;
      }

      const currentIndex = emails.findIndex(email => email.id === selectedEmail?.id);

      // J - Next email
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        if (currentIndex < emails.length - 1) {
          onEmailClick(emails[currentIndex + 1]);
        }
      }

      // K - Previous email
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (currentIndex > 0) {
          onEmailClick(emails[currentIndex - 1]);
        } else if (currentIndex === -1 && emails.length > 0) {
          // No selection, select first email
          onEmailClick(emails[0]);
        }
      }

      // X - Toggle select current email
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        if (selectedEmail) {
          onToggleSelect(selectedEmail.id);
        }
      }

      // S - Toggle star on current email
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (selectedEmail) {
          onToggleStar(selectedEmail.id, selectedEmail.starred);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emails, selectedEmail, modalStates, onEmailClick, onToggleSelect, onToggleStar]);
}
