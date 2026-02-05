import { X, Gauge, Thermometer, Zap, HardDrive, Download, Upload, Database } from 'lucide-react';
import ComparisonGraph from './ComparisonGraph';
import ComparisonMetricCard from './ComparisonMetricCard';

/**
 * Full comparison view showing two exports side-by-side
 */
function ExportComparison({ export1, export2, onExit }) {
  const { data: data1, filename: filename1 } = export1;
  const { data: data2, filename: filename2 } = export2;

  const metrics1 = data1.current_metrics;
  const metrics2 = data2.current_metrics;

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const label1 = formatDate(data1.exported_at);
  const label2 = formatDate(data2.exported_at);

  return (
    <div className="export-comparison">
      <div className="comparison-header">
        <h4>Comparing Exports</h4>
        <div className="comparison-labels">
          <span className="comparison-label label-1">{label1}</span>
          <span className="vs">vs</span>
          <span className="comparison-label label-2">{label2}</span>
        </div>
        <button className="btn btn-secondary" onClick={onExit}>
          <X size={16} />
          Exit Compare
        </button>
      </div>

      {/* Overlay Graph */}
      <ComparisonGraph
        history1={data1.history}
        history2={data2.history}
        label1={label1}
        label2={label2}
      />

      {/* Side-by-side Metrics */}
      <div className="comparison-metrics">
        <div className="comparison-section">
          <h5>GPU Performance</h5>
          <div className="comparison-grid">
            <ComparisonMetricCard
              icon={<Gauge size={14} />}
              label="GPU Utilization"
              value1={metrics1.gpu_utilization}
              value2={metrics2.gpu_utilization}
              unit="%"
              higherIsBetter={true}
            />
            <ComparisonMetricCard
              icon={<Thermometer size={14} />}
              label="Temperature"
              value1={metrics1.temperature_c}
              value2={metrics2.temperature_c}
              unit="°C"
              higherIsBetter={false}
            />
            <ComparisonMetricCard
              icon={<Zap size={14} />}
              label="Power Draw"
              value1={metrics1.power_watts?.toFixed(0) || 0}
              value2={metrics2.power_watts?.toFixed(0) || 0}
              unit="W"
              higherIsBetter={false}
            />
          </div>
        </div>

        <div className="comparison-section">
          <h5>Memory</h5>
          <div className="comparison-grid">
            <ComparisonMetricCard
              icon={<HardDrive size={14} />}
              label="Memory Used"
              value1={(metrics1.memory_used_mb / 1024).toFixed(1)}
              value2={(metrics2.memory_used_mb / 1024).toFixed(1)}
              unit=" GB"
              higherIsBetter={false}
            />
            <ComparisonMetricCard
              icon={<HardDrive size={14} />}
              label="Memory Available"
              value1={(metrics1.memory_available_mb / 1024).toFixed(1)}
              value2={(metrics2.memory_available_mb / 1024).toFixed(1)}
              unit=" GB"
              higherIsBetter={true}
            />
          </div>
        </div>

        <div className="comparison-section">
          <h5>Network (Session)</h5>
          <div className="comparison-grid">
            <ComparisonMetricCard
              icon={<Download size={14} />}
              label="RX Delta"
              value1={(metrics1.rx_bytes_delta / (1024*1024)).toFixed(1)}
              value2={(metrics2.rx_bytes_delta / (1024*1024)).toFixed(1)}
              unit=" MB"
              higherIsBetter={true}
            />
            <ComparisonMetricCard
              icon={<Upload size={14} />}
              label="TX Delta"
              value1={(metrics1.tx_bytes_delta / (1024*1024)).toFixed(1)}
              value2={(metrics2.tx_bytes_delta / (1024*1024)).toFixed(1)}
              unit=" MB"
              higherIsBetter={true}
            />
          </div>
        </div>

        <div className="comparison-section">
          <h5>Storage</h5>
          <div className="comparison-grid">
            <ComparisonMetricCard
              icon={<Database size={14} />}
              label="Storage Used"
              value1={metrics1.storage_used_gb}
              value2={metrics2.storage_used_gb}
              unit=" GB"
              higherIsBetter={false}
            />
            <ComparisonMetricCard
              icon={<Database size={14} />}
              label="Storage Available"
              value1={metrics1.storage_available_gb}
              value2={metrics2.storage_available_gb}
              unit=" GB"
              higherIsBetter={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportComparison;
