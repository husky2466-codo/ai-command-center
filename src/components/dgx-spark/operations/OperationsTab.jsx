import React, { useState } from 'react';
import { Server, Brain, Terminal, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import OperationCard from './OperationCard';
import useOperationPolling from './useOperationPolling';
import NewOperationModal from './NewOperationModal';
import './OperationsTab.css';

/**
 * Operations tab for DGX Spark
 * Shows running servers, training jobs, and programs
 */
export default function OperationsTab({ isConnected, connectionId }) {
  const { operations, loading, error, refresh } = useOperationPolling(connectionId, isConnected);

  // Collapsible section state
  const [collapsed, setCollapsed] = useState({
    servers: false,
    jobs: false,
    programs: false
  });

  // Modal state
  const [showNewOperationModal, setShowNewOperationModal] = useState(false);

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
        <button
          className="btn btn-primary"
          onClick={() => setShowNewOperationModal(true)}
        >
          <Plus size={18} />
          New Operation
        </button>
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
                  <OperationCard key={op.id} operation={op} />
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
                  <OperationCard key={op.id} operation={op} />
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
                  <OperationCard key={op.id} operation={op} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Operation Modal */}
      <NewOperationModal
        isOpen={showNewOperationModal}
        onClose={() => setShowNewOperationModal(false)}
        connectionId={connectionId}
        onOperationCreated={handleOperationCreated}
      />
    </div>
  );
}
