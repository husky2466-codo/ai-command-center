import React, { useState, useEffect, useRef } from 'react';
import { calculateNodePositions } from '../utils/topologyLayout';
import DGXTopologyNode from './DGXTopologyNode';
import './DGXTopology.css';

/**
 * DGX Topology Canvas Container
 * Displays all DGX servers in a topology view with interactive nodes
 */
export default function DGXTopology({ connections, selectedConnection, onSelectConnection, layoutMode = 'horizontal' }) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [nodePositions, setNodePositions] = useState([]);

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate node positions when connections, layout mode, or container size changes
  useEffect(() => {
    if (connections && connections.length > 0) {
      const positions = calculateNodePositions(connections, layoutMode, containerSize);
      setNodePositions(positions);
    } else {
      setNodePositions([]);
    }
  }, [connections, layoutMode, containerSize]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!connections || connections.length === 0) return;

      const currentIndex = connections.findIndex(c => c.id === selectedConnection?.id);

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            onSelectConnection(connections[currentIndex - 1]);
          } else if (currentIndex === -1 && connections.length > 0) {
            onSelectConnection(connections[0]);
          }
          break;

        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex >= 0 && currentIndex < connections.length - 1) {
            onSelectConnection(connections[currentIndex + 1]);
          } else if (currentIndex === -1 && connections.length > 0) {
            onSelectConnection(connections[0]);
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedConnection && onSelectConnection) {
            // Trigger detail view (handled by parent)
            onSelectConnection(selectedConnection);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onSelectConnection(null);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [connections, selectedConnection, onSelectConnection]);

  const handleNodeClick = (connection) => {
    if (onSelectConnection) {
      onSelectConnection(connection);
    }
  };

  // Show empty state if no connections
  if (!connections || connections.length === 0) {
    return (
      <div className="dgx-topology dgx-topology-empty" ref={containerRef}>
        <div className="empty-state">
          <p className="empty-title">No DGX Connections</p>
          <p className="empty-subtitle">Add a connection to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="dgx-topology"
      ref={containerRef}
      role="region"
      aria-label="DGX Topology View"
    >
      {/* SVG layer for connection lines (placeholder for now) */}
      <svg className="dgx-topology-connections">
        {/* Future: connection lines between nodes */}
      </svg>

      {/* Node layer */}
      <div className="dgx-topology-nodes">
        {nodePositions.map(pos => {
          const connection = connections.find(c => c.id === pos.id);
          if (!connection) return null;

          return (
            <DGXTopologyNode
              key={pos.id}
              connection={connection}
              position={pos}
              isSelected={selectedConnection?.id === pos.id}
              onClick={handleNodeClick}
            />
          );
        })}
      </div>

      {/* Keyboard navigation hint */}
      {connections.length > 1 && (
        <div className="topology-hint">
          Use arrow keys to navigate, Enter to view details, Esc to deselect
        </div>
      )}
    </div>
  );
}
