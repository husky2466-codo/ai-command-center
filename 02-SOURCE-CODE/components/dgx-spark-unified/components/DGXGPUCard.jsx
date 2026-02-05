import React from 'react';
import { Cpu, Thermometer, Zap } from 'lucide-react';
import './DGXGPUCard.css';

/**
 * Individual GPU metrics card
 * @param {Object} gpu - GPU metrics object
 */
export function DGXGPUCard({ gpu }) {
  // Calculate percentages
  const memoryPercent = gpu.memory_total > 0
    ? Math.round((gpu.memory_used / gpu.memory_total) * 100)
    : 0;

  const powerPercent = gpu.power_limit > 0
    ? Math.round((gpu.power_draw / gpu.power_limit) * 100)
    : 0;

  // Color coding for utilization
  const getUtilizationColor = (util) => {
    if (util >= 81) return 'var(--status-error)';
    if (util >= 41) return 'var(--status-warning)';
    return 'var(--status-success)';
  };

  // Color coding for temperature
  const getTempColor = (temp) => {
    if (temp > 85) return 'var(--status-error)';
    if (temp >= 70) return 'var(--status-warning)';
    return 'var(--status-success)';
  };

  // Format memory in GB
  const formatMemory = (mb) => {
    return (mb / 1024).toFixed(1);
  };

  return (
    <div className="dgx-gpu-card">
      <div className="gpu-card-header">
        <Cpu size={16} />
        <span className="gpu-card-title">
          GPU {gpu.index} - {gpu.name}
        </span>
      </div>

      <div className="gpu-card-body">
        {/* Utilization */}
        <div className="gpu-metric">
          <div className="metric-label">
            <span>Utilization</span>
            <span className="metric-value">{gpu.utilization}%</span>
          </div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{
                width: `${gpu.utilization}%`,
                backgroundColor: getUtilizationColor(gpu.utilization)
              }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="gpu-metric">
          <div className="metric-label">
            <span>Memory</span>
            <span className="metric-value">
              {formatMemory(gpu.memory_used)} GB / {formatMemory(gpu.memory_total)} GB
            </span>
          </div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{
                width: `${memoryPercent}%`,
                backgroundColor: 'var(--accent)'
              }}
            />
          </div>
        </div>

        {/* Temperature and Power */}
        <div className="gpu-stats">
          <div className="gpu-stat">
            <Thermometer size={14} style={{ color: getTempColor(gpu.temperature) }} />
            <span style={{ color: getTempColor(gpu.temperature) }}>
              {gpu.temperature}°C
            </span>
          </div>
          <div className="gpu-stat">
            <Zap size={14} />
            <span>
              {gpu.power_draw}W / {gpu.power_limit}W
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
