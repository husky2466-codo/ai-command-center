import React, { useEffect, useState } from 'react';
import { FolderKanban, ChevronDown, ChevronRight, Edit2, Trash2, Calendar, Target, Eye, RefreshCw } from 'lucide-react';
import { projectService } from '../../services/ProjectService';
import { PROJECT_STATUS } from '../../constants/energyTypes';
import Card from '../shared/Card';
import Badge from '../shared/Badge';

export default function ProjectsView({
  projects,
  spaces,
  selectedSpace,
  onProjectClick,
  onEditProject,
  onDeleteProject
}) {
  const [projectsWithDetails, setProjectsWithDetails] = useState([]);
  const [groupedProjects, setGroupedProjects] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({
    active_focus: true,
    on_deck: true,
    growing: false,
    on_hold: false,
    completed: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectDetails();
  }, [projects, selectedSpace]);

  const loadProjectDetails = async () => {
    try {
      setLoading(true);

      // Filter by selected space if applicable
      const filteredProjects = selectedSpace
        ? projects.filter(p => p.space_id === selectedSpace.id)
        : projects;

      // Load details for each project
      const detailedProjects = await Promise.all(
        filteredProjects.map(p => projectService.getProjectWithDetails(p.id))
      );

      setProjectsWithDetails(detailedProjects);

      // Group by status
      const grouped = {};
      Object.keys(PROJECT_STATUS).forEach(status => {
        grouped[status] = detailedProjects.filter(p => p.status === status);
      });

      setGroupedProjects(grouped);
    } catch (error) {
      console.error('Failed to load project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (status) => {
    setExpandedGroups(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  if (loading) {
    return <div className="projects-view-loading">Loading projects...</div>;
  }

  if (projectsWithDetails.length === 0) {
    return (
      <div className="projects-view-empty">
        <FolderKanban size={64} className="empty-icon" />
        <h2>No Projects Yet</h2>
        <p>Create your first project to start tracking progress</p>
      </div>
    );
  }

  return (
    <div className="projects-view">
      {Object.entries(PROJECT_STATUS).map(([statusKey, statusConfig]) => {
        const statusProjects = groupedProjects[statusKey] || [];
        const isExpanded = expandedGroups[statusKey];

        if (statusProjects.length === 0) return null;

        return (
          <div key={statusKey} className="project-section">
            <div
              className="project-section-header"
              onClick={() => toggleGroup(statusKey)}
            >
              <div className="project-section-title-row">
                {isExpanded ? (
                  <ChevronDown size={20} className="section-chevron" />
                ) : (
                  <ChevronRight size={20} className="section-chevron" />
                )}
                <h2 className="project-section-title">{statusConfig.label}</h2>
                <span className="project-section-count">{statusProjects.length}</span>
              </div>
              <p className="project-section-description">{statusConfig.description}</p>
            </div>

            {isExpanded && (
              <div className="project-list">
                {statusProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => onProjectClick(project)}
                    onEdit={(e) => {
                      e.stopPropagation();
                      onEditProject(project);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProjectCard({ project, onClick, onEdit, onDelete }) {
  const [isWatching, setIsWatching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const progressPercent = Math.round(project.progress || 0);
  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  useEffect(() => {
    checkWatchingStatus();
  }, [project.id]);

  const checkWatchingStatus = async () => {
    if (project.fs_path) {
      const watching = await projectService.isWatching(project.id);
      setIsWatching(watching);
    }
  };

  const handleSyncProgress = async (e) => {
    e.stopPropagation();
    if (!project.fs_path || syncing) return;

    try {
      setSyncing(true);
      await projectService.syncProgress(project.id, project.fs_path);
      // The progress update event will trigger a reload
    } catch (error) {
      console.error('Failed to sync progress:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card
      className="project-card"
      hoverable
      onClick={onClick}
    >
      <div className="project-card-content">
        {/* Header */}
        <div className="project-card-header">
          <div className="project-card-title-row">
            <h3 className="project-card-title">{project.name}</h3>
            <div className="project-card-actions">
              {/* Watching indicator */}
              {isWatching && (
                <div className="project-watching-indicator" title="File watcher active">
                  <Eye size={14} className="watching-icon" />
                </div>
              )}

              {/* Manual sync button */}
              {project.fs_path && (
                <button
                  className={`project-action-btn ${syncing ? 'syncing' : ''}`}
                  onClick={handleSyncProgress}
                  title="Sync progress from filesystem"
                  disabled={syncing}
                >
                  <RefreshCw size={16} className={syncing ? 'spinning' : ''} />
                </button>
              )}

              <button
                className="project-action-btn"
                onClick={onEdit}
                title="Edit project"
              >
                <Edit2 size={16} />
              </button>
              <button
                className="project-action-btn project-delete-btn"
                onClick={onDelete}
                title="Delete project"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Space Badge */}
          {project.space && (
            <Badge
              variant="outlined"
              style={{
                borderColor: project.space.color,
                color: project.space.color
              }}
            >
              {project.space.name}
            </Badge>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="project-card-description">{project.description}</p>
        )}

        {/* Progress Bar */}
        <div className="project-progress">
          <div className="project-progress-header">
            <span className="project-progress-label">Progress</span>
            <span className="project-progress-value">{progressPercent}%</span>
          </div>
          <div className="project-progress-bar">
            <div
              className="project-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="project-card-footer">
          {/* Task Count */}
          <div className="project-task-count">
            <Target size={14} />
            <span>
              {project.completed_tasks || 0} / {project.total_tasks || 0} tasks
            </span>
          </div>

          {/* Deadline */}
          {project.deadline && (
            <div className={`project-deadline ${isOverdue ? 'overdue' : ''}`}>
              <Calendar size={14} />
              <span>{formatDate(project.deadline)}</span>
            </div>
          )}
        </div>

        {/* Next Action */}
        {project.next_action && (
          <div className="project-next-action">
            <span className="next-action-label">Next:</span>
            <span className="next-action-text">{project.next_action}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
