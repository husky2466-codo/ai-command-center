import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

/**
 * Card Component
 *
 * A reusable card container with dark navy styling, optional header/footer,
 * and hover elevation effect.
 *
 * @param {Object} props
 * @param {string} props.title - Optional card title
 * @param {string} props.subtitle - Optional card subtitle
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} props.actions - Optional footer actions
 * @param {React.ReactNode} props.header - Optional custom header content
 * @param {React.ReactNode} props.footer - Optional custom footer content
 * @param {Function} props.onClick - Optional click handler
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Card variant: 'default' | 'elevated' | 'outlined'
 * @param {string} props.padding - Padding variant: 'none' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.hoverable - Enable hover effect
 */
function Card({
  title,
  subtitle,
  children,
  actions,
  header,
  footer,
  onClick,
  className = '',
  variant = 'default',
  padding = 'md',
  hoverable = false
}) {
  const cardClasses = [
    'card',
    `card-${variant}`,
    `card-padding-${padding}`,
    hoverable && 'card-hoverable',
    onClick && 'card-clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
    >
      {header ? (
        <div className="card-header-custom">{header}</div>
      ) : (title || subtitle) ? (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      ) : null}

      {children && (
        <div className="card-content">{children}</div>
      )}

      {footer ? (
        <div className="card-footer-custom">{footer}</div>
      ) : actions ? (
        <div className="card-actions">{actions}</div>
      ) : null}
    </div>
  );
}

Card.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  actions: PropTypes.node,
  header: PropTypes.node,
  footer: PropTypes.node,
  onClick: PropTypes.func,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'elevated', 'outlined']),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg']),
  hoverable: PropTypes.bool
};

export default Card;
