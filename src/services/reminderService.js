/**
 * ReminderService - Handles all reminder operations
 *
 * Features:
 * - CRUD operations for reminders
 * - Snooze functionality with count tracking
 * - Recurrence logic (daily, weekly, monthly)
 * - Grouping by time buckets (overdue, today, upcoming, etc.)
 * - Natural language date parsing helpers
 */

import { BaseService } from './BaseService.js';

export class ReminderService extends BaseService {
  constructor() {
    super('reminders');
  }

  /**
   * Get reminders grouped by time buckets
   * @returns {Promise<Object>} Object with arrays for each time bucket
   */
  async getGrouped() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get all active reminders (pending or snoozed)
    const allReminders = await this.query(
      `status IN ('pending', 'snoozed') ORDER BY due_at ASC`,
      []
    );

    const groups = {
      overdue: [],
      today: [],
      upcoming: [], // Next 7 days
      later: [], // Beyond 7 days
      anytime: [], // No due date
      completed: []
    };

    // Get completed reminders (last 7 days)
    const completedReminders = await this.query(
      `status = 'completed' AND completed_at >= datetime('now', '-7 days') ORDER BY completed_at DESC`,
      []
    );
    groups.completed = completedReminders;

    // Group active reminders
    for (const reminder of allReminders) {
      // Handle snoozed reminders
      if (reminder.status === 'snoozed' && reminder.snoozed_until) {
        const snoozeDate = new Date(reminder.snoozed_until);
        if (snoozeDate > now) {
          // Still snoozed, use snoozed_until as effective due date
          reminder.effectiveDueAt = reminder.snoozed_until;
        } else {
          // Snooze expired, revert to original due_at
          reminder.effectiveDueAt = reminder.due_at;
        }
      } else {
        reminder.effectiveDueAt = reminder.due_at;
      }

      if (!reminder.effectiveDueAt) {
        groups.anytime.push(reminder);
      } else {
        const dueDate = new Date(reminder.effectiveDueAt);

        if (dueDate < today) {
          groups.overdue.push(reminder);
        } else if (dueDate < tomorrow) {
          groups.today.push(reminder);
        } else if (dueDate < nextWeek) {
          groups.upcoming.push(reminder);
        } else {
          groups.later.push(reminder);
        }
      }
    }

    return groups;
  }

  /**
   * Get reminders due now (for notifications)
   * @returns {Promise<Array>} Reminders that are due
   */
  async getDue() {
    const result = await window.electronAPI.dbQuery(
      `SELECT * FROM ${this.tableName}
       WHERE status = 'pending'
       AND due_at <= datetime('now')
       AND (snoozed_until IS NULL OR snoozed_until <= datetime('now'))
       ORDER BY due_at ASC`
    );

    if (!result.success) {
      throw new Error(`Failed to get due reminders: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Snooze a reminder
   * @param {string} id - Reminder ID
   * @param {string} until - ISO date string for when to resume
   * @returns {Promise<Object>} Updated reminder
   */
  async snooze(id, until) {
    const reminder = await this.getById(id);
    if (!reminder) {
      throw new Error('Reminder not found');
    }

    const newSnoozeCount = (reminder.snooze_count || 0) + 1;

    const result = await window.electronAPI.dbRun(
      `UPDATE ${this.tableName}
       SET snoozed_until = ?,
           snooze_count = ?,
           status = 'snoozed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [until, newSnoozeCount, id]
    );

    if (!result.success) {
      throw new Error(`Failed to snooze reminder: ${result.error}`);
    }

    return this.getById(id);
  }

  /**
   * Complete a reminder (and create next occurrence if recurring)
   * @param {string} id - Reminder ID
   * @returns {Promise<Object>} Updated reminder
   */
  async complete(id) {
    const reminder = await this.getById(id);
    if (!reminder) {
      throw new Error('Reminder not found');
    }

    // Mark as completed
    const result = await window.electronAPI.dbRun(
      `UPDATE ${this.tableName}
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    if (!result.success) {
      throw new Error(`Failed to complete reminder: ${result.error}`);
    }

    // If recurring, create next occurrence
    if (reminder.is_recurring && reminder.recurrence_rule) {
      await this.createNextOccurrence(reminder);
    }

    return this.getById(id);
  }

  /**
   * Create the next occurrence of a recurring reminder
   * @param {Object} reminder - The completed recurring reminder
   * @returns {Promise<Object>} New reminder instance
   */
  async createNextOccurrence(reminder) {
    const nextDueAt = this.calculateNextOccurrence(
      reminder.due_at,
      reminder.recurrence_rule
    );

    if (!nextDueAt) {
      return null; // No more occurrences
    }

    const newReminder = {
      title: reminder.title,
      description: reminder.description,
      due_at: nextDueAt,
      is_recurring: 1,
      recurrence_rule: reminder.recurrence_rule,
      snooze_count: 0,
      snoozed_until: null,
      status: 'pending',
      source_type: reminder.source_type,
      source_id: reminder.source_id,
      url: reminder.url
    };

    return this.create(newReminder);
  }

  /**
   * Calculate next occurrence date based on recurrence rule
   * @param {string} currentDueAt - Current due date (ISO string)
   * @param {string} recurrenceRule - Recurrence rule (simple format: "daily", "weekly", "monthly", "custom:N:days|weeks|months")
   * @returns {string|null} Next due date (ISO string) or null
   */
  calculateNextOccurrence(currentDueAt, recurrenceRule) {
    if (!currentDueAt || !recurrenceRule) return null;

    const current = new Date(currentDueAt);
    const next = new Date(current);

    if (recurrenceRule === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (recurrenceRule === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else if (recurrenceRule === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    } else if (recurrenceRule.startsWith('custom:')) {
      // Format: custom:N:days|weeks|months
      const [, count, unit] = recurrenceRule.split(':');
      const n = parseInt(count, 10);

      if (unit === 'days') {
        next.setDate(next.getDate() + n);
      } else if (unit === 'weeks') {
        next.setDate(next.getDate() + (n * 7));
      } else if (unit === 'months') {
        next.setMonth(next.getMonth() + n);
      }
    }

    return next.toISOString();
  }

  /**
   * Get quick snooze options (helper for UI)
   * @returns {Array} Array of snooze options
   */
  getSnoozeOptions() {
    const now = new Date();

    const oneHour = new Date(now);
    oneHour.setHours(oneHour.getHours() + 1);

    const threeHours = new Date(now);
    threeHours.setHours(threeHours.getHours() + 3);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Tomorrow at 9 AM

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0); // Next week same day at 9 AM

    return [
      { label: '1 hour', value: oneHour.toISOString() },
      { label: '3 hours', value: threeHours.toISOString() },
      { label: 'Tomorrow', value: tomorrow.toISOString() },
      { label: 'Next week', value: nextWeek.toISOString() }
    ];
  }

  /**
   * Parse natural language date (helper - basic implementation)
   * For production, consider using chrono-node library
   * @param {string} text - Natural language text
   * @returns {Object|null} { dueAt: ISO string, title: string } or null
   */
  parseNaturalDate(text) {
    const now = new Date();
    let dueAt = null;
    let title = text;

    // Simple patterns (expand as needed)
    const patterns = [
      {
        regex: /tomorrow\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
        handler: (match) => {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          let hours = parseInt(match[1], 10);
          const minutes = match[2] ? parseInt(match[2], 10) : 0;
          const meridian = match[3]?.toLowerCase();

          if (meridian === 'pm' && hours < 12) hours += 12;
          if (meridian === 'am' && hours === 12) hours = 0;

          tomorrow.setHours(hours, minutes, 0, 0);
          return tomorrow;
        }
      },
      {
        regex: /tomorrow/i,
        handler: () => {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          return tomorrow;
        }
      },
      {
        regex: /next\s+week/i,
        handler: () => {
          const nextWeek = new Date(now);
          nextWeek.setDate(nextWeek.getDate() + 7);
          nextWeek.setHours(9, 0, 0, 0);
          return nextWeek;
        }
      },
      {
        regex: /in\s+(\d+)\s+(hour|hours|day|days)/i,
        handler: (match) => {
          const count = parseInt(match[1], 10);
          const unit = match[2].toLowerCase();
          const future = new Date(now);

          if (unit.startsWith('hour')) {
            future.setHours(future.getHours() + count);
          } else if (unit.startsWith('day')) {
            future.setDate(future.getDate() + count);
          }

          return future;
        }
      }
    ];

    // Try to match patterns
    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        dueAt = pattern.handler(match);
        // Remove the date part from title
        title = text.replace(pattern.regex, '').trim();
        break;
      }
    }

    if (!dueAt) {
      return null;
    }

    return {
      dueAt: dueAt.toISOString(),
      title: title || 'Reminder'
    };
  }

  /**
   * Get reminder priority based on snooze count and overdue status
   * @param {Object} reminder - Reminder object
   * @returns {string} Priority: 'urgent', 'high', 'medium', 'low'
   */
  getPriority(reminder) {
    const snoozeCount = reminder.snooze_count || 0;
    const now = new Date();
    const dueAt = reminder.effectiveDueAt || reminder.due_at;

    if (!dueAt) return 'low';

    const dueDate = new Date(dueAt);
    const isOverdue = dueDate < now;

    if (snoozeCount >= 3 && isOverdue) return 'urgent';
    if (snoozeCount >= 3 || isOverdue) return 'high';
    if (snoozeCount >= 2) return 'medium';

    return 'low';
  }
}

// Export singleton instance
export const reminderService = new ReminderService();
