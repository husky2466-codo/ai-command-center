import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Star,
  Search,
  X,
  Save,
  FolderOpen,
  Tag,
  ChevronDown,
  ChevronRight,
  Loader
} from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Modal from '../shared/Modal';
import './TemplateManager.css';

/**
 * Template variable placeholders that can be used in templates
 */
const TEMPLATE_VARIABLES = [
  { key: '{{recipient_name}}', description: 'Recipient name (from To address)' },
  { key: '{{date}}', description: 'Current date' },
  { key: '{{my_name}}', description: 'Your name (sender)' },
  { key: '{{today}}', description: 'Today\'s date formatted' },
  { key: '{{time}}', description: 'Current time' }
];

/**
 * Default template categories
 */
const DEFAULT_CATEGORIES = [
  'Sales',
  'Support',
  'Personal',
  'Follow-up',
  'Introduction',
  'Thank You',
  'Announcement',
  'Other'
];

/**
 * TemplateManager - Manage email templates (create, edit, delete, organize)
 */
export default function TemplateManager({
  isOpen,
  onClose,
  accountId,
  onSelectTemplate // callback when user wants to use a template
}) {
  // Template list state
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Edit/Create modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: '',
    is_favorite: false
  });
  const [saving, setSaving] = useState(false);

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Load templates and categories
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadCategories();
    }
  }, [isOpen, accountId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      if (window.electronAPI?.emailGetTemplates) {
        const result = await window.electronAPI.emailGetTemplates(accountId);
        if (result.success) {
          setTemplates(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      if (window.electronAPI?.emailGetTemplateCategories) {
        const result = await window.electronAPI.emailGetTemplateCategories(accountId);
        if (result.success) {
          // Merge with default categories
          const existingCategories = result.data || [];
          const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCategories])];
          setCategories(allCategories.sort());
        }
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  // Filter templates by search and category
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          template.name?.toLowerCase().includes(query) ||
          template.subject?.toLowerCase().includes(query) ||
          template.body?.toLowerCase().includes(query) ||
          template.category?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'favorites') {
          return template.is_favorite;
        }
        if (selectedCategory === 'uncategorized') {
          return !template.category;
        }
        return template.category === selectedCategory;
      }

      return true;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Group templates by category for display
  const groupedTemplates = useMemo(() => {
    const groups = {};

    // Group favorites first
    const favorites = filteredTemplates.filter(t => t.is_favorite);
    if (favorites.length > 0) {
      groups['Favorites'] = favorites;
    }

    // Group by category
    filteredTemplates.forEach(template => {
      if (!template.is_favorite || selectedCategory === 'all') {
        const category = template.category || 'Uncategorized';
        if (!groups[category]) {
          groups[category] = [];
        }
        // Avoid duplicates if already in favorites
        if (!template.is_favorite || selectedCategory !== 'all') {
          groups[category].push(template);
        }
      }
    });

    return groups;
  }, [filteredTemplates, selectedCategory]);

  // Handlers
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject: '',
      body: '',
      category: '',
      is_favorite: false
    });
    setShowEditModal(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || '',
      subject: template.subject || '',
      body: template.body || '',
      category: template.category || '',
      is_favorite: Boolean(template.is_favorite)
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Template name is required');
      return;
    }

    try {
      setSaving(true);

      const templateData = {
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        body: formData.body,
        category: formData.category || null,
        is_favorite: formData.is_favorite,
        account_id: accountId
      };

      if (editingTemplate) {
        // Update existing
        if (window.electronAPI?.emailUpdateTemplate) {
          await window.electronAPI.emailUpdateTemplate(editingTemplate.id, templateData);
        }
      } else {
        // Create new
        if (window.electronAPI?.emailCreateTemplate) {
          await window.electronAPI.emailCreateTemplate(templateData);
        }
      }

      setShowEditModal(false);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      if (window.electronAPI?.emailDeleteTemplate) {
        await window.electronAPI.emailDeleteTemplate(template.id);
        await loadTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template: ' + error.message);
    }
  };

  const handleToggleFavorite = async (template) => {
    try {
      if (window.electronAPI?.emailToggleTemplateFavorite) {
        await window.electronAPI.emailToggleTemplateFavorite(template.id);
        await loadTemplates();
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleUseTemplate = async (template) => {
    try {
      // Increment usage count
      if (window.electronAPI?.emailIncrementTemplateUsage) {
        await window.electronAPI.emailIncrementTemplateUsage(template.id);
      }

      // Call the callback to insert the template
      if (onSelectTemplate) {
        onSelectTemplate(template);
      }

      onClose();
    } catch (error) {
      console.error('Failed to use template:', error);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + variable
    }));
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Email Templates"
      size="xlarge"
      className="template-manager-modal"
    >
      <div className="template-manager">
        {/* Toolbar */}
        <div className="template-toolbar">
          <div className="template-toolbar-left">
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={handleCreateNew}
            >
              New Template
            </Button>
          </div>
          <div className="template-toolbar-right">
            <div className="template-search">
              <Input
                type="search"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <select
              className="template-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="favorites">Favorites</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Template List */}
        <div className="template-list">
          {loading ? (
            <div className="template-loading">
              <Loader size={32} className="loading-spinner" />
              <p>Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="template-empty">
              <FileText size={48} className="empty-icon" />
              <h3>No Templates Found</h3>
              <p>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first email template to save time'}
              </p>
              <Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={handleCreateNew}
              >
                Create Template
              </Button>
            </div>
          ) : (
            <div className="template-groups">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category} className="template-group">
                  <button
                    className="template-group-header"
                    onClick={() => toggleCategory(category)}
                  >
                    {expandedCategories[category] === false ? (
                      <ChevronRight size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    <FolderOpen size={16} className="folder-icon" />
                    <span className="category-name">{category}</span>
                    <span className="category-count">{categoryTemplates.length}</span>
                  </button>

                  {expandedCategories[category] !== false && (
                    <div className="template-group-items">
                      {categoryTemplates.map(template => (
                        <div
                          key={template.id}
                          className={`template-item ${previewTemplate?.id === template.id ? 'previewing' : ''}`}
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <div className="template-item-main">
                            <div className="template-item-header">
                              <span className="template-name">{template.name}</span>
                              <button
                                className={`template-favorite-btn ${template.is_favorite ? 'favorited' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(template);
                                }}
                                title={template.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <Star size={14} fill={template.is_favorite ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                            {template.subject && (
                              <div className="template-subject">{template.subject}</div>
                            )}
                            <div className="template-preview">
                              {template.body?.substring(0, 100)}
                              {template.body?.length > 100 ? '...' : ''}
                            </div>
                            <div className="template-meta">
                              {template.category && (
                                <span className="template-category-tag">
                                  <Tag size={12} />
                                  {template.category}
                                </span>
                              )}
                              {template.usage_count > 0 && (
                                <span className="template-usage">
                                  Used {template.usage_count}x
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="template-item-actions">
                            <Button
                              variant="primary"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUseTemplate(template);
                              }}
                            >
                              Use
                            </Button>
                            <Button
                              variant="ghost"
                              size="small"
                              icon={<Edit2 size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(template);
                              }}
                              title="Edit template"
                            />
                            <Button
                              variant="ghost"
                              size="small"
                              icon={<Trash2 size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(template);
                              }}
                              title="Delete template"
                              className="delete-btn"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {previewTemplate && (
          <div className="template-preview-panel">
            <div className="preview-header">
              <h3>Preview: {previewTemplate.name}</h3>
              <button
                className="preview-close"
                onClick={() => setPreviewTemplate(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="preview-content">
              {previewTemplate.subject && (
                <div className="preview-subject">
                  <strong>Subject:</strong> {previewTemplate.subject}
                </div>
              )}
              <div className="preview-body">
                {previewTemplate.body || '(No content)'}
              </div>
            </div>
            <div className="preview-actions">
              <Button
                variant="primary"
                onClick={() => handleUseTemplate(previewTemplate)}
              >
                Use This Template
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        size="large"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Save size={18} />}
              onClick={handleSave}
              loading={saving}
              disabled={saving || !formData.name.trim()}
            >
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </>
        }
      >
        <div className="template-form">
          <Input
            label="Template Name"
            placeholder="e.g., Follow-up After Meeting"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />

          <div className="template-form-row">
            <Input
              label="Subject Line (optional)"
              placeholder="Pre-filled email subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              fullWidth
            />

            <div className="template-form-field">
              <label className="template-form-label">Category</label>
              <select
                className="template-category-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">-- Select Category --</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="template-form-field">
            <label className="template-form-label">Email Body</label>
            <textarea
              className="template-body-textarea"
              placeholder="Write your email template content here..."
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={12}
            />

            {/* Variable Helpers */}
            <div className="template-variables">
              <span className="variables-label">Insert variable:</span>
              {TEMPLATE_VARIABLES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  className="variable-btn"
                  onClick={() => insertVariable(v.key)}
                  title={v.description}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          <div className="template-form-checkbox">
            <label>
              <input
                type="checkbox"
                checked={formData.is_favorite}
                onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
              />
              <Star size={14} />
              <span>Add to favorites</span>
            </label>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
