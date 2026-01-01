import React, { useState, useEffect } from 'react';
import {
  Server,
  Plug,
  Unplug,
  Gauge,
  Thermometer,
  Zap,
  FolderKanban,
  Play,
  Square,
  Activity,
  HardDrive,
  Cpu,
  Plus,
  Trash2,
  Folder
} from 'lucide-react';
import './DGXSpark.css';
import { dgxService } from '@/services/DGXService.js';
import MetricsPanel from './components/MetricsPanel.jsx';
import OperationsTab from './operations/OperationsTab.jsx';

export default function DGXSpark({ apiKeys }) {
  const [activeTab, setActiveTab] = useState('connection');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const conns = await dgxService.getConnections();
      setConnections(conns);
      const active = await dgxService.getActiveConnection();
      if (active) {
        // Check if still connected
        const status = await window.electronAPI.dgxCheckStatus(active.id);
        // IPC returns { success: true, data: { connected: true } }
        if (status?.data?.connected) {
          setActiveConnection(active);
          setIsConnected(true);
          setConnectionStatus('connected');
        } else {
          await dgxService.setActiveConnection(null);
          setActiveConnection(null);
          setIsConnected(false);
          setConnectionStatus('disconnected');
        }
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'var(--status-success)';
      case 'connecting':
        return 'var(--status-warning)';
      case 'error':
        return 'var(--status-error)';
      default:
        return 'var(--text-muted)';
    }
  };

  const tabs = [
    { id: 'connection', name: 'Connection', icon: Plug },
    { id: 'metrics', name: 'Metrics', icon: Gauge },
    { id: 'projects', name: 'Projects', icon: FolderKanban },
    { id: 'operations', name: 'Running Operations', icon: Activity }
  ];

  return (
    <div className="dgx-spark">
      {/* Header */}
      <div className="dgx-header">
        <div className="dgx-title">
          <Server className="dgx-icon" size={24} strokeWidth={2} />
          <h1>DGX Spark</h1>
          <div className="connection-indicator" style={{ '--status-color': getStatusColor() }}>
            <div className="status-dot" />
            <span className="status-text">
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'error' && 'Connection Error'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="dgx-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.name}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="dgx-content">
        {activeTab === 'connection' && (
          <ConnectionTab
            isConnected={isConnected}
            connections={connections}
            activeConnection={activeConnection}
            connectionStatus={connectionStatus}
            onConnect={async (config) => {
              setConnectionStatus('connecting');
              console.log('[DGX UI] Connecting to:', config.hostname, 'user:', config.username);
              try {
                const result = await window.electronAPI.dgxConnect({
                  id: config.id,
                  hostname: config.hostname,
                  username: config.username,
                  sshKeyPath: config.ssh_key_path,
                  port: config.port || 22
                });
                console.log('[DGX UI] Connect result:', result);

                if (result.success) {
                  await dgxService.setActiveConnection(config.id);
                  setActiveConnection(config);
                  setIsConnected(true);
                  setConnectionStatus('connected');
                  // Start Ollama tunnel
                  try {
                    await window.electronAPI.dgxStartTunnel(config.id, 11435, 11434);
                    console.log('[DGX UI] Ollama tunnel started on port 11435');
                  } catch (tunnelErr) {
                    console.warn('[DGX UI] Ollama tunnel failed (non-critical):', tunnelErr);
                  }
                } else {
                  console.error('[DGX UI] Connect failed:', result.error);
                  setConnectionStatus('error');
                  setTimeout(() => setConnectionStatus('disconnected'), 3000);
                }
              } catch (err) {
                console.error('[DGX UI] Connection exception:', err);
                setConnectionStatus('error');
                setTimeout(() => setConnectionStatus('disconnected'), 3000);
              }
            }}
            onDisconnect={async () => {
              if (activeConnection) {
                await window.electronAPI.dgxStopTunnel(activeConnection.id);
                await window.electronAPI.dgxDisconnect(activeConnection.id);
                await dgxService.setActiveConnection(null);
                setActiveConnection(null);
                setIsConnected(false);
                setConnectionStatus('disconnected');
              }
            }}
            onSave={async (formData) => {
              const newConn = await dgxService.createConnection(formData);
              setConnections([...connections, newConn]);
            }}
            onDelete={async (id) => {
              // Force delete - removes connection and all related metrics/projects/jobs
              await dgxService.deleteConnection(id, true);
              setConnections(connections.filter(c => c.id !== id));
            }}
          />
        )}
        {activeTab === 'metrics' && (
          <MetricsPanel
            connectionId={activeConnection?.id}
            isConnected={isConnected}
          />
        )}
        {activeTab === 'operations' && (
          <OperationsTab
            isConnected={connectionStatus === 'connected'}
            connectionId={activeConnection?.id}
            hostname={activeConnection?.hostname}
          />
        )}
        {activeTab === 'projects' && <ProjectsTab isConnected={isConnected} connectionId={activeConnection?.id} />}
      </div>
    </div>
  );
}

// Connection Tab Component
function ConnectionTab({
  isConnected,
  connections,
  activeConnection,
  connectionStatus,
  onConnect,
  onDisconnect,
  onSave,
  onDelete
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    username: '',
    ssh_key_path: '',
    port: 22
  });
  const [formError, setFormError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleSaveConnection = async () => {
    // Validate form
    if (!formData.name || !formData.hostname || !formData.username) {
      setFormError('Name, hostname, and username are required');
      return;
    }

    try {
      await onSave(formData);
      setFormData({ name: '', hostname: '', username: '', ssh_key_path: '', port: 22 });
      setShowForm(false);
      setFormError(null);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleBrowseKey = async () => {
    // For now, let user paste path. Future: add file picker via IPC
    const path = prompt('Enter SSH key path:');
    if (path) {
      setFormData(prev => ({ ...prev, ssh_key_path: path }));
    }
  };

  return (
    <div className="tab-pane connection-pane">
      {/* Current Connection Status */}
      {activeConnection && (
        <div className="connection-card active-connection">
          <div className="card-header">
            <Server size={20} />
            <h2>Active Connection</h2>
          </div>
          <div className="card-content">
            <div className="connection-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{activeConnection.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Host:</span>
                <span className="detail-value">{activeConnection.hostname}:{activeConnection.port}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Username:</span>
                <span className="detail-value">{activeConnection.username}</span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={onDisconnect}>
              <Unplug size={18} />
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Saved Connections List */}
      <div className="connection-card">
        <div className="card-header">
          <Plug size={20} />
          <h2>Saved Connections</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(!showForm)}
            style={{ marginLeft: 'auto' }}
          >
            <Plus size={16} />
            Add New
          </button>
        </div>
        <div className="card-content">
          {connections.length === 0 ? (
            <div className="empty-connections">
              <Server size={32} strokeWidth={1.5} />
              <p>No saved connections. Add your first DGX connection above.</p>
            </div>
          ) : (
            <div className="connections-list">
              {connections.map(conn => (
                <div
                  key={conn.id}
                  className={`connection-item ${activeConnection?.id === conn.id ? 'active' : ''}`}
                >
                  <div className="connection-item-info">
                    <h3>{conn.name}</h3>
                    <p>{conn.username}@{conn.hostname}:{conn.port}</p>
                    {conn.last_connected_at && (
                      <p className="last-connected">
                        Last connected: {new Date(conn.last_connected_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="connection-item-actions">
                    {activeConnection?.id === conn.id ? (
                      <button className="btn btn-ghost" disabled>
                        <Plug size={16} />
                        Connected
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onConnect(conn)}
                        disabled={connectionStatus === 'connecting'}
                      >
                        <Plug size={16} />
                        Connect
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-danger"
                      onClick={() => {
                        if (confirm(`Delete connection "${conn.name}" and all associated metrics, projects, and jobs?`)) {
                          onDelete(conn.id);
                        }
                      }}
                      disabled={activeConnection?.id === conn.id}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add New Connection Form */}
      {showForm && (
        <div className="connection-card">
          <div className="card-header">
            <Plus size={20} />
            <h2>New Connection</h2>
          </div>
          <div className="card-content">
            <div className="connection-form">
              {formError && (
                <div className="form-error">
                  {formError}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="name">Connection Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="My DGX Spark"
                  className="input"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="hostname">Host Address</label>
                <input
                  id="hostname"
                  name="hostname"
                  type="text"
                  placeholder="dgx-spark.local or IP address"
                  className="input"
                  value={formData.hostname}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="admin"
                    className="input"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="port">Port</label>
                  <input
                    id="port"
                    name="port"
                    type="number"
                    placeholder="22"
                    className="input"
                    value={formData.port}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="ssh_key_path">SSH Key Path (optional)</label>
                <div className="input-with-button">
                  <input
                    id="ssh_key_path"
                    name="ssh_key_path"
                    type="text"
                    placeholder="/path/to/private/key"
                    className="input"
                    value={formData.ssh_key_path}
                    onChange={handleInputChange}
                  />
                  <button className="btn btn-ghost" onClick={handleBrowseKey}>
                    <Folder size={16} />
                    Browse
                  </button>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleSaveConnection}>
                  <Plus size={18} />
                  Save Connection
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Guide */}
      <div className="info-card">
        <h3>Connection Guide</h3>
        <ul>
          <li>Ensure DGX Spark is powered on and accessible on the network</li>
          <li>Use SSH credentials configured on the DGX system</li>
          <li>SSH key authentication is recommended for better security</li>
          <li>Default SSH port is 22</li>
          <li>VPN connection may be required for remote access</li>
          <li>Ollama tunnel will be created on port 11435 when connected</li>
        </ul>
      </div>
    </div>
  );
}

// Projects Tab Component
function ProjectsTab({ isConnected, connectionId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && connectionId) {
      loadProjects();
    } else {
      setProjects([]);
    }
  }, [isConnected, connectionId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await dgxService.getProjects(connectionId);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id, name) => {
    if (confirm(`Delete project "${name}" and all its jobs?`)) {
      try {
        await dgxService.deleteProject(id);
        setProjects(projects.filter(p => p.id !== id));
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  return (
    <div className="tab-pane projects-pane">
      {!isConnected ? (
        <div className="empty-state">
          <FolderKanban size={48} strokeWidth={1.5} />
          <p>Connect to DGX Spark to manage projects</p>
        </div>
      ) : (
        <div className="projects-container">
          <div className="projects-header">
            <h2>Projects</h2>
            <button className="btn btn-primary">
              <FolderKanban size={18} />
              New Project
            </button>
          </div>
          {loading ? (
            <div className="loading-state">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <FolderKanban size={48} strokeWidth={1.5} />
              <p>No projects yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="projects-list">
              {projects.map(project => (
                <div key={project.id} className="project-item">
                  <div className="project-info">
                    <h3>{project.name}</h3>
                    <p className="project-path">{project.remote_path || 'No path set'}</p>
                    {project.description && (
                      <p className="project-description">{project.description}</p>
                    )}
                    <div className="project-meta">
                      {project.project_type && (
                        <span className="project-type">{project.project_type}</span>
                      )}
                      <span className={`project-status status-${project.status}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <div className="project-actions">
                    <button
                      className="btn btn-ghost btn-danger"
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      title="Delete project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

