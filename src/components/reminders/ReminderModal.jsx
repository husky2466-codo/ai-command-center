import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Bell, Repeat, Link as LinkIcon, Calendar, Clock } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { reminderService } from '../../services/reminderService';

/**
 * ReminderModal Component
 *
 * Modal for creating and editing reminders with full options:
 * - Title and description
 * - Due date and time
 * - Recurring patterns
 * - URL links
 */
export default function ReminderModal({ isOpen, reminder, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    is_recurring: false,
    recurrence_rule: 'daily',
    url: ''
  });
  const [customRecurrence, setCustomRecurrence] = useState({
    count: 1,
    unit: 'days'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form when reminder changes
  useEffect(() => {
    if (reminder) {
      // Editing existing reminder
      const dueAt = reminder.due_at ? new Date(reminder.due_at) : null;

      setFormData({
        title: reminder.title || '',
        description: reminder.description || '',
        due_date: dueAt ? dueAt.toISOString().split('T')[0] : '',
        due_time: dueAt ? dueAt.toTimeString().slice(0, 5) : '',
        is_recurring: reminder.is_recurring === 1,
        recurrence_rule: reminder.recurrence_rule || 'daily',
        url: reminder.url || ''
      });

      // Parse custom recurrence if present
      if (reminder.recurrence_rule?.startsWith('custom:')) {
        const [, count, unit] = reminder.recurrence_rule.split(':');
        setCustomRecurrence({
          count: parseInt(count, 10) || 1,
          unit: unit || 'days'
        });
      }
    } else {
      // Creating new reminder
      setFormData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        is_recurring: false,
        recurrence_rule: 'daily',
        url: ''
      });
      setCustomRecurrence({ count: 1, unit: 'days' });
    }
    setError(null);
  }, [reminder, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomRecurrenceChange = (field, value) => {
    setCustomRecurrence(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);

      // Build due_at timestamp
      let dueAt = null;
      if (formData.due_date) {
        const dateStr = formData.due_time
          ? `${formData.due_date}T${formData.due_time}:00`
          : `${formData.due_date}T09:00:00`;
        dueAt = new Date(dateStr).toISOString();
      }

      // Build recurrence rule
      let recurrenceRule = null;
      if (formData.is_recurring) {
        if (formData.recurrence_rule === 'custom') {
          recurrenceRule = `custom:${customRecurrence.count}:${customRecurrence.unit}`;
        } else {
          recurrenceRule = formData.recurrence_rule;
        }
      }

      const data = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        due_at: dueAt,
        is_recurring: formData.is_recurring ? 1 : 0,
        recurrence_rule: recurrenceRule,
        url: formData.url.trim() || null,
        status: 'pending',
        snooze_count: reminder ? reminder.snooze_count : 0
      };

      if (reminder) {
        // Update existing
        await reminderService.update(reminder.id, data);
      } else {
        // Create new
        await reminderService.create(data);
      }

      onSave();
    } catch (err) {
      console.error('Failed to save reminder:', err);
      setError('Failed to save reminder: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="modal-actions">
      <Button variant="secondary" onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : reminder ? 'Update' : 'Create'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={reminder ? 'Edit Reminder' : 'New Reminder'}
      footer={footer}
      size="medium"
    >
      <form onSubmit={handleSubmit} className="reminder-form">
        {/* Error Message */}
        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="form-group">
          <label htmlFor="reminder-title" className="form-label">
            <Bell size={16} />
            Title *
          </label>
          <Input
            id="reminder-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Call John about project update"
            autoFocus
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="reminder-description" className="form-label">
            Description
          </label>
          <textarea
            id="reminder-description"
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Additional details (optional)"
            rows={3}
          />
        </div>

        {/* Due Date and Time */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reminder-due-date" className="form-label">
              <Calendar size={16} />
              Due Date
            </label>
            <Input
              id="reminder-due-date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reminder-due-time" className="form-label">
              <Clock size={16} />
              Time
            </label>
            <Input
              id="reminder-due-time"
              type="time"
              value={formData.due_time}
              onChange={(e) => handleChange('due_time', e.target.value)}
              disabled={!formData.due_date}
            />
          </div>
        </div>

        {/* Recurring */}
        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={formData.is_recurring}
              onChange={(e) => handleChange('is_recurring', e.target.checked)}
            />
            <Repeat size={16} />
            <span>Recurring reminder</span>
          </label>
        </div>

        {/* Recurrence Options */}
        {formData.is_recurring && (
          <div className="form-group recurring-options">
            <label className="form-label">Repeat every</label>
            <select
              className="form-select"
              value={formData.recurrence_rule}
              onChange={(e) => handleChange('recurrence_rule', e.target.value)}
            >
              <option value="daily">Day</option>
              <option value="weekly">Week</option>
              <option value="monthly">Month</option>
              <option value="custom">Custom...</option>
            </select>

            {formData.recurrence_rule === 'custom' && (
              <div className="custom-recurrence">
                <Input
                  type="number"
                  min="1"
                  value={customRecurrence.count}
                  onChange={(e) => handleCustomRecurrenceChange('count', parseInt(e.target.value, 10))}
                  className="recurrence-count"
                />
                <select
                  className="form-select"
                  value={customRecurrence.unit}
                  onChange={(e) => handleCustomRecurrenceChange('unit', e.target.value)}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* URL */}
        <div className="form-group">
          <label htmlFor="reminder-url" className="form-label">
            <LinkIcon size={16} />
            Link (optional)
          </label>
          <Input
            id="reminder-url"
            type="url"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </form>
    </Modal>
  );
}

ReminderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  reminder: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    due_at: PropTypes.string,
    is_recurring: PropTypes.number,
    recurrence_rule: PropTypes.string,
    snooze_count: PropTypes.number,
    url: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};
