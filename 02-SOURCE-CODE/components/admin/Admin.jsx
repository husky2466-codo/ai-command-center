import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Activity,
  TrendingUp,
  Users,
  MessageSquare,
  Brain,
  HardDrive,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Search,
  Filter,
  Palette
} from 'lucide-react';
import './Admin.css';
import { adminService } from '../../services/adminService';
import AppearanceSettings from './AppearanceSettings';

export default function Admin({ apiKeys }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Overview state
  const [stats, setStats] = useState({
    memoryCount: 0,
    sessionCount: 0,
    totalTokens: 0,
    dbSize: '0 KB',
    serviceHealth: {}
  });

  // Token usage state
  const [tokenUsage, setTokenUsage] = useState({
    usage: [],
    totals: { total_tokens: 0, total_cost: 0, provider_count: 0 },
    byProvider: []
  });
  const [tokenPeriod, setTokenPeriod] = useState('30d');

  // System health state
  const [systemHealth, setSystemHealth] = useState({
    database: 'unknown',
    ollama: 'unknown',
    embeddings: 'unknown'
  });

  // Data management state
  const [clearDays, setClearDays] = useState(90);
  const [showConfirm, setShowConfirm] = useState(null);

  // Environment state
  const [environment, setEnvironment] = useState({});
  const [showKeys, setShowKeys] = useState({
    anthropic: false,
    openai: false,
    hf: false
  });

  // Debug state
  const [tables, setTables] = useState([]);
  const [testQuery, setTestQuery] = useState('SELECT * FROM memories LIMIT 10');
  const [queryResult, setQueryResult] = useState(null);

  // Memories browser state
  const [memories, setMemories] = useState([]);
  const [memoryFilters, setMemoryFilters] = useState({ type: '', category: '', search: '' });

  // Sessions browser state
  const [sessions, setSessions] = useState([]);
  const [sessionFilters, setSessionFilters] = useState({ search: '' });
  const [selectedSession, setSelectedSession] = useState(null);

  // Load data on mount and tab change
  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  // Load data for current tab
  const loadTabData = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'overview':
          await loadOverview();
          break;
        case 'tokens':
          await loadTokenUsage();
          break;
        case 'system':
          await loadSystemHealth();
          break;
        case 'environment':
          await loadEnvironment();
          break;
        case 'debug':
          await loadDebugInfo();
          break;
        case 'memories':
          await loadMemories();
          break;
        case 'sessions':
          await loadSessions();
          break;
        default:
          break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load overview statistics
  const loadOverview = async () => {
    const data = await adminService.getOverviewStats();
    setStats(data);
  };

  // Load token usage
  const loadTokenUsage = async () => {
    const data = await adminService.getTokenUsage(tokenPeriod);
    setTokenUsage(data);
  };

  // Load system health
  const loadSystemHealth = async () => {
    const health = await adminService.checkServiceHealth();
    setSystemHealth(health);
  };

  // Load environment info
  const loadEnvironment = async () => {
    const env = await adminService.getEnvironment();
    setEnvironment(env);
  };

  // Load debug info
  const loadDebugInfo = async () => {
    const tablesData = await adminService.getDatabaseTables();
    setTables(tablesData);
  };

  // Load memories
  const loadMemories = async () => {
    const data = await adminService.getMemories(memoryFilters);
    setMemories(data);
  };

  // Load sessions
  const loadSessions = async () => {
    const data = await adminService.getSessions(sessionFilters);
    setSessions(data);
  };

  // Export data
  const handleExport = async () => {
    try {
      setLoading(true);
      const data = await adminService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-command-center-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear old data
  const handleClearData = async () => {
    if (!showConfirm) {
      setShowConfirm('clear');
      return;
    }

    try {
      setLoading(true);
      const deleted = await adminService.clearOldData(clearDays);
      alert(`Deleted ${deleted.memories} memories and ${deleted.sessions} sessions`);
      setShowConfirm(null);
      await loadOverview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Optimize database
  const handleOptimize = async () => {
    try {
      setLoading(true);
      await adminService.optimizeDatabase();
      alert('Database optimized successfully');
      await loadOverview();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run test query
  const handleRunQuery = async () => {
    try {
      setLoading(true);
      const result = await adminService.runTestQuery(testQuery);
      setQueryResult(result);
    } catch (err) {
      setError(err.message);
      setQueryResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Delete memory
  const handleDeleteMemory = async (id) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      await adminService.deleteMemory(id);
      await loadMemories();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete session
  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await adminService.deleteSession(id);
      await loadSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  // Render status indicator
  const renderStatus = (status) => {
    const icons = {
      healthy: <CheckCircle className="status-icon status-healthy" size={16} />,
      warning: <AlertCircle className="status-icon status-warning" size={16} />,
      error: <XCircle className="status-icon status-error" size={16} />,
      offline: <XCircle className="status-icon status-offline" size={16} />,
      unknown: <AlertCircle className="status-icon status-offline" size={16} />
    };
    return icons[status] || icons.unknown;
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>
          <Settings size={28} />
          Admin Panel
        </h1>
        <p className="admin-subtitle">System monitoring and configuration</p>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={18} />
          Overview
        </button>
        <button
          className={`admin-tab ${activeTab === 'tokens' ? 'active' : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          <TrendingUp size={18} />
          Token Usage
        </button>
        <button
          className={`admin-tab ${activeTab === 'memories' ? 'active' : ''}`}
          onClick={() => setActiveTab('memories')}
        >
          <Brain size={18} />
          Memories
        </button>
        <button
          className={`admin-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <MessageSquare size={18} />
          Sessions
        </button>
        <button
          className={`admin-tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Database size={18} />
          System Health
        </button>
        <button
          className={`admin-tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <HardDrive size={18} />
          Data Management
        </button>
        <button
          className={`admin-tab ${activeTab === 'environment' ? 'active' : ''}`}
          onClick={() => setActiveTab('environment')}
        >
          <Settings size={18} />
          Environment
        </button>
        <button
          className={`admin-tab ${activeTab === 'debug' ? 'active' : ''}`}
          onClick={() => setActiveTab('debug')}
        >
          <Activity size={18} />
          Debug
        </button>
        <button
          className={`admin-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          <Palette size={18} />
          Appearance
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="admin-error">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tab Content */}
      <div className="admin-content">
        {loading && <div className="admin-loading">Loading...</div>}

        {/* Overview Tab */}
        {activeTab === 'overview' && !loading && (
          <div className="admin-overview">
            <div className="stat-cards">
              <div className="stat-card">
                <Brain size={32} className="stat-icon" />
                <div className="stat-value">{stats.memoryCount.toLocaleString()}</div>
                <div className="stat-label">Memories</div>
              </div>
              <div className="stat-card">
                <MessageSquare size={32} className="stat-icon" />
                <div className="stat-value">{stats.sessionCount.toLocaleString()}</div>
                <div className="stat-label">Sessions</div>
              </div>
              <div className="stat-card">
                <TrendingUp size={32} className="stat-icon" />
                <div className="stat-value">{(stats.totalTokens / 1000000).toFixed(2)}M</div>
                <div className="stat-label">Total Tokens</div>
              </div>
              <div className="stat-card">
                <HardDrive size={32} className="stat-icon" />
                <div className="stat-value">{stats.dbSize}</div>
                <div className="stat-label">Database Size</div>
              </div>
            </div>

            <div className="service-health">
              <h2>Service Health</h2>
              <div className="health-items">
                <div className="health-item">
                  {renderStatus(stats.serviceHealth?.database)}
                  <span>Database</span>
                </div>
                <div className="health-item">
                  {renderStatus(stats.serviceHealth?.ollama)}
                  <span>Ollama</span>
                </div>
                <div className="health-item">
                  {renderStatus(stats.serviceHealth?.embeddings)}
                  <span>Embeddings</span>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <button onClick={() => loadOverview()} className="action-btn">
                <RefreshCw size={18} />
                Refresh Stats
              </button>
              <button onClick={handleExport} className="action-btn">
                <Download size={18} />
                Export Data
              </button>
              <button onClick={handleOptimize} className="action-btn">
                <Database size={18} />
                Optimize Database
              </button>
            </div>
          </div>
        )}

        {/* Token Usage Tab */}
        {activeTab === 'tokens' && !loading && (
          <div className="admin-tokens">
            <div className="token-controls">
              <label>
                Time Period:
                <select value={tokenPeriod} onChange={(e) => {
                  setTokenPeriod(e.target.value);
                  setTimeout(() => loadTokenUsage(), 100);
                }}>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </label>
            </div>

            <div className="token-summary">
              <div className="token-stat">
                <div className="token-value">{(tokenUsage.totals.total_tokens / 1000000).toFixed(2)}M</div>
                <div className="token-label">Total Tokens</div>
              </div>
              <div className="token-stat">
                <div className="token-value">${tokenUsage.totals.total_cost.toFixed(2)}</div>
                <div className="token-label">Estimated Cost</div>
              </div>
              <div className="token-stat">
                <div className="token-value">{tokenUsage.totals.provider_count}</div>
                <div className="token-label">Providers</div>
              </div>
            </div>

            <div className="token-breakdown">
              <h2>By Provider</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Tokens</th>
                    <th>Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenUsage.byProvider.map((row, idx) => (
                    <tr key={idx}>
                      <td className="capitalize">{row.provider}</td>
                      <td>{row.tokens.toLocaleString()}</td>
                      <td>${row.cost.toFixed(4)}</td>
                    </tr>
                  ))}
                  {tokenUsage.byProvider.length === 0 && (
                    <tr>
                      <td colSpan="3" className="empty-state">No token usage data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Memories Tab */}
        {activeTab === 'memories' && !loading && (
          <div className="admin-memories">
            <div className="memory-filters">
              <input
                type="text"
                placeholder="Search memories..."
                value={memoryFilters.search}
                onChange={(e) => setMemoryFilters({ ...memoryFilters, search: e.target.value })}
              />
              <button onClick={loadMemories} className="filter-btn">
                <Search size={16} />
                Search
              </button>
            </div>

            <div className="memory-list">
              {memories.map((memory) => (
                <div key={memory.id} className="memory-item">
                  <div className="memory-header">
                    <span className={`memory-type-badge ${memory.type}`}>{memory.type}</span>
                    <span className="memory-confidence">{(memory.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="memory-title">{memory.title || 'Untitled'}</div>
                  <div className="memory-content">{memory.content?.substring(0, 200)}...</div>
                  <div className="memory-meta">
                    <span>{new Date(memory.formed_at).toLocaleDateString()}</span>
                    <button onClick={() => handleDeleteMemory(memory.id)} className="delete-btn">
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {memories.length === 0 && (
                <div className="empty-state">No memories found</div>
              )}
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && !loading && (
          <div className="admin-sessions">
            <div className="session-filters">
              <input
                type="text"
                placeholder="Search sessions..."
                value={sessionFilters.search}
                onChange={(e) => setSessionFilters({ ...sessionFilters, search: e.target.value })}
              />
              <button onClick={loadSessions} className="filter-btn">
                <Search size={16} />
                Search
              </button>
            </div>

            <div className="session-list">
              {sessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-title">{session.title || 'Untitled Session'}</div>
                  <div className="session-meta">
                    <span>{session.message_count} messages</span>
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleDeleteSession(session.id)} className="delete-btn">
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="empty-state">No sessions found</div>
              )}
            </div>
          </div>
        )}

        {/* System Health Tab */}
        {activeTab === 'system' && !loading && (
          <div className="admin-system">
            <div className="health-grid">
              <div className="health-card">
                <div className="health-card-header">
                  <Database size={24} />
                  <span>Database</span>
                </div>
                <div className="health-card-status">
                  {renderStatus(systemHealth.database)}
                  <span className="capitalize">{systemHealth.database}</span>
                </div>
              </div>
              <div className="health-card">
                <div className="health-card-header">
                  <Activity size={24} />
                  <span>Ollama</span>
                </div>
                <div className="health-card-status">
                  {renderStatus(systemHealth.ollama)}
                  <span className="capitalize">{systemHealth.ollama}</span>
                </div>
              </div>
              <div className="health-card">
                <div className="health-card-header">
                  <TrendingUp size={24} />
                  <span>Embeddings</span>
                </div>
                <div className="health-card-status">
                  {renderStatus(systemHealth.embeddings)}
                  <span className="capitalize">{systemHealth.embeddings}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === 'data' && !loading && (
          <div className="admin-data">
            <div className="data-section">
              <h2>Export / Import</h2>
              <div className="data-actions">
                <button onClick={handleExport} className="action-btn">
                  <Download size={18} />
                  Export All Data (JSON)
                </button>
                <button onClick={() => alert('Import not yet implemented')} className="action-btn" disabled>
                  <Upload size={18} />
                  Import Data
                </button>
              </div>
            </div>

            <div className="data-section">
              <h2>Clear Old Data</h2>
              <div className="clear-data-form">
                <label>
                  Delete data older than:
                  <input
                    type="number"
                    value={clearDays}
                    onChange={(e) => setClearDays(parseInt(e.target.value))}
                    min="1"
                  />
                  days
                </label>
                <button onClick={handleClearData} className="action-btn danger">
                  <Trash2 size={18} />
                  {showConfirm === 'clear' ? 'Confirm Delete' : 'Clear Old Data'}
                </button>
                {showConfirm === 'clear' && (
                  <button onClick={() => setShowConfirm(null)} className="action-btn">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="data-section">
              <h2>Database Optimization</h2>
              <button onClick={handleOptimize} className="action-btn">
                <Database size={18} />
                Run VACUUM
              </button>
              <p className="help-text">Reclaim unused space and optimize database performance</p>
            </div>
          </div>
        )}

        {/* Environment Tab */}
        {activeTab === 'environment' && !loading && (
          <div className="admin-environment">
            <div className="env-section">
              <h2>API Keys</h2>
              <div className="env-vars">
                <div className="env-var">
                  <span className="env-key">Anthropic API Key</span>
                  <span className="env-value">
                    {showKeys.anthropic ? apiKeys?.ANTHROPIC_API_KEY || 'Not set' : environment.anthropicKey}
                  </span>
                  <button onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}>
                    {showKeys.anthropic ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="env-var">
                  <span className="env-key">OpenAI API Key</span>
                  <span className="env-value">
                    {showKeys.openai ? apiKeys?.OPENAI_API_KEY || 'Not set' : environment.openaiKey}
                  </span>
                  <button onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}>
                    {showKeys.openai ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="env-var">
                  <span className="env-key">HuggingFace Token</span>
                  <span className="env-value">
                    {showKeys.hf ? apiKeys?.HF_TOKEN || 'Not set' : environment.hfToken}
                  </span>
                  <button onClick={() => setShowKeys({ ...showKeys, hf: !showKeys.hf })}>
                    {showKeys.hf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="env-section">
              <h2>System Info</h2>
              <div className="env-vars">
                <div className="env-var">
                  <span className="env-key">Ollama Status</span>
                  <span className="env-value capitalize">{environment.ollamaStatus}</span>
                </div>
                <div className="env-var">
                  <span className="env-key">App Version</span>
                  <span className="env-value">{environment.appVersion}</span>
                </div>
                <div className="env-var">
                  <span className="env-key">Storage Path</span>
                  <span className="env-value">{environment.storagePath}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Tab */}
        {activeTab === 'debug' && !loading && (
          <div className="admin-debug">
            <div className="debug-section">
              <h2>Database Tables</h2>
              <div className="table-list">
                {tables.map((table, idx) => (
                  <div key={idx} className="table-item">
                    <Database size={16} />
                    {table.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="debug-section">
              <h2>Test Query</h2>
              <textarea
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                rows={4}
                placeholder="SELECT * FROM memories LIMIT 10"
              />
              <button onClick={handleRunQuery} className="action-btn">
                <Play size={18} />
                Run Query
              </button>

              {queryResult && (
                <div className="query-result">
                  <h3>Result ({queryResult.length} rows)</h3>
                  <pre>{JSON.stringify(queryResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <AppearanceSettings />
        )}
      </div>
    </div>
  );
}
