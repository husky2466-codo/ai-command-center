import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Star,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Reply,
  Forward,
  Trash2,
  MoreHorizontal,
  User,
  Calendar,
  X,
  Edit,
  MailOpen,
  Loader,
  CheckSquare,
  Square,
  MinusSquare,
  Download,
  FileIcon,
  Plus,
  Tag,
  Settings,
  Check,
  PenSquare,
  FileText,
  SlidersHorizontal,
  XCircle,
  Keyboard
} from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Modal from '../shared/Modal';
import LabelManager from './LabelManager';
import TemplateManager from './TemplateManager';
import TemplateSelector from './TemplateSelector';
import SignatureManager from './SignatureManager';
import AdvancedSearchModal from './AdvancedSearchModal';
import SavedSearches from './SavedSearches';
import EmailSettings from './EmailSettings';
import './Email.css';
import './LabelManager.css';
import './TemplateManager.css';
import './TemplateSelector.css';
import './SignatureManager.css';
import './AdvancedSearch.css';
import './EmailSettings.css';
import './VirtualEmailList.css';
import VirtualEmailList from './VirtualEmailList';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import './KeyboardShortcutsHelp.css';

/**
 * EmailBodyIframe - Renders email HTML with inline image support
 * Handles CID (Content-ID) embedded images by fetching them from Gmail API
 * and converting to data URIs
 */
function EmailBodyIframe({ body, emailId, accountId }) {
  const [processedBody, setProcessedBody] = useState(body);
  const [isLoading, setIsLoading] = useState(false);

  // Process email body to replace CID images with data URIs
  const processInlineImages = useCallback(async () => {
    if (!body || !emailId || !accountId) {
      setProcessedBody(body);
      return;
    }

    // Check if body contains CID references
    const cidPattern = /src=["']cid:([^"']+)["']/gi;
    const cidMatches = [...body.matchAll(cidPattern)];

    if (cidMatches.length === 0) {
      // No CID images, use body as-is
      setProcessedBody(body);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch inline images from the email
      let newBody = body;

      if (window.electronAPI?.googleGetInlineImages) {
        const result = await window.electronAPI.googleGetInlineImages(accountId, emailId);

        if (result.success && result.data) {
          const inlineImages = result.data;

          // Replace each CID reference with the corresponding data URI
          for (const match of cidMatches) {
            const fullMatch = match[0];
            const contentId = match[1];

            // Find the matching inline image (Gmail uses Content-ID without angle brackets in cid: URLs)
            // Content-ID in attachment may be like <image001.png@...> or just image001.png@...
            const inlineImage = inlineImages.find(img => {
              const imgCid = img.contentId?.replace(/^<|>$/g, '') || '';
              return imgCid === contentId || imgCid.startsWith(contentId);
            });

            if (inlineImage && inlineImage.data) {
              // Convert URL-safe base64 to standard base64
              const standardBase64 = inlineImage.data
                .replace(/-/g, '+')
                .replace(/_/g, '/');

              const dataUri = `data:${inlineImage.mimeType || 'image/png'};base64,${standardBase64}`;
              newBody = newBody.replace(fullMatch, `src="${dataUri}"`);
            }
          }
        }
      }

      setProcessedBody(newBody);
    } catch (error) {
      console.error('Failed to process inline images:', error);
      setProcessedBody(body);
    } finally {
      setIsLoading(false);
    }
  }, [body, emailId, accountId]);

  useEffect(() => {
    processInlineImages();
  }, [processInlineImages]);

  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; img-src * data: blob:; style-src 'self' 'unsafe-inline';">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #e0e0e0;
            background: transparent;
          }
          a { color: #ea4335; text-decoration: none; }
          a:hover { text-decoration: underline; }
          img { max-width: 100%; height: auto; }
          table { max-width: 100%; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>${processedBody || ''}</body>
    </html>
  `;

  if (isLoading) {
    return (
      <div className="email-body-loading">
        <Loader size={24} className="loading-spinner" />
        <span>Loading images...</span>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={iframeSrcDoc}
      sandbox="allow-same-origin allow-popups"
      className="email-iframe-body"
      title="Email content"
    />
  );
}

const FILTERS = {
  ALL: 'all',
  UNREAD: 'unread',
  STARRED: 'starred'
};

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: Inbox },
  { id: 'sent', name: 'Sent', icon: Send },
  { id: 'starred', name: 'Starred', icon: Star },
  { id: 'trash', name: 'Trash', icon: Trash2 }
];

export default function Email() {
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
  const [filter, setFilter] = useState(FILTERS.ALL);
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
  const [emailSettings, setEmailSettings] = useState({
    readingPanePosition: 'right',
    markAsReadDelay: 3,
    defaultCompose: 'html',
    conversationView: true,
    syncFrequency: 15,
    notifications: true,
    defaultSignatureId: null,
    imageLoading: 'ask',
    cacheRetentionDays: 30
  });

  // Pagination
  const [emailsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Keyboard shortcuts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadAccounts();
    // Load email settings from localStorage
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

  useEffect(() => {
    if (selectedAccountId) {
      loadEmails();
      loadLabels();
      loadSignatures();
    }
  }, [selectedAccountId, selectedFolder]);

  // Load labels for the selected account
  const loadLabels = async () => {
    if (!selectedAccountId) return;

    try {
      if (window.electronAPI?.googleGetLabels) {
        const result = await window.electronAPI.googleGetLabels(selectedAccountId);
        if (result.success) {
          const allLabels = result.data || [];
          setLabels(allLabels);
          // Filter to get only user-created labels
          const userOnly = allLabels.filter(l => l.type === 'user');
          setUserLabels(userOnly);
        }
      }
    } catch (err) {
      console.error('Failed to load labels:', err);
    }
  };

  // Load signatures for the selected account
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

  // Get default signature and insert into body
  const getDefaultSignatureContent = async (type = 'new') => {
    if (!selectedAccountId) return '';

    try {
      if (window.electronAPI?.emailGetDefaultSignature) {
        const result = await window.electronAPI.emailGetDefaultSignature(selectedAccountId, type);
        if (result.success && result.data) {
          setSelectedSignatureId(result.data.id);
          // Return signature with separator
          return `\n\n--\n${result.data.content}`;
        }
      }
    } catch (err) {
      console.error('Failed to get default signature:', err);
    }
    return '';
  };

  // Insert signature into compose body
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

  // Handle applying label to an email
  const handleApplyLabel = async (emailId, labelId) => {
    if (!selectedAccountId) return;

    setApplyingLabel(labelId);
    try {
      if (window.electronAPI?.googleApplyLabel) {
        const result = await window.electronAPI.googleApplyLabel(selectedAccountId, emailId, labelId);
        if (result.success) {
          // Update local email state
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

  // Handle removing label from an email
  const handleRemoveLabel = async (emailId, labelId) => {
    if (!selectedAccountId) return;

    setApplyingLabel(labelId);
    try {
      if (window.electronAPI?.googleRemoveLabel) {
        const result = await window.electronAPI.googleRemoveLabel(selectedAccountId, emailId, labelId);
        if (result.success) {
          // Update local email state
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

  // Get label display name and color
  const getLabelInfo = (labelId) => {
    const label = labels.find(l => l.id === labelId);
    if (label) {
      return {
        name: label.name,
        color: label.color?.backgroundColor || '#999999',
        textColor: label.color?.textColor || '#ffffff'
      };
    }
    return { name: labelId, color: '#999999', textColor: '#ffffff' };
  };

  const normalizeEmailData = (email) => {
    return {
      id: email.id,
      threadId: email.threadId || email.thread_id,
      subject: email.subject,
      snippet: email.snippet,
      from: email.from || email.from_name || email.from_email || 'Unknown',
      fromEmail: email.fromEmail || email.from_email,
      to: email.to || email.to_emails,
      date: email.date,
      unread: email.unread !== undefined ? email.unread : !(email.is_read),
      starred: email.starred !== undefined ? email.starred : Boolean(email.is_starred),
      body: email.body || email.body_html || email.body_text || null,
      labels: email.labels ? (typeof email.labels === 'string' ? (email.labels.startsWith('[') ? JSON.parse(email.labels) : email.labels.split(',')) : email.labels) : [],
      attachments: email.attachments || []
    };
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      if (window.electronAPI?.googleListAccounts) {
        const result = await window.electronAPI.googleListAccounts();
        // Extract accounts from response object
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
        // Handle both raw array and {success, data} response formats
        const emailsData = Array.isArray(result) ? result : (result?.data || result || []);
        // Normalize all emails on load
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
    console.log('=== EMAIL CLICK HANDLER CALLED ===');
    console.log('Email clicked:', email);
    console.log('Setting loadingEmailDetail to true');
    setLoadingEmailDetail(true);

    try {
      // Email is already normalized from loadEmails
      console.log('Email data:', email);
      console.log('About to setSelectedEmail...');

      // Load full email if only snippet is available
      if (!email.body && window.electronAPI?.googleGetEmail) {
        try {
          console.log('Loading full email from API...');
          const fullEmail = await window.electronAPI.googleGetEmail(selectedAccountId, email.id);
          const normalizedFullEmail = normalizeEmailData(fullEmail);
          console.log('Loaded full email:', normalizedFullEmail);
          console.log('Calling setSelectedEmail with full email');
          setSelectedEmail(normalizedFullEmail);
          console.log('setSelectedEmail called successfully');
        } catch (error) {
          console.error('Failed to load email details:', error);
          // Fall back to the email we already have
          console.log('Falling back to snippet version');
          setSelectedEmail(email);
        }
      } else {
        // Use the email directly (already normalized)
        console.log('Using email directly (has body or no API)');
        setSelectedEmail(email);
        console.log('setSelectedEmail called with email');
      }

      // Mark as read if unread (with configurable delay)
      if (email.unread && window.electronAPI?.googleMarkEmailRead) {
        const delay = emailSettings.markAsReadDelay * 1000; // Convert to milliseconds
        if (delay > 0) {
          setTimeout(() => {
            handleMarkAsRead(email.id, true).catch(err =>
              console.error('Failed to mark as read:', err)
            );
          }, delay);
        } else {
          // Immediate
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
    console.log('=== STAR TOGGLE CALLED ===');
    console.log('Email ID:', emailId, 'Current starred state:', isStarred);

    try {
      // Update UI immediately for instant feedback
      const updatedEmails = emails.map(e =>
        e.id === emailId ? { ...e, starred: !isStarred } : e
      );
      setEmails(updatedEmails);
      console.log('Updated emails list with new starred state');

      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, starred: !isStarred });
        console.log('Updated selected email with new starred state');
      }

      // Then sync with server in background
      if (window.electronAPI?.googleToggleEmailStar) {
        await window.electronAPI.googleToggleEmailStar(selectedAccountId, emailId, !isStarred);
        console.log('Server updated successfully');
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

  const handleReply = async () => {
    if (!selectedEmail) return;

    // Get default signature for replies
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

    // Get default signature for forwards (uses reply setting)
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

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    try {
      setSending(true);
      if (window.electronAPI?.googleSendEmail) {
        // Prepare attachments for sending
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

  // Attachment handlers
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
          // Ask user if they want to open the file
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Multi-select handlers
  const handleToggleSelectMode = () => {
    if (selectMode) {
      // Exiting select mode - clear selections
      setSelectedEmailIds(new Set());
    }
    setSelectMode(!selectMode);
  };

  const handleToggleEmailSelection = (emailId, event) => {
    event?.stopPropagation();
    setSelectedEmailIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmailIds.size === paginatedEmails.length) {
      // All selected, deselect all
      setSelectedEmailIds(new Set());
    } else {
      // Select all visible emails
      setSelectedEmailIds(new Set(paginatedEmails.map(e => e.id)));
    }
  };

  const handleCancelSelection = () => {
    setSelectedEmailIds(new Set());
    setSelectMode(false);
  };

  // Bulk action handlers
  const handleBulkMarkAsRead = async () => {
    if (selectedEmailIds.size === 0) return;

    try {
      setBulkOperationLoading(true);
      const emailIds = Array.from(selectedEmailIds);

      if (window.electronAPI?.googleBatchModifyEmails) {
        await window.electronAPI.googleBatchModifyEmails(selectedAccountId, emailIds, { markRead: true });
      }

      // Optimistic update
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

      // Optimistic update
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

      // Optimistic update
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

  const handleBulkUnstar = async () => {
    if (selectedEmailIds.size === 0) return;

    try {
      setBulkOperationLoading(true);
      const emailIds = Array.from(selectedEmailIds);

      if (window.electronAPI?.googleBatchModifyEmails) {
        await window.electronAPI.googleBatchModifyEmails(selectedAccountId, emailIds, { unstar: true });
      }

      // Optimistic update
      const updatedEmails = emails.map(e =>
        selectedEmailIds.has(e.id) ? { ...e, starred: false } : e
      );
      setEmails(updatedEmails);
      setSelectedEmailIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Failed to unstar emails:', error);
      alert('Failed to unstar emails: ' + error.message);
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

      // Remove trashed emails from list
      const updatedEmails = emails.filter(e => !selectedEmailIds.has(e.id));
      setEmails(updatedEmails);

      // Clear selection for any deleted email that was selected
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

  const handleBulkDelete = async () => {
    if (selectedEmailIds.size === 0) return;

    const count = selectedEmailIds.size;
    if (!confirm(`Permanently delete ${count} email${count > 1 ? 's' : ''}? This cannot be undone.`)) return;

    try {
      setBulkOperationLoading(true);
      const emailIds = Array.from(selectedEmailIds);

      if (window.electronAPI?.googleBatchDeleteEmails) {
        await window.electronAPI.googleBatchDeleteEmails(selectedAccountId, emailIds);
      }

      // Remove deleted emails from list
      const updatedEmails = emails.filter(e => !selectedEmailIds.has(e.id));
      setEmails(updatedEmails);

      // Clear selection for any deleted email that was selected
      if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
        setSelectedEmail(null);
      }

      setSelectedEmailIds(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error('Failed to delete emails:', error);
      alert('Failed to delete emails: ' + error.message);
    } finally {
      setBulkOperationLoading(false);
    }
  };

  // Advanced Search handlers
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

  // Handle settings save
  const handleSaveSettings = (newSettings) => {
    setEmailSettings(newSettings);
    // Settings are already saved to localStorage in EmailSettings component
  };

  // Filter emails - ensure emails is an array (moved before keyboard nav hook)
  const emailsArray = Array.isArray(emails) ? emails : [];
  const filteredEmails = activeSearchQuery
    ? emailsArray
    : emailsArray.filter(email => {
        if (filter === FILTERS.UNREAD && !email.unread) return false;
        if (filter === FILTERS.STARRED && !email.starred) return false;

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            email.subject?.toLowerCase().includes(query) ||
            email.from?.toLowerCase().includes(query) ||
            email.snippet?.toLowerCase().includes(query)
          );
        }

        return true;
      });

  // Paginate emails
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, startIndex + emailsPerPage);

  // Keyboard navigation (J/K for next/previous, X for select, S for star)
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

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

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
              // Navigate to Accounts page
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
      <aside className="email-sidebar">
        {/* Account Selector */}
        <div className="email-account-selector">
          <select
            className="account-select"
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.email}
              </option>
            ))}
          </select>
        </div>

        {/* Compose Button */}
        <Button
          variant="primary"
          icon={<Edit size={18} />}
          fullWidth
          onClick={async () => {
            setShowCompose(true);
            // Load default signature for new emails
            const signatureContent = await getDefaultSignatureContent('new');
            if (signatureContent) {
              setComposeData({ to: '', subject: '', body: signatureContent });
            }
          }}
          className="compose-btn"
        >
          Compose
        </Button>

        {/* Folders */}
        <nav className="email-folders">
          {FOLDERS.map(folder => {
            const FolderIcon = folder.icon;
            const folderEmailsArray = Array.isArray(emails) ? emails : [];
            const count = folderEmailsArray.filter(e => {
              if (folder.id === 'inbox') return !e.labels?.includes('SENT') && !e.labels?.includes('TRASH');
              if (folder.id === 'sent') return e.labels?.includes('SENT');
              if (folder.id === 'starred') return e.starred;
              if (folder.id === 'trash') return e.labels?.includes('TRASH');
              return false;
            }).length;

            return (
              <button
                key={folder.id}
                className={`folder-item ${selectedFolder === folder.id && !selectedLabelFilter ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFolder(folder.id);
                  setSelectedLabelFilter(null); // Clear label filter when selecting folder
                  setSelectedEmail(null);
                  // Reset filter to ALL when changing folders to avoid redundant filtering
                  // (e.g., clicking Starred folder already filters by starred)
                  setFilter(FILTERS.ALL);
                  setCurrentPage(1);
                }}
              >
                <FolderIcon size={20} className="folder-icon" />
                <span className="folder-name">{folder.name}</span>
                {count > 0 && <span className="folder-count">{count}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Labels Section */}
        {userLabels.length > 0 && (
          <div className="sidebar-user-labels">
            <div className="sidebar-labels-header">
              <span className="sidebar-labels-title">Labels</span>
              <button
                className="sidebar-labels-manage-btn"
                onClick={() => setShowLabelManager(true)}
                title="Manage labels"
              >
                <Settings size={14} />
              </button>
            </div>
            {userLabels.map(label => (
              <button
                key={label.id}
                className={`sidebar-label-item ${selectedLabelFilter === label.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLabelFilter(label.id);
                  setSelectedFolder(null);
                  setSelectedEmail(null);
                  setFilter(FILTERS.ALL);
                  setCurrentPage(1);
                }}
              >
                <span
                  className="sidebar-label-color"
                  style={{ backgroundColor: label.color?.backgroundColor || '#999999' }}
                />
                <span className="sidebar-label-name">{label.name}</span>
                {label.messagesTotal > 0 && (
                  <span className="sidebar-label-count">{label.messagesTotal}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Saved Searches */}
        <SavedSearches
          accountId={selectedAccountId}
          onSelectSearch={handleSavedSearchSelect}
          isExpanded={showSavedSearches}
          onToggleExpand={() => setShowSavedSearches(!showSavedSearches)}
        />

        {/* Manage Labels Button */}
        <Button
          variant="ghost"
          icon={<Tag size={16} />}
          onClick={() => setShowLabelManager(true)}
          fullWidth
          style={{ marginTop: 'auto', justifyContent: 'flex-start' }}
        >
          Manage Labels
        </Button>
      </aside>

      {/* Middle Panel - Email List */}
      <div className="email-list-panel">
        {/* Bulk Action Bar - appears when emails are selected */}
        {selectedEmailIds.size > 0 && (
          <div className="bulk-action-bar">
            <div className="bulk-action-left">
              <button
                className="select-all-checkbox"
                onClick={handleSelectAll}
                title={selectedEmailIds.size === paginatedEmails.length ? "Deselect all" : "Select all"}
              >
                {selectedEmailIds.size === paginatedEmails.length ? (
                  <CheckSquare size={20} />
                ) : selectedEmailIds.size > 0 ? (
                  <MinusSquare size={20} />
                ) : (
                  <Square size={20} />
                )}
              </button>
              <span className="bulk-selection-count">
                {selectedEmailIds.size} selected
              </span>
            </div>
            <div className="bulk-action-buttons">
              <Button
                variant="ghost"
                size="small"
                icon={<MailOpen size={16} />}
                onClick={handleBulkMarkAsRead}
                disabled={bulkOperationLoading}
                title="Mark as read"
              >
                Read
              </Button>
              <Button
                variant="ghost"
                size="small"
                icon={<Mail size={16} />}
                onClick={handleBulkMarkAsUnread}
                disabled={bulkOperationLoading}
                title="Mark as unread"
              >
                Unread
              </Button>
              <Button
                variant="ghost"
                size="small"
                icon={<Star size={16} />}
                onClick={handleBulkStar}
                disabled={bulkOperationLoading}
                title="Star"
              >
                Star
              </Button>
              <Button
                variant="ghost"
                size="small"
                icon={<Trash2 size={16} />}
                onClick={handleBulkTrash}
                disabled={bulkOperationLoading}
                title="Move to trash"
              >
                Trash
              </Button>
              <Button
                variant="ghost"
                size="small"
                icon={<X size={16} />}
                onClick={handleCancelSelection}
                disabled={bulkOperationLoading}
                title="Cancel selection"
              >
                Cancel
              </Button>
            </div>
            {bulkOperationLoading && (
              <div className="bulk-loading-indicator">
                <Loader size={16} className="loading-spinner" />
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="email-toolbar">
          <div className="toolbar-left">
            {/* Select Mode Toggle */}
            <button
              className={`select-mode-toggle ${selectMode ? 'active' : ''}`}
              onClick={handleToggleSelectMode}
              title={selectMode ? "Exit selection mode" : "Enter selection mode"}
            >
              {selectMode ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>

            <Button
              variant="ghost"
              icon={<RefreshCw size={18} />}
              onClick={handleSyncEmails}
              loading={syncing}
              disabled={syncing}
              title="Sync emails"
            />

            <Button
              variant="ghost"
              icon={<Settings size={18} />}
              onClick={() => setShowSettings(true)}
              title="Email settings"
            />

            <Button
              variant="ghost"
              icon={<Keyboard size={18} />}
              onClick={() => setShowKeyboardHelp(true)}
              title="Keyboard shortcuts (?)"
            />

            {/* Filter Buttons */}
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === FILTERS.ALL ? 'active' : ''}`}
                onClick={() => setFilter(FILTERS.ALL)}
              >
                All
              </button>
              <button
                className={`filter-btn ${filter === FILTERS.UNREAD ? 'active' : ''}`}
                onClick={() => setFilter(FILTERS.UNREAD)}
              >
                Unread
              </button>
              <button
                className={`filter-btn ${filter === FILTERS.STARRED ? 'active' : ''}`}
                onClick={() => setFilter(FILTERS.STARRED)}
              >
                Starred
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="toolbar-search-wrapper">
            <div className="toolbar-search">
              <Input
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
            </div>
            <Button
              variant="ghost"
              icon={<SlidersHorizontal size={16} />}
              onClick={() => setShowAdvancedSearch(true)}
              title="Advanced search"
              className="advanced-search-btn"
            />
            {activeSearchQuery && (
              <Button
                variant="ghost"
                icon={<XCircle size={16} />}
                onClick={handleClearSearch}
                title="Clear search"
                className="clear-search-btn"
              />
            )}
          </div>
        </div>

        {/* Active Search Indicator */}
        {activeSearchQuery && (
          <div className="active-search-bar">
            <Search size={14} />
            <span className="search-label">
              {activeSearchName ? `"${activeSearchName}"` : 'Search results'}:
            </span>
            <span className="search-query-display">{activeSearchQuery}</span>
            <span className="search-result-count">
              {searchResults ? `${searchResults.total} results` : 'Searching...'}
            </span>
            <button className="clear-search-inline" onClick={handleClearSearch}>
              <X size={14} />
              Clear
            </button>
          </div>
        )}

        {/* Email List */}
        <div className="email-list">
          {loading ? (
            <div className="loading-state">
              <Loader size={24} className="loading-spinner" />
              <span>Loading emails...</span>
            </div>
          ) : paginatedEmails.length === 0 ? (
            <div className="empty-state">
              <Mail size={32} className="empty-icon" />
              <p>No emails found</p>
            </div>
          ) : (
            paginatedEmails.map(email => (
              <div
                key={email.id}
                className={`email-item ${email.unread ? 'unread' : ''} ${selectedEmail?.id === email.id ? 'selected' : ''} ${selectedEmailIds.has(email.id) ? 'bulk-selected' : ''}`}
                onClick={() => selectMode ? handleToggleEmailSelection(email.id) : handleEmailClick(email)}
              >
                <div className="email-item-checkbox">
                  <button
                    className={`email-checkbox ${selectedEmailIds.has(email.id) ? 'checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleEmailSelection(email.id, e);
                    }}
                  >
                    {selectedEmailIds.has(email.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </div>
                <div className="email-item-left">
                  <div className="email-avatar">
                    {(email.from || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                </div>
                <div className="email-item-content">
                  <div className="email-item-header">
                    <span className="email-from">{email.from || 'Unknown'}</span>
                    <span className="email-date">{new Date(email.date).toLocaleDateString()}</span>
                  </div>
                  <div className="email-subject">
                    {email.unread && <span className="unread-dot" />}
                    {email.subject || '(No subject)'}
                  </div>
                  <div className="email-snippet">{email.snippet || ''}</div>
                </div>
                <div className="email-item-actions">
                  <button
                    className={`star-btn ${email.starred ? 'starred' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStar(email.id, email.starred);
                    }}
                  >
                    <Star size={16} fill={email.starred ? 'currentColor' : 'none'} />
                  </button>
                  {email.attachments?.length > 0 && <Paperclip size={16} className="attachment-icon" />}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="email-pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Email Detail */}
      <div className="email-detail-panel">
        {loadingEmailDetail ? (
          <div className="email-detail-loading">
            <Loader size={48} className="loading-spinner" />
            <p>Loading email...</p>
          </div>
        ) : selectedEmail ? (
          <>
            <div className="email-detail-header">
              <h2 className="email-detail-subject">{selectedEmail.subject || '(No subject)'}</h2>
              <div className="email-detail-actions">
                <Button
                  variant="ghost"
                  icon={<Reply size={18} />}
                  title="Reply"
                  onClick={handleReply}
                >
                  Reply
                </Button>
                <Button
                  variant="ghost"
                  icon={<Forward size={18} />}
                  title="Forward"
                  onClick={handleForward}
                >
                  Forward
                </Button>
                <Button
                  variant="ghost"
                  icon={<MailOpen size={18} />}
                  title={selectedEmail.unread ? "Mark as read" : "Mark as unread"}
                  onClick={() => handleMarkAsRead(selectedEmail.id, !selectedEmail.unread)}
                />
                <Button
                  variant="ghost"
                  icon={<Trash2 size={18} />}
                  title="Move to trash"
                  onClick={() => handleTrashEmail(selectedEmail.id)}
                />
                {/* Labels Dropdown */}
                <div className="email-labels-dropdown">
                  <button
                    className="email-labels-trigger"
                    onClick={() => setShowLabelsDropdown(!showLabelsDropdown)}
                    title="Manage labels"
                  >
                    <Tag size={16} />
                    Labels
                  </button>
                  {showLabelsDropdown && (
                    <div className="email-labels-menu">
                      <div className="email-labels-menu-header">
                        <span className="email-labels-menu-title">Labels</span>
                        <button
                          className="email-labels-menu-close"
                          onClick={() => setShowLabelsDropdown(false)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="email-labels-menu-list">
                        {userLabels.length === 0 ? (
                          <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            No labels yet
                          </div>
                        ) : (
                          userLabels.map(label => {
                            const isApplied = selectedEmail.labels?.includes(label.id);
                            return (
                              <button
                                key={label.id}
                                className={`email-labels-menu-item ${isApplied ? 'applied' : ''}`}
                                onClick={() => {
                                  if (isApplied) {
                                    handleRemoveLabel(selectedEmail.id, label.id);
                                  } else {
                                    handleApplyLabel(selectedEmail.id, label.id);
                                  }
                                }}
                                disabled={applyingLabel === label.id}
                              >
                                <span className="label-checkbox">
                                  {isApplied && <Check size={12} />}
                                </span>
                                <span className="label-info">
                                  <span
                                    className="label-color-indicator"
                                    style={{ backgroundColor: label.color?.backgroundColor || '#999999' }}
                                  />
                                  <span className="label-name">{label.name}</span>
                                </span>
                                {applyingLabel === label.id && (
                                  <Loader size={14} className="loading-spinner" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="email-labels-menu-footer">
                        <button
                          className="email-labels-manage-btn"
                          onClick={() => {
                            setShowLabelsDropdown(false);
                            setShowLabelManager(true);
                          }}
                        >
                          Manage labels
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Display current email labels */}
            {selectedEmail.labels?.filter(l => userLabels.some(ul => ul.id === l)).length > 0 && (
              <div className="email-detail-labels">
                {selectedEmail.labels
                  .filter(labelId => userLabels.some(ul => ul.id === labelId))
                  .map(labelId => {
                    const info = getLabelInfo(labelId);
                    return (
                      <span
                        key={labelId}
                        className="email-label-badge"
                        style={{
                          backgroundColor: info.color,
                          color: info.textColor
                        }}
                      >
                        {info.name}
                        <button
                          className="remove-label-btn"
                          onClick={() => handleRemoveLabel(selectedEmail.id, labelId)}
                          title="Remove label"
                          disabled={applyingLabel === labelId}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
              </div>
            )}

            <div className="email-detail-meta">
              <div className="email-sender">
                <div className="email-sender-avatar">
                  {getInitials(selectedEmail.from)}
                </div>
                <div className="email-sender-info">
                  <div className="email-sender-name">{selectedEmail.from || 'Unknown'}</div>
                  <div className="email-sender-email">to: {selectedEmail.to || 'me'}</div>
                </div>
              </div>
              <div className="email-detail-date">
                <Calendar size={14} />
                {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ''}
              </div>
            </div>

            {emailAttachments.length > 0 && (
              <div className="email-attachments">
                <div className="attachments-header">
                  <Paperclip size={16} />
                  <span>{emailAttachments.length} attachment(s)</span>
                </div>
                <div className="attachments-list">
                  {emailAttachments.map((attachment, idx) => (
                    <div key={idx} className="attachment-item attachment-downloadable">
                      <FileIcon size={14} className="attachment-file-icon" />
                      <span className="attachment-name">{attachment.filename}</span>
                      <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                      <button
                        className="attachment-download-btn"
                        onClick={() => handleDownloadAttachment(attachment)}
                        disabled={downloadingAttachment === attachment.id}
                        title="Download attachment"
                      >
                        {downloadingAttachment === attachment.id ? (
                          <Loader size={14} className="loading-spinner" />
                        ) : (
                          <Download size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="email-detail-body">
              {selectedEmail.body ? (
                <EmailBodyIframe
                  body={selectedEmail.body}
                  emailId={selectedEmail.id}
                  accountId={selectedAccountId}
                />
              ) : (
                <div className="email-text-body">{selectedEmail.snippet}</div>
              )}
            </div>
          </>
        ) : (
          <div className="email-detail-empty">
            <Mail size={48} className="empty-icon" />
            <p>Select an email to view</p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <Modal
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false);
          setComposeData({ to: '', subject: '', body: '' });
          setComposeAttachments([]);
        }}
        title="Compose Email"
        size="large"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCompose(false);
                setComposeData({ to: '', subject: '', body: '' });
                setComposeAttachments([]);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Send size={18} />}
              onClick={handleSendEmail}
              loading={sending}
              disabled={sending || !composeData.to || !composeData.subject}
            >
              Send{composeAttachments.length > 0 ? ` (${composeAttachments.length} attachment${composeAttachments.length > 1 ? 's' : ''})` : ''}
            </Button>
          </>
        }
      >
        <div className="compose-form">
          <Input
            label="To"
            type="email"
            placeholder="recipient@example.com"
            value={composeData.to}
            onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
            fullWidth
            required
          />
          <Input
            label="Subject"
            type="text"
            placeholder="Email subject"
            value={composeData.subject}
            onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
            fullWidth
            required
          />
          <div className="compose-body-field">
            <div className="compose-body-header">
              <label className="compose-body-label">Message</label>
              <div className="compose-toolbar">
                <div className="template-btn-wrapper">
                  <Button
                    variant="ghost"
                    size="small"
                    icon={<FileText size={16} />}
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    title="Insert template"
                  >
                    Templates
                  </Button>
                  <TemplateSelector
                    isOpen={showTemplateSelector}
                    onClose={() => setShowTemplateSelector(false)}
                    accountId={selectedAccountId}
                    onSelect={(template) => {
                      // Insert template - replace or append based on current content
                      const hasContent = composeData.subject || composeData.body;
                      if (hasContent) {
                        const replaceContent = confirm(
                          'Replace current subject and body with template?\n\n' +
                          'Click OK to replace, or Cancel to append template body only.'
                        );
                        if (replaceContent) {
                          setComposeData({
                            ...composeData,
                            subject: template.subject || composeData.subject,
                            body: template.body || ''
                          });
                        } else {
                          setComposeData({
                            ...composeData,
                            body: composeData.body + '\n\n' + (template.body || '')
                          });
                        }
                      } else {
                        setComposeData({
                          ...composeData,
                          subject: template.subject || '',
                          body: template.body || ''
                        });
                      }
                    }}
                    onManageTemplates={() => setShowTemplateManager(true)}
                  />
                </div>
                {/* Signature Selector */}
                {signatures.length > 0 && (
                  <div className="signature-selector-wrapper">
                    <select
                      className="signature-selector"
                      value={selectedSignatureId || ''}
                      onChange={(e) => {
                        const sigId = e.target.value;
                        if (sigId) {
                          insertSignature(sigId);
                        }
                      }}
                      title="Select signature"
                    >
                      <option value="">Select signature...</option>
                      {signatures.map(sig => (
                        <option key={sig.id} value={sig.id}>
                          {sig.name} {sig.is_default === 1 ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="small"
                  icon={<PenSquare size={16} />}
                  onClick={() => setShowSignatureManager(true)}
                  title="Manage signatures"
                >
                  Signatures
                </Button>
              </div>
            </div>
            <textarea
              className="compose-body-textarea"
              placeholder="Type your message here..."
              value={composeData.body}
              onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
              rows={10}
            />
          </div>

          {/* Attachments Section */}
          <div className="compose-attachments">
            <div className="compose-attachments-header">
              <label className="compose-attachments-label">Attachments</label>
              <Button
                variant="ghost"
                size="small"
                icon={<Plus size={16} />}
                onClick={handleAddAttachment}
              >
                Add File
              </Button>
            </div>
            {composeAttachments.length > 0 && (
              <div className="compose-attachments-list">
                {composeAttachments.map((file, idx) => (
                  <div key={idx} className="compose-attachment-item">
                    <FileIcon size={14} className="attachment-file-icon" />
                    <span className="attachment-name">{file.name}</span>
                    <span className="attachment-size">{formatFileSize(file.size)}</span>
                    <button
                      className="attachment-remove-btn"
                      onClick={() => handleRemoveAttachment(idx)}
                      title="Remove attachment"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Reply Modal */}
      <Modal
        isOpen={showReplyModal}
        onClose={() => {
          setShowReplyModal(false);
          setReplyData({ to: '', subject: '', body: '' });
        }}
        title="Reply to Email"
        size="large"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowReplyModal(false);
                setReplyData({ to: '', subject: '', body: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Send size={18} />}
              onClick={handleSendReply}
              loading={sendingReply}
              disabled={sendingReply || !replyData.to || !replyData.subject}
            >
              Send Reply
            </Button>
          </>
        }
      >
        <div className="compose-form">
          <Input
            label="To"
            type="email"
            placeholder="recipient@example.com"
            value={replyData.to}
            onChange={(e) => setReplyData({ ...replyData, to: e.target.value })}
            fullWidth
            required
          />
          <Input
            label="Subject"
            type="text"
            placeholder="Email subject"
            value={replyData.subject}
            onChange={(e) => setReplyData({ ...replyData, subject: e.target.value })}
            fullWidth
            required
          />
          <div className="compose-body-field">
            <label className="compose-body-label">Message</label>
            <textarea
              className="compose-body-textarea"
              placeholder="Type your reply here..."
              value={replyData.body}
              onChange={(e) => setReplyData({ ...replyData, body: e.target.value })}
              rows={12}
            />
          </div>
        </div>
      </Modal>

      {/* Forward Modal */}
      <Modal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardData({ to: '', subject: '', body: '' });
        }}
        title="Forward Email"
        size="large"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForwardModal(false);
                setForwardData({ to: '', subject: '', body: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Send size={18} />}
              onClick={handleSendForward}
              loading={sendingReply}
              disabled={sendingReply || !forwardData.to || !forwardData.subject}
            >
              Send Forward
            </Button>
          </>
        }
      >
        <div className="compose-form">
          <Input
            label="To"
            type="email"
            placeholder="recipient@example.com"
            value={forwardData.to}
            onChange={(e) => setForwardData({ ...forwardData, to: e.target.value })}
            fullWidth
            required
          />
          <Input
            label="Subject"
            type="text"
            placeholder="Email subject"
            value={forwardData.subject}
            onChange={(e) => setForwardData({ ...forwardData, subject: e.target.value })}
            fullWidth
            required
          />
          <div className="compose-body-field">
            <label className="compose-body-label">Message</label>
            <textarea
              className="compose-body-textarea"
              placeholder="Add a message (optional)..."
              value={forwardData.body}
              onChange={(e) => setForwardData({ ...forwardData, body: e.target.value })}
              rows={12}
            />
          </div>
        </div>
      </Modal>

      {/* Template Manager Modal */}
      <TemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        accountId={selectedAccountId}
        onSelectTemplate={(template) => {
          // If compose is open, insert the template
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
          // Refresh labels when changes are made
          loadLabels();
        }}
      />

      {/* Signature Manager Modal */}
      <SignatureManager
        isOpen={showSignatureManager}
        onClose={() => setShowSignatureManager(false)}
        accountId={selectedAccountId}
        onSignatureChange={() => {
          // Refresh signatures when changes are made
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
