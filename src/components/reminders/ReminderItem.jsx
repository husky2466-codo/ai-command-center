import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Check, Clock, AlertTriangle, MoreVertical, Edit2, Trash2, ExternalLink, Repeat } from 'lucide-react';
import Badge from '../shared/Badge';
import { reminderService } from '../../services/reminderService';

/**
 * ReminderItem Component
 *
 * Individual reminder card with checkbox, snooze dropdown, and action menu.
 * Shows snooze count badge and warning for heavily snoozed items.
 */
export default function ReminderItem({ reminder, onComplete, onSnooze, onEdit, onDelete }) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const snoozeOptions = reminderService.getSnoozeOptions();

  // Format due date for display
  const formatDueDate = (dueAt) => {
    if (!dueAt) return null;

    const date = new Date(dueAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if today
    if (date >= today && date < tomorrow) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    // Check if this year
    const isSameYear = date.getFullYear() === now.getFullYear();

    const options = {
      month: 'short',
      day: 'numeric',
      ...(isSameYear ? {} : { year: 'numeric' }),
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    return date.toLocaleString('en-US', options);
  };

  // Get relative time description
  const getRelativeTime = (dueAt) => {
    if (!dueAt) return '';

    const date = new Date(dueAt);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) {
      // Overdue
      const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
      if (days === 0) return 'overdue today';
      if (days === 1) return '1 day overdue';
      if (days < 7) return `${days} days overdue`;
      const weeks = Math.floor(days / 7);
      if (weeks === 1) return '1 week overdue';
      return `${weeks} weeks overdue`;
    } else {
      // Upcoming
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return 'in less than 1 hour';
      if (hours < 24) return `in ${hours} hour${hours > 1 ? 's' : ''}`;

      const days = Math.floor(hours / 24);
      if (days === 1) return 'tomorrow';
      if (days < 7) return `in ${days} days`;

      const weeks = Math.floor(days / 7);
      if (weeks === 1) return 'in 1 week';
      return `in ${weeks} weeks`;
    }
  };

  const handleSnooze = (until) => {
    onSnooze(reminder.id, until);
    setShowSnoozeMenu(false);
  };

  const handleComplete = () => {
    onComplete(reminder.id);
  };

  const handleEdit = () => {
    onEdit(reminder);
    setShowActionMenu(false);
  };

  const handleDelete = () => {
    onDelete(reminder.id);
    setShowActionMenu(false);
  };

  const snoozeCount = reminder.snooze_count || 0;
  const isHighlySnoozed = snoozeCount >= 3;
  const isSnoozed = snoozeCount >= 2;
  const dueDate = reminder.effectiveDueAt || reminder.due_at;
  const formattedDate = formatDueDate(dueDate);
  const relativeTime = getRelativeTime(dueDate);
  const isCompleted = reminder.status === 'completed';

  return (
    <div className={`reminder-item ${isCompleted ? 'completed' : ''}`}>
      {/* Checkbox */}
      <button
        className="reminder-checkbox"
        onClick={handleComplete}
        disabled={isCompleted}
        aria-label={isCompleted ? 'Completed' : 'Mark as complete'}
      >
        {isCompleted ? (
          <Check size={16} className="check-icon" />
        ) : (
          <div className="checkbox-empty" />
        )}
      </button>

      {/* Content */}
      <div className="reminder-content" onClick={handleEdit}>
        <div className="reminder-header">
          <h3 className="reminder-title">{reminder.title}</h3>
          <div className="reminder-badges">
            {reminder.is_recurring === 1 && (
              <Badge className="badge-recurring" title="Recurring">
                <Repeat size={12} />
              </Badge>
            )}
            {isHighlySnoozed && (
              <Badge className="badge-error" title={`Snoozed ${snoozeCount} times`}>
                <AlertTriangle size={12} />
                {snoozeCount}x
              </Badge>
            )}
            {isSnoozed && !isHighlySnoozed && (
              <Badge className="badge-warning" title={`Snoozed ${snoozeCount} times`}>
                <Clock size={12} />
                {snoozeCount}x
              </Badge>
            )}
          </div>
        </div>

        {reminder.description && (
          <p className="reminder-description">{reminder.description}</p>
        )}

        <div className="reminder-footer">
          {formattedDate && (
            <div className="reminder-time">
              <Clock size={14} />
              <span className="time-formatted">{formattedDate}</span>
              {relativeTime && <span className="time-relative">({relativeTime})</span>}
            </div>
          )}
          {reminder.url && (
            <a
              href={reminder.url}
              target="_blank"
              rel="noopener noreferrer"
              className="reminder-link"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
              Link
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="reminder-actions">
          {/* Snooze Dropdown */}
          <div className="action-dropdown">
            <button
              className="action-btn btn-snooze"
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
              aria-label="Snooze"
            >
              <Clock size={16} />
            </button>
            {showSnoozeMenu && (
              <div className="dropdown-menu snooze-menu">
                {snoozeOptions.map((option, index) => (
                  <button
                    key={index}
                    className="dropdown-item"
                    onClick={() => handleSnooze(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Menu */}
          <div className="action-dropdown">
            <button
              className="action-btn btn-more"
              onClick={() => setShowActionMenu(!showActionMenu)}
              aria-label="More actions"
            >
              <MoreVertical size={16} />
            </button>
            {showActionMenu && (
              <div className="dropdown-menu action-menu">
                <button className="dropdown-item" onClick={handleEdit}>
                  <Edit2 size={14} />
                  Edit
                </button>
                <button className="dropdown-item delete" onClick={handleDelete}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed badge */}
      {isCompleted && (
        <div className="completed-badge">
          <Check size={14} />
          Completed
        </div>
      )}
    </div>
  );
}

ReminderItem.propTypes = {
  reminder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    due_at: PropTypes.string,
    effectiveDueAt: PropTypes.string,
    is_recurring: PropTypes.number,
    recurrence_rule: PropTypes.string,
    snooze_count: PropTypes.number,
    snoozed_until: PropTypes.string,
    status: PropTypes.string,
    url: PropTypes.string
  }).isRequired,
  onComplete: PropTypes.func.isRequired,
  onSnooze: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};
