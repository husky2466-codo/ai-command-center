import React, { useState } from 'react';
import { Server, Columns, Rows, Grid3x3 } from 'lucide-react';
import { useDGXConnections } from './hooks/useDGXConnections';
import DGXSidebar from './components/DGXSidebar';
import DGXTopology from './components/DGXTopology';
import { DGXMetricsPanel } from './components/DGXMetricsPanel';
import './DGXSparkUnified.css';

/**
 * DGX Spark Unified Component
 * Phase 2: Multi-Connection Management
 *
 * UniFi-inspired topology interface for managing multiple DGX servers
 */
const DGXSparkUnified = () => {
  // View state: topology, compare, or detail
  const [viewMode, setViewMode] = useState('topology');
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [layoutMode, setLayoutMode] = useState('horizontal');

  // Multi-connection management hook
  const {
    connections,
    loading,
    error,
    connectSingle,
    disconnectSingle,
    connectAll,
    disconnectAll,
    reconnectFailed,
    refresh
  } = useDGXConnections();

  /**
   * Handle connection selection
   */
  const handleSelectConnection = (conn) => {
    setSelectedConnection(conn);
    setViewMode('detail');
  };

  /**
   * Handle connect all action
   */
  const handleConnectAll = async () => {
    const result = await connectAll();
    console.log('[DGX] Connect all result:', result);
  };

  /**
   * Handle disconnect all action
   */
  const handleDisconnectAll = async () => {
    const result = await disconnectAll();
    console.log('[DGX] Disconnect all result:', result);
    setSelectedConnection(null);
    setViewMode('topology');
  };

  /**
   * Handle execute command action
   */
  const handleExecuteCommand = () => {
    // TODO: Open command modal in Phase 7
    console.log('[DGX] Execute command (coming in Phase 7)');
  };

  /**
   * Handle compare action
   */
  const handleCompare = () => {
    setViewMode(viewMode === 'compare' ? 'topology' : 'compare');
  };

  return (
    <div className="dgx-spark-unified">
      {/* Sidebar */}
      <DGXSidebar
        connections={connections}
        loading={loading}
        selectedConnection={selectedConnection}
        onSelectConnection={handleSelectConnection}
        onConnectAll={handleConnectAll}
        onDisconnectAll={handleDisconnectAll}
        onExecuteCommand={handleExecuteCommand}
        onCompare={handleCompare}
      />

      {/* Main Content */}
      <div className="dgx-main">
        {/* Header */}
        <div className="dgx-header">
          <div className="dgx-header-left">
            <Server size={24} className="dgx-icon" />
            <h1>
              {viewMode === 'topology' && 'Topology View'}
              {viewMode === 'compare' && 'Compare Servers'}
              {viewMode === 'detail' && selectedConnection?.name}
            </h1>
          </div>
          <div className="dgx-header-right">
            {viewMode === 'topology' && (
              <div className="layout-mode-selector">
                <button
                  className={`layout-mode-btn ${layoutMode === 'horizontal' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('horizontal')}
                  title="Horizontal Layout"
                >
                  <Columns size={18} />
                </button>
                <button
                  className={`layout-mode-btn ${layoutMode === 'vertical' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('vertical')}
                  title="Vertical Layout"
                >
                  <Rows size={18} />
                </button>
                <button
                  className={`layout-mode-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('grid')}
                  title="Grid Layout"
                >
                  <Grid3x3 size={18} />
                </button>
              </div>
            )}
            {error && (
              <div className="dgx-error-badge">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="dgx-content">
          {viewMode === 'topology' && (
            <DGXTopology
              connections={connections}
              selectedConnection={selectedConnection}
              onSelectConnection={handleSelectConnection}
              layoutMode={layoutMode}
            />
          )}

          {viewMode === 'compare' && (
            <div className="dgx-placeholder">
              <h2>🚧 Compare View</h2>
              <p>Phase 6: Compare View (Coming Soon)</p>
              <ul>
                <li>Side-by-side metrics</li>
                <li>Comparative graphs</li>
                <li>Performance analysis</li>
              </ul>
            </div>
          )}

          {viewMode === 'detail' && selectedConnection && (
            <DGXMetricsPanel
              connection={selectedConnection}
              onClose={() => {
                setSelectedConnection(null);
                setViewMode('topology');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DGXSparkUnified;
