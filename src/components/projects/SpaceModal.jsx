import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';

const COLOR_PRESETS = [
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Orange
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#a855f7'  // Purple variant
];

export default function SpaceModal({ space, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8b5cf6',
    icon: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (space) {
      setFormData({
        name: space.name || '',
        description: space.description || '',
        color: space.color || '#8b5cf6',
        icon: space.icon || ''
      });
    }
  }, [space]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Space name is required');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save space');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={space ? 'Edit Space' : 'Create New Space'}
    >
      <form onSubmit={handleSubmit} className="space-modal-form">
        {error && (
          <div className="modal-error">{error}</div>
        )}

        {/* Name */}
        <Input
          label="Space Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Work, Health, Personal Projects"
          required
          autoFocus
        />

        {/* Description */}
        <div className="form-field">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What does this life area encompass?"
            rows={3}
          />
        </div>

        {/* Color Picker */}
        <div className="form-field">
          <label className="form-label">Color</label>
          <div className="color-picker">
            {COLOR_PRESETS.map(color => (
              <button
                key={color}
                type="button"
                className={`color-swatch ${formData.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleChange('color', color)}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
          >
            {space ? 'Save Changes' : 'Create Space'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
