import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal.jsx';
import Input from '../shared/Input.jsx';
import Button from '../shared/Button.jsx';

/**
 * ContactModal Component
 *
 * Modal for creating or editing contacts.
 */
export default function ContactModal({ contact, groups, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    location: '',
    priority: 'medium',
    context: '',
    professional_background: '',
    notes: '',
    social_links: {
      linkedin: '',
      twitter: '',
      github: '',
      website: ''
    },
    groupIds: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        company: contact.company || '',
        title: contact.title || '',
        location: contact.location || '',
        priority: contact.priority || 'medium',
        context: contact.context || '',
        professional_background: contact.professional_background || '',
        notes: contact.notes || '',
        social_links: contact.social_links || {},
        groupIds: [] // Will be loaded from groups membership
      });
    } else {
      // Reset for new contact
      setFormData({
        name: '',
        email: '',
        company: '',
        title: '',
        location: '',
        priority: 'medium',
        context: '',
        professional_background: '',
        notes: '',
        social_links: {
          linkedin: '',
          twitter: '',
          github: '',
          website: ''
        },
        groupIds: []
      });
    }
    setErrors({});
  }, [contact, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialLinkChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  };

  const handleGroupToggle = (groupId) => {
    setFormData(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter(id => id !== groupId)
        : [...prev.groupIds, groupId]
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? 'Edit Contact' : 'Add New Contact'}
      size="large"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {contact ? 'Save Changes' : 'Create Contact'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="contact-form">
        {/* Basic Info */}
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-grid">
            <Input
              label="Name *"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />
            <Input
              label="Company"
              name="company"
              value={formData.company}
              onChange={handleChange}
            />
            <Input
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
            />
            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
            <div className="form-field">
              <label>Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="form-section">
          <h3>Social Links</h3>
          <div className="form-grid">
            <Input
              label="LinkedIn URL"
              name="linkedin"
              value={formData.social_links.linkedin}
              onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
            <Input
              label="Twitter URL"
              name="twitter"
              value={formData.social_links.twitter}
              onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
              placeholder="https://twitter.com/..."
            />
            <Input
              label="GitHub URL"
              name="github"
              value={formData.social_links.github}
              onChange={(e) => handleSocialLinkChange('github', e.target.value)}
              placeholder="https://github.com/..."
            />
            <Input
              label="Website URL"
              name="website"
              value={formData.social_links.website}
              onChange={(e) => handleSocialLinkChange('website', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Context & Notes */}
        <div className="form-section">
          <h3>Context & Notes</h3>
          <div className="form-field">
            <label>Relationship Context</label>
            <textarea
              name="context"
              value={formData.context}
              onChange={handleChange}
              rows={3}
              placeholder="How do you know this person? What's the nature of your relationship?"
            />
          </div>
          <div className="form-field">
            <label>Professional Background</label>
            <textarea
              name="professional_background"
              value={formData.professional_background}
              onChange={handleChange}
              rows={3}
              placeholder="Their background, expertise, career highlights..."
            />
          </div>
          <div className="form-field">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        {/* Groups */}
        {groups && groups.length > 0 && (
          <div className="form-section">
            <h3>Groups</h3>
            <div className="group-checkboxes">
              {groups.map(group => (
                <label key={group.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.groupIds.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                  />
                  <span>{group.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
