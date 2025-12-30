import React, { useState, useEffect } from 'react';
import { FolderOpen, CheckSquare, Square, Folder, Clock, X } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import './ImportProjectsModal.css';

export default function ImportProjectsModal({ spaces, onClose, onImport }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [discoveredProjects, setDiscoveredProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [projectSpaces, setProjectSpaces] = useState({});
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    // Validate props
    if (!spaces || !Array.isArray(spaces) || spaces.length === 0) {
      console.error('[ImportProjectsModal] Invalid spaces prop:', spaces);
      setError('No spaces available. Please create a space first.');
      setLoading(false);
      return;
    }

    scanProjects();
  }, []);

  const scanProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Scan D:\Projects folder
      console.log('[ImportProjectsModal] Calling scanProjectsFolder...');
      const result = await window.electronAPI.scanProjectsFolder();
      console.log('[ImportProjectsModal] scanProjectsFolder result:', result);

      if (!result || !result.success) {
        const errorMsg = result?.error || 'Failed to scan projects folder';
        console.error('[ImportProjectsModal] Scan failed:', errorMsg);
        setError(errorMsg);
        setDiscoveredProjects([]);
        return;
      }

      // Validate projects array
      const projects = result.projects || [];
      console.log('[ImportProjectsModal] Found projects:', projects.length);

      if (!Array.isArray(projects)) {
        console.error('[ImportProjectsModal] Invalid projects data - not an array:', projects);
        setError('Invalid response from scanner');
        setDiscoveredProjects([]);
        return;
      }

      // Check which projects already exist in database
      const existingProjects = await checkExistingProjects(projects);
      console.log('[ImportProjectsModal] Existing projects:', existingProjects.size);

      // Filter out already imported projects
      const newProjects = projects.filter(
        p => p && p.path && !existingProjects.has(p.path)
      );
      console.log('[ImportProjectsModal] New projects after filtering:', newProjects.length);

      setDiscoveredProjects(newProjects);

      // Initialize all projects with default space (Work)
      if (newProjects.length > 0 && spaces && spaces.length > 0) {
        const defaultSpace = spaces.find(s => s.name === 'Work') || spaces[0];
        const initialSpaces = {};
        newProjects.forEach(p => {
          initialSpaces[p.path] = defaultSpace?.id || null;
        });
        setProjectSpaces(initialSpaces);
      }

    } catch (err) {
      console.error('[ImportProjectsModal] Failed to scan projects:', err);
      setError(err.message || 'Unknown error occurred');
      setDiscoveredProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingProjects = async (projects) => {
    const existing = new Set();

    if (!projects || projects.length === 0) {
      console.log('[checkExistingProjects] No projects to check');
      return existing;
    }

    for (const project of projects) {
      try {
        const result = await window.electronAPI.dbGet(
          'SELECT id FROM projects WHERE fs_path = ?',
          [project.path]
        );

        // dbGet returns { success: true, data: <row or undefined> }
        if (result && result.success && result.data) {
          console.log('[checkExistingProjects] Found existing:', project.path);
          existing.add(project.path);
        }
      } catch (err) {
        console.error('[checkExistingProjects] Error checking project:', project.path, err);
      }
    }

    return existing;
  };

  const toggleProject = (projectPath) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectPath)) {
      newSelected.delete(projectPath);
    } else {
      newSelected.add(projectPath);
    }
    setSelectedProjects(newSelected);
  };

  const toggleAll = () => {
    if (selectedProjects.size === discoveredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(discoveredProjects.map(p => p.path)));
    }
  };

  const setSpaceForProject = (projectPath, spaceId) => {
    setProjectSpaces(prev => ({
      ...prev,
      [projectPath]: spaceId
    }));
  };

  const handleImport = async () => {
    if (selectedProjects.size === 0) {
      console.log('[handleImport] No projects selected');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      console.log('[handleImport] Starting import for', selectedProjects.size, 'projects');

      const projectsToImport = discoveredProjects.filter(p =>
        selectedProjects.has(p.path)
      );

      console.log('[handleImport] Filtered projects to import:', projectsToImport.length);

      const importedProjects = [];

      for (const project of projectsToImport) {
        const spaceId = projectSpaces[project.path];

        if (!spaceId) {
          console.warn(`[handleImport] Skipping ${project.name} - no space selected`);
          continue;
        }

        const projectData = {
          space_id: spaceId,
          name: project.name,
          description: `Imported from ${project.path}`,
          status: 'on_deck',
          fs_path: project.path
        };

        importedProjects.push(projectData);
      }

      console.log('[handleImport] Prepared', importedProjects.length, 'projects for import');

      if (importedProjects.length === 0) {
        setError('No projects selected for import (all missing space assignment)');
        return;
      }

      // Call the onImport callback with all projects
      await onImport(importedProjects);

      console.log('[handleImport] Import completed successfully');
      onClose();
    } catch (err) {
      console.error('[handleImport] Failed to import projects:', err);
      setError(err.message || 'Failed to import projects');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="large" showCloseButton={false}>
      <div className="import-projects-modal">
        <div className="import-projects-header">
          <div className="import-projects-header-left">
            <FolderOpen size={24} className="import-projects-icon" />
            <div>
              <h2 className="import-projects-title">Import Projects</h2>
              <p className="import-projects-subtitle">
                Import existing projects from D:\Projects folder
              </p>
            </div>
          </div>
          <button className="import-projects-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="import-projects-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="import-projects-loading">
            Scanning D:\Projects folder...
          </div>
        ) : discoveredProjects.length === 0 ? (
          <div className="import-projects-empty">
            <Folder size={48} className="import-projects-empty-icon" />
            <p className="import-projects-empty-text">
              No new projects found in D:\Projects
            </p>
            <p className="import-projects-empty-subtext">
              All projects may already be imported
            </p>
          </div>
        ) : (
          <>
            <div className="import-projects-toolbar">
              <Button
                variant="secondary"
                size="sm"
                icon={selectedProjects.size === discoveredProjects.length ? <CheckSquare size={16} /> : <Square size={16} />}
                onClick={toggleAll}
              >
                {selectedProjects.size === discoveredProjects.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="import-projects-count">
                {selectedProjects.size} of {discoveredProjects.length} selected
              </span>
            </div>

            <div className="import-projects-list">
              {discoveredProjects.map((project) => (
                <div
                  key={project.path}
                  className={`import-project-item ${selectedProjects.has(project.path) ? 'selected' : ''}`}
                >
                  <div className="import-project-checkbox" onClick={() => toggleProject(project.path)}>
                    {selectedProjects.has(project.path) ? (
                      <CheckSquare size={20} className="import-project-checkbox-checked" />
                    ) : (
                      <Square size={20} className="import-project-checkbox-unchecked" />
                    )}
                  </div>

                  <div className="import-project-info">
                    <div className="import-project-name">
                      <Folder size={16} className="import-project-folder-icon" />
                      {project.name}
                    </div>
                    <div className="import-project-path">{project.path}</div>
                    <div className="import-project-meta">
                      <Clock size={12} />
                      <span>Modified {formatDate(project.modified)}</span>
                    </div>
                  </div>

                  <div className="import-project-space">
                    <label className="import-project-space-label">Space:</label>
                    <select
                      className="import-project-space-select"
                      value={projectSpaces[project.path] || ''}
                      onChange={(e) => setSpaceForProject(project.path, e.target.value)}
                      disabled={!selectedProjects.has(project.path)}
                    >
                      <option value="">Select space...</option>
                      {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                          {space.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="import-projects-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={selectedProjects.size === 0 || importing || loading}
          >
            {importing ? 'Importing...' : `Import ${selectedProjects.size} Project${selectedProjects.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
