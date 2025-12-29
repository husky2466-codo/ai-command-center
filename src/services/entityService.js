/**
 * entityService.js - Domain service for entities and entity_occurrences tables
 * Manages entity resolution, linking, and tracking across sessions
 */

import { BaseService } from './BaseService.js';
import { dataService } from './DataService.js';

/**
 * Service for managing entities (people, projects, businesses, locations)
 * Handles entity resolution, deduplication, and linking to contacts/projects
 */
class EntityService extends BaseService {
  constructor() {
    super('entities');
  }

  /**
   * Create a new entity with validation
   * @param {Object} entityData - Entity data
   * @param {string} entityData.type - Entity type (person, project, business, location)
   * @param {string} entityData.canonical_name - Canonical entity name
   * @param {string} [entityData.slug] - URL-safe slug (auto-generated if not provided)
   * @param {string[]} [entityData.aliases] - Array of alternative names
   * @param {string} [entityData.linked_contact_id] - Linked contact ID
   * @param {string} [entityData.linked_project_id] - Linked project ID
   * @param {Object} [entityData.metadata] - Additional metadata
   * @returns {Promise<Object>} The created entity
   */
  async createEntity(entityData) {
    // Validate required fields
    if (!entityData.type || !entityData.canonical_name) {
      throw new Error('Entity must have type and canonical_name');
    }

    // Validate entity type
    const validTypes = ['person', 'project', 'business', 'location'];
    if (!validTypes.includes(entityData.type)) {
      throw new Error(`Invalid entity type: ${entityData.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Generate slug if not provided
    const slug = entityData.slug || this.generateSlug(entityData.canonical_name);

    // Check for slug collision
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new Error(`Entity with slug "${slug}" already exists`);
    }

    // Convert aliases array to JSON string
    const aliases = Array.isArray(entityData.aliases)
      ? JSON.stringify(entityData.aliases)
      : null;

    // Convert metadata object to JSON string
    const metadata = entityData.metadata
      ? JSON.stringify(entityData.metadata)
      : null;

    const data = {
      ...entityData,
      slug,
      aliases,
      metadata
    };

    return this.create(data);
  }

  /**
   * Generate URL-safe slug from name
   * @param {string} name - Entity name
   * @returns {string} Slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .substring(0, 100); // Limit length
  }

  /**
   * Get entity by slug
   * @param {string} slug - Entity slug
   * @returns {Promise<Object|null>}
   */
  async getBySlug(slug) {
    const result = await dataService.get(
      `SELECT * FROM ${this.tableName} WHERE slug = ?`,
      [slug]
    );
    return result;
  }

  /**
   * Get entities by type
   * @param {string} type - Entity type
   * @returns {Promise<Array>}
   */
  async getByType(type) {
    return this.query('type = ? ORDER BY canonical_name ASC', [type]);
  }

  /**
   * Find entity by canonical name or alias
   * @param {string} name - Name to search for
   * @param {string} [type] - Optional type filter
   * @returns {Promise<Object|null>}
   */
  async findByName(name, type = null) {
    const nameLower = name.toLowerCase();

    // Try exact canonical name match first
    let query = `SELECT * FROM ${this.tableName} WHERE LOWER(canonical_name) = ?`;
    const params = [nameLower];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    let result = await dataService.get(query, params);
    if (result) return result;

    // Try alias match
    query = `SELECT * FROM ${this.tableName} WHERE aliases LIKE ?`;
    params[0] = `%"${name}"%`; // JSON array contains name

    if (type) {
      query += ' AND type = ?';
    }

    result = await dataService.get(query, params);
    return result;
  }

  /**
   * Find or create an entity
   * Used during entity resolution to avoid duplicates
   *
   * @param {Object} entityInfo - Entity information
   * @param {string} entityInfo.type - Entity type
   * @param {string} entityInfo.raw - Raw name from text
   * @param {string} [entityInfo.canonical_name] - Preferred canonical name
   * @returns {Promise<Object>} Found or created entity
   */
  async findOrCreate(entityInfo) {
    const { type, raw, canonical_name } = entityInfo;

    if (!type || !raw) {
      throw new Error('Entity info must have type and raw name');
    }

    // Try to find existing entity
    let entity = await this.findByName(raw, type);

    if (entity) {
      // Update aliases if this is a new variation
      await this.addAlias(entity.id, raw);
      return entity;
    }

    // Create new entity
    const name = canonical_name || raw;
    const slug = this.generateSlug(name);

    // Handle slug collision by appending type
    let finalSlug = slug;
    let existing = await this.getBySlug(finalSlug);
    if (existing) {
      finalSlug = `${slug}-${type}`;
    }

    entity = await this.createEntity({
      type,
      canonical_name: name,
      slug: finalSlug,
      aliases: raw !== name ? [raw] : []
    });

    return entity;
  }

  /**
   * Add an alias to an entity
   * @param {string} id - Entity ID
   * @param {string} alias - New alias to add
   * @returns {Promise<void>}
   */
  async addAlias(id, alias) {
    const entity = await this.getById(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }

    let aliases = [];
    if (entity.aliases) {
      try {
        aliases = JSON.parse(entity.aliases);
      } catch (e) {
        aliases = [];
      }
    }

    // Add alias if not already present
    const aliasLower = alias.toLowerCase();
    const exists = aliases.some(a => a.toLowerCase() === aliasLower);

    if (!exists) {
      aliases.push(alias);
      await this.update(id, { aliases: JSON.stringify(aliases) });
    }
  }

  /**
   * Link entity to a contact
   * @param {string} id - Entity ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>}
   */
  async linkToContact(id, contactId) {
    return this.update(id, { linked_contact_id: contactId });
  }

  /**
   * Link entity to a project
   * @param {string} id - Entity ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>}
   */
  async linkToProject(id, projectId) {
    return this.update(id, { linked_project_id: projectId });
  }

  /**
   * Get entities linked to a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<Array>}
   */
  async getByContact(contactId) {
    return this.query('linked_contact_id = ? ORDER BY canonical_name ASC', [contactId]);
  }

  /**
   * Get entities linked to a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>}
   */
  async getByProject(projectId) {
    return this.query('linked_project_id = ? ORDER BY canonical_name ASC', [projectId]);
  }

  /**
   * Search entities by name (canonical name or aliases)
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>}
   */
  async search(searchTerm) {
    const pattern = `%${searchTerm}%`;
    const result = await dataService.query(
      `SELECT * FROM ${this.tableName}
       WHERE canonical_name LIKE ? OR aliases LIKE ?
       ORDER BY canonical_name ASC`,
      [pattern, pattern]
    );
    return result;
  }

  /**
   * Update entity metadata
   * @param {string} id - Entity ID
   * @param {Object} metadata - Metadata object
   * @returns {Promise<Object>}
   */
  async updateMetadata(id, metadata) {
    return this.update(id, { metadata: JSON.stringify(metadata) });
  }

  /**
   * Get entity with parsed fields (aliases and metadata as objects)
   * @param {string} id - Entity ID
   * @returns {Promise<Object|null>}
   */
  async getByIdParsed(id) {
    const entity = await this.getById(id);
    if (!entity) return null;

    return this.parseEntity(entity);
  }

  /**
   * Parse entity fields from JSON strings to objects
   * @param {Object} entity - Raw entity from database
   * @returns {Object} Parsed entity
   */
  parseEntity(entity) {
    const parsed = { ...entity };

    // Parse aliases
    if (parsed.aliases) {
      try {
        parsed.aliases = JSON.parse(parsed.aliases);
      } catch (e) {
        parsed.aliases = [];
      }
    } else {
      parsed.aliases = [];
    }

    // Parse metadata
    if (parsed.metadata) {
      try {
        parsed.metadata = JSON.parse(parsed.metadata);
      } catch (e) {
        parsed.metadata = {};
      }
    } else {
      parsed.metadata = {};
    }

    return parsed;
  }

  /**
   * Get all entities with parsed fields
   * @returns {Promise<Array>}
   */
  async getAllParsed() {
    const entities = await this.getAll();
    return entities.map(e => this.parseEntity(e));
  }

  /**
   * Track entity occurrence in a memory
   * @param {Object} occurrenceData - Occurrence data
   * @param {string} occurrenceData.entity_id - Entity ID
   * @param {string} occurrenceData.memory_id - Memory ID
   * @param {string} occurrenceData.context - Context where entity was mentioned
   * @returns {Promise<Object>}
   */
  async trackOccurrence(occurrenceData) {
    const { entity_id, memory_id, context } = occurrenceData;

    if (!entity_id || !memory_id) {
      throw new Error('Occurrence must have entity_id and memory_id');
    }

    const id = this.generateId();

    const result = await dataService.run(
      `INSERT INTO entity_occurrences (id, entity_id, memory_id, context, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, entity_id, memory_id, context || null]
    );

    if (!result) {
      throw new Error('Failed to create entity occurrence');
    }

    return {
      id,
      entity_id,
      memory_id,
      context
    };
  }

  /**
   * Get all occurrences of an entity
   * @param {string} entityId - Entity ID
   * @returns {Promise<Array>}
   */
  async getOccurrences(entityId) {
    const result = await dataService.query(
      `SELECT eo.*, m.title, m.content, m.type, m.created_at as memory_created_at
       FROM entity_occurrences eo
       LEFT JOIN memories m ON eo.memory_id = m.id
       WHERE eo.entity_id = ?
       ORDER BY eo.created_at DESC`,
      [entityId]
    );
    return result;
  }

  /**
   * Get entities mentioned in a memory
   * @param {string} memoryId - Memory ID
   * @returns {Promise<Array>}
   */
  async getEntitiesForMemory(memoryId) {
    const result = await dataService.query(
      `SELECT e.*, eo.context
       FROM entities e
       INNER JOIN entity_occurrences eo ON e.id = eo.entity_id
       WHERE eo.memory_id = ?
       ORDER BY e.canonical_name ASC`,
      [memoryId]
    );
    return result.map(e => this.parseEntity(e));
  }

  /**
   * Get entity statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    // Total count
    const totalCount = await this.count();

    // Count by type
    const typeStats = await dataService.query(
      `SELECT type, COUNT(*) as count
       FROM ${this.tableName}
       GROUP BY type
       ORDER BY count DESC`
    );

    // Linked entities
    const linkedToContacts = await this.count('linked_contact_id IS NOT NULL');
    const linkedToProjects = await this.count('linked_project_id IS NOT NULL');

    // Most mentioned entities
    const mostMentioned = await dataService.query(
      `SELECT e.*, COUNT(eo.id) as mention_count
       FROM entities e
       LEFT JOIN entity_occurrences eo ON e.id = eo.entity_id
       GROUP BY e.id
       ORDER BY mention_count DESC
       LIMIT 10`
    );

    return {
      totalCount,
      typeStats,
      linkedToContacts,
      linkedToProjects,
      mostMentioned: mostMentioned.map(e => this.parseEntity(e))
    };
  }

  /**
   * Merge two entities (combine aliases and occurrences)
   * @param {string} keepId - Entity to keep
   * @param {string} mergeId - Entity to merge and delete
   * @returns {Promise<Object>} Updated entity
   */
  async mergeEntities(keepId, mergeId) {
    if (keepId === mergeId) {
      throw new Error('Cannot merge entity with itself');
    }

    const keep = await this.getByIdParsed(keepId);
    const merge = await this.getByIdParsed(mergeId);

    if (!keep || !merge) {
      throw new Error('Both entities must exist');
    }

    if (keep.type !== merge.type) {
      throw new Error('Can only merge entities of the same type');
    }

    // Combine aliases
    const combinedAliases = [...new Set([
      ...keep.aliases,
      ...merge.aliases,
      merge.canonical_name
    ])];

    // Update kept entity
    await this.update(keepId, {
      aliases: JSON.stringify(combinedAliases)
    });

    // Move occurrences to kept entity
    await dataService.run(
      `UPDATE entity_occurrences SET entity_id = ? WHERE entity_id = ?`,
      [keepId, mergeId]
    );

    // Delete merged entity
    await this.delete(mergeId);

    return this.getByIdParsed(keepId);
  }

  /**
   * Delete entity and its occurrences
   * @param {string} id - Entity ID
   * @returns {Promise<void>}
   */
  async deleteWithOccurrences(id) {
    // Delete occurrences first
    await dataService.run(
      `DELETE FROM entity_occurrences WHERE entity_id = ?`,
      [id]
    );

    // Delete entity
    await this.delete(id);
  }
}

// Export singleton instance
export const entityService = new EntityService();
