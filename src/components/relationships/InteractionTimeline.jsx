import React from 'react';
import { Mail, Phone, MessageSquare, Video, Users } from 'lucide-react';

/**
 * InteractionTimeline Component
 *
 * Displays chronological timeline of interactions with a contact.
 */
export default function InteractionTimeline({ interactions, onRefresh }) {
  if (interactions.length === 0) {
    return (
      <div className="interaction-timeline-empty">
        <MessageSquare size={48} />
        <p>No interactions logged yet</p>
        <p className="empty-hint">Click "Log Interaction" to record your first contact</p>
      </div>
    );
  }

  const getInteractionIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail size={18} />;
      case 'call':
        return <Phone size={18} />;
      case 'meeting':
        return <Video size={18} />;
      case 'message':
        return <MessageSquare size={18} />;
      case 'in_person':
        return <Users size={18} />;
      default:
        return <MessageSquare size={18} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (diffDays === 0) {
      return `Today at ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${timeStr}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago at ${timeStr}`;
    } else {
      return `${dateStr} at ${timeStr}`;
    }
  };

  return (
    <div className="interaction-timeline">
      {interactions.map((interaction, index) => (
        <div key={interaction.id} className="interaction-item">
          <div className={`interaction-icon interaction-type-${interaction.type}`}>
            {getInteractionIcon(interaction.type)}
          </div>
          <div className="interaction-content">
            <div className="interaction-header">
              <span className="interaction-type-label">
                {interaction.type.replace('_', ' ')}
              </span>
              <span className="interaction-date">
                {formatDate(interaction.occurred_at)}
              </span>
            </div>
            <div className="interaction-summary">
              {interaction.summary}
            </div>
          </div>
          {index < interactions.length - 1 && <div className="interaction-line" />}
        </div>
      ))}
    </div>
  );
}
