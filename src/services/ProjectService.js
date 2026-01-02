// @ts-check

/**
 * ProjectService - Business logic for three-tier project system
 * Handles Spaces, Projects, and Tasks with energy-based task management
 */

/**
 * @typedef {import('../types').Project} Project
 * @typedef {import('../types').Task} Task
 * @typedef {import('../types').Space} Space
 */

import { dataService } from './DataService.js';
import { v4 as uuidv4 } from 'uuid';

class ProjectService {
  // ============================================================================
  // SPACES (Life Areas - 30,000 ft view)
  // ============================================================================

  /**
   * Get all spaces
   * @returns {Promise<Space[]>}
   */
  async getAllSpaces() {
    return await dataService.query(
      'SELECT * FROM spaces ORDER BY sort_order ASC, created_at DESC'
    );
  }

  /**
   * Get a single space by ID
   * @param {string} id - Space ID
   * @returns {Promise<Space>}
   */
  async getSpace(id) {
    return await dataService.get('SELECT * FROM spaces WHERE id = ?', [id]);
  }

  /**
   * Create a new space
   * @param {Object} options - Space options
   * @param {string} options.name - Space name
   * @param {string} options.description - Space description
   * @param {string} [options.color='#8b5cf6'] - Space color
   * @param {string|null} [options.icon=null] - Space icon
   * @returns {Promise<Space>}
   */
  async createSpace({ name, description, color = '#8b5cf6', icon = null }) {
    const id = uuidv4();
    const now = new Date().toISOString();

    await dataService.run(
      `INSERT INTO spaces (id, name, description, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, color, icon, now, now]
    );

    return await this.getSpace(id);
  }

  async updateSpace(id, updates) {
    const { name, description, color, icon, sort_order } = updates;
    const now = new Date().toISOString();

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (color !== undefined) {
      fields.push('color = ?');
      values.push(color);
    }
    if (icon !== undefined) {
      fields.push('icon = ?');
      values.push(icon);
    }
    if (sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(sort_order);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await dataService.run(
      `UPDATE spaces SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getSpace(id);
  }

  async deleteSpace(id) {
    // Check if space has projects
    const projects = await dataService.query(
      'SELECT COUNT(*) as count FROM projects WHERE space_id = ?',
      [id]
    );

    if (projects[0].count > 0) {
      throw new Error('Cannot delete space with existing projects');
    }

    await dataService.run('DELETE FROM spaces WHERE id = ?', [id]);
  }

  async getSpaceWithProjectCount(id) {
    const space = await this.getSpace(id);
    if (!space) return null;

    const result = await dataService.get(
      `SELECT
        COUNT(*) as total_projects,
        SUM(CASE WHEN status = 'active_focus' THEN 1 ELSE 0 END) as active_projects
       FROM projects
       WHERE space_id = ?`,
      [id]
    );

    return {
      ...space,
      project_count: result.total_projects,
      active_count: result.active_projects
    };
  }

  // ============================================================================
  // PROJECTS (10,000 ft view)
  // ============================================================================

  /**
   * Get all projects with optional filters
   * @param {Object} [filters={}] - Filter options
   * @param {string} [filters.space_id] - Filter by space ID
   * @param {string} [filters.status] - Filter by status
   * @returns {Promise<Project[]>}
   */
  async getAllProjects(filters = {}) {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params = [];

    if (filters.space_id) {
      query += ' AND space_id = ?';
      params.push(filters.space_id);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Default sort by status order, then updated_at
    query += ' ORDER BY updated_at DESC';

    return await dataService.query(query, params);
  }

  async getProject(id) {
    return await dataService.get('SELECT * FROM projects WHERE id = ?', [id]);
  }

  async getProjectWithDetails(id) {
    const project = await this.getProject(id);
    if (!project) return null;

    // Get task stats
    const stats = await dataService.get(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
       FROM tasks
       WHERE project_id = ?`,
      [id]
    );

    // Get next action (first incomplete task)
    const nextAction = await dataService.get(
      `SELECT title FROM tasks
       WHERE project_id = ? AND status != 'completed'
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1`,
      [id]
    );

    // Get space
    const space = await this.getSpace(project.space_id);

    return {
      ...project,
      total_tasks: stats.total_tasks,
      completed_tasks: stats.completed_tasks,
      next_action: nextAction?.title || null,
      space
    };
  }

  /**
   * Create a new project
   * @param {Object} options - Project options
   * @param {string} options.space_id - Space ID
   * @param {string} options.name - Project name
   * @param {string} options.description - Project description
   * @param {string} [options.status='on_deck'] - Project status
   * @param {string|null} [options.deadline=null] - Deadline date
   * @param {string|null} [options.planning_notes=null] - Planning notes
   * @param {string|null} [options.fs_path=null] - Filesystem path
   * @returns {Promise<Project>}
   */
  async createProject({
    space_id,
    name,
    description,
    status = 'on_deck',
    deadline = null,
    planning_notes = null,
    fs_path = null
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();

    await dataService.run(
      `INSERT INTO projects (id, space_id, name, description, status, progress, deadline, planning_notes, fs_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [id, space_id, name, description, status, deadline, planning_notes, fs_path, now, now]
    );

    return await this.getProject(id);
  }

  async updateProject(id, updates) {
    const {
      space_id,
      name,
      description,
      status,
      progress,
      deadline,
      planning_notes,
      fs_path
    } = updates;
    const now = new Date().toISOString();

    const fields = [];
    const values = [];

    if (space_id !== undefined) {
      fields.push('space_id = ?');
      values.push(space_id);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (progress !== undefined) {
      fields.push('progress = ?');
      values.push(progress);
    }
    if (deadline !== undefined) {
      fields.push('deadline = ?');
      values.push(deadline);
    }
    if (planning_notes !== undefined) {
      fields.push('planning_notes = ?');
      values.push(planning_notes);
    }
    if (fs_path !== undefined) {
      fields.push('fs_path = ?');
      values.push(fs_path);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await dataService.run(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getProject(id);
  }

  async deleteProject(id) {
    // Tasks will be cascade deleted by foreign key constraint
    await dataService.run('DELETE FROM projects WHERE id = ?', [id]);
  }

  async updateProjectProgress(projectId) {
    const stats = await dataService.get(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM tasks
       WHERE project_id = ?`,
      [projectId]
    );

    const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    await dataService.run(
      'UPDATE projects SET progress = ?, updated_at = ? WHERE id = ?',
      [progress, new Date().toISOString(), projectId]
    );

    return progress;
  }

  async getProjectsByStatus() {
    const projects = await this.getAllProjects();
    const grouped = {
      active_focus: [],
      on_deck: [],
      growing: [],
      on_hold: [],
      completed: []
    };

    for (const project of projects) {
      const details = await this.getProjectWithDetails(project.id);
      grouped[project.status].push(details);
    }

    return grouped;
  }

  // ============================================================================
  // TASKS (Ground Level - Now View)
  // ============================================================================

  /**
   * Get all tasks with optional filters
   * @param {Object} [filters={}] - Filter options
   * @param {string} [filters.project_id] - Filter by project ID
   * @param {string} [filters.energy_type] - Filter by energy type
   * @param {string} [filters.status] - Filter by status
   * @param {boolean} [filters.exclude_completed] - Exclude completed tasks
   * @returns {Promise<Task[]>}
   */
  async getAllTasks(filters = {}) {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (filters.project_id) {
      query += ' AND project_id = ?';
      params.push(filters.project_id);
    }

    if (filters.energy_type) {
      query += ' AND energy_type = ?';
      params.push(filters.energy_type);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Exclude completed if specified
    if (filters.exclude_completed) {
      query += " AND status != 'completed'";
    }

    query += ' ORDER BY sort_order ASC, created_at DESC';

    return await dataService.query(query, params);
  }

  async getTask(id) {
    return await dataService.get('SELECT * FROM tasks WHERE id = ?', [id]);
  }

  async getTaskWithProject(id) {
    const task = await this.getTask(id);
    if (!task) return null;

    const project = await this.getProject(task.project_id);

    return {
      ...task,
      project
    };
  }

  /**
   * Create a new task
   * @param {Object} options - Task options
   * @param {string} options.project_id - Project ID
   * @param {string} options.title - Task title
   * @param {string|null} [options.description=null] - Task description
   * @param {string} [options.energy_type='medium'] - Energy type
   * @param {string} [options.status='pending'] - Task status
   * @param {string|null} [options.due_date=null] - Due date
   * @returns {Promise<Task>}
   */
  async createTask({
    project_id,
    title,
    description = null,
    energy_type = 'medium',
    status = 'pending',
    due_date = null
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get max sort_order for this project
    const maxOrder = await dataService.get(
      'SELECT MAX(sort_order) as max_order FROM tasks WHERE project_id = ?',
      [project_id]
    );

    const sort_order = (maxOrder?.max_order || 0) + 1;

    await dataService.run(
      `INSERT INTO tasks (id, project_id, title, description, energy_type, status, due_date, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, title, description, energy_type, status, due_date, sort_order, now, now]
    );

    // Update project progress
    await this.updateProjectProgress(project_id);

    return await this.getTask(id);
  }

  async updateTask(id, updates) {
    const task = await this.getTask(id);
    if (!task) throw new Error('Task not found');

    const {
      project_id,
      title,
      description,
      energy_type,
      status,
      due_date,
      sort_order
    } = updates;
    const now = new Date().toISOString();

    const fields = [];
    const values = [];

    if (project_id !== undefined) {
      fields.push('project_id = ?');
      values.push(project_id);
    }
    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (energy_type !== undefined) {
      fields.push('energy_type = ?');
      values.push(energy_type);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);

      // Set completed_at timestamp if status changed to completed
      if (status === 'completed' && task.status !== 'completed') {
        fields.push('completed_at = ?');
        values.push(now);
      } else if (status !== 'completed') {
        fields.push('completed_at = NULL');
      }
    }
    if (due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(due_date);
    }
    if (sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(sort_order);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await dataService.run(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Update project progress
    await this.updateProjectProgress(task.project_id);

    return await this.getTask(id);
  }

  async deleteTask(id) {
    const task = await this.getTask(id);
    if (!task) throw new Error('Task not found');

    await dataService.run('DELETE FROM tasks WHERE id = ?', [id]);

    // Update project progress
    await this.updateProjectProgress(task.project_id);
  }

  async toggleTaskComplete(id) {
    const task = await this.getTask(id);
    if (!task) throw new Error('Task not found');

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    return await this.updateTask(id, { status: newStatus });
  }

  async reorderTasks(taskIds) {
    // Update sort_order for array of task IDs
    const operations = taskIds.map((id, index) => ({
      type: 'run',
      sql: 'UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?',
      params: [index, new Date().toISOString(), id]
    }));

    await dataService.transaction(operations);
  }

  async getTasksByEnergy(energyTypes = [], excludeCompleted = true) {
    let query = 'SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE 1=1';
    const params = [];

    if (energyTypes.length > 0) {
      const placeholders = energyTypes.map(() => '?').join(',');
      query += ` AND t.energy_type IN (${placeholders})`;
      params.push(...energyTypes);
    }

    if (excludeCompleted) {
      query += " AND t.status != 'completed'";
    }

    query += ' ORDER BY t.sort_order ASC, t.created_at DESC';

    return await dataService.query(query, params);
  }

  async getTasksByStatus(status) {
    // Map 'active' to non-completed tasks (for dashboard compatibility)
    if (status === 'active') {
      return await dataService.query(
        `SELECT t.*, p.name as project_name
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.status != 'completed'
         ORDER BY t.sort_order ASC, t.created_at DESC`
      );
    }

    return await dataService.query(
      `SELECT t.*, p.name as project_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.status = ?
       ORDER BY t.sort_order ASC, t.created_at DESC`,
      [status]
    );
  }

  // ============================================================================
  // PROJECT WATCHER OPERATIONS
  // ============================================================================

  /**
   * Start watching a project's filesystem directory for changes
   * @param {string} projectId - UUID of the project
   * @param {string} fsPath - Filesystem path to watch
   * @returns {Promise<boolean>} Success status
   */
  async startWatching(projectId, fsPath) {
    if (!window.electronAPI?.projectStartWatching) {
      console.warn('[ProjectService] Project watcher not available (not running in Electron)');
      return false;
    }

    try {
      const result = await window.electronAPI.projectStartWatching(projectId, fsPath);
      return result?.success && result?.data?.watching;
    } catch (err) {
      console.error('[ProjectService] Failed to start watching:', err);
      return false;
    }
  }

  /**
   * Stop watching a project
   * @param {string} projectId - UUID of the project
   * @returns {Promise<boolean>} Success status
   */
  async stopWatching(projectId) {
    if (!window.electronAPI?.projectStopWatching) {
      console.warn('[ProjectService] Project watcher not available (not running in Electron)');
      return false;
    }

    try {
      const result = await window.electronAPI.projectStopWatching(projectId);
      return result?.success && result?.data?.stopped;
    } catch (err) {
      console.error('[ProjectService] Failed to stop watching:', err);
      return false;
    }
  }

  /**
   * Get recent file activity for a project
   * @param {string} projectId - UUID of the project
   * @param {number} limit - Maximum number of entries
   * @returns {Promise<Array>} Activity entries
   */
  async getActivity(projectId, limit = 20) {
    if (!window.electronAPI?.projectGetActivity) {
      console.warn('[ProjectService] Project watcher not available (not running in Electron)');
      return [];
    }

    try {
      const result = await window.electronAPI.projectGetActivity(projectId, limit);
      return result?.success ? result.data : [];
    } catch (err) {
      console.error('[ProjectService] Failed to get activity:', err);
      return [];
    }
  }

  /**
   * Get current metrics for a watched project
   * @param {string} projectId - UUID of the project
   * @returns {Promise<Object|null>} Metrics or null
   */
  async getMetrics(projectId) {
    if (!window.electronAPI?.projectGetMetrics) {
      console.warn('[ProjectService] Project watcher not available (not running in Electron)');
      return null;
    }

    try {
      const result = await window.electronAPI.projectGetMetrics(projectId);
      return result?.success ? result.data : null;
    } catch (err) {
      console.error('[ProjectService] Failed to get metrics:', err);
      return null;
    }
  }

  /**
   * Manually sync progress for a project (even if not watched)
   * @param {string} projectId - UUID of the project
   * @param {string} fsPath - Filesystem path
   * @returns {Promise<Object|null>} Progress and metrics or null
   */
  async syncProgress(projectId, fsPath) {
    if (!window.electronAPI?.projectSyncProgress) {
      console.warn('[ProjectService] Project watcher not available (not running in Electron)');
      return null;
    }

    try {
      const result = await window.electronAPI.projectSyncProgress(projectId, fsPath);
      return result?.success ? result.data : null;
    } catch (err) {
      console.error('[ProjectService] Failed to sync progress:', err);
      return null;
    }
  }

  /**
   * Check if a project is being watched
   * @param {string} projectId - UUID of the project
   * @returns {Promise<boolean>} True if watched
   */
  async isWatching(projectId) {
    if (!window.electronAPI?.projectIsWatching) {
      return false;
    }

    try {
      const result = await window.electronAPI.projectIsWatching(projectId);
      return result?.success && result?.data?.watching;
    } catch (err) {
      console.error('[ProjectService] Failed to check watching status:', err);
      return false;
    }
  }

  /**
   * Get list of all watched project IDs
   * @returns {Promise<Array<string>>} Project IDs
   */
  async getWatchedProjects() {
    if (!window.electronAPI?.projectGetWatchedProjects) {
      return [];
    }

    try {
      const result = await window.electronAPI.projectGetWatchedProjects();
      return result?.success ? result.data : [];
    } catch (err) {
      console.error('[ProjectService] Failed to get watched projects:', err);
      return [];
    }
  }

  /**
   * Subscribe to real-time progress updates
   * @param {function} callback - Callback function to receive updates
   * @returns {function} Cleanup function to unsubscribe
   */
  onProgressUpdate(callback) {
    if (!window.electronAPI?.onProjectProgressUpdated) {
      console.warn('[ProjectService] Progress updates not available (not running in Electron)');
      return () => {};
    }

    return window.electronAPI.onProjectProgressUpdated(callback);
  }

  /**
   * Manually trigger a project refresh
   * @returns {Promise<void>}
   */
  async manualRefresh() {
    if (!window.electronAPI?.projectsManualRefresh) {
      console.warn('[ProjectService] Manual refresh not available (not running in Electron)');
      return;
    }

    return window.electronAPI.projectsManualRefresh();
  }

  /**
   * Get refresh daemon status
   * @returns {Promise<Object>} Status object with running, interval, lastRefresh, nextRefresh
   */
  async getDaemonStatus() {
    if (!window.electronAPI?.projectsDaemonStatus) {
      console.warn('[ProjectService] Daemon status not available (not running in Electron)');
      return { running: false };
    }

    return window.electronAPI.projectsDaemonStatus();
  }

  /**
   * Set refresh interval
   * @param {number} intervalMs - Interval in milliseconds
   * @returns {Promise<void>}
   */
  async setRefreshInterval(intervalMs) {
    if (!window.electronAPI?.projectsSetRefreshInterval) {
      console.warn('[ProjectService] Set refresh interval not available (not running in Electron)');
      return;
    }

    return window.electronAPI.projectsSetRefreshInterval(intervalMs);
  }

  /**
   * Subscribe to refresh events
   * @param {function} callback - Callback function to receive refresh events
   * @returns {function} Cleanup function to unsubscribe
   */
  onProjectsRefreshed(callback) {
    if (!window.electronAPI?.onProjectsRefreshed) {
      console.warn('[ProjectService] Refresh events not available (not running in Electron)');
      return () => {};
    }

    return window.electronAPI.onProjectsRefreshed(callback);
  }
}

// Export singleton instance
export const projectService = new ProjectService();
