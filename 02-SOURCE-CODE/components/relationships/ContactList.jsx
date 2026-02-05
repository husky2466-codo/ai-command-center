import React from 'react';
import ContactListItem from './ContactListItem.jsx';

/**
 * ContactList Component
 *
 * Displays a scrollable list of contacts with freshness indicators.
 */
export default function ContactList({ contacts, selectedContact, onSelectContact }) {
  if (contacts.length === 0) {
    return (
      <div className="contact-list-empty">
        <p>No contacts found</p>
      </div>
    );
  }

  return (
    <div className="contact-list">
      {contacts.map(contact => (
        <ContactListItem
          key={contact.id}
          contact={contact}
          isSelected={selectedContact?.id === contact.id}
          onClick={() => onSelectContact(contact)}
        />
      ))}
    </div>
  );
}
