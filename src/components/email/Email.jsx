import React, { useEffect } from 'react';
import { Mail, User } from 'lucide-react';
import Button from '../shared/Button';
import EmailFolders from './EmailFolders';
import EmailInbox from './EmailInbox';
import EmailView from './EmailView';
import { ComposeModal, ReplyModal, ForwardModal } from './EmailCompose';
import LabelManager from './LabelManager';
import TemplateManager from './TemplateManager';
import SignatureManager from './SignatureManager';
import AdvancedSearchModal from './AdvancedSearchModal';
import EmailSettings from './EmailSettings';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useEmailState } from './hooks/useEmailState';
import { useEmailFilters } from './hooks/useEmailFilters';
import { useEmailSelection } from './hooks/useEmailSelection';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { normalizeEmailData, EMAILS_PER_PAGE } from './utils/emailConstants';
import './Email.css';
import './LabelManager.css';
import './TemplateManager.css';
import './TemplateSelector.css';
import './SignatureManager.css';
import './AdvancedSearch.css';
import './EmailSettings.css';
import './VirtualEmailList.css';
import './KeyboardShortcutsHelp.css';

/**
 * Email - Main orchestrator component
 * Now refactored into focused sub-components
 */
export default function Email() {
  // Centralized state from custom hook
  const state = useEmailState();

  // Destructure for cleaner access
  const {
    accounts,
    setAccounts,
    selectedAccountId,
    setSelectedAccountId,
    emails,
    setEmails,
    selectedEmail,
    setSelectedEmail,
    selectedFolder,
    setSelectedFolder,
    loading,
    setLoading,
    loadingEmailDetail,
    setLoadingEmailDetail,
    syncing,
    setSyncing,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    showCompose,
    setShowCompose,
    composeData,
    setComposeData,
    composeAttachments,
    setComposeAttachments,
    sending,
    setSending,
    downloadingAttachment,
    setDownloadingAttachment,
    emailAttachments,
    setEmailAttachments,
    showReplyModal,
    setShowReplyModal,
    showForwardModal,
    setShowForwardModal,
    replyData,
    setReplyData,
    forwardData,
    setForwardData,
    sendingReply,
    setSendingReply,
    selectedEmailIds,
    setSelectedEmailIds,
    selectMode,
    setSelectMode,
    bulkOperationLoading,
    setBulkOperationLoading,
    labels,
    setLabels,
    userLabels,
    setUserLabels,
    showLabelManager,
    setShowLabelManager,
    showLabelsDropdown,
    setShowLabelsDropdown,
    applyingLabel,
    setApplyingLabel,
    selectedLabelFilter,
    setSelectedLabelFilter,
    showTemplateManager,
    setShowTemplateManager,
    showTemplateSelector,
    setShowTemplateSelector,
    showSignatureManager,
    setShowSignatureManager,
    signatures,
    setSignatures,
    selectedSignatureId,
    setSelectedSignatureId,
    showAdvancedSearch,
    setShowAdvancedSearch,
    showSavedSearches,
    setShowSavedSearches,
    activeSearchQuery,
    setActiveSearchQuery,
    activeSearchName,
    setActiveSearchName,
    isSearching,
    setIsSearching,
    searchResults,
    setSearchResults,
    showSettings,
    setShowSettings,
    emailSettings,
    setEmailSettings,
    currentPage,
    setCurrentPage,
    showKeyboardHelp,
    setShowKeyboardHelp
  } = state;

  // Filter and pagination logic
  const { paginatedEmails, totalPages } = useEmailFilters(
    emails,
    filter,
    searchQuery,
    activeSearchQuery,
    EMAILS_PER_PAGE,
    currentPage
  );

  // Multi-select logic
  const {
    handleToggleSelectMode,
    handleToggleEmailSelection,
    handleSelectAll,
    handleCancelSelection
  } = useEmailSelection(selectedEmailIds, setSelectedEmailIds, setSelectMode, paginatedEmails);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load emails when account/folder changes
  useEffect(() => {
    if (selectedAccountId) {
      loadEmails();
      loadLabels();
      loadSignatures();
    }
  }, [selectedAccountId, selectedFolder]);

  // Keyboard navigation
  useKeyboardNavigation({
    emails: paginatedEmails,
    selectedEmail,
    onEmailClick: handleEmailClick,
    onToggleSelect: handleToggleEmailSelection,
    onToggleStar: handleToggleStar,
    modalStates: {
      showCompose,
      showReplyModal,
      showForwardModal,
      showLabelManager,
      showTemplateManager,
      showSignatureManager,
      showAdvancedSearch,
      showSettings,
      showKeyboardHelp
    }
  });

  // Listen for '?' key to show keyboard shortcuts help
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if in input, textarea, or modal is open
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable ||
        showCompose || showReplyModal || showForwardModal || showLabelManager ||
        showTemplateManager || showSignatureManager || showAdvancedSearch ||
        showSettings || showKeyboardHelp
      ) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCompose, showReplyModal, showForwardModal, showLabelManager,
      showTemplateManager, showSignatureManager, showAdvancedSearch,
      showSettings, showKeyboardHelp]);

  // =============== DATA LOADING ===============

  const loadAccounts = async () => {
    try {
      setLoading(true);
      if (window.electronAPI?.googleListAccounts) {
        const result = await window.electronAPI.googleListAccounts();
        const accountsArray = result?.success ? (result.data || []) : [];
        setAccounts(accountsArray);
        if (accountsArray.length > 0) {
          setSelectedAccountId(accountsArray[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      setLoading(true);
      if (window.electronAPI?.googleGetEmails) {
        const result = await window.electronAPI.googleGetEmails(selectedAccountId, {
          folder: selectedFolder,
          maxResults: 100
        });
        const emailsData = Array.isArray(result) ? result : (result?.data || result || []);
        const normalizedEmails = (Array.isArray(emailsData) ? emailsData : []).map(normalizeEmailData);
        setEmails(normalizedEmails);
      }
    } catch (error) {
      console.error('Failed to load emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLabels = async () => {
    if (!selectedAccountId) return;

    try {
      if (window.electronAPI?.googleGetLabels) {
        const result = await window.electronAPI.googleGetLabels(selectedAccountId);
        if (result.success) {
          const allLabels = result.data || [];
          setLabels(allLabels);
          const userOnly = allLabels.filter(l => l.type === 'user');
          setUserLabels(userOnly);
        }
      }
    } catch (err) {
      console.error('Failed to load labels:', err);
    }
  };

  const loadSignatures = async () => {
    if (!selectedAccountId) return;

    try {
      if (window.electronAPI?.emailGetSignatures) {
        const result = await window.electronAPI.emailGetSignatures(selectedAccountId);
        if (result.success) {
          setSignatures(result.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load signatures:', err);
    }
  };

  const loadEmailAttachments = async (emailId) => {
    try {
      if (window.electronAPI?.googleGetAttachments) {
        const result = await window.electronAPI.googleGetAttachments(selectedAccountId, emailId);
        if (result.success) {
          setEmailAttachments(result.data || []);
        } else {
          setEmailAttachments([]);
        }
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setEmailAttachments([]);
    }
  };

  // =============== EMAIL ACTIONS ===============

  const handleSyncEmails = async () => {
    if (!selectedAccountId) return;
    try {
      setSyncing(true);
      if (window.electronAPI?.googleSyncEmails) {
        await window.electronAPI.googleSyncEmails(selectedAccountId);
        await loadEmails();
      }
    } catch (error) {
      console.error('Failed to sync emails:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleEmailClick = async (email) => {
    setLoadingEmailDetail(true);

    try {
      // Load full email if only snippet is available
      if (!email.body && window.electronAPI?.googleGetEmail) {
        try {
          const fullEmail = await window.electronAPI.googleGetEmail(selectedAccountId, email.id);
          const normalizedFullEmail = normalizeEmailData(fullEmail);
          setSelectedEmail(normalizedFullEmail);
        } catch (error) {
          console.error('Failed to load email details:', error);
          setSelectedEmail(email);
        }
      } else {
        setSelectedEmail(email);
      }

      // Mark as read if unread (with configurable delay)
      if (email.unread && window.electronAPI?.googleMarkEmailRead) {
        const delay = emailSettings.markAsReadDelay * 1000;
        if (delay > 0) {
          setTimeout(() => {
            handleMarkAsRead(email.id, true).catch(err =>
              console.error('Failed to mark as read:', err)
            );
          }, delay);
        } else {
          handleMarkAsRead(email.id, true).catch(err =>
            console.error('Failed to mark as read:', err)
          );
        }
      }

      // Load attachments for this email
      loadEmailAttachments(email.id);
    } catch (error) {
      console.error('Error in handleEmailClick:', error);
    } finally {
      setLoadingEmailDetail(false);
    }
  };

  const handleToggleStar = async (emailId, isStarred) => {
    try {
      // Update UI immediately for instant feedback
      const updatedEmails = emails.map(e =>
        e.id === emailId ? { ...e, starred: !isStarred } : e
      );
      setEmails(updatedEmails);

      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, starred: !isStarred });
      }

      // Then sync with server in background
      if (window.electronAPI?.googleToggleEmailStar) {
        await window.electronAPI.googleToggleEmailStar(selectedAccountId, emailId, !isStarred);
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
      // Revert on error
      const revertedEmails = emails.map(e =>
        e.id === emailId ? { ...e, starred: isStarred } : e
      );
      setEmails(revertedEmails);
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, starred: isStarred });
      }
    }
  };

  const handleMarkAsRead = async (emailId, isRead) => {
    try {
      if (window.electronAPI?.googleMarkEmailRead) {
        await window.electronAPI.googleMarkEmailRead(selectedAccountId, emailId, isRead);
      }

      const updatedEmails = emails.map(e =>
        e.id === emailId ? { ...e, unread: !isRead } : e
      );
      setEmails(updatedEmails);
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, unread: !isRead });
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleTrashEmail = async (emailId) => {
    if (!confirm('Move this email to trash?')) return;

    try {
      if (window.electronAPI?.googleTrashEmail) {
        await window.electronAPI.googleTrashEmail(selectedAccountId, emailId);
      }

      const updatedEmails = emails.filter(e => e.id !== emailId);
      setEmails(updatedEmails);
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Failed to trash email:', error);
      alert('Failed to move email to trash: ' + error.message);
    }
  };

  // =============== COMPOSE/REPLY/FORWARD ===============

  const getDefaultSignatureContent = async (type = 'new') => {
    if (!selectedAccountId) return '';

    try {
      if (window.electronAPI?.emailGetDefaultSignature) {
        const result = await window.electronAPI.emailGetDefaultSignature(selectedAccountId, type);
        if (result.success && result.data) {
          setSelectedSignatureId(result.data.id);
          return `\n\n--\n${result.data.content}`;
        }
      }
    } catch (err) {
      console.error('Failed to get default signature:', err);
    }
    return '';
  };

  const insertSignature = (signatureId) => {
    const signature = signatures.find(s => s.id === signatureId);
    if (!signature) return;

    setSelectedSignatureId(signatureId);

    // Remove existing signature (content after --)
    let body = composeData.body;
    const signatureSeparatorIndex = body.lastIndexOf('\n\n--\n');
    if (signatureSeparatorIndex !== -1) {
      body = body.substring(0, signatureSeparatorIndex);
    }

    // Append new signature
    const newBody = `${body}\n\n--\n${signature.content}`;
    setComposeData({ ...composeData, body: newBody });
  };

  const handleOpenCompose = async () => {
    setShowCompose(true);
    const signatureContent = await getDefaultSignatureContent('new');
    if (signatureContent) {
      setComposeData({ to: '', subject: '', body: signatureContent });
    }
  };

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    try {
      setSending(true);
      if (window.electronAPI?.googleSendEmail) {
        const attachments = composeAttachments.map(att => ({
          filename: att.name,
          mimeType: att.mimeType,
          content: att.content
        }));

        await window.electronAPI.googleSendEmail(selectedAccountId, {
          to: composeData.to,
          subject: composeData.subject,
          body: composeData.body,
          attachments: attachments.length > 0 ? attachments : undefined
        });
        setShowCompose(false);
        setComposeData({ to: '', subject: '', body: '' });
        setComposeAttachments([]);
        await loadEmails();
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!selectedEmail) return;

    const signatureContent = await getDefaultSignatureContent('reply');

    setReplyData({
      to: selectedEmail.fromEmail || selectedEmail.from,
      subject: selectedEmail.subject.startsWith('Re: ')
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`,
      body: `${signatureContent}\n\n---\nOn ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.from} wrote:\n${selectedEmail.body || selectedEmail.snippet}`
    });
    setShowReplyModal(true);
  };

  const handleSendReply = async () => {
    if (!replyData.to || !replyData.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    try {
      setSendingReply(true);
      if (window.electronAPI?.googleSendEmail) {
        await window.electronAPI.googleSendEmail(selectedAccountId, {
          to: replyData.to,
          subject: replyData.subject,
          body: replyData.body,
          threadId: selectedEmail?.threadId
        });
        setShowReplyModal(false);
        setReplyData({ to: '', subject: '', body: '' });
        await loadEmails();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Failed to send reply: ' + error.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleForward = async () => {
    if (!selectedEmail) return;

    const signatureContent = await getDefaultSignatureContent('reply');

    setForwardData({
      to: '',
      subject: selectedEmail.subject.startsWith('Fwd: ')
        ? selectedEmail.subject
        : `Fwd: ${selectedEmail.subject}`,
      body: `${signatureContent}\n\n---\nForwarded message from ${selectedEmail.from}:\n${selectedEmail.body || selectedEmail.snippet}`
    });
    setShowForwardModal(true);
  };

  const handleSendForward = async () => {
    if (!forwardData.to || !forwardData.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    try {
      setSendingReply(true);
      if (window.electronAPI?.googleSendEmail) {
        await window.electronAPI.googleSendEmail(selectedAccountId, {
          to: forwardData.to,
          subject: forwardData.subject,
          body: forwardData.body
        });
        setShowForwardModal(false);
        setForwardData({ to: '', subject: '', body: '' });
        await loadEmails();
      }
    } catch (error) {
      console.error('Failed to forward email:', error);
      alert('Failed to forward email: ' + error.message);
    } finally {
      setSendingReply(false);
    }
  };

  // =============== ATTACHMENTS ===============

  const handleAddAttachment = async () => {
    try {
      if (window.electronAPI?.dialogOpenFile) {
        const result = await window.electronAPI.dialogOpenFile({
          multiple: true,
          filters: [
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result.success) {
          const files = result.files || (result.file ? [result.file] : []);
          setComposeAttachments(prev => [...prev, ...files]);
        }
      }
    } catch (error) {
      console.error('Failed to add attachment:', error);
      alert('Failed to add attachment: ' + error.message);
    }
  };

  const handleRemoveAttachment = (index) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadAttachment = async (attachment) => {
    if (!selectedEmail || !selectedAccountId) return;

    try {
      setDownloadingAttachment(attachment.id);

      if (window.electronAPI?.googleDownloadAttachment) {
        const result = await window.electronAPI.googleDownloadAttachment(
          selectedAccountId,
          selectedEmail.id,
          attachment.id,
          attachment.filename
        );

        if (result.success) {
          const openFile = confirm(`Downloaded ${attachment.filename} to Downloads folder.\n\nWould you like to open it?`);
          if (openFile && window.electronAPI?.shellOpenPath) {
            await window.electronAPI.shellOpenPath(result.data.filePath);
          }
        } else {
          alert('Failed to download attachment: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Failed to download attachment: ' + error.message);
    } finally {
      setDownloadingAttachment(null);
    }
  };

  // =============== LABELS ===============

  const handleApplyLabel = async (emailId, labelId) => {
    if (!selectedAccountId) return;

    setApplyingLabel(labelId);
    try {
      if (window.electronAPI?.googleApplyLabel) {
        const result = await window.electronAPI.googleApplyLabel(selectedAccountId, emailId, labelId);
        if (result.success) {
          const updatedEmails = emails.map(e => {
            if (e.id === emailId) {
              const newLabels = [...(e.labels || [])];
              if (!newLabels.includes(labelId)) {
                newLabels.push(labelId);
              }
              return { ...e, labels: newLabels };
            }
            return e;
          });
          setEmails(updatedEmails);
          if (selectedEmail?.id === emailId) {
            const newLabels = [...(selectedEmail.labels || [])];
            if (!newLabels.includes(labelId)) {
              newLabels.push(labelId);
            }
            setSelectedEmail({ ...selectedEmail, labels: newLabels });
          }
        }
      }
    } catch (err) {
      console.error('Failed to apply label:', err);
      alert('Failed to apply label: ' + err.message);
    } finally {
      setApplyingLabel(null);
    }
  };

  const handleRemoveLabel = async (emailId, labelId) => {
    if (!selectedAccountId) return;

    setApplyingLabel(labelId);
    try {
      if (window.electronAPI?.googleRemoveLabel) {
        const result = await window.electronAPI.googleRemoveLabel(selectedAccountId, emailId, labelId);
        if (result.success) {
          const updatedEmails = emails.map(e => {
            if (e.id === emailId) {
              const newLabels = (e.labels || []).filter(l => l !== labelId);
              return { ...e, labels: newLabels };
            }
            return e;
          });
          setEmails(updatedEmails);
          if (selectedEmail?.id === emailId) {
            const newLabels = (selectedEmail.labels || []).filter(l => l !== labelId);
            setSelectedEmail({ ...selectedEmail, labels: newLabels });
          }
        }
      }
    } catch (err) {
      console.error('Failed to remove label:', err);
      alert('Failed to remove label: ' + err.message);
    } finally {
      setApplyingLabel(null);
    }
  };

  // =============== BULK ACTIONS ===============

  const handleBulkMarkAsRead = async () => {
    if (selectedEmailIds.size === 0) return;

    try {
      setBulkOperationLoading(true);
      const emailIds = Array.from(selectedEmailIds);

      if (window.electronAPI?.googleBatchModifyEmails) {
        await window.electronAPI.googleBatchModifyEmails(selectedAccountId, emailIds, { markRead: true });
      }

      const updatedEmails = emails.map(e =>
        selectedEmailIds.has(e.id) ? { ...e, unread: false } : e
      );
      setEmails(updatedEmails);
      setSelectedEmailIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Failed to mark emails as read:', error);
      alert('Failed to mark emails as read: ' + error.message);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkMarkAsUnread = async () => {
    if (selectedEmailIds.size === 0) return;

    try {
      setBulkOperationLoading(true);
      const emailIds = Array.from(selectedEmailIds);

      if (window.electronAPI?.googleBatchModifyEmails) {
        await window.electronAPI.googleBatchModifyEmails(selectedAccountId, emailIds, { markUnread: true });
      }

      const updatedEmails = emails.map(e =>
        selectedEmailIds.has(e.id) ? { ...e, unread: true } : e
      );
      setEmails(updatedEmails);
      setSelectedEmailIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Failed to mark emails as unread:', error);
      alert('Failed to mark emails as unread: ' + error.message);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkStar = async () => {
    if (selectedEmailIds.size === 0) return;

    try {
      setBulkOperationLoading(true);
      const emailIds = Array.from(selectedEmailIds);

      if (window.electronAPI?.googleBatchModifyEmails) {
        await window.electronAPI.googleBatchModifyEmails(selectedAccountId, emailIds, { star: true });
      }

      const updatedEmails = emails.map(e =>
        selectedEmailIds.has(e.id) ? { ...e, starred: true } : e
      );
      setEmails(updatedEmails);
      setSelectedEmailIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Failed to star emails:', error);
      alert('Failed to star emails: ' + error.message);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkTrash = async () => {
    if (selectedEmailIds.size === 0) return;

    const count = selectedEmailIds.size;
    if (!confirm(`Move ${count} email${count > 1 ? 's' : ''} to trash?`)) return;

    try {
      setBulkOperationLoading(true);
      const emailIds = Array.from(selectedEmailIds);

      if (window.electronAPI?.googleBatchTrashEmails) {
        await window.electronAPI.googleBatchTrashEmails(selectedAccountId, emailIds);
      }

      const updatedEmails = emails.filter(e => !selectedEmailIds.has(e.id));
      setEmails(updatedEmails);

      if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
        setSelectedEmail(null);
      }

      setSelectedEmailIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Failed to trash emails:', error);
      alert('Failed to trash emails: ' + error.message);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  // =============== SEARCH ===============

  const handleAdvancedSearch = async (query, name = '') => {
    if (!query.trim() || !selectedAccountId) return;

    try {
      setIsSearching(true);
      setActiveSearchQuery(query);
      setActiveSearchName(name);
      setSearchQuery('');

      if (window.electronAPI?.googleSearchEmails) {
        const result = await window.electronAPI.googleSearchEmails(
          selectedAccountId,
          query,
          { limit: 100, searchGmail: true }
        );

        if (result.success) {
          setSearchResults(result.data);
          const normalizedEmails = (result.data.emails || []).map(normalizeEmailData);
          setEmails(normalizedEmails);
          setCurrentPage(1);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setActiveSearchQuery('');
    setActiveSearchName('');
    setSearchResults(null);
    setSearchQuery('');
    loadEmails();
  };

  const handleSavedSearchSelect = (query, name) => {
    handleAdvancedSearch(query, name);
  };

  // =============== SETTINGS ===============

  const handleSaveSettings = (newSettings) => {
    setEmailSettings(newSettings);
  };

  // =============== RENDER ===============

  if (loading && accounts.length === 0) {
    return (
      <div className="email-container">
        <div className="email-loading">Loading email accounts...</div>
      </div>
    );
  }

  if (!window.electronAPI?.googleListAccounts) {
    return (
      <div className="email-container">
        <div className="email-error">
          <Mail size={48} className="error-icon" />
          <h2>Email API Not Available</h2>
          <p>The Google email integration is not available in this environment.</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="email-container">
        <div className="email-empty">
          <Mail size={48} className="empty-icon" />
          <h2>No Email Accounts Connected</h2>
          <p>Connect a Google account to access your emails.</p>
          <Button
            variant="primary"
            icon={<User size={18} />}
            onClick={() => {
              window.electronAPI?.navigateTo?.('accounts');
            }}
          >
            Go to Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-container">
      {/* Left Sidebar - Folders & Accounts */}
      <EmailFolders
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        onCompose={handleOpenCompose}
        selectedFolder={selectedFolder}
        onFolderChange={setSelectedFolder}
        emails={emails}
        userLabels={userLabels}
        selectedLabelFilter={selectedLabelFilter}
        onLabelFilterChange={setSelectedLabelFilter}
        onShowLabelManager={() => setShowLabelManager(true)}
        showSavedSearches={showSavedSearches}
        onToggleSavedSearches={() => setShowSavedSearches(!showSavedSearches)}
        onSavedSearchSelect={handleSavedSearchSelect}
        filter={filter}
        onFilterChange={setFilter}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Middle Panel - Email List */}
      <EmailInbox
        syncing={syncing}
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeSearchQuery={activeSearchQuery}
        activeSearchName={activeSearchName}
        searchResults={searchResults}
        paginatedEmails={paginatedEmails}
        loading={loading}
        selectedEmail={selectedEmail}
        selectMode={selectMode}
        selectedEmailIds={selectedEmailIds}
        bulkOperationLoading={bulkOperationLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onSyncEmails={handleSyncEmails}
        onShowSettings={() => setShowSettings(true)}
        onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
        onAdvancedSearch={handleAdvancedSearch}
        onClearSearch={handleClearSearch}
        onShowAdvancedSearch={() => setShowAdvancedSearch(true)}
        onEmailClick={handleEmailClick}
        onToggleStar={handleToggleStar}
        onToggleSelectMode={handleToggleSelectMode}
        onToggleEmailSelection={handleToggleEmailSelection}
        onSelectAll={handleSelectAll}
        onCancelSelection={handleCancelSelection}
        onBulkMarkAsRead={handleBulkMarkAsRead}
        onBulkMarkAsUnread={handleBulkMarkAsUnread}
        onBulkStar={handleBulkStar}
        onBulkTrash={handleBulkTrash}
        onPageChange={setCurrentPage}
      />

      {/* Right Panel - Email Detail */}
      <EmailView
        selectedEmail={selectedEmail}
        loadingEmailDetail={loadingEmailDetail}
        selectedAccountId={selectedAccountId}
        emailAttachments={emailAttachments}
        downloadingAttachment={downloadingAttachment}
        userLabels={userLabels}
        labels={labels}
        applyingLabel={applyingLabel}
        showLabelsDropdown={showLabelsDropdown}
        onToggleLabelsDropdown={() => setShowLabelsDropdown(!showLabelsDropdown)}
        onReply={handleReply}
        onForward={handleForward}
        onMarkAsRead={handleMarkAsRead}
        onTrashEmail={handleTrashEmail}
        onApplyLabel={handleApplyLabel}
        onRemoveLabel={handleRemoveLabel}
        onDownloadAttachment={handleDownloadAttachment}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false);
          setComposeData({ to: '', subject: '', body: '' });
          setComposeAttachments([]);
        }}
        composeData={composeData}
        onComposeDataChange={setComposeData}
        composeAttachments={composeAttachments}
        onAddAttachment={handleAddAttachment}
        onRemoveAttachment={handleRemoveAttachment}
        sending={sending}
        onSend={handleSendEmail}
        selectedAccountId={selectedAccountId}
        showTemplateSelector={showTemplateSelector}
        onToggleTemplateSelector={setShowTemplateSelector}
        onShowTemplateManager={() => setShowTemplateManager(true)}
        signatures={signatures}
        selectedSignatureId={selectedSignatureId}
        onInsertSignature={insertSignature}
      />

      {/* Reply Modal */}
      <ReplyModal
        isOpen={showReplyModal}
        onClose={() => {
          setShowReplyModal(false);
          setReplyData({ to: '', subject: '', body: '' });
        }}
        replyData={replyData}
        onReplyDataChange={setReplyData}
        sendingReply={sendingReply}
        onSendReply={handleSendReply}
      />

      {/* Forward Modal */}
      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardData({ to: '', subject: '', body: '' });
        }}
        forwardData={forwardData}
        onForwardDataChange={setForwardData}
        sendingReply={sendingReply}
        onSendForward={handleSendForward}
      />

      {/* Template Manager Modal */}
      <TemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        accountId={selectedAccountId}
        onSelectTemplate={(template) => {
          if (showCompose) {
            setComposeData({
              ...composeData,
              subject: template.subject || composeData.subject,
              body: template.body || ''
            });
          }
          setShowTemplateManager(false);
        }}
      />

      {/* Label Manager Modal */}
      <LabelManager
        isOpen={showLabelManager}
        onClose={() => setShowLabelManager(false)}
        accountId={selectedAccountId}
        onLabelChange={() => {
          loadLabels();
        }}
      />

      {/* Signature Manager Modal */}
      <SignatureManager
        isOpen={showSignatureManager}
        onClose={() => setShowSignatureManager(false)}
        accountId={selectedAccountId}
        onSignatureChange={() => {
          loadSignatures();
        }}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        accountId={selectedAccountId}
        initialQuery={activeSearchQuery}
      />

      {/* Email Settings Modal */}
      <EmailSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentSettings={emailSettings}
        onSave={handleSaveSettings}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
}
