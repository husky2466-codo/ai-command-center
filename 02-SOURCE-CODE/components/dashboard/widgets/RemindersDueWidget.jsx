import React from 'react';
import { Bell, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../shared/Card';
import Badge from '../../shared/Badge';

/**
 * RemindersDueWidget - Overdue + today's reminders with quick actions
 */
function RemindersDueWidget({ reminders, onNavigate, onComplete }) {
  if (!reminders) return null;

  const handleReminderClick = (reminder) => {
    if (onNavigate) {
      onNavigate('reminders', { reminderId: reminder.id });
    }
  };

  const handleComplete = (e, reminder) => {
    e.stopPropagation();
    if (onComplete) {
      onComplete(reminder.id);
    }
  };

  const formatDueTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card
      title="Reminders"
      className="reminders-due-widget"
      variant="default"
      padding="md"
      hoverable
    >
      <div className="widget-icon">
        <Bell size={20} />
      </div>

      {reminders.totalCount === 0 ? (
        <div className="widget-empty">
          <CheckCircle size={24} className="empty-icon-success" />
          <p>All caught up!</p>
        </div>
      ) : (
        <div className="reminders-sections">
          {reminders.overdue.count > 0 && (
            <div className="reminders-section overdue">
              <div className="section-header">
                <AlertCircle size={16} className="section-icon-error" />
                <h4>Overdue</h4>
                <Badge text={reminders.overdue.count} variant="error" size="sm" />
              </div>
              <div className="reminders-list">
                {reminders.overdue.items.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="reminder-item"
                    onClick={() => handleReminderClick(reminder)}
                  >
                    <span className="reminder-text">{reminder.text}</span>
                    <button
                      className="btn-icon"
                      onClick={(e) => handleComplete(e, reminder)}
                      title="Complete"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reminders.dueToday.count > 0 && (
            <div className="reminders-section due-today">
              <div className="section-header">
                <Bell size={16} className="section-icon-warning" />
                <h4>Due Today</h4>
                <Badge text={reminders.dueToday.count} variant="warning" size="sm" />
              </div>
              <div className="reminders-list">
                {reminders.dueToday.items.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="reminder-item"
                    onClick={() => handleReminderClick(reminder)}
                  >
                    <span className="reminder-text">{reminder.text}</span>
                    <span className="reminder-time">{formatDueTime(reminder.due_at)}</span>
                    <button
                      className="btn-icon"
                      onClick={(e) => handleComplete(e, reminder)}
                      title="Complete"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="widget-footer">
        <span className="widget-count">{reminders.totalCount} active</span>
        <button
          className="btn-link"
          onClick={() => onNavigate && onNavigate('reminders')}
        >
          View all
        </button>
      </div>
    </Card>
  );
}

export default RemindersDueWidget;
