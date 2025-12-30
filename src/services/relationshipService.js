/**
 * RelationshipService - CRM and contact management
 *
 * Handles contacts, groups, interactions, and freshness tracking.
 * Implements Freshness System for relationship maintenance.
 */

import { BaseService } from './BaseService.js';

class RelationshipService extends BaseService {
  constructor() {
    super('contacts');
  }

  /**
   * Get all contacts with freshness calculation
   * @returns {Promise<Array>} Contacts with freshness data
   */
  async getAllContacts() {
    const result = await window.electronAPI.dbQuery(`
      SELECT
        c.*,
        CASE
          WHEN c.last_contact_at IS NULL THEN 999999
          ELSE julianday('now') - julianday(c.last_contact_at)
        END as days_since_contact,
        GROUP_CONCAT(cg.name) as group_names
      FROM contacts c
      LEFT JOIN contact_group_members cgm ON c.id = cgm.contact_id
      LEFT JOIN contact_groups cg ON cgm.group_id = cg.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    if (!result.success) {
      throw new Error(`Failed to get contacts: ${result.error}`);
    }

    return result.data.map(contact => ({
      ...contact,
      social_links: this.parseSocialLinks(contact.social_links),
      groups: contact.group_names ? contact.group_names.split(',') : []
    }));
  }

  /**
   * Get contacts by freshness level
   * @param {string} freshnessLevel - 'hot', 'warm', 'cool', or 'cold'
   * @returns {Promise<Array>}
   */
  async getContactsByFreshness(freshnessLevel) {
    const ranges = {
      hot: [0, 7],
      warm: [7, 30],
      cool: [30, 90],
      cold: [90, 999999]
    };

    const [min, max] = ranges[freshnessLevel] || [0, 999999];

    const result = await window.electronAPI.dbQuery(`
      SELECT
        c.*,
        julianday('now') - julianday(c.last_contact_at) as days_since_contact
      FROM contacts c
      WHERE (
        CASE
          WHEN c.last_contact_at IS NULL THEN 999999
          ELSE julianday('now') - julianday(c.last_contact_at)
        END
      ) >= ? AND (
        CASE
          WHEN c.last_contact_at IS NULL THEN 999999
          ELSE julianday('now') - julianday(c.last_contact_at)
        END
      ) < ?
      ORDER BY c.last_contact_at DESC NULLS LAST
    `, [min, max]);

    if (!result.success) {
      throw new Error(`Failed to get contacts by freshness: ${result.error}`);
    }

    return result.data.map(contact => ({
      ...contact,
      social_links: this.parseSocialLinks(contact.social_links)
    }));
  }

  /**
   * Get stale contacts needing attention
   * @param {number} daysThreshold - Days threshold (default 90)
   * @returns {Promise<Array>}
   */
  async getStaleContacts(daysThreshold = 90) {
    const result = await window.electronAPI.dbQuery(`
      SELECT
        c.*,
        julianday('now') - julianday(c.last_contact_at) as days_since_contact
      FROM contacts c
      WHERE c.last_contact_at IS NOT NULL
        AND julianday('now') - julianday(c.last_contact_at) >= ?
      ORDER BY days_since_contact DESC
    `, [daysThreshold]);

    if (!result.success) {
      throw new Error(`Failed to get stale contacts: ${result.error}`);
    }

    return result.data.map(contact => ({
      ...contact,
      social_links: this.parseSocialLinks(contact.social_links)
    }));
  }

  /**
   * Search contacts by name, company, or email
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async searchContacts(query) {
    const result = await window.electronAPI.dbQuery(`
      SELECT
        c.*,
        CASE
          WHEN c.last_contact_at IS NULL THEN 999999
          ELSE julianday('now') - julianday(c.last_contact_at)
        END as days_since_contact
      FROM contacts c
      WHERE c.name LIKE ?
        OR c.company LIKE ?
        OR c.email LIKE ?
        OR c.title LIKE ?
      ORDER BY c.name ASC
    `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

    if (!result.success) {
      throw new Error(`Failed to search contacts: ${result.error}`);
    }

    return result.data.map(contact => ({
      ...contact,
      social_links: this.parseSocialLinks(contact.social_links)
    }));
  }

  /**
   * Create a contact with auto-generated slug
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>}
   */
  async createContact(contactData) {
    const slug = this.generateSlug(contactData.name);
    const socialLinksStr = this.serializeSocialLinks(contactData.social_links);

    const data = {
      ...contactData,
      slug,
      social_links: socialLinksStr,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Remove social_links object if it was in original data
    delete data.groups; // Groups handled separately

    return await this.create(data);
  }

  /**
   * Update a contact
   * @param {string} id - Contact ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateContact(id, updates) {
    if (updates.social_links) {
      updates.social_links = this.serializeSocialLinks(updates.social_links);
    }

    if (updates.name) {
      updates.slug = this.generateSlug(updates.name);
    }

    return await this.update(id, updates);
  }

  /**
   * Log an interaction with a contact
   * @param {string} contactId - Contact ID
   * @param {string} type - Interaction type (email, meeting, call, message, in_person)
   * @param {string} summary - Interaction summary
   * @param {Date} occurredAt - When it occurred (default: now)
   * @returns {Promise<Object>}
   */
  async logInteraction(contactId, type, summary, occurredAt = new Date()) {
    const interactionId = this.generateId();

    const result = await window.electronAPI.dbRun(`
      INSERT INTO contact_interactions (id, contact_id, type, summary, occurred_at)
      VALUES (?, ?, ?, ?, ?)
    `, [interactionId, contactId, type, summary, occurredAt.toISOString()]);

    if (!result.success) {
      throw new Error(`Failed to log interaction: ${result.error}`);
    }

    // Update last_contact_at on the contact
    await window.electronAPI.dbRun(`
      UPDATE contacts
      SET last_contact_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [occurredAt.toISOString(), contactId]);

    return { id: interactionId, contact_id: contactId, type, summary, occurred_at: occurredAt.toISOString() };
  }

  /**
   * Get all interactions for a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<Array>}
   */
  async getContactInteractions(contactId) {
    const result = await window.electronAPI.dbQuery(`
      SELECT * FROM contact_interactions
      WHERE contact_id = ?
      ORDER BY occurred_at DESC
    `, [contactId]);

    if (!result.success) {
      throw new Error(`Failed to get interactions: ${result.error}`);
    }

    return result.data;
  }

  // =========================================================================
  // GROUP MANAGEMENT
  // =========================================================================

  /**
   * Get all contact groups
   * @returns {Promise<Array>}
   */
  async getAllGroups() {
    const result = await window.electronAPI.dbQuery(`
      SELECT
        cg.*,
        COUNT(cgm.contact_id) as member_count
      FROM contact_groups cg
      LEFT JOIN contact_group_members cgm ON cg.id = cgm.group_id
      GROUP BY cg.id
      ORDER BY cg.name ASC
    `);

    if (!result.success) {
      throw new Error(`Failed to get groups: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Create a new group
   * @param {string} name - Group name
   * @param {string} description - Group description
   * @returns {Promise<Object>}
   */
  async createGroup(name, description = '') {
    const id = this.generateId();

    const result = await window.electronAPI.dbRun(`
      INSERT INTO contact_groups (id, name, description)
      VALUES (?, ?, ?)
    `, [id, name, description]);

    if (!result.success) {
      throw new Error(`Failed to create group: ${result.error}`);
    }

    return { id, name, description };
  }

  /**
   * Update a group
   * @param {string} id - Group ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateGroup(id, updates) {
    const columns = Object.keys(updates);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    const result = await window.electronAPI.dbRun(`
      UPDATE contact_groups SET ${setClause} WHERE id = ?
    `, values);

    if (!result.success) {
      throw new Error(`Failed to update group: ${result.error}`);
    }

    return this.getGroupById(id);
  }

  /**
   * Delete a group
   * @param {string} id - Group ID
   */
  async deleteGroup(id) {
    // First remove all members
    await window.electronAPI.dbRun(`
      DELETE FROM contact_group_members WHERE group_id = ?
    `, [id]);

    // Then delete the group
    const result = await window.electronAPI.dbRun(`
      DELETE FROM contact_groups WHERE id = ?
    `, [id]);

    if (!result.success) {
      throw new Error(`Failed to delete group: ${result.error}`);
    }
  }

  /**
   * Get a group by ID
   * @param {string} id - Group ID
   * @returns {Promise<Object>}
   */
  async getGroupById(id) {
    const result = await window.electronAPI.dbGet(`
      SELECT * FROM contact_groups WHERE id = ?
    `, [id]);

    if (!result.success) {
      throw new Error(`Failed to get group: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Add a contact to a group
   * @param {string} contactId - Contact ID
   * @param {string} groupId - Group ID
   */
  async addContactToGroup(contactId, groupId) {
    const result = await window.electronAPI.dbRun(`
      INSERT OR IGNORE INTO contact_group_members (contact_id, group_id)
      VALUES (?, ?)
    `, [contactId, groupId]);

    if (!result.success) {
      throw new Error(`Failed to add contact to group: ${result.error}`);
    }
  }

  /**
   * Remove a contact from a group
   * @param {string} contactId - Contact ID
   * @param {string} groupId - Group ID
   */
  async removeContactFromGroup(contactId, groupId) {
    const result = await window.electronAPI.dbRun(`
      DELETE FROM contact_group_members
      WHERE contact_id = ? AND group_id = ?
    `, [contactId, groupId]);

    if (!result.success) {
      throw new Error(`Failed to remove contact from group: ${result.error}`);
    }
  }

  /**
   * Get contacts by group
   * @param {string} groupId - Group ID
   * @returns {Promise<Array>}
   */
  async getContactsByGroup(groupId) {
    const result = await window.electronAPI.dbQuery(`
      SELECT
        c.*,
        CASE
          WHEN c.last_contact_at IS NULL THEN 999999
          ELSE julianday('now') - julianday(c.last_contact_at)
        END as days_since_contact
      FROM contacts c
      INNER JOIN contact_group_members cgm ON c.id = cgm.contact_id
      WHERE cgm.group_id = ?
      ORDER BY c.name ASC
    `, [groupId]);

    if (!result.success) {
      throw new Error(`Failed to get contacts by group: ${result.error}`);
    }

    return result.data.map(contact => ({
      ...contact,
      social_links: this.parseSocialLinks(contact.social_links)
    }));
  }

  /**
   * Get groups for a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<Array>}
   */
  async getContactGroups(contactId) {
    const result = await window.electronAPI.dbQuery(`
      SELECT cg.*
      FROM contact_groups cg
      INNER JOIN contact_group_members cgm ON cg.id = cgm.group_id
      WHERE cgm.contact_id = ?
      ORDER BY cg.name ASC
    `, [contactId]);

    if (!result.success) {
      throw new Error(`Failed to get contact groups: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Update contact groups (replaces all groups for a contact)
   * @param {string} contactId - Contact ID
   * @param {Array<string>} groupIds - Array of group IDs
   */
  async updateContactGroups(contactId, groupIds) {
    // Remove all existing groups
    await window.electronAPI.dbRun(`
      DELETE FROM contact_group_members WHERE contact_id = ?
    `, [contactId]);

    // Add new groups
    for (const groupId of groupIds) {
      await this.addContactToGroup(contactId, groupId);
    }
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Generate URL-safe slug from name
   * @param {string} name - Contact name
   * @returns {string}
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Parse social links from JSON string
   * @param {string} socialLinksStr - JSON string
   * @returns {Object}
   */
  parseSocialLinks(socialLinksStr) {
    if (!socialLinksStr) return {};
    try {
      return JSON.parse(socialLinksStr);
    } catch (e) {
      return {};
    }
  }

  /**
   * Serialize social links to JSON string
   * @param {Object} socialLinks - Social links object
   * @returns {string}
   */
  serializeSocialLinks(socialLinks) {
    if (!socialLinks) return null;
    return JSON.stringify(socialLinks);
  }

  /**
   * Get dashboard widget data
   * @returns {Promise<Object>}
   */
  async getRelationshipsWidgetData() {
    const staleContacts = await this.getStaleContacts(90);
    const allContacts = await this.getAllContacts();

    // Count by freshness
    const freshnessCounts = {
      hot: 0,
      warm: 0,
      cool: 0,
      cold: 0
    };

    allContacts.forEach(contact => {
      const days = contact.days_since_contact;
      if (days <= 7) freshnessCounts.hot++;
      else if (days <= 30) freshnessCounts.warm++;
      else if (days <= 90) freshnessCounts.cool++;
      else freshnessCounts.cold++;
    });

    return {
      totalContacts: allContacts.length,
      staleCount: staleContacts.length,
      freshnessCounts,
      needsAttention: staleContacts.slice(0, 5) // Top 5 stale contacts
    };
  }
}

export const relationshipService = new RelationshipService();
export default relationshipService;
