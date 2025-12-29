import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import './Button.css';

/**
 * Button Component
 *
 * Versatile button with multiple variants, sizes, and states.
 * Supports loading state with spinner and icon support.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * @param {string} props.size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} props.loading - Show loading spinner
 * @param {boolean} props.disabled - Disable button
 * @param {React.ReactNode} props.icon - Optional icon (left side)
 * @param {React.ReactNode} props.iconRight - Optional icon (right side)
 * @param {Function} props.onClick - Click handler
 * @param {string} props.type - Button type: 'button' | 'submit' | 'reset'
 * @param {boolean} props.fullWidth - Make button full width
 * @param {string} props.className - Additional CSS classes
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  onClick,
  type = 'button',
  fullWidth = false,
  className = '',
  ...restProps
}) {
  const buttonClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading && 'btn-loading',
    fullWidth && 'btn-full-width',
    className
  ].filter(Boolean).join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      {...restProps}
    >
      {loading && (
        <span className="btn-spinner" aria-label="Loading">
          <Loader2 size={16} className="btn-spinner-icon" />
        </span>
      )}

      {!loading && icon && (
        <span className="btn-icon btn-icon-left">{icon}</span>
      )}

      {children && <span className="btn-content">{children}</span>}

      {!loading && iconRight && (
        <span className="btn-icon btn-icon-right">{iconRight}</span>
      )}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.node,
  iconRight: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string
};

export default Button;
