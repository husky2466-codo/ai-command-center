import { useState, useEffect, useRef } from 'react';
import { Gauge, Thermometer, Zap, HardDrive, Activity, Wifi, Download, Upload, ArrowDownUp, FileDown, Database } from 'lucide-react';
import { dgxService } from '../../../services/DGXService.js';
import { dualExport } from '../utils/metricsExporter.js';
import PastExportsBrowser from './PastExportsBrowser';
import ExportViewer from './ExportViewer';
import ExportComparison from './ExportComparison';

function MetricsPanel({ connectionId, isConnected }) {
  const [metrics, setMetrics] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [networkBaseline, setNetworkBaseline] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const pollInterval = useRef(null);
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'view' | 'compare'
  const [selectedExport, setSelectedExport] = useState(null);
  const [selectedFilename, setSelectedFilename] = useState(null);
  const [comparisonExports, setComparisonExports] = useState({ export1: null, export2: null });
  const [lastCommand, setLastCommand] = useState(null);
  const [commandCount, setCommandCount] = useState(0);

  useEffect(() => {
    if (isConnected && connectionId) {
      setError(null);
      setNetworkBaseline(null);
      startPolling();
    } else {
      stopPolling();
      setMetrics(null);
      setMetricsHistory([]);
      setNetworkBaseline(null);
      setError(null);
    }

    return () => stopPolling();
  }, [isConnected, connectionId]);

  // Listen for command execution events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = window.electronAPI.onDgxCommandExecuted((data) => {
      if (data.connectionId === connectionId) {
        setLastCommand(data);
        setCommandCount(prev => prev + 1);
        console.log('[Metrics] Command executed:', data.command, `(${data.duration}ms)`);
      }
    });

    return () => unsubscribe();
  }, [isConnected, connectionId]);

  // Reset command count on disconnect
  useEffect(() => {
    if (!isConnected) {
      setCommandCount(0);
      setLastCommand(null);
    }
  }, [isConnected]);

  const startPolling = () => {
    fetchMetrics(); // Initial fetch
    pollInterval.current = setInterval(fetchMetrics, 2000); // Poll every 2s
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const fetchMetrics = async () => {
    try {
      const result = await window.electronAPI.dgxGetMetrics(connectionId);
      if (result.success && result.data) {
        const { gpus, memory, network, storage, timestamp } = result.data;
        const gpu = gpus?.[0] || {};

        // Set baseline for network delta calculation
        if (!networkBaseline && network) {
          setNetworkBaseline({
            rxBytes: network.rxBytes,
            txBytes: network.txBytes,
            rxPackets: network.rxPackets,
            txPackets: network.txPackets,
            timestamp: Date.now()
          });
        }

        const newMetrics = {
          // GPU
          gpu_name: gpu.name || 'NVIDIA GB10',
          gpu_utilization: gpu.gpuUtilization ?? 0,
          temperature_c: gpu.temperature ?? 0,
          power_watts: gpu.powerDraw ?? 0,
          // Memory (unified)
          memory_used_mb: memory?.used ?? 0,
          memory_total_mb: memory?.total ?? 128000,
          memory_available_mb: memory?.available ?? 0,
          // Network
          network_interface: network?.interface || 'unknown',
          rx_bytes: network?.rxBytes ?? 0,
          tx_bytes: network?.txBytes ?? 0,
          rx_packets: network?.rxPackets ?? 0,
          tx_packets: network?.txPackets ?? 0,
          // Delta since baseline
          rx_bytes_delta: networkBaseline ? (network?.rxBytes ?? 0) - networkBaseline.rxBytes : 0,
          tx_bytes_delta: networkBaseline ? (network?.txBytes ?? 0) - networkBaseline.txBytes : 0,
          rx_packets_delta: networkBaseline ? (network?.rxPackets ?? 0) - networkBaseline.rxPackets : 0,
          tx_packets_delta: networkBaseline ? (network?.txPackets ?? 0) - networkBaseline.txPackets : 0,
          // Storage
          storage_total_gb: storage?.total ?? 0,
          storage_used_gb: storage?.used ?? 0,
          storage_available_gb: storage?.available ?? 0,
          storage_used_percent: storage?.usedPercent ?? 0,
          storage_mount: storage?.mountPoint || '/home',
          timestamp: Date.now()
        };

        setMetrics(newMetrics);
        setError(null);

        // Keep last 55 data points for chart (1:50 at 2s interval)
        setMetricsHistory(prev => [...prev.slice(-54), newMetrics]);
      } else if (!result.success) {
        console.warn('Metrics fetch failed:', result.error);
        setError(result.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err.message || 'Connection error');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleViewExport = (exportData, filename) => {
    setSelectedExport(exportData);
    setSelectedFilename(filename);
    setViewMode('view');
  };

  const handleCompareExports = (exp1, exp2) => {
    setComparisonExports({ export1: exp1, export2: exp2 });
    setViewMode('compare');
  };

  const handleBackToLive = () => {
    setViewMode('live');
    setSelectedExport(null);
    setSelectedFilename(null);
    setComparisonExports({ export1: null, export2: null });
  };

  const exportMetrics = async () => {
    setExporting(true);
    setExportResult(null);

    try {
      const history = await dgxService.getMetricsHistory(connectionId, 24);

      const exportData = {
        connection_id: connectionId,
        exported_at: new Date().toISOString(),
        current_metrics: metrics,
        session_metrics: {
          start_time: networkBaseline?.timestamp ? new Date(networkBaseline.timestamp).toISOString() : null,
          duration_minutes: networkBaseline ? Math.round((Date.now() - networkBaseline.timestamp) / 60000) : 0,
          total_rx_bytes: metrics?.rx_bytes_delta || 0,
          total_tx_bytes: metrics?.tx_bytes_delta || 0,
          total_rx_packets: metrics?.rx_packets_delta || 0,
          total_tx_packets: metrics?.tx_packets_delta || 0
        },
        history: metricsHistory,
        database_history: history || []
      };

      const result = await dualExport(connectionId, exportData);
      setExportResult(result);

      console.log('[Metrics Export] Local:', result.local);
      console.log('[Metrics Export] Remote:', result.remote);

      setTimeout(() => setExportResult(null), 5000);

    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export metrics');
      setExportResult({
        local: { success: false, error: err.message },
        remote: { success: false, error: 'Not attempted' }
      });
    } finally {
      setExporting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="metrics-disconnected">
        <Activity size={48} strokeWidth={1.5} />
        <p>Connect to DGX Spark to view metrics</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="metrics-error">
        <Activity size={48} strokeWidth={1.5} />
        <p>Error: {error}</p>
        <p className="error-hint">Check if nvidia-smi is available on the DGX</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="metrics-loading">
        <Activity size={24} className="spin" />
        <p>Loading metrics...</p>
      </div>
    );
  }

  const memoryPercent = (metrics.memory_used_mb / metrics.memory_total_mb * 100).toFixed(1);

  return (
    <div className="metrics-panel">
      {/* Header with Export Button */}
      <div className="metrics-header">
        <h3>{metrics.gpu_name}</h3>
        <div className="export-section">
          <button
            className="btn btn-secondary"
            onClick={exportMetrics}
            disabled={exporting}
          >
            <FileDown size={16} />
            {exporting ? 'Exporting...' : 'Export Metrics'}
          </button>

          {exportResult && (
            <div className="export-result">
              <span className={`export-status ${exportResult.local.success ? 'success' : 'error'}`}>
                Local: {exportResult.local.success ? '✓' : '✗'}
              </span>
              <span className={`export-status ${exportResult.remote.success ? 'success' : 'error'}`}>
                DGX: {exportResult.remote.success ? '✓' : '✗'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Metrics Area */}
      <div className="metrics-compact-area">
        {/* Row 1: GPU Performance + Unified Memory */}
        <div className="metrics-row">
          <div className="metrics-section-half">
            <h4>GPU Performance</h4>
            <div className="metrics-grid">
              <MetricCard
                icon={<Gauge size={12} strokeWidth={2} />}
                label="GPU Utilization"
                value={`${metrics.gpu_utilization}%`}
                color={getUtilColor(metrics.gpu_utilization)}
              />
              <MetricCard
                icon={<Thermometer size={12} strokeWidth={2} />}
                label="Temperature"
                value={`${metrics.temperature_c}°C`}
                color={getTempColor(metrics.temperature_c)}
              />
              <MetricCard
                icon={<Zap size={12} strokeWidth={2} />}
                label="Power Draw"
                value={`${metrics.power_watts.toFixed(0)} W`}
                color="var(--accent-gold)"
              />
            </div>
          </div>

          <div className="metrics-section-half">
            <h4>Unified Memory (128 GB)</h4>
            <div className="metrics-grid">
              <MetricCard
                icon={<HardDrive size={12} strokeWidth={2} />}
                label="Memory Used"
                value={`${(metrics.memory_used_mb / 1024).toFixed(1)} GB`}
                subvalue={`${memoryPercent}%`}
                color={getUtilColor(parseFloat(memoryPercent))}
              />
              <MetricCard
                icon={<HardDrive size={12} strokeWidth={2} />}
                label="Memory Available"
                value={`${(metrics.memory_available_mb / 1024).toFixed(1)} GB`}
                color="#22c55e"
              />
              <MetricCard
                icon={<HardDrive size={12} strokeWidth={2} />}
                label="Memory Total"
                value={`${(metrics.memory_total_mb / 1024).toFixed(1)} GB`}
                color="#8b5cf6"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Network + Storage */}
        <div className="metrics-row">
          <div className="metrics-section-half">
            <h4>Network ({metrics.network_interface})</h4>
            <div className="metrics-grid">
              <MetricCard
                icon={<Download size={12} strokeWidth={2} />}
                label="RX (Total)"
                value={formatBytes(metrics.rx_bytes)}
                subvalue={`${formatNumber(metrics.rx_packets)} packets`}
                color="#3b82f6"
              />
              <MetricCard
                icon={<Upload size={12} strokeWidth={2} />}
                label="TX (Total)"
                value={formatBytes(metrics.tx_bytes)}
                subvalue={`${formatNumber(metrics.tx_packets)} packets`}
                color="#f59e0b"
              />
              <MetricCard
                icon={<ArrowDownUp size={12} strokeWidth={2} />}
                label="Session Transfer"
                value={formatBytes(metrics.rx_bytes_delta + metrics.tx_bytes_delta)}
                subvalue={`↓${formatBytes(metrics.rx_bytes_delta)} ↑${formatBytes(metrics.tx_bytes_delta)}`}
                color="#8b5cf6"
              />
            </div>
          </div>

          <div className="metrics-section-half">
            <h4>Storage ({metrics.storage_mount})</h4>
            <div className="metrics-grid">
              <MetricCard
                icon={<Database size={12} strokeWidth={2} />}
                label="Available"
                value={`${metrics.storage_available_gb} GB`}
                subvalue={`${100 - metrics.storage_used_percent}% free`}
                color="#22c55e"
              />
              <MetricCard
                icon={<Database size={12} strokeWidth={2} />}
                label="Used"
                value={`${metrics.storage_used_gb} GB`}
                subvalue={`${metrics.storage_used_percent}%`}
                color={getUtilColor(metrics.storage_used_percent)}
              />
              <MetricCard
                icon={<Database size={12} strokeWidth={2} />}
                label="Total"
                value={`${metrics.storage_total_gb} GB`}
                color="#8b5cf6"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Session Packet Stats (full width) */}
        <div className="packet-stats">
          <div className="packet-stat">
            <span className="packet-label">RX Packets (Session)</span>
            <span className="packet-value">{formatNumber(metrics.rx_packets_delta)}</span>
          </div>
          <div className="packet-stat">
            <span className="packet-label">TX Packets (Session)</span>
            <span className="packet-value">{formatNumber(metrics.tx_packets_delta)}</span>
          </div>
          <div className="packet-stat">
            <span className="packet-label">Commands Run</span>
            <span className="packet-value">{commandCount}</span>
          </div>
          <div className="packet-stat">
            <span className="packet-label">Session Duration</span>
            <span className="packet-value">
              {networkBaseline ? Math.round((Date.now() - networkBaseline.timestamp) / 60000) : 0} min
            </span>
          </div>
          {lastCommand && (
            <div className="packet-stat">
              <span className="packet-label">Last Command</span>
              <span className="packet-value" title={lastCommand.command}>
                {lastCommand.duration}ms
              </span>
            </div>
          )}
        </div>
      </div>

      {/* GPU Utilization History Line Graph - Expanded */}
      {metricsHistory.length > 1 && (() => {
        // Calculate dynamic scale based on max value in history
        const maxValue = Math.max(...metricsHistory.map(m => m.gpu_utilization), 10);
        const scaleMax = Math.ceil(maxValue / 25) * 25; // Round up to nearest 25

        // Helper to scale Y position
        const scaleY = (value) => 100 - (value / scaleMax * 100);

        return (
          <div className="metrics-history-expanded">
            <h4>GPU Utilization - Last 1:50</h4>
            <div className="line-graph-container-expanded">
              <svg className="line-graph" viewBox="0 0 300 100" preserveAspectRatio="none">
                {/* Grid lines at 25%, 50%, 75% of scaleMax */}
                <line x1="0" y1="25" x2="300" y2="25" className="grid-line" />
                <line x1="0" y1="50" x2="300" y2="50" className="grid-line" />
                <line x1="0" y1="75" x2="300" y2="75" className="grid-line" />

                {/* Area fill under line */}
                <path
                  d={`M0,${scaleY(metricsHistory[0].gpu_utilization)} ${metricsHistory.map((m, i) =>
                    `L${(i / (metricsHistory.length - 1)) * 300},${scaleY(m.gpu_utilization)}`
                  ).join(' ')} L300,100 L0,100 Z`}
                  className="line-graph-area"
                />

                {/* Main line */}
                <path
                  d={`M0,${scaleY(metricsHistory[0].gpu_utilization)} ${metricsHistory.map((m, i) =>
                    `L${(i / (metricsHistory.length - 1)) * 300},${scaleY(m.gpu_utilization)}`
                  ).join(' ')}`}
                  className="line-graph-line"
                />

                {/* Data points */}
                {metricsHistory.map((m, i) => (
                  <circle
                    key={i}
                    cx={(i / (metricsHistory.length - 1)) * 300}
                    cy={scaleY(m.gpu_utilization)}
                    r="0.6"
                    className="line-graph-point"
                    style={{ fill: getUtilColor(m.gpu_utilization) }}
                  >
                    <title>{m.gpu_utilization}%</title>
                  </circle>
                ))}
              </svg>
              {/* Y-axis labels with dynamic scale */}
              <div className="line-graph-labels">
                <span>{scaleMax}%</span>
                <span>{Math.round(scaleMax * 0.75)}%</span>
                <span>{Math.round(scaleMax * 0.5)}%</span>
                <span>{Math.round(scaleMax * 0.25)}%</span>
                <span>0%</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Past Exports Section - Only show in live mode */}
      {viewMode === 'live' && (
        <PastExportsBrowser
          connectionId={connectionId}
          onViewExport={handleViewExport}
          onCompareExports={handleCompareExports}
        />
      )}

      {/* Export Viewer Mode */}
      {viewMode === 'view' && selectedExport && (
        <ExportViewer
          exportData={selectedExport}
          filename={selectedFilename}
          onBack={handleBackToLive}
        />
      )}

      {/* Comparison Mode */}
      {viewMode === 'compare' && comparisonExports.export1 && comparisonExports.export2 && (
        <ExportComparison
          export1={comparisonExports.export1}
          export2={comparisonExports.export2}
          onExit={handleBackToLive}
        />
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, subvalue, color }) {
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

function getUtilColor(value) {
  if (value < 50) return '#22c55e'; // Green
  if (value < 80) return '#eab308'; // Yellow
  return '#ef4444'; // Red
}

function getTempColor(temp) {
  if (temp < 60) return '#22c55e'; // Green
  if (temp < 80) return '#eab308'; // Yellow
  return '#ef4444'; // Red
}

export default MetricsPanel;
