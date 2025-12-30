import { useState, useEffect, useRef } from 'react';
import { Gauge, Thermometer, Zap, HardDrive, Activity, Wifi, Download, Upload, ArrowDownUp, FileDown } from 'lucide-react';
import { dgxService } from '../../../services/DGXService.js';

function MetricsPanel({ connectionId, isConnected }) {
  const [metrics, setMetrics] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [networkBaseline, setNetworkBaseline] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const pollInterval = useRef(null);

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
        const { gpus, memory, network, timestamp } = result.data;
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
          timestamp: Date.now()
        };

        setMetrics(newMetrics);
        setError(null);

        // Keep last 60 data points for chart (2 minutes at 2s interval)
        setMetricsHistory(prev => [...prev.slice(-59), newMetrics]);
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

  const exportMetrics = async () => {
    setExporting(true);
    try {
      // Get metrics history from database
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

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dgx-metrics-${connectionId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export metrics');
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
        <button
          className="btn btn-secondary"
          onClick={exportMetrics}
          disabled={exporting}
        >
          <FileDown size={16} />
          {exporting ? 'Exporting...' : 'Export Metrics'}
        </button>
      </div>

      {/* GPU Metrics */}
      <div className="metrics-section">
        <h4>GPU Performance</h4>
        <div className="metrics-grid">
          <MetricCard
            icon={<Gauge size={24} strokeWidth={2} />}
            label="GPU Utilization"
            value={`${metrics.gpu_utilization}%`}
            color={getUtilColor(metrics.gpu_utilization)}
          />
          <MetricCard
            icon={<Thermometer size={24} strokeWidth={2} />}
            label="Temperature"
            value={`${metrics.temperature_c}°C`}
            color={getTempColor(metrics.temperature_c)}
          />
          <MetricCard
            icon={<Zap size={24} strokeWidth={2} />}
            label="Power Draw"
            value={`${metrics.power_watts.toFixed(0)} W`}
            color="var(--accent-gold)"
          />
        </div>
      </div>

      {/* Memory Metrics */}
      <div className="metrics-section">
        <h4>Unified Memory (128 GB)</h4>
        <div className="metrics-grid">
          <MetricCard
            icon={<HardDrive size={24} strokeWidth={2} />}
            label="Memory Used"
            value={`${(metrics.memory_used_mb / 1024).toFixed(1)} GB`}
            subvalue={`${memoryPercent}%`}
            color={getUtilColor(parseFloat(memoryPercent))}
          />
          <MetricCard
            icon={<HardDrive size={24} strokeWidth={2} />}
            label="Memory Available"
            value={`${(metrics.memory_available_mb / 1024).toFixed(1)} GB`}
            color="#22c55e"
          />
          <MetricCard
            icon={<HardDrive size={24} strokeWidth={2} />}
            label="Memory Total"
            value={`${(metrics.memory_total_mb / 1024).toFixed(1)} GB`}
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Network Metrics */}
      <div className="metrics-section">
        <h4>Network ({metrics.network_interface})</h4>
        <div className="metrics-grid">
          <MetricCard
            icon={<Download size={24} strokeWidth={2} />}
            label="RX (Total)"
            value={formatBytes(metrics.rx_bytes)}
            subvalue={`${formatNumber(metrics.rx_packets)} packets`}
            color="#3b82f6"
          />
          <MetricCard
            icon={<Upload size={24} strokeWidth={2} />}
            label="TX (Total)"
            value={formatBytes(metrics.tx_bytes)}
            subvalue={`${formatNumber(metrics.tx_packets)} packets`}
            color="#f59e0b"
          />
          <MetricCard
            icon={<ArrowDownUp size={24} strokeWidth={2} />}
            label="Session Transfer"
            value={formatBytes(metrics.rx_bytes_delta + metrics.tx_bytes_delta)}
            subvalue={`↓${formatBytes(metrics.rx_bytes_delta)} ↑${formatBytes(metrics.tx_bytes_delta)}`}
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Session Packet Stats */}
      <div className="metrics-section">
        <h4>Session Packet Stats</h4>
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
            <span className="packet-label">Session Duration</span>
            <span className="packet-value">
              {networkBaseline ? Math.round((Date.now() - networkBaseline.timestamp) / 60000) : 0} min
            </span>
          </div>
        </div>
      </div>

      {/* GPU Utilization History Sparkline */}
      {metricsHistory.length > 0 && (
        <div className="metrics-history">
          <h4>GPU Utilization - Last 2 Minutes</h4>
          <div className="sparkline">
            {metricsHistory.map((m, i) => (
              <div
                key={i}
                className="sparkline-bar"
                style={{
                  height: `${m.gpu_utilization}%`,
                  backgroundColor: getUtilColor(m.gpu_utilization)
                }}
                title={`${m.gpu_utilization}%`}
              />
            ))}
          </div>
        </div>
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
