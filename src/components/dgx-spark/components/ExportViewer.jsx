import { ArrowLeft, Gauge, Thermometer, Zap, HardDrive, Download, Upload, Database } from 'lucide-react';

function ExportViewer({ exportData, filename, onBack }) {
  if (!exportData) return null;

  const { current_metrics: metrics, session_metrics, history } = exportData;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUtilColor = (value) => {
    if (value < 50) return '#22c55e';
    if (value < 80) return '#eab308';
    return '#ef4444';
  };

  const memoryPercent = metrics ? (metrics.memory_used_mb / metrics.memory_total_mb * 100).toFixed(1) : 0;

  // Calculate dynamic scale for graph
  const maxUtil = history?.length > 0
    ? Math.max(...history.map(m => m.gpu_utilization), 10)
    : 100;
  const scaleMax = Math.ceil(maxUtil / 25) * 25;
  const scaleY = (value) => 100 - (value / scaleMax * 100);

  return (
    <div className="export-viewer">
      <div className="export-viewer-header">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to List
        </button>
        <div className="export-viewer-title">
          <h4>Viewing Export</h4>
          <span className="export-filename">{filename}</span>
        </div>
      </div>

      <div className="export-viewer-meta">
        <span>Exported: {new Date(exportData.exported_at).toLocaleString()}</span>
        {session_metrics && (
          <span>Session Duration: {session_metrics.duration_minutes} min</span>
        )}
      </div>

      {/* Historical Graph */}
      {history && history.length > 1 && (
        <div className="export-viewer-graph">
          <h5>GPU Utilization History</h5>
          <div className="line-graph-container-expanded">
            <svg className="line-graph" viewBox="0 0 300 100" preserveAspectRatio="none">
              <line x1="0" y1="25" x2="300" y2="25" className="grid-line" />
              <line x1="0" y1="50" x2="300" y2="50" className="grid-line" />
              <line x1="0" y1="75" x2="300" y2="75" className="grid-line" />

              <path
                d={`M0,${scaleY(history[0].gpu_utilization)} ${history.map((m, i) =>
                  `L${(i / (history.length - 1)) * 300},${scaleY(m.gpu_utilization)}`
                ).join(' ')} L300,100 L0,100 Z`}
                className="line-graph-area"
              />

              <path
                d={`M0,${scaleY(history[0].gpu_utilization)} ${history.map((m, i) =>
                  `L${(i / (history.length - 1)) * 300},${scaleY(m.gpu_utilization)}`
                ).join(' ')}`}
                className="line-graph-line"
              />

              {history.map((m, i) => (
                <circle
                  key={i}
                  cx={(i / (history.length - 1)) * 300}
                  cy={scaleY(m.gpu_utilization)}
                  r="0.6"
                  className="line-graph-point"
                  style={{ fill: getUtilColor(m.gpu_utilization) }}
                />
              ))}
            </svg>
            <div className="line-graph-labels">
              <span>{scaleMax}%</span>
              <span>{Math.round(scaleMax * 0.75)}%</span>
              <span>{Math.round(scaleMax * 0.5)}%</span>
              <span>{Math.round(scaleMax * 0.25)}%</span>
              <span>0%</span>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Display */}
      {metrics && (
        <div className="export-viewer-metrics">
          <div className="metrics-row">
            <div className="metrics-section-half">
              <h5>GPU Performance</h5>
              <div className="metrics-grid">
                <ViewerMetricCard
                  icon={<Gauge size={12} />}
                  label="GPU Utilization"
                  value={`${metrics.gpu_utilization}%`}
                  color={getUtilColor(metrics.gpu_utilization)}
                />
                <ViewerMetricCard
                  icon={<Thermometer size={12} />}
                  label="Temperature"
                  value={`${metrics.temperature_c}°C`}
                  color={metrics.temperature_c < 60 ? '#22c55e' : metrics.temperature_c < 80 ? '#eab308' : '#ef4444'}
                />
                <ViewerMetricCard
                  icon={<Zap size={12} />}
                  label="Power"
                  value={`${metrics.power_watts?.toFixed(0) || 0}W`}
                  color="var(--accent-gold)"
                />
              </div>
            </div>

            <div className="metrics-section-half">
              <h5>Memory</h5>
              <div className="metrics-grid">
                <ViewerMetricCard
                  icon={<HardDrive size={12} />}
                  label="Used"
                  value={`${(metrics.memory_used_mb / 1024).toFixed(1)} GB`}
                  subvalue={`${memoryPercent}%`}
                  color={getUtilColor(parseFloat(memoryPercent))}
                />
                <ViewerMetricCard
                  icon={<HardDrive size={12} />}
                  label="Available"
                  value={`${(metrics.memory_available_mb / 1024).toFixed(1)} GB`}
                  color="#22c55e"
                />
              </div>
            </div>
          </div>

          <div className="metrics-row">
            <div className="metrics-section-half">
              <h5>Network</h5>
              <div className="metrics-grid">
                <ViewerMetricCard
                  icon={<Download size={12} />}
                  label="RX"
                  value={formatBytes(metrics.rx_bytes)}
                  color="#3b82f6"
                />
                <ViewerMetricCard
                  icon={<Upload size={12} />}
                  label="TX"
                  value={formatBytes(metrics.tx_bytes)}
                  color="#f59e0b"
                />
              </div>
            </div>

            <div className="metrics-section-half">
              <h5>Storage</h5>
              <div className="metrics-grid">
                <ViewerMetricCard
                  icon={<Database size={12} />}
                  label="Used"
                  value={`${metrics.storage_used_gb} GB`}
                  subvalue={`${metrics.storage_used_percent}%`}
                  color={getUtilColor(metrics.storage_used_percent)}
                />
                <ViewerMetricCard
                  icon={<Database size={12} />}
                  label="Available"
                  value={`${metrics.storage_available_gb} GB`}
                  color="#22c55e"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewerMetricCard({ icon, label, value, subvalue, color }) {
  return (
    <div className="metric-card-new" style={{ borderColor: color }}>
      <div className="metric-icon" style={{ color }}>{icon}</div>
      <div className="metric-info">
        <span className="metric-label">{label}</span>
        <span className="metric-value-new" style={{ color }}>{value}</span>
        {subvalue && <span className="metric-subvalue">{subvalue}</span>}
      </div>
    </div>
  );
}

export default ExportViewer;
