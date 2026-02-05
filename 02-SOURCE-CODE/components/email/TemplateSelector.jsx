import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Search,
  Star,
  Clock,
  ChevronRight,
  FolderOpen,
  X,
  Settings
} from 'lucide-react';
import './TemplateSelector.css';

/**
 * TemplateSelector - Quick template picker dropdown for compose modal
 */
export default function TemplateSelector({
  isOpen,
  onClose,
  accountId,
  onSelect, // (template) => void
  onManageTemplates, // () => void - open full template manager
  anchorRef // ref to anchor element for positioning
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Load templates
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setSearchQuery('');
      setSelectedIndex(0);
      // Focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, accountId]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev =>
            Math.min(prev + 1, filteredTemplates.length - 1)
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredTemplates[selectedIndex]) {
            handleSelectTemplate(filteredTemplates[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedIndex, onClose]);

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

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) {
      // Return sorted by favorites first, then usage count
      return [...templates].sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return (b.usage_count || 0) - (a.usage_count || 0);
      });
    }

    const query = searchQuery.toLowerCase();
    return templates.filter(template => {
      return (
        template.name?.toLowerCase().includes(query) ||
        template.subject?.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query)
      );
    });
  }, [templates, searchQuery]);

  // Group by favorites/recent/all
  const groupedTemplates = useMemo(() => {
    const favorites = filteredTemplates.filter(t => t.is_favorite);
    const recent = filteredTemplates
      .filter(t => !t.is_favorite && t.usage_count > 0)
      .slice(0, 5);
    const others = filteredTemplates.filter(
      t => !t.is_favorite && (!t.usage_count || !recent.includes(t))
    );

    return { favorites, recent, others };
  }, [filteredTemplates]);

  const handleSelectTemplate = async (template) => {
    try {
      // Increment usage count
      if (window.electronAPI?.emailIncrementTemplateUsage) {
        await window.electronAPI.emailIncrementTemplateUsage(template.id);
      }

      onSelect(template);
      onClose();
    } catch (error) {
      console.error('Failed to select template:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="template-selector"
    >
      {/* Search Header */}
      <div className="template-selector-header">
        <div className="template-selector-search">
          <Search size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="template-search-input"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Template List */}
      <div className="template-selector-list">
        {loading ? (
          <div className="template-selector-loading">
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="template-selector-empty">
            {searchQuery ? (
              <p>No templates match your search</p>
            ) : (
              <>
                <FileText size={24} />
                <p>No templates yet</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Favorites Section */}
            {groupedTemplates.favorites.length > 0 && (
              <div className="template-selector-group">
                <div className="template-group-label">
                  <Star size={14} />
                  <span>Favorites</span>
                </div>
                {groupedTemplates.favorites.map((template, index) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    isSelected={filteredTemplates.indexOf(template) === selectedIndex}
                    onClick={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            )}

            {/* Recent Section */}
            {groupedTemplates.recent.length > 0 && (
              <div className="template-selector-group">
                <div className="template-group-label">
                  <Clock size={14} />
                  <span>Recent</span>
                </div>
                {groupedTemplates.recent.map((template, index) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    isSelected={filteredTemplates.indexOf(template) === selectedIndex}
                    onClick={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            )}

            {/* Other Templates */}
            {groupedTemplates.others.length > 0 && (
              <div className="template-selector-group">
                {(groupedTemplates.favorites.length > 0 || groupedTemplates.recent.length > 0) && (
                  <div className="template-group-label">
                    <FolderOpen size={14} />
                    <span>All Templates</span>
                  </div>
                )}
                {groupedTemplates.others.map((template, index) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    isSelected={filteredTemplates.indexOf(template) === selectedIndex}
                    onClick={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="template-selector-footer">
        <button
          className="manage-templates-btn"
          onClick={() => {
            onClose();
            onManageTemplates?.();
          }}
        >
          <Settings size={14} />
          <span>Manage Templates</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * TemplateItem - Individual template in the selector
 */
function TemplateItem({ template, isSelected, onClick }) {
  return (
    <button
      className={`template-selector-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="template-item-content">
        <div className="template-item-name">
          {template.is_favorite && (
            <Star size={12} className="favorite-indicator" fill="currentColor" />
          )}
          {template.name}
        </div>
        {template.subject && (
          <div className="template-item-subject">{template.subject}</div>
        )}
      </div>
      {template.category && (
        <span className="template-item-category">{template.category}</span>
      )}
    </button>
  );
}
