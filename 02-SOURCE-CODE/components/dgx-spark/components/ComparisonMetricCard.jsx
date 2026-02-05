import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

/**
 * Expanded metric card showing two values side-by-side for comparison
 */
function ComparisonMetricCard({ icon, label, value1, value2, unit = '', higherIsBetter = true }) {
  // Parse numeric values for comparison
  const num1 = parseFloat(String(value1).replace(/[^0-9.-]/g, '')) || 0;
  const num2 = parseFloat(String(value2).replace(/[^0-9.-]/g, '')) || 0;

  const diff = num2 - num1;
  const diffPercent = num1 !== 0 ? ((diff / num1) * 100).toFixed(1) : 0;

  // Determine which is "better"
  const isBetter1 = higherIsBetter ? num1 > num2 : num1 < num2;
  const isBetter2 = higherIsBetter ? num2 > num1 : num2 < num1;
  const isEqual = num1 === num2;

  const getIndicator = (isBetter) => {
    if (isEqual) return <Minus size={12} className="indicator-equal" />;
    return isBetter
      ? <ArrowUp size={12} className="indicator-better" />
      : <ArrowDown size={12} className="indicator-worse" />;
  };

  return (
    <div className="comparison-metric-card">
      <div className="comparison-metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>

      <div className="comparison-metric-body">
        <div className={`comparison-side ${isBetter1 ? 'better' : ''}`}>
          <span className="comparison-value">{value1}{unit}</span>
          {getIndicator(isBetter1)}
        </div>

        <div className="comparison-divider">vs</div>

        <div className={`comparison-side ${isBetter2 ? 'better' : ''}`}>
          <span className="comparison-value">{value2}{unit}</span>
          {getIndicator(isBetter2)}
        </div>
      </div>

      {!isEqual && (
        <div className="comparison-diff">
          {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit} ({diffPercent}%)
        </div>
      )}
    </div>
  );
}

export default ComparisonMetricCard;
