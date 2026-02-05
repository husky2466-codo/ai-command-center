import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './Input.css';

/**
 * Input Component
 *
 * Dark-themed text input with label, error messages, and icon support.
 * Focus state shows gold border.
 *
 * @param {Object} props
 * @param {string} props.type - Input type: 'text' | 'number' | 'email' | 'password' | 'url' | 'search'
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Label text
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.error - Error message
 * @param {string} props.hint - Hint text (shown below input)
 * @param {React.ReactNode} props.icon - Icon to show (prefix, left side)
 * @param {React.ReactNode} props.iconRight - Icon to show (suffix, right side)
 * @param {boolean} props.disabled - Disable input
 * @param {boolean} props.required - Mark as required
 * @param {boolean} props.fullWidth - Make input full width
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.id - Input ID (auto-generated if not provided)
 * @param {string} props.name - Input name
 */
const Input = forwardRef(function Input({
  type = 'text',
  value,
  onChange,
  label,
  placeholder,
  error,
  hint,
  icon,
  iconRight,
  disabled = false,
  required = false,
  fullWidth = false,
  className = '',
  id,
  name,
  ...restProps
}, ref) {
  // Generate a unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const containerClasses = [
    'input-container',
    fullWidth && 'input-full-width',
    error && 'input-has-error',
    disabled && 'input-disabled',
    className
  ].filter(Boolean).join(' ');

  const inputClasses = [
    'input',
    icon && 'input-has-icon-left',
    iconRight && 'input-has-icon-right'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required" aria-label="required"> *</span>}
        </label>
      )}

      {/* Input wrapper (for icon positioning) */}
      <div className="input-wrapper">
        {icon && (
          <span className="input-icon input-icon-left" aria-hidden="true">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...restProps}
        />

        {iconRight && (
          <span className="input-icon input-icon-right" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <span id={`${inputId}-error`} className="input-error" role="alert">
          {error}
        </span>
      )}

      {/* Hint text */}
      {!error && hint && (
        <span id={`${inputId}-hint`} className="input-hint">
          {hint}
        </span>
      )}
    </div>
  );
});

Input.propTypes = {
  type: PropTypes.oneOf(['text', 'number', 'email', 'password', 'url', 'search', 'tel', 'date', 'time', 'datetime-local']),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  icon: PropTypes.node,
  iconRight: PropTypes.node,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string
};

export default Input;
