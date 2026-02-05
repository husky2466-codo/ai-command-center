import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Filter, Check, Clock, AlertTriangle } from 'lucide-react';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import ReminderItem from './ReminderItem';
import ReminderModal from './ReminderModal';
import { reminderService } from '../../services/reminderService';
import './Reminders.css';

/**
 * Reminders Component
 *
 * Main reminders module with time-based grouping, snooze workflow, and priority filtering.
 * Features:
 * - Grouped views (Overdue, Today, Upcoming, Later, Anytime, Completed)
 * - Quick add with natural language parsing
 * - Snooze functionality with escalation warnings
 * - Priority filtering
 * - Recurring reminders
 */
export default function Reminders() {
  const [groups, setGroups] = useState({
    overdue: [],
    today: [],
    upcoming: [],
    later: [],
    anytime: [],
    completed: []
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load reminders
  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const grouped = await reminderService.getGrouped();
      setGroups(grouped);
    } catch (err) {
      console.error('Failed to load reminders:', err);
      setError('Failed to load reminders: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Handle quick add
  const handleQuickAdd = async () => {
    if (!quickAddText.trim()) return;

    try {
      // Try to parse natural language
      const parsed = reminderService.parseNaturalDate(quickAddText);

      if (parsed) {
        // Create reminder with parsed date
        await reminderService.create({
          title: parsed.title,
          due_at: parsed.dueAt,
          status: 'pending',
          is_recurring: 0,
          snooze_count: 0
        });
      } else {
        // Create as "anytime" reminder (no due date)
        await reminderService.create({
          title: quickAddText,
          due_at: null,
          status: 'pending',
          is_recurring: 0,
          snooze_count: 0
        });
      }

      setQuickAddText('');
      await loadReminders();
    } catch (err) {
      console.error('Failed to create reminder:', err);
      setError('Failed to create reminder: ' + err.message);
    }
  };

  // Handle quick add on Enter key
  const handleQuickAddKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleQuickAdd();
    }
  };

  // Handle reminder actions
  const handleComplete = async (id) => {
    try {
      await reminderService.complete(id);
      await loadReminders();
    } catch (err) {
      console.error('Failed to complete reminder:', err);
      setError('Failed to complete reminder: ' + err.message);
    }
  };

  const handleSnooze = async (id, until) => {
    try {
      await reminderService.snooze(id, until);
      await loadReminders();
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
      setError('Failed to snooze reminder: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      await reminderService.delete(id);
      await loadReminders();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      setError('Failed to delete reminder: ' + err.message);
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingReminder(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingReminder(null);
  };

  const handleModalSave = async () => {
    await loadReminders();
    handleModalClose();
  };

  // Filter tabs
  const filters = [
    { id: 'all', label: 'All', count: groups.overdue.length + groups.today.length + groups.upcoming.length + groups.later.length + groups.anytime.length },
    { id: 'overdue', label: 'Overdue', count: groups.overdue.length },
    { id: 'today', label: 'Today', count: groups.today.length },
    { id: 'upcoming', label: 'Next 7 Days', count: groups.upcoming.length },
    { id: 'later', label: 'Later', count: groups.later.length },
    { id: 'anytime', label: 'Anytime', count: groups.anytime.length },
    { id: 'completed', label: 'Completed', count: groups.completed.length }
  ];

  // Get filtered groups
  const getVisibleGroups = () => {
    if (activeFilter === 'all') {
      return [
        { id: 'overdue', label: 'Overdue', items: groups.overdue, color: 'error' },
        { id: 'today', label: 'Today', items: groups.today, color: 'warning' },
        { id: 'upcoming', label: 'Next 7 Days', items: groups.upcoming, color: 'info' },
        { id: 'later', label: 'Later', items: groups.later, color: 'default' },
        { id: 'anytime', label: 'Anytime', items: groups.anytime, color: 'muted' }
      ];
    } else if (activeFilter === 'completed') {
      return [
        { id: 'completed', label: 'Completed', items: groups.completed, color: 'success' }
      ];
    } else {
      const group = groups[activeFilter];
      const colors = {
        overdue: 'error',
        today: 'warning',
        upcoming: 'info',
        later: 'default',
        anytime: 'muted'
      };
      return [
        { id: activeFilter, label: filters.find(f => f.id === activeFilter)?.label || '', items: group, color: colors[activeFilter] }
      ];
    }
  };

  const visibleGroups = getVisibleGroups();

  return (
    <div className="reminders-container">
      {/* Header */}
      <div className="reminders-header">
        <div className="reminders-header-content">
          <div className="reminders-title-section">
            <Bell className="reminders-icon" size={28} />
            <div>
              <h1 className="reminders-title">Reminders</h1>
              <p className="reminders-subtitle">Time-based tasks with smart snooze workflow</p>
            </div>
          </div>
          <Button onClick={handleAdd} className="btn-add-reminder">
            <Plus size={18} />
            New Reminder
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="reminders-filters">
        {filters.map(filter => (
          <button
            key={filter.id}
            className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <span className="filter-label">{filter.label}</span>
            {filter.count > 0 && (
              <Badge className={`filter-badge ${filter.id === 'overdue' ? 'badge-error' : ''}`}>
                {filter.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Quick Add */}
      <div className="reminders-quick-add">
        <input
          type="text"
          className="quick-add-input"
          placeholder='Quick add: "Call John tomorrow 3pm" or "Review docs next week"'
          value={quickAddText}
          onChange={(e) => setQuickAddText(e.target.value)}
          onKeyPress={handleQuickAddKeyPress}
        />
        <Button onClick={handleQuickAdd} disabled={!quickAddText.trim()}>
          <Plus size={16} />
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="reminders-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-dismiss">×</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="reminders-loading">
          <Clock size={24} className="loading-icon" />
          <p>Loading reminders...</p>
        </div>
      )}

      {/* Reminder Groups */}
      {!loading && (
        <div className="reminders-content">
          {visibleGroups.map(group => (
            group.items.length > 0 && (
              <div key={group.id} className="reminder-group">
                <div className={`group-header group-${group.color}`}>
                  <h2 className="group-title">{group.label}</h2>
                  <Badge className={`group-count ${group.color === 'error' ? 'badge-error' : ''}`}>
                    {group.items.length}
                  </Badge>
                </div>
                <div className="group-items">
                  {group.items.map(reminder => (
                    <ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      onComplete={handleComplete}
                      onSnooze={handleSnooze}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )
          ))}

          {/* Empty State */}
          {visibleGroups.every(g => g.items.length === 0) && (
            <div className="reminders-empty">
              <Bell size={48} className="empty-icon" />
              <h3 className="empty-title">No reminders here</h3>
              <p className="empty-text">
                {activeFilter === 'all'
                  ? 'Create your first reminder using the button above or quick add'
                  : `No ${activeFilter} reminders at the moment`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        reminder={editingReminder}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
}
