import React from 'react';
import { Server, Activity, CheckCircle, XCircle, AlertTriangle, WifiOff } from 'lucide-react';
import { getStatusColor, getStatusLabel, shouldPulse } from '../utils/topologyLayout';
import './DGXTopologyNode.css';

/**
 * DGX Topology Node Component
 * Displays a single DGX server node in the topology view
 */
export default function DGXTopologyNode({ connection, position, isSelected, onClick }) {
  if (!connection || !position) return null;

  const statusColor = getStatusColor(connection);
  const statusLabel = getStatusLabel(connection);
  const isPulsing = shouldPulse(connection);

  // Get GPU info from latest metrics or connection metadata
  const gpuCount = connection.metrics?.gpus?.length || connection.gpu_count || 1;
  const gpuModel = connection.metrics?.gpus?.[0]?.name || connection.gpu_model || 'Unknown GPU';

  // Get status icon
  const StatusIcon = getStatusIcon(connection);

  const handleClick = () => {
    if (onClick) {
      onClick(connection);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`dgx-topology-node ${isSelected ? 'selected' : ''} ${isPulsing ? 'pulsing' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        borderColor: `var(${statusColor})`
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`DGX server ${connection.name} - ${statusLabel}`}
    >
      <div className="node-header">
        <Server className="node-icon" size={32} />
      </div>

      <div className="node-body">
        <h3 className="node-name">{connection.name || 'Unnamed Server'}</h3>
        <p className="node-hostname">{connection.hostname || 'Unknown Host'}</p>
      </div>

      <div className="node-footer">
        <div className="node-status">
          <StatusIcon className="status-icon" size={16} style={{ color: `var(${statusColor})` }} />
          <span className="status-label" style={{ color: `var(${statusColor})` }}>
            {statusLabel}
          </span>
        </div>

        <div className="node-gpu-info">
          <Activity className="gpu-icon" size={14} />
          <span className="gpu-text">
            {gpuCount}x {gpuModel}
          </span>
        </div>
      </div>

      {isSelected && <div className="node-selection-indicator" />}
    </div>
  );
}

/**
 * Get status icon based on connection state
 */
function getStatusIcon(connection) {
  if (!connection) return WifiOff;

  const status = connection.status?.toLowerCase() || 'offline';

  switch (status) {
    case 'online':
    case 'connected':
      return CheckCircle;
    case 'connecting':
    case 'authenticating':
      return Activity;
    case 'error':
    case 'failed':
      return XCircle;
    case 'offline':
    case 'disconnected':
    default:
      return WifiOff;
  }
}
