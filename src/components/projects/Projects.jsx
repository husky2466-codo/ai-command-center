import React, { useState, useEffect } from 'react';
import { FolderKanban, LayoutGrid, List, CheckSquare, Plus, FolderInput } from 'lucide-react';
import { projectService } from '../../services/ProjectService';
import { useProjectRefresh } from '../../hooks/useProjectRefresh';
import LifeView from './LifeView';
import ProjectsView from './ProjectsView';
import NowView from './NowView';
import SpaceModal from './SpaceModal';
import ProjectModal from './ProjectModal';
import TaskModal from './TaskModal';
import ImportProjectsModal from './ImportProjectsModal';
import Button from '../shared/Button';
import './Projects.css';

const VIEWS = {
  LIFE: 'life',
  PROJECTS: 'projects',
  NOW: 'now'
};

export default function Projects() {
  const [currentView, setCurrentView] = useState(VIEWS.LIFE);
  const [spaces, setSpaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Modal states
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Hook for project refresh daemon
  useProjectRefresh(() => {
    console.log('[Projects] Refresh triggered by daemon');
    loadData();
  });

  useEffect(() => {
    loadData();

    // Subscribe to real-time progress updates
    const unsubscribe = projectService.onProgressUpdate((updateData) => {
      console.log('[Projects] Progress update received:', updateData);
      // Reload data when progress updates
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [spacesData, projectsData, tasksData] = await Promise.all([
        projectService.getAllSpaces(),
        projectService.getAllProjects(),
        projectService.getAllTasks({ exclude_completed: true })
      ]);

      setSpaces(spacesData);
      setProjects(projectsData);
      setTasks(tasksData);

      // Auto-start watchers for projects with fs_path
      for (const project of projectsData) {
        if (project.fs_path && project.status === 'active_focus') {
          const isWatching = await projectService.isWatching(project.id);
          if (!isWatching) {
            console.log(`[Projects] Auto-starting watcher for: ${project.name}`);
            await projectService.startWatching(project.id, project.fs_path);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceClick = (space) => {
    setSelectedSpace(space);
    setCurrentView(VIEWS.PROJECTS);
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setCurrentView(VIEWS.NOW);
  };

  const handleViewTasks = (project) => {
    setSelectedProject(project);
    setCurrentView(VIEWS.NOW);
  };

  const handleCreateSpace = () => {
    setEditingItem(null);
    setSpaceModalOpen(true);
  };

  const handleEditSpace = (space) => {
    setEditingItem(space);
    setSpaceModalOpen(true);
  };

  const handleCreateProject = () => {
    setEditingItem(null);
    setProjectModalOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingItem(project);
    setProjectModalOpen(true);
  };

  const handleCreateTask = () => {
    setEditingItem(null);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingItem(task);
    setTaskModalOpen(true);
  };

  const handleSpaceSaved = async (spaceData) => {
    try {
      if (editingItem) {
        await projectService.updateSpace(editingItem.id, spaceData);
      } else {
        await projectService.createSpace(spaceData);
      }
      await loadData();
      setSpaceModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save space:', error);
      throw error;
    }
  };

  const handleProjectSaved = async (projectData) => {
    try {
      if (editingItem) {
        await projectService.updateProject(editingItem.id, projectData);
      } else {
        await projectService.createProject(projectData);
      }
      await loadData();
      setProjectModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  };

  const handleTaskSaved = async (taskData) => {
    try {
      if (editingItem) {
        await projectService.updateTask(editingItem.id, taskData);
      } else {
        await projectService.createTask(taskData);
      }
      await loadData();
      setTaskModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save task:', error);
      throw error;
    }
  };

  const handleDeleteSpace = async (id) => {
    if (!confirm('Delete this space? All projects must be moved or deleted first.')) return;
    try {
      await projectService.deleteSpace(id);
      await loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await projectService.deleteProject(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await projectService.deleteTask(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleToggleTask = async (id) => {
    try {
      await projectService.toggleTaskComplete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleImportProjects = async (projectsData) => {
    try {
      for (const projectData of projectsData) {
        await projectService.createProject(projectData);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to import projects:', error);
      throw error;
    }
  };

  const handleOpenImportModal = () => {
    setImportModalOpen(true);
  };

  const getViewConfig = () => {
    switch (currentView) {
      case VIEWS.LIFE:
        return {
          title: 'Life (30,000 ft)',
          icon: LayoutGrid,
          description: 'High-level life areas and spaces',
          actionLabel: 'New Space',
          onAction: handleCreateSpace
        };
      case VIEWS.PROJECTS:
        return {
          title: 'Projects (10,000 ft)',
          icon: FolderKanban,
          description: selectedSpace ? `Projects in ${selectedSpace.name}` : 'All projects',
          actionLabel: 'New Project',
          onAction: handleCreateProject
        };
      case VIEWS.NOW:
        return {
          title: 'Now (Ground Level)',
          icon: CheckSquare,
          description: selectedProject ? `Tasks in ${selectedProject.name}` : 'All tasks',
          actionLabel: 'New Task',
          onAction: handleCreateTask
        };
      default:
        return {};
    }
  };

  const viewConfig = getViewConfig();
  const ViewIcon = viewConfig.icon;

  if (loading) {
    return (
      <div className="projects-container">
        <div className="projects-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      {/* Header */}
      <header className="projects-header">
        <div className="projects-header-left">
          <ViewIcon size={28} className="projects-header-icon" />
          <div className="projects-header-info">
            <h1 className="projects-title">{viewConfig.title}</h1>
            <p className="projects-subtitle">{viewConfig.description}</p>
          </div>
        </div>

        <div className="projects-header-actions">
          {/* View Switcher */}
          <div className="projects-view-switcher">
            <button
              className={`view-btn ${currentView === VIEWS.LIFE ? 'active' : ''}`}
              onClick={() => setCurrentView(VIEWS.LIFE)}
              title="Life View"
            >
              <LayoutGrid size={18} />
              <span>Life</span>
            </button>
            <button
              className={`view-btn ${currentView === VIEWS.PROJECTS ? 'active' : ''}`}
              onClick={() => setCurrentView(VIEWS.PROJECTS)}
              title="Projects View"
            >
              <FolderKanban size={18} />
              <span>Projects</span>
            </button>
            <button
              className={`view-btn ${currentView === VIEWS.NOW ? 'active' : ''}`}
              onClick={() => setCurrentView(VIEWS.NOW)}
              title="Now View"
            >
              <CheckSquare size={18} />
              <span>Now</span>
            </button>
          </div>

          {/* Import Button (only show in Projects view) */}
          {currentView === VIEWS.PROJECTS && (
            <Button
              variant="secondary"
              icon={<FolderInput size={18} />}
              onClick={handleOpenImportModal}
            >
              Import from D:\Projects
            </Button>
          )}

          {/* Create Button */}
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={viewConfig.onAction}
          >
            {viewConfig.actionLabel}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="projects-main">
        {currentView === VIEWS.LIFE && (
          <LifeView
            spaces={spaces}
            onSpaceClick={handleSpaceClick}
            onEditSpace={handleEditSpace}
            onDeleteSpace={handleDeleteSpace}
          />
        )}

        {currentView === VIEWS.PROJECTS && (
          <ProjectsView
            projects={projects}
            spaces={spaces}
            selectedSpace={selectedSpace}
            onProjectClick={handleProjectClick}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onViewTasks={handleViewTasks}
          />
        )}

        {currentView === VIEWS.NOW && (
          <NowView
            tasks={tasks}
            projects={projects}
            selectedProject={selectedProject}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
            onReload={loadData}
          />
        )}
      </main>

      {/* Modals */}
      {spaceModalOpen && (
        <SpaceModal
          space={editingItem}
          onClose={() => {
            setSpaceModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSpaceSaved}
        />
      )}

      {projectModalOpen && (
        <ProjectModal
          project={editingItem}
          spaces={spaces}
          selectedSpace={selectedSpace}
          onClose={() => {
            setProjectModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleProjectSaved}
        />
      )}

      {taskModalOpen && (
        <TaskModal
          task={editingItem}
          projects={projects}
          selectedProject={selectedProject}
          onClose={() => {
            setTaskModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleTaskSaved}
        />
      )}

      {importModalOpen && (
        <ImportProjectsModal
          spaces={spaces}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportProjects}
        />
      )}
    </div>
  );
}
