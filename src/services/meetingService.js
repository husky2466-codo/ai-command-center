/**
 * MeetingService - Business logic for meetings management
 * Handles CRUD operations, participant management, prep sheets, and commitment extraction
 */

import { BaseService } from './BaseService.js';

class MeetingService extends BaseService {
  constructor() {
    super('meetings');
  }

  /**
   * Get all meetings with participants
   * @returns {Promise<Array>}
   */
  async getAllWithParticipants() {
    const result = await window.electronAPI.dbQuery(`
      SELECT
        m.*,
        GROUP_CONCAT(c.id || ':' || c.name || ':' || c.email) as participants_data
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN contacts c ON mp.contact_id = c.id
      GROUP BY m.id
      ORDER BY m.scheduled_at DESC
    `);

    if (!result.success) {
      throw new Error(`Failed to get meetings with participants: ${result.error}`);
    }

    // Parse participants data
    return result.data.map(meeting => ({
      ...meeting,
      participants: meeting.participants_data
        ? meeting.participants_data.split(',').map(p => {
            const [id, name, email] = p.split(':');
            return { id, name, email };
          })
        : []
    }));
  }

  /**
   * Get a single meeting with full participant details
   * @param {string} id - Meeting ID
   * @returns {Promise<Object|null>}
   */
  async getByIdWithParticipants(id) {
    const meeting = await this.getById(id);
    if (!meeting) return null;

    // Get participants
    const result = await window.electronAPI.dbQuery(`
      SELECT c.*, mp.role
      FROM meeting_participants mp
      JOIN contacts c ON mp.contact_id = c.id
      WHERE mp.meeting_id = ?
    `, [id]);

    if (!result.success) {
      throw new Error(`Failed to get meeting participants: ${result.error}`);
    }

    meeting.participants = result.data;
    return meeting;
  }

  /**
   * Get upcoming meetings (next 7 days)
   * @returns {Promise<Array>}
   */
  async getUpcoming() {
    const now = new Date().toISOString();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await window.electronAPI.dbQuery(`
      SELECT
        m.*,
        GROUP_CONCAT(c.name, ', ') as participant_names
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN contacts c ON mp.contact_id = c.id
      WHERE m.scheduled_at >= ? AND m.scheduled_at <= ?
        AND m.status = 'scheduled'
      GROUP BY m.id
      ORDER BY m.scheduled_at ASC
    `, [now, weekFromNow]);

    if (!result.success) {
      throw new Error(`Failed to get upcoming meetings: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Get today's meetings
   * @returns {Promise<Array>}
   */
  async getToday() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const result = await window.electronAPI.dbQuery(`
      SELECT
        m.*,
        GROUP_CONCAT(c.name, ', ') as participant_names
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN contacts c ON mp.contact_id = c.id
      WHERE m.scheduled_at >= ? AND m.scheduled_at <= ?
      GROUP BY m.id
      ORDER BY m.scheduled_at ASC
    `, [startOfDay, endOfDay]);

    if (!result.success) {
      throw new Error(`Failed to get today's meetings: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Get past meetings
   * @param {number} limit - Maximum number of meetings to return
   * @returns {Promise<Array>}
   */
  async getPast(limit = 50) {
    const now = new Date().toISOString();

    const result = await window.electronAPI.dbQuery(`
      SELECT
        m.*,
        GROUP_CONCAT(c.name, ', ') as participant_names
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN contacts c ON mp.contact_id = c.id
      WHERE m.scheduled_at < ?
      GROUP BY m.id
      ORDER BY m.scheduled_at DESC
      LIMIT ?
    `, [now, limit]);

    if (!result.success) {
      throw new Error(`Failed to get past meetings: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Create a meeting with participants
   * @param {Object} meetingData - Meeting data
   * @param {Array<string>} participantIds - Array of contact IDs
   * @returns {Promise<Object>}
   */
  async createWithParticipants(meetingData, participantIds = []) {
    const meeting = await this.create(meetingData);

    // Add participants
    for (const contactId of participantIds) {
      await this.addParticipant(meeting.id, contactId);
    }

    return this.getByIdWithParticipants(meeting.id);
  }

  /**
   * Add a participant to a meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} contactId - Contact ID
   * @param {string} role - Optional role
   * @returns {Promise<void>}
   */
  async addParticipant(meetingId, contactId, role = null) {
    const result = await window.electronAPI.dbRun(`
      INSERT INTO meeting_participants (meeting_id, contact_id, role)
      VALUES (?, ?, ?)
      ON CONFLICT (meeting_id, contact_id) DO UPDATE SET role = ?
    `, [meetingId, contactId, role, role]);

    if (!result.success) {
      throw new Error(`Failed to add participant: ${result.error}`);
    }
  }

  /**
   * Remove a participant from a meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<void>}
   */
  async removeParticipant(meetingId, contactId) {
    const result = await window.electronAPI.dbRun(`
      DELETE FROM meeting_participants
      WHERE meeting_id = ? AND contact_id = ?
    `, [meetingId, contactId]);

    if (!result.success) {
      throw new Error(`Failed to remove participant: ${result.error}`);
    }
  }

  /**
   * Generate prep sheet for a meeting
   * @param {string} meetingId - Meeting ID
   * @returns {Promise<Object>}
   */
  async generatePrepSheet(meetingId) {
    const meeting = await this.getByIdWithParticipants(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const prepSections = [];

    // Meeting overview
    prepSections.push({
      title: 'Meeting Overview',
      content: `
**Title:** ${meeting.title}
**Date:** ${new Date(meeting.scheduled_at).toLocaleString()}
**Duration:** ${meeting.duration_minutes} minutes
**Location:** ${meeting.location || 'Not specified'}
      `.trim()
    });

    // Attendee context
    if (meeting.participants.length > 0) {
      const attendeeContexts = await Promise.all(
        meeting.participants.map(async (participant) => {
          // Get last interaction
          const interactionResult = await window.electronAPI.dbGet(`
            SELECT * FROM contact_interactions
            WHERE contact_id = ?
            ORDER BY occurred_at DESC
            LIMIT 1
          `, [participant.id]);

          const lastInteraction = interactionResult.success ? interactionResult.data : null;

          // Get previous meetings with this person
          const meetingsResult = await window.electronAPI.dbQuery(`
            SELECT m.title, m.scheduled_at
            FROM meetings m
            JOIN meeting_participants mp ON m.id = mp.meeting_id
            WHERE mp.contact_id = ? AND m.id != ? AND m.scheduled_at < ?
            ORDER BY m.scheduled_at DESC
            LIMIT 3
          `, [participant.id, meetingId, meeting.scheduled_at]);

          const previousMeetings = meetingsResult.success ? meetingsResult.data : [];

          return {
            name: participant.name,
            title: participant.title,
            company: participant.company,
            context: participant.context,
            professionalBackground: participant.professional_background,
            lastInteraction: lastInteraction ? {
              type: lastInteraction.type,
              summary: lastInteraction.summary,
              date: lastInteraction.occurred_at
            } : null,
            previousMeetings
          };
        })
      );

      prepSections.push({
        title: 'Attendee Context',
        attendees: attendeeContexts
      });
    }

    // Talking points (placeholder)
    prepSections.push({
      title: 'Talking Points',
      content: 'Add your key discussion points here...'
    });

    const prepSheet = {
      generatedAt: new Date().toISOString(),
      sections: prepSections
    };

    // Save prep sheet to meeting
    await this.update(meetingId, {
      prep_sheet: JSON.stringify(prepSheet)
    });

    return prepSheet;
  }

  /**
   * Extract commitments from meeting notes using AI
   * @param {string} meetingId - Meeting ID
   * @param {string} notes - Meeting notes
   * @param {Object} apiKeys - API keys object
   * @returns {Promise<Array>}
   */
  async extractCommitments(meetingId, notes, apiKeys) {
    if (!notes || notes.trim().length === 0) {
      return [];
    }

    // Simple keyword-based extraction for now
    // In production, you'd use Claude API for better extraction
    const commitments = [];
    const lines = notes.split('\n');

    const actionKeywords = [
      'will', 'should', 'need to', 'must', 'action:', 'todo:', 'follow up',
      'commit to', 'promised', 'agreed to', 'responsible for'
    ];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const hasActionKeyword = actionKeywords.some(keyword => lowerLine.includes(keyword));

      if (hasActionKeyword && line.trim().length > 10) {
        // Extract potential assignee (look for names in line)
        const assigneeMatch = line.match(/@(\w+)/);
        const assignee = assigneeMatch ? assigneeMatch[1] : null;

        // Extract due date (look for dates)
        const dateMatch = line.match(/by\s+(\w+\s+\d+|\d{4}-\d{2}-\d{2})/i);
        const dueDate = dateMatch ? dateMatch[1] : null;

        commitments.push({
          id: crypto.randomUUID(),
          description: line.trim(),
          assignee,
          dueDate,
          source: 'meeting_notes',
          meetingId,
          extractedAt: new Date().toISOString()
        });
      }
    }

    return commitments;
  }

  /**
   * Search meetings by title or participants
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async search(query) {
    const result = await window.electronAPI.dbQuery(`
      SELECT DISTINCT
        m.*,
        GROUP_CONCAT(c.name, ', ') as participant_names
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      LEFT JOIN contacts c ON mp.contact_id = c.id
      WHERE m.title LIKE ? OR m.description LIKE ? OR c.name LIKE ?
      GROUP BY m.id
      ORDER BY m.scheduled_at DESC
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

    if (!result.success) {
      throw new Error(`Failed to search meetings: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Update meeting status
   * @param {string} meetingId - Meeting ID
   * @param {string} status - New status
   * @returns {Promise<Object>}
   */
  async updateStatus(meetingId, status) {
    return this.update(meetingId, { status });
  }

  /**
   * Update meeting notes
   * @param {string} meetingId - Meeting ID
   * @param {string} notes - Post-meeting notes
   * @returns {Promise<Object>}
   */
  async updateNotes(meetingId, notes) {
    return this.update(meetingId, { post_notes: notes });
  }

  /**
   * Get meetings grouped by time period
   * @returns {Promise<Object>}
   */
  async getGrouped() {
    const allMeetings = await this.getAllWithParticipants();
    const now = new Date();

    const grouped = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
      upcoming: []
    };

    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const meeting of allMeetings) {
      const meetingDate = new Date(meeting.scheduled_at);

      if (meetingDate > now && meeting.status === 'scheduled') {
        grouped.upcoming.push(meeting);
      } else if (meetingDate >= todayStart && meetingDate <= todayEnd) {
        grouped.today.push(meeting);
      } else if (meetingDate >= yesterdayStart && meetingDate < todayStart) {
        grouped.yesterday.push(meeting);
      } else if (meetingDate >= weekStart && meetingDate < todayStart) {
        grouped.thisWeek.push(meeting);
      } else if (meetingDate < weekStart) {
        grouped.earlier.push(meeting);
      }
    }

    return grouped;
  }
}

// Export singleton instance
export const meetingService = new MeetingService();
export default meetingService;
