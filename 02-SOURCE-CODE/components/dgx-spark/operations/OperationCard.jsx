import React from 'react';
import { Server, Brain, Terminal, StopCircle, RotateCcw, FileText } from 'lucide-react';
import ProgressBar from './ProgressBar';
import './OperationCard.css';

const OperationCard = ({
  operation,
  onStop,
  onRestart,
  onViewLogs
}) => {
  // Map operation types to icons
  const getIcon = () => {
    switch (operation.type) {
      case 'connection':
        return <Server size={20} />;
      case 'training':
        return <Brain size={20} />;
      case 'command':
        return <Terminal size={20} />;
      default:
        return <Terminal size={20} />;
    }
  };

  // Map status to progress bar type
  const getProgressType = () => {
    switch (operation.status) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Determine if operation can be stopped
  const canStop = ['running', 'pending', 'starting'].includes(operation.status);

  // Determine if operation can be restarted
  const canRestart = ['completed', 'failed', 'error', 'cancelled'].includes(operation.status);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`operation-card operation-card-${operation.status}`}>
      {/* Header */}
      <div className="operation-card-header">
        <div className="operation-card-icon">
          {getIcon()}
        </div>
        <div className="operation-card-title">
          <h4>{operation.name}</h4>
          <span className="operation-card-category">{operation.category || operation.type}</span>
        </div>
        <div className="operation-card-status">
          <span className={`status-badge status-${operation.status}`}>
            {operation.status}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="operation-card-progress">
        <ProgressBar
          progress={operation.progress}
          type={getProgressType()}
          size="md"
          showLabel={true}
          animated={operation.status === 'running'}
        />
      </div>

      {/* Message */}
      {operation.progress_message && (
        <div className="operation-card-message">
          <p>{operation.progress_message}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="operation-card-meta">
        <span className="meta-item">
          Started: {formatTime(operation.started_at)}
        </span>
        {operation.completed_at && (
          <span className="meta-item">
            Completed: {formatTime(operation.completed_at)}
          </span>
        )}
        {operation.duration && (
          <span className="meta-item">
            Duration: {Math.round(operation.duration / 1000)}s
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="operation-card-actions">
        {canStop && (
          <button
            className="operation-btn operation-btn-danger"
            onClick={() => onStop(operation.id)}
            title="Stop operation"
          >
            <StopCircle size={16} />
            <span>Stop</span>
          </button>
        )}
        {canRestart && (
          <button
            className="operation-btn operation-btn-primary"
            onClick={() => onRestart(operation.id)}
            title="Restart operation"
          >
            <RotateCcw size={16} />
            <span>Restart</span>
          </button>
        )}
        <button
          className="operation-btn operation-btn-secondary"
          onClick={() => onViewLogs(operation.id)}
          title="View logs"
        >
          <FileText size={16} />
          <span>Logs</span>
        </button>
      </div>
    </div>
  );
};

export default OperationCard;
