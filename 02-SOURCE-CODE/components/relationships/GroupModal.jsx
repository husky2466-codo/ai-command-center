import React, { useState } from 'react';
import Modal from '../shared/Modal.jsx';
import Button from '../shared/Button.jsx';
import Input from '../shared/Input.jsx';
import { Plus, Trash2, Edit } from 'lucide-react';

/**
 * GroupModal Component
 *
 * Modal for managing contact groups (create, edit, delete).
 */
export default function GroupModal({ groups, isOpen, onClose, onSave, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  const handleAddNew = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '' });
    setShowForm(true);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || ''
    });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave(editingGroup ? { id: editingGroup.id, ...formData } : formData);
    setShowForm(false);
    setFormData({ name: '', description: '' });
    setEditingGroup(null);
  };

  const handleDelete = (groupId) => {
    if (confirm('Are you sure you want to delete this group? Contacts will not be deleted.')) {
      onDelete(groupId);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Groups"
      size="medium"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="group-manager">
        {!showForm ? (
          <>
            <div className="group-manager-header">
              <Button variant="primary" onClick={handleAddNew}>
                <Plus size={16} />
                Add New Group
              </Button>
            </div>

            <div className="group-list-manager">
              {groups.length === 0 ? (
                <div className="empty-groups">
                  <p>No groups yet. Create your first group to organize contacts.</p>
                </div>
              ) : (
                groups.map(group => (
                  <div key={group.id} className="group-manager-item">
                    <div className="group-manager-info">
                      <h4>{group.name}</h4>
                      {group.description && <p>{group.description}</p>}
                      <span className="group-count">{group.member_count || 0} contacts</span>
                    </div>
                    <div className="group-manager-actions">
                      <button onClick={() => handleEdit(group)} className="btn-icon" title="Edit group">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(group.id)} className="btn-icon btn-danger" title="Delete group">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="group-form">
            <h3>{editingGroup ? 'Edit Group' : 'New Group'}</h3>
            <Input
              label="Group Name *"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <div className="form-field">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Optional description for this group..."
              />
            </div>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" type="submit">
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
