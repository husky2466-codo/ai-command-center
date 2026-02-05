import React from 'react';
import { X, XCircle } from 'lucide-react';
import './DGXProcessModal.css';

/**
 * Modal for viewing detailed process information
 * @param {Object} process - Process object
 * @param {string} connectionId - DGX connection ID
 * @param {Function} onClose - Close callback
 * @param {Function} onKill - Kill process callback
 */
export function DGXProcessModal({ process, connectionId, onClose, onKill }) {
  if (!process) return null;

  const formatMemory = (mb) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const getStatusClass = (status) => {
    if (!status || status === 'running') return 'status-running';
    if (status === 'zombie') return 'status-zombie';
    return 'status-unknown';
  };

  const handleKill = () => {
    const confirmed = window.confirm(
      `Are you sure you want to kill process ${process.pid}?\n\n` +
      `This action cannot be undone.`
    );

    if (confirmed && onKill) {
      onKill(process.pid);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="process-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Process Details</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Overview Section */}
          <section className="process-section">
            <h3>Overview</h3>
            <dl className="detail-list">
              <div className="detail-item">
                <dt>PID</dt>
                <dd className="monospace">{process.pid}</dd>
              </div>

              <div className="detail-item">
                <dt>Name</dt>
                <dd className="process-name-value">{process.name}</dd>
              </div>

              <div className="detail-item">
                <dt>User</dt>
                <dd>{process.user || 'N/A'}</dd>
              </div>

              <div className="detail-item">
                <dt>Status</dt>
                <dd>
                  <span className={`status-indicator ${getStatusClass(process.status)}`}>
                    {process.status || 'running'}
                  </span>
                </dd>
              </div>

              {process.start_time && (
                <div className="detail-item">
                  <dt>Started</dt>
                  <dd>{process.start_time}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* GPU Usage Section */}
          <section className="process-section">
            <h3>GPU Usage</h3>
            <dl className="detail-list">
              <div className="detail-item">
                <dt>GPU Index</dt>
                <dd className="gpu-value">GPU {process.gpu_index}</dd>
              </div>

              <div className="detail-item">
                <dt>GPU Memory</dt>
                <dd className="memory-value">{formatMemory(process.gpu_memory)}</dd>
              </div>

              {process.gpu_utilization !== undefined && (
                <div className="detail-item">
                  <dt>GPU Utilization</dt>
                  <dd>{process.gpu_utilization}%</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Command Section */}
          <section className="process-section">
            <h3>Command</h3>
            <pre className="command-display">{process.command || 'N/A'}</pre>
          </section>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-kill-modal" onClick={handleKill}>
            <XCircle size={16} />
            Kill Process
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
