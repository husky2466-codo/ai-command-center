import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';
import { PROJECT_STATUS, getProjectStatusList } from '../../constants/energyTypes';

export default function ProjectModal({ project, spaces, selectedSpace, onClose, onSave }) {
  const [formData, setFormData] = useState({
    space_id: '',
    name: '',
    description: '',
    status: 'on_deck',
    deadline: '',
    planning_notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        space_id: project.space_id || '',
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'on_deck',
        deadline: project.deadline || '',
        planning_notes: project.planning_notes || ''
      });
    } else if (selectedSpace) {
      setFormData(prev => ({ ...prev, space_id: selectedSpace.id }));
    }
  }, [project, selectedSpace]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!formData.space_id) {
      setError('Please select a space');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={project ? 'Edit Project' : 'Create New Project'}
    >
      <form onSubmit={handleSubmit} className="project-modal-form">
        {error && (
          <div className="modal-error">{error}</div>
        )}

        {/* Space Selection */}
        <div className="form-field">
          <label className="form-label">Space</label>
          <select
            className="form-select"
            value={formData.space_id}
            onChange={(e) => handleChange('space_id', e.target.value)}
            required
          >
            <option value="">Select a space...</option>
            {spaces.map(space => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <Input
          label="Project Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Launch new website"
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
            placeholder="What is this project about?"
            rows={3}
          />
        </div>

        {/* Status */}
        <div className="form-field">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            {getProjectStatusList().map(status => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
          <p className="form-hint">
            {PROJECT_STATUS[formData.status]?.description}
          </p>
        </div>

        {/* Deadline */}
        <Input
          label="Deadline (Optional)"
          type="date"
          value={formData.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
        />

        {/* Planning Notes */}
        <div className="form-field">
          <label className="form-label">Planning Notes</label>
          <textarea
            className="form-textarea"
            value={formData.planning_notes}
            onChange={(e) => handleChange('planning_notes', e.target.value)}
            placeholder="Research, ideas, resources..."
            rows={4}
          />
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
            {project ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
