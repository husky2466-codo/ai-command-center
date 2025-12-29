/**
 * DashboardService - Aggregates data from all modules for Andy's Daily Briefing
 * Provides methods to fetch widget data and generate dashboard overview
 */

import { projectService } from './ProjectService.js';
import { reminderService } from './reminderService.js';
import { meetingService } from './meetingService.js';
import relationshipService from './relationshipService.js';
import { memoryService } from './memoryService.js';

class DashboardService {
  constructor() {
    this.cache = {
      data: null,
      timestamp: null,
      ttl: 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Get complete dashboard briefing data
   * @returns {Promise<Object>} Aggregated data for all widgets
   */
  async getTodaysBriefing() {
    // Check cache first
    if (this.cache.data && this.cache.timestamp) {
      const age = Date.now() - this.cache.timestamp;
      if (age < this.cache.ttl) {
        return this.cache.data;
      }
    }

    try {
      // Fetch all data in parallel for performance
      const [focus, meetings, reminders, relationships, memories] = await Promise.all([
        this.getTodaysFocus(),
        this.getTodaysMeetings(),
        this.getRemindersDue(),
        this.getRelationshipsNeedingAttention(),
        this.getRecentMemories(),
      ]);

      const briefing = {
        greeting: this.getGreeting(),
        focus,
        meetings,
        reminders,
        relationships,
        memories,
        timestamp: new Date().toISOString(),
      };

      // Cache the result
      this.cache.data = briefing;
      this.cache.timestamp = Date.now();

      return briefing;
    } catch (error) {
      console.error('Failed to generate daily briefing:', error);
      throw error;
    }
  }

  /**
   * Get personalized greeting based on time of day
   * @returns {Object} Greeting data with message and time
   */
  getGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const name = 'Andy'; // Can be made configurable later

    let message;
    if (hour < 12) {
      message = `Good morning, ${name}`;
    } else if (hour < 18) {
      message = `Good afternoon, ${name}`;
    } else {
      message = `Good evening, ${name}`;
    }

    return {
      message,
      date: now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  }

  /**
   * Get top 3-5 priority tasks from Projects (Now view)
   * @returns {Promise<Object>} Today's focus tasks
   */
  async getTodaysFocus() {
    try {
      // Get active focus tasks
      const tasks = await projectService.getTasksByStatus('active');

      // Filter for today's focus (tasks in "Now" tier)
      const focusTasks = tasks
        .filter(task => task.status === 'active')
        .sort((a, b) => {
          // Sort by priority (if available) or created date
          if (a.priority && b.priority) {
            return a.priority - b.priority;
          }
          return new Date(b.created_at) - new Date(a.created_at);
        })
        .slice(0, 5);

      return {
        count: focusTasks.length,
        tasks: focusTasks,
      };
    } catch (error) {
      console.error('Failed to get today\'s focus:', error);
      return { count: 0, tasks: [] };
    }
  }

  /**
   * Get today's meetings with times
   * @returns {Promise<Object>} Today's meetings
   */
  async getTodaysMeetings() {
    try {
      const meetings = await meetingService.getToday();

      // Sort by start time
      meetings.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

      return {
        count: meetings.length,
        meetings,
      };
    } catch (error) {
      console.error('Failed to get today\'s meetings:', error);
      return { count: 0, meetings: [] };
    }
  }

  /**
   * Get overdue + today's reminders
   * @returns {Promise<Object>} Reminders due
   */
  async getRemindersDue() {
    try {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      // Get due reminders (includes overdue and upcoming)
      const dueReminders = await reminderService.getDue();

      // Separate into overdue and due today
      const overdue = [];
      const dueToday = [];

      dueReminders.forEach(reminder => {
        const dueDate = new Date(reminder.due_at);
        if (dueDate < now) {
          overdue.push(reminder);
        } else if (dueDate <= endOfDay) {
          dueToday.push(reminder);
        }
      });

      return {
        overdue: {
          count: overdue.length,
          items: overdue.slice(0, 5), // Top 5
        },
        dueToday: {
          count: dueToday.length,
          items: dueToday.slice(0, 5), // Top 5
        },
        totalCount: overdue.length + dueToday.length,
      };
    } catch (error) {
      console.error('Failed to get reminders due:', error);
      return {
        overdue: { count: 0, items: [] },
        dueToday: { count: 0, items: [] },
        totalCount: 0,
      };
    }
  }

  /**
   * Get contacts needing attention (Cool/Cold freshness)
   * @returns {Promise<Object>} Relationships data
   */
  async getRelationshipsNeedingAttention() {
    try {
      const staleContacts = await relationshipService.getStaleContacts();

      // Categorize by freshness
      const cool = staleContacts.filter(c => c.freshness === 'cool');
      const cold = staleContacts.filter(c => c.freshness === 'cold');

      return {
        totalCount: staleContacts.length,
        cool: {
          count: cool.length,
          contacts: cool.slice(0, 3),
        },
        cold: {
          count: cold.length,
          contacts: cold.slice(0, 3),
        },
        topContacts: staleContacts.slice(0, 5), // Top 5 overall
      };
    } catch (error) {
      console.error('Failed to get relationships needing attention:', error);
      return {
        totalCount: 0,
        cool: { count: 0, contacts: [] },
        cold: { count: 0, contacts: [] },
        topContacts: [],
      };
    }
  }

  /**
   * Get recent extracted memories
   * @returns {Promise<Object>} Recent memories
   */
  async getRecentMemories() {
    try {
      const memories = await memoryService.getRecent(7, 5); // Last 7 days, limit 5

      return {
        count: memories.length,
        memories,
      };
    } catch (error) {
      console.error('Failed to get recent memories:', error);
      return { count: 0, memories: [] };
    }
  }

  /**
   * Get specific widget data by type
   * @param {string} type - Widget type (focus, meetings, reminders, etc.)
   * @returns {Promise<Object>} Widget-specific data
   */
  async getWidgetData(type) {
    switch (type) {
      case 'greeting':
        return this.getGreeting();
      case 'focus':
        return this.getTodaysFocus();
      case 'meetings':
        return this.getTodaysMeetings();
      case 'reminders':
        return this.getRemindersDue();
      case 'relationships':
        return this.getRelationshipsNeedingAttention();
      case 'memories':
        return this.getRecentMemories();
      default:
        throw new Error(`Unknown widget type: ${type}`);
    }
  }

  /**
   * Clear cache (useful for manual refresh)
   */
  clearCache() {
    this.cache.data = null;
    this.cache.timestamp = null;
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
