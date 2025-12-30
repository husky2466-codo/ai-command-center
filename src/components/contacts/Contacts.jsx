import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Mail, Phone, RefreshCw, ChevronDown } from 'lucide-react';
import './Contacts.css';

/**
 * Contacts - Google Contacts Directory
 *
 * Features:
 * - Display contacts from connected Google accounts
 * - Alphabetical sidebar for quick navigation
 * - Search by name, email, company
 * - Contact detail panel
 * - Account selection and syncing
 */
export default function Contacts() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [accountsDropdownOpen, setAccountsDropdownOpen] = useState(false);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load contacts when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      loadContacts();
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.electronAPI?.googleListAccounts) {
        setError('Google API not available');
        setLoading(false);
        return;
      }

      const result = await window.electronAPI.googleListAccounts();
      const accountsList = result?.success ? (result.data || []) : [];
      setAccounts(accountsList);

      // Auto-select first account if available
      if (accountsList.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accountsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Failed to load accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setError(null);

      if (!window.electronAPI?.googleGetContacts) {
        setError('Google API not available');
        setLoading(false);
        return;
      }

      const result = await window.electronAPI.googleGetContacts(selectedAccountId, {
        pageSize: 1000,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,photos'
      });

      console.log('[Contacts] googleGetContacts response:', result);

      // Handle both array and object response formats
      const contactsList = Array.isArray(result) ? result :
        (result?.success && Array.isArray(result.data)) ? result.data :
        (Array.isArray(result?.connections)) ? result.connections : [];

      console.log('[Contacts] Parsed contacts list:', contactsList);
      console.log('[Contacts] Total contacts:', contactsList.length);

      setContacts(contactsList);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError('Failed to load contacts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!selectedAccountId) return;

    try {
      setSyncing(true);
      setError(null);

      if (!window.electronAPI?.googleSyncContacts) {
        setError('Google API not available');
        return;
      }

      console.log('[Contacts] Starting sync for account:', selectedAccountId);
      const syncResult = await window.electronAPI.googleSyncContacts(selectedAccountId);
      console.log('[Contacts] Sync result:', syncResult);

      await loadContacts();
    } catch (err) {
      console.error('Failed to sync contacts:', err);
      setError('Failed to sync contacts: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleAccountChange = (accountId) => {
    setSelectedAccountId(accountId);
    setSelectedContact(null);
    setSearchQuery('');
    setAccountsDropdownOpen(false);
  };

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    // Ensure contacts is always an array
    const contactsArray = Array.isArray(contacts) ? contacts : [];
    if (!searchQuery) return contactsArray;

    const query = searchQuery.toLowerCase();
    return contactsArray.filter(contact => {
      const name = contact.names?.[0]?.displayName || '';
      const email = contact.emailAddresses?.[0]?.value || '';
      const company = contact.organizations?.[0]?.name || '';

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
      const name = contact.names?.[0]?.displayName || 'Unknown';
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
        const nameA = a.names?.[0]?.displayName || '';
        const nameB = b.names?.[0]?.displayName || '';
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

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  if (loading && accounts.length === 0) {
    return (
      <div className="contacts-container">
        <div className="loading-state">
          <Users size={48} />
          <p>Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="contacts-container">
        <div className="error-state">
          <Users size={48} />
          <p className="error-message">{error}</p>
          <button onClick={loadAccounts} className="btn-primary">Retry</button>
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

        {/* Account Selector */}
        <div className="account-selector">
          <button
            className="account-dropdown-btn"
            onClick={() => setAccountsDropdownOpen(!accountsDropdownOpen)}
          >
            <span className="account-email">
              {selectedAccount?.email || 'Select Account'}
            </span>
            <ChevronDown size={16} />
          </button>
          {accountsDropdownOpen && (
            <div className="account-dropdown-menu">
              {accounts.map(account => (
                <button
                  key={account.id}
                  className={`account-dropdown-item ${account.id === selectedAccountId ? 'active' : ''}`}
                  onClick={() => handleAccountChange(account.id)}
                >
                  <span className="account-email">{account.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSyncContacts}
          className="btn-sync"
          disabled={!selectedAccountId || syncing}
          title="Sync contacts"
        >
          <RefreshCw size={20} className={syncing ? 'spinning' : ''} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>

        {/* Stats */}
        <div className="header-stats">
          <span className="stat">
            <strong>{filteredContacts.length}</strong> contacts
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
                      const name = contact.names?.[0]?.displayName || 'Unknown';
                      const email = contact.emailAddresses?.[0]?.value || '';
                      const company = contact.organizations?.[0]?.name || '';
                      const title = contact.organizations?.[0]?.title || '';
                      const photo = contact.photos?.[0]?.url || null;
                      const isSelected = selectedContact?.resourceName === contact.resourceName;

                      return (
                        <button
                          key={contact.resourceName}
                          className={`contact-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedContact(contact)}
                        >
                          <div className="contact-avatar">
                            {photo ? (
                              <img src={photo} alt={name} />
                            ) : (
                              <div className="contact-initials">
                                {getInitials(name)}
                              </div>
                            )}
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
                  {selectedContact.photos?.[0]?.url ? (
                    <img src={selectedContact.photos[0].url} alt={selectedContact.names?.[0]?.displayName || 'Contact'} />
                  ) : (
                    <div className="detail-initials">
                      {getInitials(selectedContact.names?.[0]?.displayName || 'Unknown')}
                    </div>
                  )}
                </div>
                <div className="detail-name">
                  {selectedContact.names?.[0]?.displayName || 'Unknown'}
                </div>
                {selectedContact.organizations?.[0] && (
                  <div className="detail-job">
                    {selectedContact.organizations[0].title && (
                      <div className="detail-title">{selectedContact.organizations[0].title}</div>
                    )}
                    {selectedContact.organizations[0].name && (
                      <div className="detail-company">{selectedContact.organizations[0].name}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="detail-content">
                {/* Email Addresses */}
                {selectedContact.emailAddresses && selectedContact.emailAddresses.length > 0 && (
                  <div className="detail-section">
                    <h3>Email</h3>
                    {selectedContact.emailAddresses.map((email, idx) => (
                      <div key={idx} className="detail-item">
                        <Mail size={16} />
                        <a href={`mailto:${email.value}`} className="detail-link">
                          {email.value}
                        </a>
                        {email.type && <span className="detail-label">{email.type}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Phone Numbers */}
                {selectedContact.phoneNumbers && selectedContact.phoneNumbers.length > 0 && (
                  <div className="detail-section">
                    <h3>Phone</h3>
                    {selectedContact.phoneNumbers.map((phone, idx) => (
                      <div key={idx} className="detail-item">
                        <Phone size={16} />
                        <a href={`tel:${phone.value}`} className="detail-link">
                          {phone.value}
                        </a>
                        {phone.type && <span className="detail-label">{phone.type}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="detail-actions">
                  {selectedContact.emailAddresses?.[0] && (
                    <a
                      href={`mailto:${selectedContact.emailAddresses[0].value}`}
                      className="btn-action"
                    >
                      <Mail size={16} />
                      Email
                    </a>
                  )}
                  {selectedContact.phoneNumbers?.[0] && (
                    <a
                      href={`tel:${selectedContact.phoneNumbers[0].value}`}
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
