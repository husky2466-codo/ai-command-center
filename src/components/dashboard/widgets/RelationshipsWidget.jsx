import React from 'react';
import { Users, Snowflake, Cloud, AlertTriangle } from 'lucide-react';
import Card from '../../shared/Card';
import Badge from '../../shared/Badge';

/**
 * RelationshipsWidget - Contacts needing attention (Cool/Cold freshness)
 */
function RelationshipsWidget({ relationships, onNavigate }) {
  if (!relationships) return null;

  const getFreshnessIcon = (freshness) => {
    switch (freshness) {
      case 'cold':
        return <Snowflake size={14} />;
      case 'cool':
        return <Cloud size={14} />;
      default:
        return null;
    }
  };

  const getFreshnessClass = (freshness) => {
    return `freshness-${freshness}`;
  };

  const getDaysSinceContact = (lastContactDate) => {
    if (!lastContactDate) return 'Never';
    const days = Math.floor(
      (Date.now() - new Date(lastContactDate)) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const handleContactClick = (contact) => {
    if (onNavigate) {
      onNavigate('relationships', { contactId: contact.id });
    }
  };

  return (
    <Card
      title="Relationships"
      className="relationships-widget"
      variant="default"
      padding="md"
      hoverable
    >
      <div className="widget-icon">
        <Users size={20} />
      </div>

      {relationships.totalCount === 0 ? (
        <div className="widget-empty">
          <p>All relationships are fresh!</p>
        </div>
      ) : (
        <div className="relationships-sections">
          <div className="relationships-summary">
            <div className="summary-stat">
              <AlertTriangle size={16} className="stat-icon-warning" />
              <span className="stat-count">{relationships.totalCount}</span>
              <span className="stat-label">need attention</span>
            </div>
          </div>

          <div className="contacts-list">
            {relationships.topContacts.map((contact) => (
              <div
                key={contact.id}
                className={`contact-item ${getFreshnessClass(contact.freshness)}`}
                onClick={() => handleContactClick(contact)}
              >
                <div className="contact-header">
                  <span className="contact-name">{contact.name}</span>
                  <Badge
                    text={contact.freshness}
                    variant={contact.freshness}
                    size="sm"
                    icon={getFreshnessIcon(contact.freshness)}
                  />
                </div>
                <div className="contact-meta">
                  <span className="contact-last">
                    {getDaysSinceContact(contact.last_contact)}
                  </span>
                  {contact.relationship_type && (
                    <span className="contact-type">{contact.relationship_type}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {relationships.cold.count > 0 && (
            <div className="freshness-alert cold">
              <Snowflake size={14} />
              <span>{relationships.cold.count} cold (90+ days)</span>
            </div>
          )}
          {relationships.cool.count > 0 && (
            <div className="freshness-alert cool">
              <Cloud size={14} />
              <span>{relationships.cool.count} cool (31-90 days)</span>
            </div>
          )}
        </div>
      )}

      <div className="widget-footer">
        <span className="widget-count">{relationships.totalCount} contacts</span>
        <button
          className="btn-link"
          onClick={() => onNavigate && onNavigate('relationships')}
        >
          View all
        </button>
      </div>
    </Card>
  );
}

export default RelationshipsWidget;
