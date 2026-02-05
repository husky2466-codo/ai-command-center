/**
 * DGXSidebar Component
 * Phase 2: Multi-Connection Management
 *
 * Sidebar with:
 * - Connection list (both DGX with status indicators)
 * - Quick stats (aggregate metrics)
 * - Actions (Connect All, Disconnect All, Execute Command)
 */

import React from 'react';
import {
  Server,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  WifiOff,
  Terminal,
  GitCompare
} from 'lucide-react';
import './DGXSidebar.css';

const DGXSidebar = ({
  connections = [],
  loading = false,
  selectedConnection = null,
  onSelectConnection,
  onConnectAll,
  onDisconnectAll,
  onExecuteCommand,
  onCompare
}) => {
  /**
   * Get status icon based on connection status
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle size={16} className="status-icon status-online" />;
      case 'connecting':
        return <Activity size={16} className="status-icon status-connecting" />;
      case 'error':
        return <AlertTriangle size={16} className="status-icon status-error" />;
      case 'offline':
      default:
        return <XCircle size={16} className="status-icon status-offline" />;
    }
  };

  /**
   * Calculate aggregate stats from all connections
   */
  const getAggregateStats = () => {
    const totalGPUs = connections.reduce((sum, conn) => sum + (conn.gpu_count || 0), 0);
    const onlineCount = connections.filter(c => c.status === 'online').length;
    const totalConnections = connections.length;

    return {
      totalGPUs,
      onlineConnections: onlineCount,
      totalConnections,
      allOnline: onlineCount === totalConnections && totalConnections > 0
    };
  };

  const stats = getAggregateStats();

  return (
    <div className="dgx-sidebar">
      {/* Header */}
      <div className="dgx-sidebar-header">
        <Server size={20} />
        <h2>DGX Servers</h2>
      </div>

      {/* Connection List */}
      <div className="dgx-sidebar-section">
        <h3 className="dgx-sidebar-section-title">Connections</h3>

        {loading && (
          <div className="dgx-sidebar-loading">
            <Activity size={18} className="spinner" />
            <span>Loading connections...</span>
          </div>
        )}

        {!loading && connections.length === 0 && (
          <div className="dgx-sidebar-empty">
            <WifiOff size={24} />
            <p>No connections configured</p>
          </div>
        )}

        {!loading && connections.length > 0 && (
          <div className="dgx-connection-list">
            {connections.map(conn => (
              <button
                key={conn.id}
                className={`dgx-connection-item ${selectedConnection?.id === conn.id ? 'selected' : ''} ${conn.status}`}
                onClick={() => onSelectConnection?.(conn)}
                title={`${conn.name} - ${conn.hostname}`}
              >
                <div className="connection-header">
                  <div className="connection-icon">
                    {getStatusIcon(conn.status)}
                  </div>
                  <div className="connection-info">
                    <div className="connection-name">{conn.name}</div>
                    <div className="connection-host">{conn.hostname}</div>
                  </div>
                </div>

                {conn.gpu_count && (
                  <div className="connection-stats">
                    <div className="stat-item">
                      <Zap size={12} />
                      <span>{conn.gpu_count} GPU{conn.gpu_count > 1 ? 's' : ''}</span>
                    </div>
                    {conn.gpu_model && (
                      <div className="stat-item gpu-model">
                        {conn.gpu_model}
                      </div>
                    )}
                  </div>
                )}

                {conn.status === 'error' && conn.errorMessage && (
                  <div className="connection-error">
                    {conn.errorMessage}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="dgx-sidebar-section">
        <h3 className="dgx-sidebar-section-title">Quick Stats</h3>

        <div className="dgx-quick-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Server size={16} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Servers</div>
              <div className="stat-value">
                {stats.onlineConnections} / {stats.totalConnections}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Zap size={16} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total GPUs</div>
              <div className="stat-value">{stats.totalGPUs}</div>
            </div>
          </div>

          <div className={`stat-card ${stats.allOnline ? 'all-online' : ''}`}>
            <div className="stat-icon">
              {stats.allOnline ? (
                <CheckCircle size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
            </div>
            <div className="stat-content">
              <div className="stat-label">Status</div>
              <div className="stat-value">
                {stats.allOnline ? 'All Online' : 'Partial'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="dgx-sidebar-section dgx-sidebar-actions">
        <h3 className="dgx-sidebar-section-title">Actions</h3>

        <div className="action-buttons">
          <button
            className="dgx-action-btn primary"
            onClick={onConnectAll}
            disabled={loading || stats.allOnline}
            title="Connect to all DGX servers"
          >
            <Zap size={16} />
            Connect All
          </button>

          <button
            className="dgx-action-btn secondary"
            onClick={onDisconnectAll}
            disabled={loading || stats.onlineConnections === 0}
            title="Disconnect from all servers"
          >
            <WifiOff size={16} />
            Disconnect All
          </button>

          <button
            className="dgx-action-btn tertiary"
            onClick={onExecuteCommand}
            disabled={loading || stats.onlineConnections === 0}
            title="Execute command on selected servers"
          >
            <Terminal size={16} />
            Execute Command
          </button>

          <button
            className="dgx-action-btn tertiary"
            onClick={onCompare}
            disabled={loading || stats.onlineConnections < 2}
            title="Compare server metrics"
          >
            <GitCompare size={16} />
            Compare
          </button>
        </div>
      </div>
    </div>
  );
};

export default DGXSidebar;
