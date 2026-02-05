import React from 'react';
import PropTypes from 'prop-types';
import './Badge.css';

/**
 * Badge Component
 *
 * Small pill-shaped badges with color variants for status, memory types, and energy types.
 * Optional icon support and hexagon variant for memory types.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} props.variant - Badge color variant
 * @param {string} props.size - Badge size: 'sm' | 'md'
 * @param {React.ReactNode} props.icon - Optional icon
 * @param {boolean} props.hexagon - Use hexagonal shape (for memory types)
 * @param {string} props.className - Additional CSS classes
 */
function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  hexagon = false,
  className = '',
  ...restProps
}) {
  const badgeClasses = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    hexagon && 'badge-hexagon',
    icon && 'badge-has-icon',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses} {...restProps}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children && <span className="badge-content">{children}</span>}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'default',
    // Status variants
    'success',
    'warning',
    'error',
    'info',
    // Memory type variants
    'memory-correction',
    'memory-decision',
    'memory-commitment',
    'memory-insight',
    'memory-learning',
    'memory-confidence',
    'memory-pattern',
    'memory-cross-agent',
    'memory-workflow',
    'memory-gap',
    // Energy type variants
    'energy-low',
    'energy-quick-win',
    'energy-deep-work',
    'energy-creative',
    'energy-execution',
    'energy-people',
    // Freshness variants
    'freshness-hot',
    'freshness-warm',
    'freshness-cool',
    'freshness-cold',
    // Module variants
    'module-dashboard',
    'module-projects',
    'module-reminders',
    'module-relationships',
    'module-meetings',
    'module-knowledge',
    'module-chat',
    'module-memory-lane',
    'module-vision',
    'module-chain-runner',
    'module-admin'
  ]),
  size: PropTypes.oneOf(['sm', 'md']),
  icon: PropTypes.node,
  hexagon: PropTypes.bool,
  className: PropTypes.string
};

export default Badge;
