import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import { ENERGY_TYPES, getEnergyTypesList, TASK_STATUS, getTaskStatusList } from '../../constants/energyTypes';

export default function TaskModal({ task, projects, selectedProject, onClose, onSave }) {
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    energy_type: 'medium',
    status: 'pending',
    due_date: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        project_id: task.project_id || '',
        title: task.title || '',
        description: task.description || '',
        energy_type: task.energy_type || 'medium',
        status: task.status || 'pending',
        due_date: task.due_date || ''
      });
    } else if (selectedProject) {
      setFormData(prev => ({ ...prev, project_id: selectedProject.id }));
    }
  }, [task, selectedProject]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!formData.project_id) {
      setError('Please select a project');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={task ? 'Edit Task' : 'Create New Task'}
    >
      <form onSubmit={handleSubmit} className="task-modal-form">
        {error && (
          <div className="modal-error">{error}</div>
        )}

        {/* Project Selection */}
        <div className="form-field">
          <label className="form-label">Project</label>
          <select
            className="form-select"
            value={formData.project_id}
            onChange={(e) => handleChange('project_id', e.target.value)}
            required
          >
            <option value="">Select a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <Input
          label="Task Title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="What needs to be done?"
          required
          autoFocus
        />

        {/* Description */}
        <div className="form-field">
          <label className="form-label">Description (Optional)</label>
          <textarea
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Additional details..."
            rows={3}
          />
        </div>

        {/* Energy Type */}
        <div className="form-field">
          <label className="form-label">Energy Type</label>
          <div className="energy-type-selector">
            {getEnergyTypesList().map(energy => {
              const isSelected = formData.energy_type === energy.id;
              return (
                <button
                  key={energy.id}
                  type="button"
                  className={`energy-type-option ${isSelected ? 'active' : ''}`}
                  onClick={() => handleChange('energy_type', energy.id)}
                  style={{
                    '--energy-color': energy.color
                  }}
                >
                  <Badge
                    variant={isSelected ? 'filled' : 'outlined'}
                    style={{
                      backgroundColor: isSelected ? energy.color : 'transparent',
                      borderColor: energy.color,
                      color: isSelected ? '#ffffff' : energy.color
                    }}
                  >
                    {energy.label}
                  </Badge>
                </button>
              );
            })}
          </div>
          <p className="form-hint">
            {ENERGY_TYPES[formData.energy_type]?.description}
          </p>
        </div>

        {/* Status */}
        <div className="form-field">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            {getTaskStatusList().map(status => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <Input
          label="Due Date (Optional)"
          type="date"
          value={formData.due_date}
          onChange={(e) => handleChange('due_date', e.target.value)}
        />

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
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
