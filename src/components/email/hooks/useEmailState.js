import { useState, useEffect } from 'react';
import { DEFAULT_EMAIL_SETTINGS } from '../utils/emailConstants';

/**
 * Centralized state management hook for Email component
 */
export function useEmailState() {
  // Account state
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Email state
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('inbox');

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingEmailDetail, setLoadingEmailDetail] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  // Compose state
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [sending, setSending] = useState(false);

  // Attachment download state
  const [downloadingAttachment, setDownloadingAttachment] = useState(null);
  const [emailAttachments, setEmailAttachments] = useState([]);

  // Reply/Forward state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [replyData, setReplyData] = useState({ to: '', subject: '', body: '' });
  const [forwardData, setForwardData] = useState({ to: '', subject: '', body: '' });
  const [sendingReply, setSendingReply] = useState(false);

  // Multi-select state
  const [selectedEmailIds, setSelectedEmailIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);

  // Labels state
  const [labels, setLabels] = useState([]);
  const [userLabels, setUserLabels] = useState([]);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);
  const [applyingLabel, setApplyingLabel] = useState(null);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState(null);

  // Template state
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Signature state
  const [showSignatureManager, setShowSignatureManager] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState(null);

  // Advanced Search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [activeSearchName, setActiveSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [emailSettings, setEmailSettings] = useState(DEFAULT_EMAIL_SETTINGS);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Keyboard shortcuts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Load email settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('email_settings');
      if (stored) {
        const savedSettings = JSON.parse(stored);
        setEmailSettings(prev => ({ ...prev, ...savedSettings }));
      }
    } catch (error) {
      console.error('Failed to load email settings:', error);
    }
  }, []);

  return {
    // Account state
    accounts,
    setAccounts,
    selectedAccountId,
    setSelectedAccountId,

    // Email state
    emails,
    setEmails,
    selectedEmail,
    setSelectedEmail,
    selectedFolder,
    setSelectedFolder,

    // UI state
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

    // Compose state
    composeData,
    setComposeData,
    composeAttachments,
    setComposeAttachments,
    sending,
    setSending,

    // Attachment state
    downloadingAttachment,
    setDownloadingAttachment,
    emailAttachments,
    setEmailAttachments,

    // Reply/Forward state
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

    // Multi-select state
    selectedEmailIds,
    setSelectedEmailIds,
    selectMode,
    setSelectMode,
    bulkOperationLoading,
    setBulkOperationLoading,

    // Labels state
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

    // Template state
    showTemplateManager,
    setShowTemplateManager,
    showTemplateSelector,
    setShowTemplateSelector,

    // Signature state
    showSignatureManager,
    setShowSignatureManager,
    signatures,
    setSignatures,
    selectedSignatureId,
    setSelectedSignatureId,

    // Search state
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

    // Settings state
    showSettings,
    setShowSettings,
    emailSettings,
    setEmailSettings,

    // Pagination
    currentPage,
    setCurrentPage,

    // Keyboard shortcuts
    showKeyboardHelp,
    setShowKeyboardHelp
  };
}
