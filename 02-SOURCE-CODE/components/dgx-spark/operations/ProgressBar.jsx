import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({
  progress = 0,
  label = null,
  type = 'default',
  size = 'md',
  showLabel = true,
  animated = false
}) => {
  const isIndeterminate = progress === -1;
  const isCompleted = progress === 100;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Determine effective type
  const effectiveType = isCompleted && type === 'default' ? 'success' : type;

  // Generate label text
  const labelText = label || (isIndeterminate ? 'In progress...' : `${clampedProgress}%`);

  return (
    <div className={`progress-bar-container progress-bar-${size}`}>
      {showLabel && (
        <div className="progress-bar-label">
          <span>{labelText}</span>
        </div>
      )}
      <div className={`progress-bar-track progress-bar-${effectiveType}`}>
        <div
          className={`progress-bar-fill ${isIndeterminate ? 'indeterminate' : ''} ${animated ? 'animated' : ''}`}
          style={{
            width: isIndeterminate ? '30%' : `${clampedProgress}%`
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
