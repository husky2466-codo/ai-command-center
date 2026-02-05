/**
 * EmailTemplateService - Email template CRUD operations
 * All static methods, DB-only operations (no OAuth required)
 */

const crypto = require('crypto');

// Use crypto.randomUUID for generating unique IDs
const uuidv4 = () => crypto.randomUUID();

/**
 * EmailTemplateService - Manages email templates stored in the database
 */
class EmailTemplateService {

  /**
   * Get email templates (account-specific + global templates)
   * @param {Object} db - Database instance
   * @param {string} accountId - Account ID (optional, for account-specific templates)
   * @returns {Array} List of templates sorted by favorites first, then usage count
   */
  static getTemplates(db, accountId = null) {
    console.log(`[GoogleService] Getting email templates for account: ${accountId || 'all'}`);

    // Query that gets both account-specific and global (null account_id) templates
    let query = `
      SELECT * FROM email_templates
      WHERE account_id IS NULL
    `;
    const params = [];

    if (accountId) {
      query = `
        SELECT * FROM email_templates
        WHERE account_id IS NULL OR account_id = ?
      `;
      params.push(accountId);
    }

    query += ' ORDER BY is_favorite DESC, usage_count DESC, updated_at DESC';

    try {
      const stmt = db.prepare(query);
      const templates = stmt.all(...params);
      console.log(`[GoogleService] Found ${templates.length} templates`);
      return templates;
    } catch (error) {
      console.error(`[GoogleService] Failed to get templates:`, error.message);
      throw error;
    }
  }

  /**
   * Get a single email template by ID
   * @param {Object} db - Database instance
   * @param {string} templateId - Template ID
   * @returns {Object} Template details
   */
  static getTemplate(db, templateId) {
    console.log(`[GoogleService] Getting template: ${templateId}`);

    try {
      const stmt = db.prepare('SELECT * FROM email_templates WHERE id = ?');
      const template = stmt.get(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      return template;
    } catch (error) {
      console.error(`[GoogleService] Failed to get template:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new email template
   * @param {Object} db - Database instance
   * @param {Object} data - Template data
   * @param {string} data.name - Template name
   * @param {string} data.subject - Pre-filled subject
   * @param {string} data.body - HTML body content
   * @param {string} data.category - Category (e.g., "Sales", "Support")
   * @param {string} data.account_id - Account ID (null for global template)
   * @param {boolean} data.is_favorite - Whether template is favorited
   * @returns {Object} Created template
   */
  static createTemplate(db, data) {
    console.log(`[GoogleService] Creating template: ${data.name}`);

    const templateId = uuidv4();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO email_templates (
          id, account_id, name, subject, body, category, is_favorite, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        templateId,
        data.account_id || null,
        data.name,
        data.subject || '',
        data.body || '',
        data.category || null,
        data.is_favorite ? 1 : 0,
        0,
        now,
        now
      );

      console.log(`[GoogleService] Template created: ${templateId}`);
      return EmailTemplateService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to create template:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing email template
   * @param {Object} db - Database instance
   * @param {string} templateId - Template ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated template
   */
  static updateTemplate(db, templateId, updates) {
    console.log(`[GoogleService] Updating template: ${templateId}`);

    try {
      // Build dynamic update query
      const updateFields = [];
      const params = [];

      const allowedFields = ['name', 'subject', 'body', 'category', 'is_favorite', 'account_id'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          if (field === 'is_favorite') {
            params.push(updates[field] ? 1 : 0);
          } else {
            params.push(updates[field]);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Always update the updated_at timestamp
      updateFields.push('updated_at = ?');
      params.push(Date.now());

      // Add templateId as last parameter
      params.push(templateId);

      const query = `UPDATE email_templates SET ${updateFields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      stmt.run(...params);

      console.log(`[GoogleService] Template updated: ${templateId}`);
      return EmailTemplateService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to update template:`, error.message);
      throw error;
    }
  }

  /**
   * Delete an email template
   * @param {Object} db - Database instance
   * @param {string} templateId - Template ID
   * @returns {Object} Success response
   */
  static deleteTemplate(db, templateId) {
    console.log(`[GoogleService] Deleting template: ${templateId}`);

    try {
      const stmt = db.prepare('DELETE FROM email_templates WHERE id = ?');
      const result = stmt.run(templateId);

      if (result.changes === 0) {
        throw new Error(`Template not found: ${templateId}`);
      }

      console.log(`[GoogleService] Template deleted: ${templateId}`);
      return { success: true };
    } catch (error) {
      console.error(`[GoogleService] Failed to delete template:`, error.message);
      throw error;
    }
  }

  /**
   * Increment template usage count (called when template is used)
   * @param {Object} db - Database instance
   * @param {string} templateId - Template ID
   * @returns {Object} Updated template
   */
  static incrementTemplateUsage(db, templateId) {
    console.log(`[GoogleService] Incrementing usage for template: ${templateId}`);

    try {
      const stmt = db.prepare(`
        UPDATE email_templates
        SET usage_count = usage_count + 1, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(Date.now(), templateId);

      return EmailTemplateService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to increment template usage:`, error.message);
      throw error;
    }
  }

  /**
   * Toggle template favorite status
   * @param {Object} db - Database instance
   * @param {string} templateId - Template ID
   * @returns {Object} Updated template
   */
  static toggleTemplateFavorite(db, templateId) {
    console.log(`[GoogleService] Toggling favorite for template: ${templateId}`);

    try {
      const stmt = db.prepare(`
        UPDATE email_templates
        SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(Date.now(), templateId);

      return EmailTemplateService.getTemplate(db, templateId);
    } catch (error) {
      console.error(`[GoogleService] Failed to toggle template favorite:`, error.message);
      throw error;
    }
  }

  /**
   * Get all unique template categories
   * @param {Object} db - Database instance
   * @param {string} accountId - Account ID (optional)
   * @returns {Array} List of unique categories
   */
  static getTemplateCategories(db, accountId = null) {
    console.log(`[GoogleService] Getting template categories`);

    try {
      let query = `
        SELECT DISTINCT category FROM email_templates
        WHERE category IS NOT NULL AND category != ''
      `;
      const params = [];

      if (accountId) {
        query = `
          SELECT DISTINCT category FROM email_templates
          WHERE category IS NOT NULL AND category != ''
          AND (account_id IS NULL OR account_id = ?)
        `;
        params.push(accountId);
      }

      query += ' ORDER BY category ASC';

      const stmt = db.prepare(query);
      const rows = stmt.all(...params);
      return rows.map(row => row.category);
    } catch (error) {
      console.error(`[GoogleService] Failed to get template categories:`, error.message);
      throw error;
    }
  }
}

module.exports = EmailTemplateService;
