import React from 'react';
import { Building, Star } from 'lucide-react';
import { calculateFreshness, formatDaysSince } from '../../utils/freshness.js';

/**
 * ContactListItem Component
 *
 * Individual contact card in the list with avatar, name, company, and freshness indicator.
 */
export default function ContactListItem({ contact, isSelected, onClick }) {
  const freshness = calculateFreshness(contact.days_since_contact);
  const initials = contact.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`contact-list-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Avatar with Freshness Indicator */}
      <div className="contact-avatar-wrapper">
        <div className="contact-avatar">{initials}</div>
        <div
          className={`freshness-dot freshness-${freshness.level}`}
          style={{ backgroundColor: freshness.color }}
          title={`${freshness.label} - ${freshness.description}`}
        />
      </div>

      {/* Contact Info */}
      <div className="contact-info">
        <div className="contact-name">
          {contact.name}
          {contact.priority === 'high' && (
            <Star size={14} className="priority-high" title="High priority" />
          )}
        </div>
        {contact.company && (
          <div className="contact-company">
            <Building size={12} />
            {contact.company}
          </div>
        )}
        {contact.title && (
          <div className="contact-title">{contact.title}</div>
        )}
        <div className="contact-freshness">
          <span className="freshness-emoji">{freshness.emoji}</span>
          {formatDaysSince(contact.days_since_contact)}
        </div>
      </div>
    </div>
  );
}
