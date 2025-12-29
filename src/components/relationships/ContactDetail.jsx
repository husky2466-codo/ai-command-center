import React, { useState, useEffect } from 'react';
import {
  Mail, Phone, MapPin, Building, Edit, Trash2,
  MessageSquare, Linkedin, Twitter, Github, Globe,
  Calendar, Star, ExternalLink
} from 'lucide-react';
import { calculateFreshness, formatDaysSince } from '../../utils/freshness.js';
import relationshipService from '../../services/relationshipService.js';
import InteractionTimeline from './InteractionTimeline.jsx';

/**
 * ContactDetail Component
 *
 * Displays full contact information with tabs for Info, Context, and History.
 */
export default function ContactDetail({ contact, groups, onEdit, onDelete, onLogInteraction, onRefresh }) {
  const [activeTab, setActiveTab] = useState('info');
  const [interactions, setInteractions] = useState([]);
  const [contactGroups, setContactGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const freshness = calculateFreshness(contact.days_since_contact);

  // Load interactions and groups when contact changes
  useEffect(() => {
    loadContactData();
  }, [contact.id]);

  const loadContactData = async () => {
    try {
      setLoading(true);
      const [interactionsData, groupsData] = await Promise.all([
        relationshipService.getContactInteractions(contact.id),
        relationshipService.getContactGroups(contact.id)
      ]);
      setInteractions(interactionsData);
      setContactGroups(groupsData);
    } catch (err) {
      console.error('Failed to load contact data:', err);
    } finally {
      setLoading(false);
    }
  };

  const initials = contact.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const socialLinks = contact.social_links || {};

  return (
    <div className="contact-detail">
      {/* Header */}
      <div className="contact-detail-header">
        <div className="contact-detail-avatar-wrapper">
          <div className="contact-detail-avatar">{initials}</div>
          <div
            className={`freshness-indicator freshness-${freshness.level}`}
            style={{ backgroundColor: freshness.color }}
          >
            <span className="freshness-emoji-large">{freshness.emoji}</span>
          </div>
        </div>

        <div className="contact-detail-header-info">
          <h2>{contact.name}</h2>
          {contact.title && <p className="contact-detail-title">{contact.title}</p>}
          {contact.company && (
            <p className="contact-detail-company">
              <Building size={16} />
              {contact.company}
            </p>
          )}

          <div className="contact-detail-meta">
            <div className={`freshness-badge freshness-${freshness.level}`}>
              {freshness.emoji} {freshness.label}
            </div>
            {contact.priority === 'high' && (
              <div className="priority-badge">
                <Star size={14} fill="currentColor" />
                High Priority
              </div>
            )}
          </div>

          <div className="contact-detail-last-contact">
            Last contact: <strong>{formatDaysSince(contact.days_since_contact)}</strong>
          </div>
        </div>

        <div className="contact-detail-actions">
          <button onClick={() => onEdit(contact)} className="btn-icon" title="Edit contact">
            <Edit size={20} />
          </button>
          <button onClick={() => onDelete(contact.id)} className="btn-icon btn-danger" title="Delete contact">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="contact-quick-actions">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="quick-action" title="Send email">
            <Mail size={16} />
            Email
          </a>
        )}
        <button onClick={onLogInteraction} className="quick-action" title="Log interaction">
          <MessageSquare size={16} />
          Log Interaction
        </button>
        <button onClick={loadContactData} className="quick-action" title="Refresh">
          <Calendar size={16} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="contact-detail-tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          className={`tab ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          Context
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History ({interactions.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="contact-detail-content">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="contact-info-tab">
            <div className="info-section">
              <h3>Contact Information</h3>
              <div className="info-grid">
                {contact.email && (
                  <div className="info-item">
                    <Mail size={16} />
                    <div>
                      <label>Email</label>
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>
                    </div>
                  </div>
                )}
                {contact.location && (
                  <div className="info-item">
                    <MapPin size={16} />
                    <div>
                      <label>Location</label>
                      <span>{contact.location}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="info-section">
                <h3>Social Links</h3>
                <div className="social-links">
                  {socialLinks.linkedin && (
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                      <Linkedin size={20} />
                      LinkedIn
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="social-link twitter">
                      <Twitter size={20} />
                      Twitter
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {socialLinks.github && (
                    <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" className="social-link github">
                      <Github size={20} />
                      GitHub
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {socialLinks.website && (
                    <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="social-link website">
                      <Globe size={20} />
                      Website
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Groups */}
            {contactGroups.length > 0 && (
              <div className="info-section">
                <h3>Groups</h3>
                <div className="contact-groups">
                  {contactGroups.map(group => (
                    <span key={group.id} className="group-badge">
                      {group.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Background */}
            {contact.professional_background && (
              <div className="info-section">
                <h3>Professional Background</h3>
                <p className="professional-background">{contact.professional_background}</p>
              </div>
            )}
          </div>
        )}

        {/* Context Tab */}
        {activeTab === 'context' && (
          <div className="contact-context-tab">
            <div className="info-section">
              <h3>Relationship Context</h3>
              {contact.context ? (
                <p className="context-text">{contact.context}</p>
              ) : (
                <p className="empty-context">No context notes yet. Click Edit to add context about this relationship.</p>
              )}
            </div>

            {contact.notes && (
              <div className="info-section">
                <h3>Notes</h3>
                <p className="notes-text">{contact.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="contact-history-tab">
            {loading ? (
              <div className="loading-interactions">Loading interactions...</div>
            ) : (
              <InteractionTimeline
                interactions={interactions}
                onRefresh={loadContactData}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
