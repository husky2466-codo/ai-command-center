import React, { useState, useEffect, useCallback } from 'react';
import * as Diff from 'diff';
import './MemoryViewer.css';

export default function MemoryViewer() {
  const [currentContent, setCurrentContent] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeFile, setActiveFile] = useState('claude');
  const [diffView, setDiffView] = useState(false);
  const [lastModified, setLastModified] = useState(null);
  const [userDataPath, setUserDataPath] = useState('');
  const [homePath, setHomePath] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [currentProject, setCurrentProject] = useState('home');
  const [recentProjects, setRecentProjects] = useState([]);
  const [customProjects, setCustomProjects] = useState([]);

  // Get the current project path based on selection
  const getCurrentProjectPath = () => {
    if (currentProject === 'home') {
      return homePath;
    }
    const project = [...recentProjects, ...customProjects].find(p => p.id === currentProject);
    return project ? project.path : homePath;
  };

  const filePath = getCurrentProjectPath()
    ? `${getCurrentProjectPath()}\\${activeFile === 'claude' ? 'CLAUDE.md' : 'CLAUDELONGTERM.md'}`
    : '';

  // Initialize paths on mount
  useEffect(() => {
    const initPaths = async () => {
      if (window.electronAPI) {
        const [userPath, homeDir] = await Promise.all([
          window.electronAPI.getUserDataPath(),
          window.electronAPI.getHomePath()
        ]);
        setUserDataPath(userPath);
        setHomePath(homeDir);
      }
    };
    initPaths();

    // Load recent projects from localStorage
    const savedProjects = localStorage.getItem('mv-recent-projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setRecentProjects(parsed.slice(0, 5)); // Keep max 5 recent
      } catch (e) {
        console.error('Failed to parse recent projects:', e);
      }
    }

    // Load custom projects from localStorage
    const savedCustom = localStorage.getItem('mv-custom-projects');
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        setCustomProjects(parsed);
      } catch (e) {
        console.error('Failed to parse custom projects:', e);
      }
    }
  }, []);

  // Load file and versions when activeFile or paths change
  useEffect(() => {
    const loadFile = async () => {
      if (!window.electronAPI || !filePath) return;
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        setCurrentContent(result.content);
        const stats = await window.electronAPI.getFileStats(filePath);
        if (stats.success) {
          setLastModified(new Date(stats.stats.mtime));
        }
      }
    };

    const loadVersions = async () => {
      if (!window.electronAPI || !userDataPath) return;
      const snapshotsDir = `${userDataPath}\\snapshots`;
      const prefix = activeFile === 'claude' ? 'claude_' : 'longterm_';

      const result = await window.electronAPI.listDirectory(snapshotsDir);
      if (result.success) {
        const filtered = result.files
          .filter(f => f.startsWith(prefix) && f.endsWith('.md'))
          .sort()
          .reverse();

        const versionData = await Promise.all(
          filtered.slice(0, 50).map(async (filename) => {
            const content = await window.electronAPI.readFile(`${snapshotsDir}\\${filename}`);
            const timestamp = filename.replace(prefix, '').replace('.md', '');
            return {
              filename,
              timestamp,
              date: parseTimestamp(timestamp),
              content: content.success ? content.content : '',
            };
          })
        );
        setVersions(versionData);
      } else {
        setVersions([]);
      }
    };

    loadFile();
    loadVersions();
  }, [activeFile, userDataPath, filePath, reloadTrigger, currentProject]);

  // Check for file changes periodically
  useEffect(() => {
    const checkForChanges = async () => {
      if (!window.electronAPI || !filePath) return;
      const stats = await window.electronAPI.getFileStats(filePath);
      if (stats.success) {
        const newMtime = new Date(stats.stats.mtime);
        if (lastModified && newMtime > lastModified) {
          const result = await window.electronAPI.readFile(filePath);
          if (result.success) {
            setCurrentContent(result.content);
            setLastModified(newMtime);
          }
        }
      }
    };

    const interval = setInterval(checkForChanges, 5000);
    return () => clearInterval(interval);
  }, [lastModified, filePath]);

  const parseTimestamp = (ts) => {
    // Format: YYYYMMDD_HHMMSS
    if (ts.length < 15) return new Date();
    const year = ts.slice(0, 4);
    const month = ts.slice(4, 6);
    const day = ts.slice(6, 8);
    const hour = ts.slice(9, 11);
    const min = ts.slice(11, 13);
    const sec = ts.slice(13, 15);
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
  };

  const takeSnapshot = async () => {
    if (!window.electronAPI || !userDataPath) return;
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const prefix = activeFile === 'claude' ? 'claude_' : 'longterm_';
    const filename = `${prefix}${timestamp}.md`;
    const snapshotPath = `${userDataPath}\\snapshots\\${filename}`;

    await window.electronAPI.writeFile(snapshotPath, currentContent);

    // Trigger reload of versions
    setReloadTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    setReloadTrigger(prev => prev + 1);
  };

  const addToRecent = (projectPath, projectName) => {
    const newProject = {
      id: `recent-${Date.now()}`,
      path: projectPath,
      name: projectName || projectPath.split('\\').pop(),
      timestamp: Date.now()
    };

    setRecentProjects(prev => {
      // Remove if already exists
      const filtered = prev.filter(p => p.path !== projectPath);
      // Add to beginning and keep max 5
      const updated = [newProject, ...filtered].slice(0, 5);
      localStorage.setItem('mv-recent-projects', JSON.stringify(updated));
      return updated;
    });
  };

  const handleProjectChange = (projectId) => {
    setCurrentProject(projectId);
    setSelectedVersion(null);

    // Add to recent if it's a custom project
    if (projectId !== 'home') {
      const project = [...recentProjects, ...customProjects].find(p => p.id === projectId);
      if (project) {
        addToRecent(project.path, project.name);
      }
    }
  };

  const handleBrowseFolder = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.selectFolder();
    if (result.success && result.path) {
      const projectName = result.path.split('\\').pop();
      const newProject = {
        id: `custom-${Date.now()}`,
        path: result.path,
        name: projectName
      };

      setCustomProjects(prev => {
        // Check if already exists
        const exists = prev.some(p => p.path === result.path);
        if (exists) return prev;

        const updated = [...prev, newProject];
        localStorage.setItem('mv-custom-projects', JSON.stringify(updated));
        return updated;
      });

      addToRecent(result.path, projectName);
      setCurrentProject(newProject.id);
      setSelectedVersion(null);
    }
  };

  const removeCustomProject = (projectId) => {
    setCustomProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      localStorage.setItem('mv-custom-projects', JSON.stringify(updated));
      return updated;
    });
    if (currentProject === projectId) {
      setCurrentProject('home');
    }
  };

  const computeDiff = useCallback((oldText, newText) => {
    const changes = Diff.diffLines(oldText, newText);
    const result = [];
    let lineNum = 1;

    changes.forEach((part) => {
      const lines = part.value.split('\n');
      // Remove the last empty line if present (artifact of split)
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }

      lines.forEach((line) => {
        if (part.added) {
          result.push({ type: 'add', content: line, lineNum });
          lineNum++;
        } else if (part.removed) {
          result.push({ type: 'remove', content: line, lineNum });
        } else {
          result.push({ type: 'same', content: line, lineNum });
          lineNum++;
        }
      });
    });

    return result;
  }, []);

  const renderContent = () => {
    if (!selectedVersion || !diffView) {
      const content = selectedVersion ? selectedVersion.content : currentContent;
      return (
        <pre className="content-view">
          {content}
        </pre>
      );
    }

    const diff = computeDiff(selectedVersion.content, currentContent);
    return (
      <div className="diff-view">
        {diff.map((line, idx) => (
          <div key={idx} className={`diff-line diff-${line.type}`}>
            <span className="line-num">{line.lineNum}</span>
            <span className="line-prefix">
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </span>
            <span className="line-content">{line.content}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="memory-viewer">
      <div className="mv-sidebar">
        <div className="mv-project-selector">
          <label className="mv-selector-label">Project Folder</label>
          <select
            className="mv-project-dropdown"
            value={currentProject}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="home">Home Directory</option>
            {recentProjects.length > 0 && (
              <optgroup label="Recent Projects">
                {recentProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </optgroup>
            )}
            {customProjects.length > 0 && (
              <optgroup label="Custom Projects">
                {customProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <div className="mv-selector-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleBrowseFolder}>
              Browse...
            </button>
            {currentProject !== 'home' && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => removeCustomProject(currentProject)}
                title="Remove this project"
              >
                Remove
              </button>
            )}
          </div>
          <div className="mv-current-path">
            {getCurrentProjectPath()}
          </div>
        </div>

        <div className="mv-file-tabs">
          <button
            className={`mv-file-tab ${activeFile === 'claude' ? 'active' : ''}`}
            onClick={() => { setActiveFile('claude'); setSelectedVersion(null); }}
          >
            CLAUDE.md
          </button>
          <button
            className={`mv-file-tab ${activeFile === 'longterm' ? 'active' : ''}`}
            onClick={() => { setActiveFile('longterm'); setSelectedVersion(null); }}
          >
            LONGTERM.md
          </button>
        </div>

        <div className="mv-actions">
          <button className="btn btn-primary" onClick={takeSnapshot}>
            Take Snapshot
          </button>
        </div>

        <div className="mv-versions">
          <h3>Version History</h3>
          <div
            className={`mv-version-item ${!selectedVersion ? 'active' : ''}`}
            onClick={() => setSelectedVersion(null)}
          >
            <span className="version-label">Current</span>
            {lastModified && (
              <span className="version-date">{lastModified.toLocaleString()}</span>
            )}
          </div>
          {versions.map((v, idx) => (
            <div
              key={v.filename}
              className={`mv-version-item ${selectedVersion?.filename === v.filename ? 'active' : ''}`}
              onClick={() => setSelectedVersion(v)}
            >
              <span className="version-label">Snapshot {versions.length - idx}</span>
              <span className="version-date">{v.date.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mv-content">
        <div className="mv-toolbar">
          <span className="mv-title">
            {selectedVersion ? `Viewing: ${selectedVersion.filename}` : `Current: ${activeFile === 'claude' ? 'CLAUDE.md' : 'CLAUDELONGTERM.md'}`}
          </span>
          <div className="mv-toolbar-actions">
            {selectedVersion && (
              <label className="diff-toggle">
                <input
                  type="checkbox"
                  checked={diffView}
                  onChange={(e) => setDiffView(e.target.checked)}
                />
                Show Diff
              </label>
            )}
            <button className="btn btn-secondary" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        </div>
        <div className="mv-content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
