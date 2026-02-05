/**
 * Comparison Graph - Overlays two export histories on one graph
 * Export 1: Green line with green points
 * Export 2: Purple line with yellow points
 */
function ComparisonGraph({ history1, history2, label1, label2 }) {
  if (!history1?.length || !history2?.length) {
    return <div className="comparison-graph-empty">No history data available</div>;
  }

  // Normalize both histories to same number of points
  const normalizeHistory = (history, targetPoints = 50) => {
    if (history.length <= targetPoints) return history;
    const step = (history.length - 1) / (targetPoints - 1);
    return Array.from({ length: targetPoints }, (_, i) => {
      const idx = Math.round(i * step);
      return history[Math.min(idx, history.length - 1)];
    });
  };

  const norm1 = normalizeHistory(history1);
  const norm2 = normalizeHistory(history2);
  const points = Math.max(norm1.length, norm2.length);

  // Calculate dynamic scale based on both datasets
  const allValues = [...norm1.map(m => m.gpu_utilization), ...norm2.map(m => m.gpu_utilization)];
  const maxVal = Math.max(...allValues, 10);
  const scaleMax = Math.ceil(maxVal / 25) * 25;

  const scaleY = (value) => 100 - (value / scaleMax * 100);
  const getX = (index, total) => (index / (total - 1)) * 300;

  const getUtilColor = (value) => {
    if (value < 50) return '#22c55e';
    if (value < 80) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="comparison-graph">
      <div className="comparison-graph-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#22c55e' }}></span>
          <span className="legend-label">{label1}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#8b5cf6' }}></span>
          <span className="legend-label">{label2}</span>
        </div>
      </div>

      <div className="line-graph-container-expanded">
        <svg className="line-graph" viewBox="0 0 300 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="300" y2="25" className="grid-line" />
          <line x1="0" y1="50" x2="300" y2="50" className="grid-line" />
          <line x1="0" y1="75" x2="300" y2="75" className="grid-line" />

          {/* Export 1 - Green area and line */}
          <path
            d={`M0,${scaleY(norm1[0].gpu_utilization)} ${norm1.map((m, i) =>
              `L${getX(i, norm1.length)},${scaleY(m.gpu_utilization)}`
            ).join(' ')} L300,100 L0,100 Z`}
            className="line-graph-area"
          />
          <path
            d={`M0,${scaleY(norm1[0].gpu_utilization)} ${norm1.map((m, i) =>
              `L${getX(i, norm1.length)},${scaleY(m.gpu_utilization)}`
            ).join(' ')}`}
            className="line-graph-line"
          />
          {norm1.map((m, i) => (
            <circle
              key={`p1-${i}`}
              cx={getX(i, norm1.length)}
              cy={scaleY(m.gpu_utilization)}
              r="0.6"
              className="line-graph-point"
              style={{ fill: getUtilColor(m.gpu_utilization) }}
            >
              <title>Export 1: {m.gpu_utilization}%</title>
            </circle>
          ))}

          {/* Export 2 - Purple area and line */}
          <path
            d={`M0,${scaleY(norm2[0].gpu_utilization)} ${norm2.map((m, i) =>
              `L${getX(i, norm2.length)},${scaleY(m.gpu_utilization)}`
            ).join(' ')} L300,100 L0,100 Z`}
            className="line-graph-area-secondary"
          />
          <path
            d={`M0,${scaleY(norm2[0].gpu_utilization)} ${norm2.map((m, i) =>
              `L${getX(i, norm2.length)},${scaleY(m.gpu_utilization)}`
            ).join(' ')}`}
            className="line-graph-line-secondary"
          />
          {norm2.map((m, i) => (
            <circle
              key={`p2-${i}`}
              cx={getX(i, norm2.length)}
              cy={scaleY(m.gpu_utilization)}
              r="0.6"
              className="line-graph-point-secondary"
            >
              <title>Export 2: {m.gpu_utilization}%</title>
            </circle>
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
  );
}

export default ComparisonGraph;
