import { Inbox, Send, Star, Trash2 } from 'lucide-react';

/**
 * Email filter constants
 */
export const FILTERS = {
  ALL: 'all',
  UNREAD: 'unread',
  STARRED: 'starred'
};

/**
 * Default email folders
 */
export const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: Inbox },
  { id: 'sent', name: 'Sent', icon: Send },
  { id: 'starred', name: 'Starred', icon: Star },
  { id: 'trash', name: 'Trash', icon: Trash2 }
];

/**
 * Default email settings
 */
export const DEFAULT_EMAIL_SETTINGS = {
  readingPanePosition: 'right',
  markAsReadDelay: 3,
  defaultCompose: 'html',
  conversationView: true,
  syncFrequency: 15,
  notifications: true,
  defaultSignatureId: null,
  imageLoading: 'ask',
  cacheRetentionDays: 30
};

/**
 * Pagination settings
 */
export const EMAILS_PER_PAGE = 50;

/**
 * Email data normalization
 */
export function normalizeEmailData(email) {
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
}

/**
 * Utility functions
 */
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatDate(dateString) {
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
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
