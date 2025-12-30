import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Loader,
  RefreshCw
} from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Modal from '../shared/Modal';
import './LabelManager.css';

// Gmail's predefined label colors
const GMAIL_LABEL_COLORS = [
  { bg: '#000000', text: '#ffffff', name: 'Black' },
  { bg: '#434343', text: '#ffffff', name: 'Dark Gray 3' },
  { bg: '#666666', text: '#ffffff', name: 'Dark Gray 2' },
  { bg: '#999999', text: '#ffffff', name: 'Dark Gray 1' },
  { bg: '#cccccc', text: '#000000', name: 'Gray' },
  { bg: '#efefef', text: '#000000', name: 'Light Gray 2' },
  { bg: '#f3f3f3', text: '#000000', name: 'Light Gray 1' },
  { bg: '#ffffff', text: '#000000', name: 'White' },
  { bg: '#fb4c2f', text: '#ffffff', name: 'Red Vivid' },
  { bg: '#ffad47', text: '#000000', name: 'Orange Vivid' },
  { bg: '#fad165', text: '#000000', name: 'Yellow Vivid' },
  { bg: '#16a766', text: '#ffffff', name: 'Green Vivid' },
  { bg: '#43d692', text: '#000000', name: 'Teal Vivid' },
  { bg: '#4a86e8', text: '#ffffff', name: 'Blue Vivid' },
  { bg: '#a479e2', text: '#ffffff', name: 'Purple Vivid' },
  { bg: '#f691b3', text: '#000000', name: 'Pink Vivid' },
  { bg: '#f6c5be', text: '#000000', name: 'Red Light' },
  { bg: '#ffe6c7', text: '#000000', name: 'Orange Light' },
  { bg: '#fef1d1', text: '#000000', name: 'Yellow Light' },
  { bg: '#b9e4d0', text: '#000000', name: 'Green Light' },
  { bg: '#c6f3de', text: '#000000', name: 'Teal Light' },
  { bg: '#c9daf8', text: '#000000', name: 'Blue Light' },
  { bg: '#e4d7f5', text: '#000000', name: 'Purple Light' },
  { bg: '#fcdee8', text: '#000000', name: 'Pink Light' },
  { bg: '#ac2b16', text: '#ffffff', name: 'Red Dark' },
  { bg: '#cf8933', text: '#ffffff', name: 'Orange Dark' },
  { bg: '#d5ae49', text: '#ffffff', name: 'Yellow Dark' },
  { bg: '#0b804b', text: '#ffffff', name: 'Green Dark' },
  { bg: '#149e60', text: '#ffffff', name: 'Teal Dark' },
  { bg: '#3c78d8', text: '#ffffff', name: 'Blue Dark' },
  { bg: '#8e63ce', text: '#ffffff', name: 'Purple Dark' },
  { bg: '#e07798', text: '#ffffff', name: 'Pink Dark' },
];

// System label IDs that cannot be modified
const SYSTEM_LABELS = [
  'INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED',
  'IMPORTANT', 'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'
];

export default function LabelManager({
  isOpen,
  onClose,
  accountId,
  onLabelChange
}) {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create label state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(GMAIL_LABEL_COLORS[12]); // Default green
  const [creating, setCreating] = useState(false);

  // Edit label state
  const [editingLabel, setEditingLabel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deletingLabel, setDeletingLabel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && accountId) {
      loadLabels();
    }
  }, [isOpen, accountId]);

  const loadLabels = async () => {
    if (!accountId) return;

    setLoading(true);
    setError(null);

    try {
      if (window.electronAPI?.googleGetLabels) {
        const result = await window.electronAPI.googleGetLabels(accountId);
        if (result.success) {
          setLabels(result.data || []);
        } else {
          setError(result.error || 'Failed to load labels');
        }
      }
    } catch (err) {
      console.error('Failed to load labels:', err);
      setError(err.message || 'Failed to load labels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      alert('Please enter a label name');
      return;
    }

    setCreating(true);
    try {
      if (window.electronAPI?.googleCreateLabel) {
        const result = await window.electronAPI.googleCreateLabel(accountId, newLabelName.trim(), {
          color: {
            backgroundColor: newLabelColor.bg,
            textColor: newLabelColor.text
          }
        });

        if (result.success) {
          setNewLabelName('');
          setNewLabelColor(GMAIL_LABEL_COLORS[12]);
          setShowCreateForm(false);
          await loadLabels();
          onLabelChange?.();
        } else {
          alert('Failed to create label: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (err) {
      console.error('Failed to create label:', err);
      alert('Failed to create label: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (label) => {
    setEditingLabel(label);
    setEditName(label.name);
    setEditColor(label.color ? {
      bg: label.color.backgroundColor,
      text: label.color.textColor
    } : GMAIL_LABEL_COLORS[0]);
  };

  const handleCancelEdit = () => {
    setEditingLabel(null);
    setEditName('');
    setEditColor(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      alert('Please enter a label name');
      return;
    }

    setSaving(true);
    try {
      if (window.electronAPI?.googleUpdateLabel) {
        const updates = {
          name: editName.trim()
        };

        if (editColor) {
          updates.color = {
            backgroundColor: editColor.bg,
            textColor: editColor.text
          };
        }

        const result = await window.electronAPI.googleUpdateLabel(accountId, editingLabel.id, updates);

        if (result.success) {
          handleCancelEdit();
          await loadLabels();
          onLabelChange?.();
        } else {
          alert('Failed to update label: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (err) {
      console.error('Failed to update label:', err);
      alert('Failed to update label: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLabel = async () => {
    if (!deletingLabel) return;

    setDeleting(true);
    try {
      if (window.electronAPI?.googleDeleteLabel) {
        const result = await window.electronAPI.googleDeleteLabel(accountId, deletingLabel.id);

        if (result.success) {
          setDeletingLabel(null);
          await loadLabels();
          onLabelChange?.();
        } else {
          alert('Failed to delete label: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (err) {
      console.error('Failed to delete label:', err);
      alert('Failed to delete label: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const isSystemLabel = (label) => {
    return label.type === 'system' || SYSTEM_LABELS.includes(label.id);
  };

  const userLabels = labels.filter(l => l.type === 'user');
  const systemLabels = labels.filter(l => l.type === 'system');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Labels"
      size="medium"
    >
      <div className="label-manager">
        {/* Header Actions */}
        <div className="label-manager-header">
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => setShowCreateForm(true)}
            disabled={showCreateForm}
          >
            Create Label
          </Button>
          <Button
            variant="ghost"
            icon={<RefreshCw size={18} />}
            onClick={loadLabels}
            loading={loading}
            disabled={loading}
            title="Refresh labels"
          />
        </div>

        {error && (
          <div className="label-manager-error">
            {error}
          </div>
        )}

        {/* Create Label Form */}
        {showCreateForm && (
          <div className="label-create-form">
            <div className="label-form-row">
              <Input
                placeholder="Label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                fullWidth
                autoFocus
              />
            </div>
            <div className="label-form-row">
              <label className="label-form-label">Color:</label>
              <div className="label-color-picker">
                {GMAIL_LABEL_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    className={`label-color-option ${newLabelColor.bg === color.bg ? 'selected' : ''}`}
                    style={{ backgroundColor: color.bg }}
                    onClick={() => setNewLabelColor(color)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="label-form-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewLabelName('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Check size={18} />}
                onClick={handleCreateLabel}
                loading={creating}
                disabled={creating || !newLabelName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        )}

        {loading && !labels.length ? (
          <div className="label-manager-loading">
            <Loader size={24} className="loading-spinner" />
            <span>Loading labels...</span>
          </div>
        ) : (
          <>
            {/* User Labels */}
            <div className="label-section">
              <h3 className="label-section-title">Your Labels ({userLabels.length})</h3>
              <div className="label-list">
                {userLabels.length === 0 ? (
                  <div className="label-empty">No custom labels yet. Create one above.</div>
                ) : (
                  userLabels.map(label => (
                    <div key={label.id} className="label-item">
                      {editingLabel?.id === label.id ? (
                        // Edit mode
                        <div className="label-edit-form">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            fullWidth
                            autoFocus
                          />
                          <div className="label-color-picker-small">
                            {GMAIL_LABEL_COLORS.slice(0, 16).map((color, idx) => (
                              <button
                                key={idx}
                                className={`label-color-option-small ${editColor?.bg === color.bg ? 'selected' : ''}`}
                                style={{ backgroundColor: color.bg }}
                                onClick={() => setEditColor(color)}
                                title={color.name}
                              />
                            ))}
                          </div>
                          <div className="label-edit-actions">
                            <Button
                              variant="ghost"
                              size="small"
                              icon={<X size={14} />}
                              onClick={handleCancelEdit}
                              disabled={saving}
                            />
                            <Button
                              variant="primary"
                              size="small"
                              icon={<Check size={14} />}
                              onClick={handleSaveEdit}
                              loading={saving}
                              disabled={saving}
                            />
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="label-item-info">
                            <span
                              className="label-color-indicator"
                              style={{
                                backgroundColor: label.color?.backgroundColor || '#999999'
                              }}
                            />
                            <span className="label-item-name">{label.name}</span>
                            {label.messagesTotal > 0 && (
                              <span className="label-item-count">{label.messagesTotal}</span>
                            )}
                          </div>
                          <div className="label-item-actions">
                            <button
                              className="label-action-btn"
                              onClick={() => handleStartEdit(label)}
                              title="Edit label"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="label-action-btn delete"
                              onClick={() => setDeletingLabel(label)}
                              title="Delete label"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Labels */}
            <div className="label-section">
              <h3 className="label-section-title">System Labels ({systemLabels.length})</h3>
              <div className="label-list system">
                {systemLabels.map(label => (
                  <div key={label.id} className="label-item system">
                    <div className="label-item-info">
                      <Tag size={14} className="label-system-icon" />
                      <span className="label-item-name">{label.name || label.id}</span>
                      {label.messagesTotal > 0 && (
                        <span className="label-item-count">{label.messagesTotal}</span>
                      )}
                    </div>
                    <span className="label-system-badge">System</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingLabel}
        onClose={() => setDeletingLabel(null)}
        title="Delete Label"
        size="small"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeletingLabel(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteLabel}
              loading={deleting}
              disabled={deleting}
              style={{ background: 'var(--status-error)' }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete the label "{deletingLabel?.name}"?</p>
        <p className="delete-warning">This action cannot be undone. Emails with this label will not be deleted, but the label will be removed from them.</p>
      </Modal>
    </Modal>
  );
}
