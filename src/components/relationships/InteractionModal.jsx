import React, { useState } from 'react';
import Modal from '../shared/Modal.jsx';
import Button from '../shared/Button.jsx';
import Input from '../shared/Input.jsx';

/**
 * InteractionModal Component
 *
 * Modal for logging interactions with a contact.
 */
export default function InteractionModal({ contact, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    type: 'email',
    summary: '',
    occurred_at: new Date().toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave(formData);

    // Reset form
    setFormData({
      type: 'email',
      summary: '',
      occurred_at: new Date().toISOString().slice(0, 16)
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Interaction - ${contact?.name}`}
      size="medium"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Log Interaction</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="interaction-form">
        <div className="form-field">
          <label>Type *</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
            <option value="message">Message</option>
            <option value="in_person">In Person</option>
          </select>
        </div>

        <div className="form-field">
          <label>Date & Time *</label>
          <input
            type="datetime-local"
            name="occurred_at"
            value={formData.occurred_at}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label>Summary *</label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            rows={5}
            placeholder="What did you discuss? What were the key points?"
            className={errors.summary ? 'error' : ''}
          />
          {errors.summary && <span className="error-message">{errors.summary}</span>}
        </div>
      </form>
    </Modal>
  );
}
