import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Save, X, Plus, Tag as TagIcon, Link as LinkIcon, Folder } from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import './ArticleEditor.css';

/**
 * ArticleEditor Component
 * Edit or create knowledge articles with markdown support
 */
function ArticleEditor({ article, folders, allTags, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: article.title || '',
    content: article.content || '',
    source_url: article.source_url || '',
    folder_id: article.folder_id || null,
    tags: article.tags || [],
    is_spark: article.is_spark || false
  });

  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update form when article changes
  useEffect(() => {
    setFormData({
      title: article.title || '',
      content: article.content || '',
      source_url: article.source_url || '',
      folder_id: article.folder_id || null,
      tags: article.tags || [],
      is_spark: article.is_spark || false
    });
  }, [article]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = (tag) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputChange = (value) => {
    setTagInput(value);
    setShowTagSuggestions(value.length > 0);
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag(tagInput);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        ...article,
        ...formData
      });
    } catch (error) {
      console.error('Failed to save article:', error);
      alert('Failed to save article: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter tag suggestions
  const tagSuggestions = allTags
    .filter(tag =>
      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      !formData.tags.includes(tag)
    )
    .slice(0, 5);

  return (
    <div className="article-editor">
      {/* Header */}
      <header className="article-editor-header">
        <h2>{article.id ? 'Edit Article' : 'New Article'}</h2>
        <div className="article-editor-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<X size={16} />}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Save size={16} />}
            onClick={handleSave}
            loading={isSaving}
            disabled={!formData.title.trim()}
          >
            Save
          </Button>
        </div>
      </header>

      {/* Form */}
      <div className="article-editor-form">
        {/* Title */}
        <div className="editor-field">
          <Input
            label="Title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter article title..."
            required
            autoFocus
          />
        </div>

        {/* Folder Selection */}
        <div className="editor-field">
          <label className="editor-label">
            <Folder size={14} />
            Folder
          </label>
          <select
            value={formData.folder_id || ''}
            onChange={(e) => handleChange('folder_id', e.target.value || null)}
            className="editor-select"
          >
            <option value="">No Folder</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                {'  '.repeat(folder.depth || 0)}
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* Source URL */}
        <div className="editor-field">
          <Input
            label={
              <span className="editor-label">
                <LinkIcon size={14} />
                Source URL (optional)
              </span>
            }
            type="url"
            value={formData.source_url}
            onChange={(e) => handleChange('source_url', e.target.value)}
            placeholder="https://example.com/article"
          />
        </div>

        {/* Tags */}
        <div className="editor-field">
          <label className="editor-label">
            <TagIcon size={14} />
            Tags
          </label>

          {/* Current Tags */}
          {formData.tags.length > 0 && (
            <div className="editor-tags-list">
              {formData.tags.map(tag => (
                <span key={tag} className="editor-tag">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="editor-tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tag Input */}
          <div className="editor-tag-input-wrapper">
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => handleTagInputChange(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              placeholder="Type to add tags..."
              icon={<Plus size={14} />}
            />

            {/* Tag Suggestions */}
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <div className="editor-tag-suggestions">
                {tagSuggestions.map(tag => (
                  <button
                    key={tag}
                    className="tag-suggestion"
                    onClick={() => handleAddTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="editor-field">
          <label className="editor-label">Content (Markdown supported)</label>
          <textarea
            className="editor-textarea"
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="Write your content here... Markdown is supported."
            rows={20}
          />
        </div>

        {/* Spark Checkbox */}
        <div className="editor-field">
          <label className="editor-checkbox-label">
            <input
              type="checkbox"
              checked={formData.is_spark}
              onChange={(e) => handleChange('is_spark', e.target.checked)}
              className="editor-checkbox"
            />
            <span>Mark as Spark (quick capture)</span>
          </label>
        </div>
      </div>

      {/* Markdown Help */}
      <div className="editor-help">
        <details>
          <summary>Markdown Syntax Help</summary>
          <div className="markdown-help-content">
            <p><code># Heading 1</code> → <strong>Heading 1</strong></p>
            <p><code>## Heading 2</code> → <strong>Heading 2</strong></p>
            <p><code>**bold text**</code> → <strong>bold text</strong></p>
            <p><code>*italic text*</code> → <em>italic text</em></p>
            <p><code>[link text](url)</code> → link</p>
            <p><code>`code`</code> → inline code</p>
            <p><code>```language</code><br />code block<br /><code>```</code></p>
            <p><code>- List item</code> → Bullet list</p>
            <p><code>1. List item</code> → Numbered list</p>
          </div>
        </details>
      </div>
    </div>
  );
}

ArticleEditor.propTypes = {
  article: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.string,
    source_url: PropTypes.string,
    folder_id: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    is_spark: PropTypes.bool
  }).isRequired,
  folders: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    depth: PropTypes.number
  })).isRequired,
  allTags: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ArticleEditor;
