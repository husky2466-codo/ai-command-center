import React from 'react';
import { Star, Paperclip, CheckSquare, Square } from 'lucide-react';

/**
 * EmailListItem - Memoized individual email row for virtual list
 * Optimized to prevent unnecessary re-renders
 */
const EmailListItem = React.memo(function EmailListItem({
  email,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onToggleStar,
  selectMode,
  style
}) {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Less than 1 hour ago
    if (diffMins < 60) {
      return diffMins === 0 ? 'Just now' : `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours ago
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }

    // Yesterday
    if (diffDays === 1) {
      return 'Yesterday';
    }

    // Less than 7 days ago
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    // Older
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      style={style}
      className={`email-item ${email.unread ? 'unread' : ''} ${isSelected ? 'selected' : ''} ${isChecked ? 'bulk-selected' : ''} ${selectMode ? 'select-mode' : ''}`}
      onClick={() => {
        if (selectMode) {
          onToggleCheck(email.id);
        } else {
          onSelect(email);
        }
      }}
    >
      {/* Checkbox - visible in select mode or on hover */}
      <div className="email-item-checkbox">
        <button
          className={`email-checkbox ${isChecked ? 'checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck(email.id, e);
          }}
          title={isChecked ? 'Deselect' : 'Select'}
        >
          {isChecked ? (
            <CheckSquare size={18} />
          ) : (
            <Square size={18} />
          )}
        </button>
      </div>

      <div className="email-item-left">
        <div className="email-avatar">
          {getInitials(email.from)}
        </div>
      </div>

      <div className="email-item-content">
        <div className="email-item-header">
          <span className="email-from">{email.from || 'Unknown'}</span>
          <span className="email-date">{formatDate(email.date)}</span>
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
            onToggleStar(email.id, email.starred);
          }}
          title={email.starred ? 'Unstar' : 'Star'}
        >
          <Star size={16} fill={email.starred ? 'currentColor' : 'none'} />
        </button>
        {email.attachments?.length > 0 && (
          <Paperclip size={16} className="attachment-icon" />
        )}
      </div>
    </div>
  );
});

export default EmailListItem;
