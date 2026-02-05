import React, { useState } from 'react';
import { Server, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useDGXMetrics } from '../hooks/useDGXMetrics';
import { DGXGPUCard } from './DGXGPUCard';
import { DGXProcessList } from './DGXProcessList';
import { DGXProcessModal } from './DGXProcessModal';
import { dgxService } from '@/services/DGXService';
import './DGXMetricsPanel.css';

/**
 * Detailed metrics panel for a single DGX connection
 * @param {Object} connection - DGX connection object
 * @param {Function} onClose - Close callback
 */
export function DGXMetricsPanel({ connection, onClose }) {
  const { metrics, loading, error, refresh } = useDGXMetrics(connection?.id, true);
  const [selectedProcess, setSelectedProcess] = useState(null);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Loading state
  if (loading && !metrics) {
    return (
      <div className="metrics-panel">
        <div className="metrics-header">
          <div className="metrics-title">
            <Server size={20} />
            <h2>{connection.name}</h2>
            <span className="metrics-hostname">{connection.hostname}</span>
          </div>
          <button className="metrics-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="metrics-loading">
          <div className="loading-spinner" />
          <p>Loading metrics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metrics) {
    return (
      <div className="metrics-panel">
        <div className="metrics-header">
          <div className="metrics-title">
            <Server size={20} />
            <h2>{connection.name}</h2>
            <span className="metrics-hostname">{connection.hostname}</span>
          </div>
          <button className="metrics-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="metrics-error">
          <AlertCircle size={48} />
          <p>{error}</p>
          <button className="retry-button" onClick={refresh}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!metrics) {
    return (
      <div className="metrics-panel">
        <div className="metrics-header">
          <div className="metrics-title">
            <Server size={20} />
            <h2>{connection.name}</h2>
            <span className="metrics-hostname">{connection.hostname}</span>
          </div>
          <button className="metrics-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="metrics-empty">
          <p>No metrics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-panel">
      {/* Header */}
      <div className="metrics-header">
        <div className="metrics-title">
          <Server size={20} />
          <h2>{connection.name}</h2>
          <span className="metrics-hostname">{connection.hostname}</span>
        </div>
        <div className="metrics-actions">
          <span className="metrics-timestamp">
            Last updated: {formatTimestamp(metrics.timestamp)}
          </span>
          <button className="metrics-refresh" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="metrics-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="metrics-content">
        {/* GPU Grid */}
        {metrics.gpus && metrics.gpus.length > 0 && (
          <div className="metrics-section">
            <h3 className="section-title">GPU Status</h3>
            <div className="gpu-grid">
              {metrics.gpus.map((gpu) => (
                <DGXGPUCard key={gpu.index} gpu={gpu} />
              ))}
            </div>
          </div>
        )}

        {/* System Stats (Optional) */}
        {metrics.system && (
          <div className="metrics-section">
            <h3 className="section-title">System Resources</h3>
            <div className="system-stats">
              <div className="system-stat">
                <span className="stat-label">CPU Usage</span>
                <span className="stat-value">{metrics.system.cpu_usage}%</span>
              </div>
              <div className="system-stat">
                <span className="stat-label">Memory</span>
                <span className="stat-value">
                  {(metrics.system.memory_used / 1024).toFixed(1)} GB /
                  {(metrics.system.memory_total / 1024).toFixed(1)} GB
                </span>
              </div>
              <div className="system-stat">
                <span className="stat-label">Disk Usage</span>
                <span className="stat-value">{metrics.system.disk_usage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Process List */}
        {metrics.processes && (
          <div className="metrics-section">
            <DGXProcessList
              processes={metrics.processes}
              connectionId={connection.id}
              onRefresh={refresh}
              onShowDetails={setSelectedProcess}
            />
          </div>
        )}
      </div>

      {/* Process Detail Modal */}
      {selectedProcess && (
        <DGXProcessModal
          process={selectedProcess}
          connectionId={connection.id}
          onClose={() => setSelectedProcess(null)}
          onKill={async (pid) => {
            try {
              await dgxService.killProcess(connection.id, pid);
              setSelectedProcess(null);
              refresh();
            } catch (error) {
              console.error('Failed to kill process:', error);
              alert(`Failed to kill process: ${error.message}`);
            }
          }}
        />
      )}
    </div>
  );
}
