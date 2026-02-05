# Keyboard Shortcuts Integration Guide for Email.jsx

## Step 1: Add imports

Add `useRef` to React imports:
```javascript
import React, { useState, useEffect, useCallback, useRef } from 'react';
```

Add `Keyboard` icon to lucide-react imports:
```javascript
import {
  // ... existing imports
  Keyboard  // ADD THIS
} from 'lucide-react';
```

Add keyboard shortcuts imports after SavedSearches:
```javascript
import SavedSearches from './SavedSearches';
import useEmailKeyboardShortcuts from './useEmailKeyboardShortcuts';  // ADD THIS
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';  // ADD THIS
```

Add CSS import:
```javascript
import './KeyboardShortcutsHelp.css';  // ADD THIS
```

## Step 2: Add state variables

After the existing state variables (around line 250), add:
```javascript
// Keyboard shortcuts state
const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
const searchInputRef = useRef(null);
```

## Step 3: Add keyboard shortcuts hook

After all state declarations and before useEffect hooks (around line 260), add:
```javascript
// Keyboard shortcuts integration
const { shortcuts } = useEmailKeyboardShortcuts({
  selectedEmail,
  emails: paginatedEmails,
  onCompose: async () => {
    setShowCompose(true);
    const signatureContent = await getDefaultSignatureContent('new');
    if (signatureContent) {
      setComposeData({ to: '', subject: '', body: signatureContent });
    }
  },
  onReply: handleReply,
  onReplyAll: async () => {
    if (!selectedEmail) return;
    const signatureContent = await getDefaultSignatureContent('reply');
    setReplyData({
      to: [selectedEmail.fromEmail || selectedEmail.from, ...(selectedEmail.to ? selectedEmail.to.split(',') : [])].join(','),
      subject: selectedEmail.subject.startsWith('Re: ') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      body: `${signatureContent}\n\n---\nOn ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.from} wrote:\n${selectedEmail.body || selectedEmail.snippet}`
    });
    setShowReplyModal(true);
  },
  onForward: handleForward,
  onArchive: async () => {
    if (selectedEmail && window.electronAPI?.googleArchiveEmail) {
      await window.electronAPI.googleArchiveEmail(selectedAccountId, selectedEmail.id);
      const updatedEmails = emails.filter(e => e.id !== selectedEmail.id);
      setEmails(updatedEmails);
      setSelectedEmail(null);
    }
  },
  onDelete: () => selectedEmail && handleTrashEmail(selectedEmail.id),
  onMarkRead: () => selectedEmail && handleMarkAsRead(selectedEmail.id, true),
  onMarkUnread: () => selectedEmail && handleMarkAsRead(selectedEmail.id, false),
  onToggleStar: () => selectedEmail && handleToggleStar(selectedEmail.id, selectedEmail.starred),
  onSelectEmail: handleEmailClick,
  onToggleSelect: (emailId) => handleToggleEmailSelection(emailId),
  onSelectAll: handleSelectAll,
  onClearSelection: handleCancelSelection,
  onRefresh: handleSyncEmails,
  searchInputRef,
  isModalOpen: showCompose || showReplyModal || showForwardModal || showLabelManager || showTemplateManager || showSignatureManager || showAdvancedSearch || showKeyboardHelp
});

// Listen for help shortcut event
useEffect(() => {
  const handleShowHelp = () => setShowKeyboardHelp(true);
  window.addEventListener('email:show-shortcuts-help', handleShowHelp);
  return () => window.removeEventListener('email:show-shortcuts-help', handleShowHelp);
}, []);
```

## Step 4: Add searchInputRef to search Input component

Find the search Input component (around line 1430) and add ref:
```javascript
<Input
  ref={searchInputRef}  // ADD THIS
  type="search"
  placeholder={activeSearchQuery ? `Searching: ${activeSearchName || 'Custom'}` : "Search emails..."}
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleAdvancedSearch(searchQuery);
    }
  }}
  icon={<Search size={16} />}
/>
```

## Step 5: Add keyboard shortcuts help button

In the toolbar-search-wrapper section (around line 1440), add a button for shortcuts help:
```javascript
<Button
  variant="ghost"
  icon={<Keyboard size={16} />}
  onClick={() => setShowKeyboardHelp(true)}
  title="Keyboard shortcuts (?)"
  className="keyboard-shortcuts-btn"
/>
```

## Step 6: Add KeyboardShortcutsHelp modal

Before the closing </div> of email-container (at the very end, around line 2148), add:
```javascript
{/* Keyboard Shortcuts Help Modal */}
<KeyboardShortcutsHelp
  isOpen={showKeyboardHelp}
  onClose={() => setShowKeyboardHelp(false)}
  shortcuts={shortcuts}
/>
```

## Usage

Once integrated:
- Press `?` anywhere to show keyboard shortcuts help
- Press `C` to compose new email
- Press `R` to reply, `Shift+R` to reply all
- Press `F` to forward
- Press `J`/`K` to navigate next/previous email
- Press `/` to focus search
- Press `S` to star/unstar
- Press `Shift+I` to mark as read, `Shift+U` to mark as unread
- Press `#` or `Delete` to trash
- Press `X` to toggle selection
- Press `Ctrl+A` to select all
- Press `Esc` to clear selection
- Press `G` then `I` to refresh inbox
