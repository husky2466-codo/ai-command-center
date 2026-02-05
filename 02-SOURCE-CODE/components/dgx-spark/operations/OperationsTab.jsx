import React, { useState } from 'react';
import { Server, Brain, Terminal, Plus, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import OperationCard from './OperationCard';
import useOperationPolling from './useOperationPolling';
import NewOperationModal from './NewOperationModal';
import './OperationsTab.css';

/**
 * Operations tab for DGX Spark
 * Shows running servers, training jobs, and programs
 */
export default function OperationsTab({ isConnected, connectionId, hostname }) {
  const { operations, loading, error, refresh } = useOperationPolling(connectionId, isConnected);

  // Collapsible section state
  const [collapsed, setCollapsed] = useState({
    servers: false,
    jobs: false,
    programs: false
  });

  // Modal state
  const [showNewOperationModal, setShowNewOperationModal] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState(null);

  // Logs modal state
  const [logsModal, setLogsModal] = useState({ open: false, logs: '', operationName: '' });

  // Sync status state
  const [syncing, setSyncing] = useState(false);

  const toggleSection = (section) => {
    setCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle operation created
  const handleOperationCreated = () => {
    // Refresh operations list
    if (refresh) {
      refresh();
    }
  };

  // Stop a running operation
  const handleStopOperation = async (operationId) => {
    try {
      const response = await fetch(`http://localhost:3939/api/dgx/operations/${operationId}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: 'SIGTERM' })
      });
      if (response.ok) {
        refresh();
      }
    } catch (error) {
      console.error('Failed to stop operation:', error);
    }
  };

  // Restart a completed/failed operation
  const handleRestartOperation = async (operationId) => {
    try {
      const response = await fetch(`http://localhost:3939/api/dgx/operations/${operationId}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        console.log('[DGX] Operation restarted successfully:', result.data);
        refresh();
        // Show success feedback (will integrate with toast/modal later)
        setFeedback({ type: 'success', message: `Operation restarted (PID: ${result.data?.pid || 'unknown'})` });
        // Auto-clear feedback after 5 seconds
        setTimeout(() => setFeedback(null), 5000);
      } else {
        console.error('[DGX] Restart failed:', result.error);
        setFeedback({ type: 'error', message: result.error || 'Failed to restart operation' });
      }
    } catch (error) {
      console.error('[DGX] Restart error:', error);
      setFeedback({ type: 'error', message: `Network error: ${error.message}` });
    }
  };

  // View operation logs
  const handleViewLogs = async (operationId, operationName) => {
    try {
      const response = await fetch(`http://localhost:3939/api/dgx/operations/${operationId}/logs?lines=200`);
      const result = await response.json();
      if (result.success) {
        setLogsModal({
          open: true,
          logs: result.data.logs || 'No logs available',
          operationName: operationName || 'Unknown Operation'
        });
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to fetch logs' });
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setFeedback({ type: 'error', message: `Failed to fetch logs: ${error.message}` });
    }
  };

  // Sync all operations status (bulk cleanup)
  const handleSyncStatus = async () => {
    if (!connectionId) {
      setFeedback({ type: 'error', message: 'No active connection' });
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('http://localhost:3939/api/dgx/operations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId })
      });
      const result = await response.json();

      if (result.success) {
        const { checked, synced, errors } = result.data;
        let message = `Checked ${checked} operations`;
        if (synced > 0) {
          message += `, updated ${synced} stale status`;
        }
        if (errors > 0) {
          message += ` (${errors} errors)`;
        }
        setFeedback({ type: 'success', message });
        refresh(); // Refresh the operations list
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({ type: 'error', message: result.error || 'Sync failed' });
      }
    } catch (error) {
      console.error('Failed to sync status:', error);
      setFeedback({ type: 'error', message: `Sync failed: ${error.message}` });
    } finally {
      setSyncing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="tab-pane operations-pane">
        <div className="empty-state">
          <Server size={48} strokeWidth={1.5} />
          <p>Connect to DGX Spark to view running operations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-pane operations-pane">
      {/* Header with New Operation button */}
      <div className="operations-header">
        <h2>Running Operations</h2>
        <div className="operations-actions">
          <button
            className="btn btn-secondary"
            onClick={handleSyncStatus}
            disabled={syncing}
            title="Sync status for all running operations"
          >
            <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
            {syncing ? 'Syncing...' : 'Sync Status'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewOperationModal(true)}
          >
            <Plus size={18} />
            New Operation
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && operations.servers.length === 0 && (
        <div className="loading-state">Loading operations...</div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-state">
          <p>Error loading operations: {error}</p>
        </div>
      )}

      {/* Servers Section */}
      <div className="operations-section">
        <div
          className="section-header"
          onClick={() => toggleSection('servers')}
        >
          <div className="section-title">
            {collapsed.servers ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            <Server size={20} />
            <h3>Servers</h3>
            <span className="section-count">({operations.servers.length})</span>
          </div>
        </div>

        {!collapsed.servers && (
          <div className="section-content">
            {operations.servers.length === 0 ? (
              <div className="empty-section">
                <Server size={32} strokeWidth={1.5} />
                <p>No servers running</p>
              </div>
            ) : (
              <div className="operations-grid">
                {operations.servers.map(op => (
                  <OperationCard
                    key={op.id}
                    operation={op}
                    onStop={handleStopOperation}
                    onRestart={handleRestartOperation}
                    onViewLogs={(id) => handleViewLogs(id, op.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Training Jobs Section */}
      <div className="operations-section">
        <div
          className="section-header"
          onClick={() => toggleSection('jobs')}
        >
          <div className="section-title">
            {collapsed.jobs ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            <Brain size={20} />
            <h3>Training Jobs</h3>
            <span className="section-count">({operations.jobs.length})</span>
          </div>
        </div>

        {!collapsed.jobs && (
          <div className="section-content">
            {operations.jobs.length === 0 ? (
              <div className="empty-section">
                <Brain size={32} strokeWidth={1.5} />
                <p>No training jobs running</p>
              </div>
            ) : (
              <div className="operations-grid">
                {operations.jobs.map(op => (
                  <OperationCard
                    key={op.id}
                    operation={op}
                    onStop={handleStopOperation}
                    onRestart={handleRestartOperation}
                    onViewLogs={(id) => handleViewLogs(id, op.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Programs & Scripts Section */}
      <div className="operations-section">
        <div
          className="section-header"
          onClick={() => toggleSection('programs')}
        >
          <div className="section-title">
            {collapsed.programs ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            <Terminal size={20} />
            <h3>Programs & Scripts</h3>
            <span className="section-count">({operations.programs.length})</span>
          </div>
        </div>

        {!collapsed.programs && (
          <div className="section-content">
            {operations.programs.length === 0 ? (
              <div className="empty-section">
                <Terminal size={32} strokeWidth={1.5} />
                <p>No programs running</p>
              </div>
            ) : (
              <div className="operations-grid">
                {operations.programs.map(op => (
                  <OperationCard
                    key={op.id}
                    operation={op}
                    onStop={handleStopOperation}
                    onRestart={handleRestartOperation}
                    onViewLogs={(id) => handleViewLogs(id, op.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Display */}
      {feedback && (
        <div className={`operation-feedback operation-feedback-${feedback.type}`}>
          <span>{feedback.message}</span>
          <button className="feedback-close" onClick={() => setFeedback(null)}>×</button>
        </div>
      )}

      {/* Logs Modal */}
      {logsModal.open && (
        <div className="logs-modal-overlay" onClick={() => setLogsModal({ open: false, logs: '', operationName: '' })}>
          <div className="logs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal-header">
              <h3>Logs: {logsModal.operationName}</h3>
              <button className="logs-modal-close" onClick={() => setLogsModal({ open: false, logs: '', operationName: '' })}>×</button>
            </div>
            <pre className="logs-modal-content">{logsModal.logs}</pre>
          </div>
        </div>
      )}

      {/* New Operation Modal */}
      <NewOperationModal
        isOpen={showNewOperationModal}
        onClose={() => setShowNewOperationModal(false)}
        connectionId={connectionId}
        hostname={hostname}
        onOperationCreated={handleOperationCreated}
      />
    </div>
  );
}
