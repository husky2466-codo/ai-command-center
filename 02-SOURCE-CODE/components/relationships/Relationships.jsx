import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter } from 'lucide-react';
import relationshipService from '../../services/relationshipService.js';
import { calculateFreshness } from '../../utils/freshness.js';
import ContactList from './ContactList.jsx';
import ContactDetail from './ContactDetail.jsx';
import ContactModal from './ContactModal.jsx';
import GroupModal from './GroupModal.jsx';
import InteractionModal from './InteractionModal.jsx';
import './Relationships.css';

/**
 * Relationships (CRM) - Main Component
 *
 * Personal CRM with Andy's Freshness System for maintaining relationships.
 * Features:
 * - Contact management with groups
 * - Interaction logging
 * - Freshness indicators (hot/warm/cool/cold)
 * - Search and filter
 * - Master-detail layout
 */
export default function Relationships() {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, last_contact, priority
  const [freshnessFilter, setFreshnessFilter] = useState(null); // hot, warm, cool, cold, or null for all
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  // Load contacts and groups on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contactsData, groupsData] = await Promise.all([
        relationshipService.getAllContacts(),
        relationshipService.getAllGroups()
      ]);
      setContacts(contactsData);
      setGroups(groupsData);
    } catch (err) {
      console.error('Failed to load relationships data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort contacts
  const filteredContacts = React.useMemo(() => {
    let result = [...contacts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.title?.toLowerCase().includes(query)
      );
    }

    // Group filter
    if (selectedGroupId) {
      result = result.filter(contact =>
        contact.groups && contact.groups.length > 0 &&
        contact.group_names?.split(',').includes(groups.find(g => g.id === selectedGroupId)?.name)
      );
    }

    // Freshness filter
    if (freshnessFilter) {
      result = result.filter(contact => {
        const freshness = calculateFreshness(contact.days_since_contact);
        return freshness.level === freshnessFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'last_contact') {
        const aDays = a.days_since_contact || 999999;
        const bDays = b.days_since_contact || 999999;
        return aDays - bDays; // Most recent first
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
      }
      return 0;
    });

    return result;
  }, [contacts, searchQuery, selectedGroupId, freshnessFilter, sortBy, groups]);

  // Handlers
  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setShowContactModal(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setShowContactModal(true);
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await relationshipService.delete(contactId);
      await loadData();
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
      }
    } catch (err) {
      console.error('Failed to delete contact:', err);
      alert('Failed to delete contact: ' + err.message);
    }
  };

  const handleSaveContact = async (contactData) => {
    try {
      if (editingContact) {
        await relationshipService.updateContact(editingContact.id, contactData);
      } else {
        await relationshipService.createContact(contactData);
      }
      await loadData();
      setShowContactModal(false);
      setEditingContact(null);
    } catch (err) {
      console.error('Failed to save contact:', err);
      alert('Failed to save contact: ' + err.message);
    }
  };

  const handleLogInteraction = async (interactionData) => {
    try {
      await relationshipService.logInteraction(
        selectedContact.id,
        interactionData.type,
        interactionData.summary,
        interactionData.occurred_at ? new Date(interactionData.occurred_at) : new Date()
      );
      await loadData();
      setShowInteractionModal(false);

      // Refresh selected contact
      const updatedContact = await relationshipService.getById(selectedContact.id);
      setSelectedContact(updatedContact);
    } catch (err) {
      console.error('Failed to log interaction:', err);
      alert('Failed to log interaction: ' + err.message);
    }
  };

  const handleManageGroups = () => {
    setEditingGroup(null);
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (groupData) => {
    try {
      if (editingGroup) {
        await relationshipService.updateGroup(editingGroup.id, groupData);
      } else {
        await relationshipService.createGroup(groupData.name, groupData.description);
      }
      await loadData();
      setShowGroupModal(false);
      setEditingGroup(null);
    } catch (err) {
      console.error('Failed to save group:', err);
      alert('Failed to save group: ' + err.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      await relationshipService.deleteGroup(groupId);
      await loadData();
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert('Failed to delete group: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="relationships-container">
        <div className="loading-state">
          <Users size={48} />
          <p>Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relationships-container">
        <div className="error-state">
          <Users size={48} />
          <p className="error-message">{error}</p>
          <button onClick={loadData} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relationships-container">
      {/* Header */}
      <header className="relationships-header">
        <div className="header-title">
          <Users size={24} />
          <h1>Relationships</h1>
        </div>
        <div className="header-stats">
          <span className="stat">
            <strong>{contacts.length}</strong> contacts
          </span>
          <span className="stat">
            <strong>{groups.length}</strong> groups
          </span>
        </div>
        <button onClick={handleAddContact} className="btn-add-contact">
          <Plus size={20} />
          Add Contact
        </button>
      </header>

      {/* Main Content - Master/Detail */}
      <div className="relationships-main">
        {/* Left Panel - Contact List */}
        <div className="relationships-sidebar">
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

          {/* Filters */}
          <div className="filters-bar">
            <div className="filter-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Name</option>
                <option value="last_contact">Last Contact</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Group Filter */}
          <div className="group-filter">
            <div className="group-filter-header">
              <h3>Groups</h3>
              <button onClick={handleManageGroups} className="btn-icon" title="Manage groups">
                <Filter size={16} />
              </button>
            </div>
            <div className="group-list">
              <button
                className={`group-item ${!selectedGroupId ? 'active' : ''}`}
                onClick={() => setSelectedGroupId(null)}
              >
                All Contacts ({contacts.length})
              </button>
              {groups.map(group => (
                <button
                  key={group.id}
                  className={`group-item ${selectedGroupId === group.id ? 'active' : ''}`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  {group.name} ({group.member_count || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Freshness Filter */}
          <div className="freshness-filter">
            <h3>Freshness</h3>
            <div className="freshness-buttons">
              <button
                className={`freshness-btn ${!freshnessFilter ? 'active' : ''}`}
                onClick={() => setFreshnessFilter(null)}
              >
                All
              </button>
              <button
                className={`freshness-btn freshness-hot ${freshnessFilter === 'hot' ? 'active' : ''}`}
                onClick={() => setFreshnessFilter('hot')}
              >
                🔥 Hot
              </button>
              <button
                className={`freshness-btn freshness-warm ${freshnessFilter === 'warm' ? 'active' : ''}`}
                onClick={() => setFreshnessFilter('warm')}
              >
                ☀️ Warm
              </button>
              <button
                className={`freshness-btn freshness-cool ${freshnessFilter === 'cool' ? 'active' : ''}`}
                onClick={() => setFreshnessFilter('cool')}
              >
                ☁️ Cool
              </button>
              <button
                className={`freshness-btn freshness-cold ${freshnessFilter === 'cold' ? 'active' : ''}`}
                onClick={() => setFreshnessFilter('cold')}
              >
                ❄️ Cold
              </button>
            </div>
          </div>

          {/* Contact List */}
          <ContactList
            contacts={filteredContacts}
            selectedContact={selectedContact}
            onSelectContact={handleSelectContact}
          />
        </div>

        {/* Right Panel - Contact Detail */}
        <div className="relationships-detail">
          {selectedContact ? (
            <ContactDetail
              contact={selectedContact}
              groups={groups}
              onEdit={handleEditContact}
              onDelete={handleDeleteContact}
              onLogInteraction={() => setShowInteractionModal(true)}
              onRefresh={loadData}
            />
          ) : (
            <div className="empty-detail">
              <Users size={64} />
              <h2>No Contact Selected</h2>
              <p>Select a contact from the list to view details</p>
              <button onClick={handleAddContact} className="btn-primary">
                <Plus size={20} />
                Add New Contact
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showContactModal && (
        <ContactModal
          contact={editingContact}
          groups={groups}
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setEditingContact(null);
          }}
          onSave={handleSaveContact}
        />
      )}

      {showGroupModal && (
        <GroupModal
          groups={groups}
          isOpen={showGroupModal}
          onClose={() => {
            setShowGroupModal(false);
            setEditingGroup(null);
          }}
          onSave={handleSaveGroup}
          onDelete={handleDeleteGroup}
        />
      )}

      {showInteractionModal && selectedContact && (
        <InteractionModal
          contact={selectedContact}
          isOpen={showInteractionModal}
          onClose={() => setShowInteractionModal(false)}
          onSave={handleLogInteraction}
        />
      )}
    </div>
  );
}
