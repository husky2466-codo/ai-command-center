import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Mail, Phone, RefreshCw } from 'lucide-react';
import './Contacts.css';

/**
 * Contacts - Google Account Contact Directory
 *
 * Features:
 * - Display synced Google contacts from account_contacts table
 * - Alphabetical sidebar for quick navigation
 * - Search by name, email, company
 * - Contact detail panel
 * - Refresh capability
 */
export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all account contacts from Google synced data
      const result = await window.electronAPI.dbQuery(`
        SELECT
          id,
          display_name as name,
          email,
          phone,
          company,
          job_title as title,
          photo_url
        FROM account_contacts
        ORDER BY display_name ASC
      `);

      if (!result.success) {
        throw new Error(result.error || 'Failed to query contacts');
      }

      const contactsList = result.data || [];
      console.log('[Contacts] Loaded contacts from account_contacts:', contactsList.length);

      setContacts(contactsList);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError('Failed to load contacts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadContacts();
  };

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    // Ensure contacts is always an array
    const contactsArray = Array.isArray(contacts) ? contacts : [];
    if (!searchQuery) return contactsArray;

    const query = searchQuery.toLowerCase();
    return contactsArray.filter(contact => {
      const name = contact.name || '';
      const email = contact.email || '';
      const company = contact.company || '';

      return name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        company.toLowerCase().includes(query);
    });
  }, [contacts, searchQuery]);

  // Group contacts by first letter
  const groupedContacts = useMemo(() => {
    const groups = {};
    const contactsToGroup = Array.isArray(filteredContacts) ? filteredContacts : [];
    contactsToGroup.forEach(contact => {
      const name = contact.name || 'Unknown';
      const firstLetter = name[0].toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(contact);
    });

    // Sort each group
    Object.keys(groups).forEach(letter => {
      groups[letter].sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      });
    });

    return groups;
  }, [filteredContacts]);

  // Get sorted letters
  const letters = useMemo(() => {
    const sorted = Object.keys(groupedContacts).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [groupedContacts]);

  const scrollToLetter = (letter) => {
    const element = document.getElementById(`contact-group-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name[0];
  };

  if (loading) {
    return (
      <div className="contacts-container">
        <div className="loading-state">
          <Users size={48} />
          <p>Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contacts-container">
        <div className="error-state">
          <Users size={48} />
          <p className="error-message">{error}</p>
          <button onClick={loadContacts} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="contacts-container">
      {/* Header */}
      <header className="contacts-header">
        <div className="header-title">
          <Users size={24} />
          <h1>Contacts</h1>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="btn-sync"
          disabled={loading}
          title="Refresh contacts"
        >
          <RefreshCw size={20} className={loading ? 'spinning' : ''} />
          Refresh
        </button>

        {/* Stats */}
        <div className="header-stats">
          <span className="stat">
            <strong>{contacts.length}</strong> total
          </span>
          <span className="stat">
            <strong>{filteredContacts.length}</strong> shown
          </span>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Main Content */}
      <div className="contacts-main">
        {/* Left Sidebar - Alphabetical Index */}
        <div className="contacts-alphabet-sidebar">
          {letters.map(letter => (
            <button
              key={letter}
              className="alphabet-btn"
              onClick={() => scrollToLetter(letter)}
              title={`Jump to ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Center - Contact List */}
        <div className="contacts-list-panel">
          {/* Search Bar */}
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Contact List */}
          <div className="contacts-list">
            {loading ? (
              <div className="list-loading">
                <Users size={32} />
                <p>Loading contacts...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="list-empty">
                <Users size={48} />
                <p>No contacts found</p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="btn-secondary">
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              letters.map(letter => (
                <div key={letter} id={`contact-group-${letter}`} className="contact-group">
                  <div className="contact-group-header">{letter}</div>
                  <div className="contact-group-items">
                    {groupedContacts[letter].map(contact => {
                      const name = contact.name || 'Unknown';
                      const email = contact.email || '';
                      const company = contact.company || '';
                      const title = contact.title || '';
                      const isSelected = selectedContact?.id === contact.id;

                      return (
                        <button
                          key={contact.id}
                          className={`contact-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedContact(contact)}
                        >
                          <div className="contact-avatar">
                            <div className="contact-initials">
                              {getInitials(name)}
                            </div>
                          </div>
                          <div className="contact-info">
                            <div className="contact-name">{name}</div>
                            {email && <div className="contact-email">{email}</div>}
                            {(company || title) && (
                              <div className="contact-job">
                                {title && <span>{title}</span>}
                                {company && title && <span> • </span>}
                                {company && <span>{company}</span>}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Contact Detail */}
        <div className="contacts-detail-panel">
          {selectedContact ? (
            <div className="contact-detail">
              {/* Contact Header */}
              <div className="detail-header">
                <div className="detail-avatar">
                  <div className="detail-initials">
                    {getInitials(selectedContact.name || 'Unknown')}
                  </div>
                </div>
                <div className="detail-name">
                  {selectedContact.name || 'Unknown'}
                </div>
                {(selectedContact.title || selectedContact.company) && (
                  <div className="detail-job">
                    {selectedContact.title && (
                      <div className="detail-title">{selectedContact.title}</div>
                    )}
                    {selectedContact.company && (
                      <div className="detail-company">{selectedContact.company}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="detail-content">
                {/* Email */}
                {selectedContact.email && (
                  <div className="detail-section">
                    <h3>Email</h3>
                    <div className="detail-item">
                      <Mail size={16} />
                      <a href={`mailto:${selectedContact.email}`} className="detail-link">
                        {selectedContact.email}
                      </a>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {selectedContact.phone && (
                  <div className="detail-section">
                    <h3>Phone</h3>
                    <div className="detail-item">
                      <Phone size={16} />
                      <a href={`tel:${selectedContact.phone}`} className="detail-link">
                        {selectedContact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedContact.notes && (
                  <div className="detail-section">
                    <h3>Notes</h3>
                    <p className="contact-notes">{selectedContact.notes}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="detail-actions">
                  {selectedContact.email && (
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="btn-action"
                    >
                      <Mail size={16} />
                      Email
                    </a>
                  )}
                  {selectedContact.phone && (
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="btn-action"
                    >
                      <Phone size={16} />
                      Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="detail-empty">
              <Users size={64} />
              <h2>No Contact Selected</h2>
              <p>Select a contact from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
