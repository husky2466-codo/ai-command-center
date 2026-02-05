import React, { useState, useEffect, useRef } from 'react';
import { RAG_CATEGORIES, EXPORT_FORMATS, SUGGESTED_TAGS, DEFAULT_EXPORT_SETTINGS } from './ragConstants';
import { exportRAGTraining, parseChainOutputs } from './ragExporter';

export default function RAGExportModal({ isOpen, onClose, sessionLog, onExportComplete }) {
  const [settings, setSettings] = useState({ ...DEFAULT_EXPORT_SETTINGS });
  const [tagInput, setTagInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState(null);
  const tagInputRef = useRef(null);

  // Reset state when modal opens and fetch default path
  useEffect(() => {
    if (isOpen) {
      // Load saved preferences from localStorage
      const saved = localStorage.getItem('ragExportSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings((prev) => ({
            ...prev,
            category: parsed.category || prev.category,
            format: parsed.format || prev.format,
          }));
        } catch (e) {
          // Ignore parse errors
        }
      }
      setResult(null);
      setTagInput('');

      // Automatically fetch and set the default output path
      if (window.electronAPI) {
        window.electronAPI.getUserDataPath().then((result) => {
          // Handle both string (direct path) and object {success, path} responses
          const userDataPath = typeof result === 'string' ? result : result?.path;
          if (userDataPath) {
            const defaultPath = `${userDataPath}\\rag-outputs`;
            setSettings((prev) => ({ ...prev, outputPath: defaultPath }));
          }
        }).catch((err) => {
          console.error('Failed to get user data path:', err);
        });
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isExporting, onClose]);

  const handleCategoryChange = (e) => {
    setSettings((prev) => ({ ...prev, category: e.target.value }));
  };

  const handleFormatChange = (format) => {
    setSettings((prev) => ({ ...prev, format }));
  };

  const handleAddTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !settings.tags.includes(trimmed)) {
      setSettings((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmed],
      }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setSettings((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && settings.tags.length > 0) {
      handleRemoveTag(settings.tags[settings.tags.length - 1]);
    }
  };

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.selectFolder();
    if (result.success && result.path) {
      setSettings((prev) => ({ ...prev, outputPath: result.path }));
    }
  };

  const handleExport = async () => {
    if (!window.electronAPI || !sessionLog) return;

    setIsExporting(true);
    setResult(null);

    // Save preferences
    localStorage.setItem(
      'ragExportSettings',
      JSON.stringify({
        category: settings.category,
        format: settings.format,
      })
    );

    try {
      const exportResult = await exportRAGTraining(sessionLog, settings, window.electronAPI);
      setResult(exportResult);

      if (exportResult.success) {
        // Auto-close after 3 seconds on success
        setTimeout(() => {
          onClose();
          // Return to setup mode if callback provided
          if (onExportComplete) {
            onExportComplete();
          }
        }, 3000);
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  // Preview how many Q&A pairs will be exported
  const previewCount = sessionLog ? parseChainOutputs(sessionLog).length : 0;

  // Filter suggested tags to exclude already selected ones
  const availableSuggestions = SUGGESTED_TAGS.filter((t) => !settings.tags.includes(t)).slice(0, 10);

  if (!isOpen) return null;

  return (
    <div className="rag-modal-overlay" onClick={(e) => e.target === e.currentTarget && !isExporting && onClose()}>
      <div className="rag-modal">
        <div className="rag-modal-header">
          <h3>Export RAG Training Document</h3>
          <button className="rag-modal-close" onClick={onClose} disabled={isExporting}>
            ×
          </button>
        </div>

        <div className="rag-modal-content">
          {result?.success ? (
            <div className="rag-success-message">
              <span>Exported {result.pairCount} Q&A pair{result.pairCount !== 1 ? 's' : ''} to:</span>
              <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>{result.filePath}</code>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="rag-form-group">
                <label>Preview</label>
                <div className="rag-preview-count">
                  {previewCount} Q&A pair{previewCount !== 1 ? 's' : ''} will be exported
                </div>
              </div>

              {/* Category Selection */}
              <div className="rag-form-group">
                <label>Category</label>
                <select value={settings.category} onChange={handleCategoryChange}>
                  {RAG_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} - {cat.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format Selection */}
              <div className="rag-form-group">
                <label>Format</label>
                <div className="rag-format-options">
                  {Object.values(EXPORT_FORMATS).map((fmt) => (
                    <div
                      key={fmt.id}
                      className={`rag-format-option ${settings.format === fmt.id ? 'selected' : ''}`}
                      onClick={() => handleFormatChange(fmt.id)}
                    >
                      <input
                        type="radio"
                        name="format"
                        checked={settings.format === fmt.id}
                        onChange={() => handleFormatChange(fmt.id)}
                      />
                      <div>
                        <div className="rag-format-label">{fmt.label}</div>
                        <div className="rag-format-desc">{fmt.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tag Input */}
              <div className="rag-form-group">
                <label>Tags</label>
                <div className="rag-tag-input-container" onClick={() => tagInputRef.current?.focus()}>
                  {settings.tags.map((tag) => (
                    <span key={tag} className="rag-tag">
                      {tag}
                      <button className="rag-tag-remove" onClick={() => handleRemoveTag(tag)}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    className="rag-tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder={settings.tags.length === 0 ? 'Add tags...' : ''}
                  />
                </div>
                <div className="rag-tag-suggestions">
                  {availableSuggestions.map((tag) => (
                    <button key={tag} className="rag-tag-suggestion" onClick={() => handleAddTag(tag)}>
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Path */}
              <div className="rag-form-group">
                <label>Output Location</label>
                <div className="rag-path-row">
                  <div className="rag-path-display">
                    {typeof settings.outputPath === 'string' ? settings.outputPath : 'Loading...'}
                  </div>
                  <button className="btn btn-secondary" onClick={handleSelectFolder}>
                    Browse
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {result?.error && <div className="rag-error-message">{result.error}</div>}
            </>
          )}
        </div>

        <div className="rag-modal-footer">
          {!result?.success && (
            <>
              <button className="btn btn-ghost" onClick={onClose} disabled={isExporting}>
                Cancel
              </button>
              <button
                className="btn rag-export-btn"
                onClick={handleExport}
                disabled={isExporting || previewCount === 0}
              >
                {isExporting ? 'Exporting...' : `Export ${previewCount} Pair${previewCount !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
          {result?.success && (
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
