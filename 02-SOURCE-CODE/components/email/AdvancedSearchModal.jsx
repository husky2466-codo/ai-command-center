import React, { useState, useEffect } from 'react';
import {
  Search,
  Paperclip,
  Star,
  Mail,
  MailOpen,
  Calendar,
  Tag,
  FileText,
  HardDrive,
  Save,
  X,
  Copy,
  History,
  Loader
} from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Modal from '../shared/Modal';

/**
 * AdvancedSearchModal - Gmail-style search builder
 * Provides form-based search building for non-technical users
 * Supports all Gmail search operators
 */
export default function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
  accountId,
  initialQuery = ''
}) {
  // Form state
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [readStatus, setReadStatus] = useState('any'); // 'any', 'read', 'unread'
  const [starredOnly, setStarredOnly] = useState(false);
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [filename, setFilename] = useState('');
  const [sizeFilter, setSizeFilter] = useState('any'); // 'any', 'larger', 'smaller'
  const [sizeValue, setSizeValue] = useState('');
  const [sizeUnit, setSizeUnit] = useState('M'); // 'K', 'M', 'G'

  // Generated query
  const [generatedQuery, setGeneratedQuery] = useState('');

  // Labels from Gmail
  const [labels, setLabels] = useState([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Save search state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Load labels when modal opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadLabels();
      loadRecentSearches();
    }
  }, [isOpen, accountId]);

  // Parse initial query into form fields
  useEffect(() => {
    if (initialQuery) {
      parseQueryToForm(initialQuery);
    }
  }, [initialQuery]);

  // Generate query string when form changes
  useEffect(() => {
    setGeneratedQuery(buildQueryString());
  }, [from, to, subject, keywords, hasAttachment, readStatus, starredOnly, dateAfter, dateBefore, selectedLabel, filename, sizeFilter, sizeValue, sizeUnit]);

  const loadLabels = async () => {
    if (!window.electronAPI?.googleGetLabels) return;

    try {
      setLoadingLabels(true);
      const result = await window.electronAPI.googleGetLabels(accountId);
      if (result.success) {
        // Filter to user labels and common system labels
        const userLabels = result.data.filter(l =>
          l.type === 'user' || ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'IMPORTANT', 'STARRED'].includes(l.id)
        );
        setLabels(userLabels);
      }
    } catch (error) {
      console.error('Failed to load labels:', error);
    } finally {
      setLoadingLabels(false);
    }
  };

  const loadRecentSearches = async () => {
    if (!window.electronAPI?.googleGetRecentSearches) return;

    try {
      setLoadingRecent(true);
      const result = await window.electronAPI.googleGetRecentSearches(accountId, 5);
      if (result.success) {
        setRecentSearches(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const parseQueryToForm = (query) => {
    // Parse from:
    const fromMatch = query.match(/from:(\S+|"[^"]+")(?:\s|$)/i);
    if (fromMatch) setFrom(fromMatch[1].replace(/"/g, ''));

    // Parse to:
    const toMatch = query.match(/to:(\S+|"[^"]+")(?:\s|$)/i);
    if (toMatch) setTo(toMatch[1].replace(/"/g, ''));

    // Parse subject:
    const subjectMatch = query.match(/subject:(\S+|"[^"]+")(?:\s|$)/i);
    if (subjectMatch) setSubject(subjectMatch[1].replace(/"/g, ''));

    // Parse has:attachment
    if (/has:attachment/i.test(query)) setHasAttachment(true);

    // Parse is:unread / is:read
    if (/is:unread/i.test(query)) setReadStatus('unread');
    else if (/is:read/i.test(query)) setReadStatus('read');

    // Parse is:starred
    if (/is:starred/i.test(query)) setStarredOnly(true);

    // Parse after:
    const afterMatch = query.match(/after:(\d{4}[\/\-]\d{2}[\/\-]\d{2})(?:\s|$)/i);
    if (afterMatch) {
      const d = afterMatch[1].replace(/\//g, '-');
      setDateAfter(d);
    }

    // Parse before:
    const beforeMatch = query.match(/before:(\d{4}[\/\-]\d{2}[\/\-]\d{2})(?:\s|$)/i);
    if (beforeMatch) {
      const d = beforeMatch[1].replace(/\//g, '-');
      setDateBefore(d);
    }

    // Parse label:
    const labelMatch = query.match(/label:(\S+|"[^"]+")(?:\s|$)/i);
    if (labelMatch) setSelectedLabel(labelMatch[1].replace(/"/g, ''));

    // Parse filename:
    const filenameMatch = query.match(/filename:(\S+|"[^"]+")(?:\s|$)/i);
    if (filenameMatch) setFilename(filenameMatch[1].replace(/"/g, ''));

    // Parse larger: / smaller:
    const largerMatch = query.match(/larger:(\d+)([KMG]?)(?:\s|$)/i);
    if (largerMatch) {
      setSizeFilter('larger');
      setSizeValue(largerMatch[1]);
      setSizeUnit(largerMatch[2]?.toUpperCase() || 'M');
    }

    const smallerMatch = query.match(/smaller:(\d+)([KMG]?)(?:\s|$)/i);
    if (smallerMatch) {
      setSizeFilter('smaller');
      setSizeValue(smallerMatch[1]);
      setSizeUnit(smallerMatch[2]?.toUpperCase() || 'M');
    }

    // Remaining text after removing all operators is keywords
    let remaining = query
      .replace(/from:\S+/gi, '')
      .replace(/to:\S+/gi, '')
      .replace(/subject:\S+/gi, '')
      .replace(/has:attachment/gi, '')
      .replace(/is:unread/gi, '')
      .replace(/is:read/gi, '')
      .replace(/is:starred/gi, '')
      .replace(/after:\S+/gi, '')
      .replace(/before:\S+/gi, '')
      .replace(/label:\S+/gi, '')
      .replace(/filename:\S+/gi, '')
      .replace(/larger:\S+/gi, '')
      .replace(/smaller:\S+/gi, '')
      .replace(/"[^"]+"/g, (m) => m.replace(/"/g, ''))
      .replace(/\s+/g, ' ')
      .trim();

    if (remaining) setKeywords(remaining);
  };

  const buildQueryString = () => {
    const parts = [];

    if (from.trim()) {
      parts.push(`from:${from.includes(' ') ? `"${from}"` : from}`);
    }

    if (to.trim()) {
      parts.push(`to:${to.includes(' ') ? `"${to}"` : to}`);
    }

    if (subject.trim()) {
      parts.push(`subject:${subject.includes(' ') ? `"${subject}"` : subject}`);
    }

    if (hasAttachment) {
      parts.push('has:attachment');
    }

    if (readStatus === 'unread') {
      parts.push('is:unread');
    } else if (readStatus === 'read') {
      parts.push('is:read');
    }

    if (starredOnly) {
      parts.push('is:starred');
    }

    if (dateAfter) {
      parts.push(`after:${dateAfter.replace(/-/g, '/')}`);
    }

    if (dateBefore) {
      parts.push(`before:${dateBefore.replace(/-/g, '/')}`);
    }

    if (selectedLabel) {
      parts.push(`label:${selectedLabel}`);
    }

    if (filename.trim()) {
      parts.push(`filename:${filename.includes(' ') ? `"${filename}"` : filename}`);
    }

    if (sizeFilter !== 'any' && sizeValue) {
      parts.push(`${sizeFilter}:${sizeValue}${sizeUnit}`);
    }

    if (keywords.trim()) {
      parts.push(keywords.trim());
    }

    return parts.join(' ');
  };

  const handleSearch = () => {
    const query = generatedQuery.trim();
    if (query) {
      onSearch(query);
      onClose();
    }
  };

  const handleSaveSearch = async () => {
    if (!saveName.trim() || !generatedQuery.trim()) return;

    try {
      setSaving(true);
      if (window.electronAPI?.googleSaveSearch) {
        const result = await window.electronAPI.googleSaveSearch(
          accountId,
          saveName.trim(),
          generatedQuery,
          saveFavorite
        );

        if (result.success) {
          setShowSaveDialog(false);
          setSaveName('');
          setSaveFavorite(false);
          await loadRecentSearches();
        }
      }
    } catch (error) {
      console.error('Failed to save search:', error);
      alert('Failed to save search: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUseRecentSearch = (search) => {
    parseQueryToForm(search.query);
    // Record usage
    if (window.electronAPI?.googleRecordSearchUsage) {
      window.electronAPI.googleRecordSearchUsage(search.id).catch(console.error);
    }
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
  };

  const handleClear = () => {
    setFrom('');
    setTo('');
    setSubject('');
    setKeywords('');
    setHasAttachment(false);
    setReadStatus('any');
    setStarredOnly(false);
    setDateAfter('');
    setDateBefore('');
    setSelectedLabel('');
    setFilename('');
    setSizeFilter('any');
    setSizeValue('');
    setSizeUnit('M');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced Email Search"
      size="large"
      footer={
        <>
          <Button variant="ghost" onClick={handleClear}>
            Clear All
          </Button>
          <Button
            variant="ghost"
            icon={<Save size={18} />}
            onClick={() => setShowSaveDialog(true)}
            disabled={!generatedQuery.trim()}
          >
            Save Search
          </Button>
          <Button
            variant="primary"
            icon={<Search size={18} />}
            onClick={handleSearch}
            disabled={!generatedQuery.trim()}
          >
            Search
          </Button>
        </>
      }
    >
      <div className="advanced-search-modal">
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="search-section recent-searches">
            <div className="section-header">
              <History size={16} />
              <span>Recent Searches</span>
            </div>
            <div className="recent-search-list">
              {recentSearches.map((search) => (
                <button
                  key={search.id}
                  className="recent-search-item"
                  onClick={() => handleUseRecentSearch(search)}
                  title={search.query}
                >
                  <Search size={14} />
                  <span className="recent-search-name">{search.name}</span>
                  <span className="recent-search-query">{search.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Basic Fields */}
        <div className="search-section">
          <div className="section-header">
            <Mail size={16} />
            <span>Basic Search</span>
          </div>
          <div className="search-grid">
            <Input
              label="From"
              type="text"
              placeholder="sender@example.com"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              fullWidth
            />
            <Input
              label="To"
              type="text"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              fullWidth
            />
            <Input
              label="Subject contains"
              type="text"
              placeholder="Keywords in subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
            />
            <Input
              label="Keywords"
              type="text"
              placeholder="Search terms"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              fullWidth
            />
          </div>
        </div>

        {/* Filters */}
        <div className="search-section">
          <div className="section-header">
            <Tag size={16} />
            <span>Filters</span>
          </div>
          <div className="filter-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasAttachment}
                onChange={(e) => setHasAttachment(e.target.checked)}
              />
              <Paperclip size={16} />
              <span>Has attachment</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={starredOnly}
                onChange={(e) => setStarredOnly(e.target.checked)}
              />
              <Star size={16} />
              <span>Starred only</span>
            </label>

            <div className="radio-group">
              <span className="radio-label">Read status:</span>
              <label className="radio-option">
                <input
                  type="radio"
                  name="readStatus"
                  value="any"
                  checked={readStatus === 'any'}
                  onChange={() => setReadStatus('any')}
                />
                <span>Any</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="readStatus"
                  value="unread"
                  checked={readStatus === 'unread'}
                  onChange={() => setReadStatus('unread')}
                />
                <MailOpen size={14} />
                <span>Unread</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="readStatus"
                  value="read"
                  checked={readStatus === 'read'}
                  onChange={() => setReadStatus('read')}
                />
                <Mail size={14} />
                <span>Read</span>
              </label>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="search-section">
          <div className="section-header">
            <Calendar size={16} />
            <span>Date Range</span>
          </div>
          <div className="date-range-row">
            <div className="date-field">
              <label>After</label>
              <input
                type="date"
                value={dateAfter}
                onChange={(e) => setDateAfter(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="date-field">
              <label>Before</label>
              <input
                type="date"
                value={dateBefore}
                onChange={(e) => setDateBefore(e.target.value)}
                className="date-input"
              />
            </div>
          </div>
        </div>

        {/* Label & Attachment */}
        <div className="search-section">
          <div className="section-header">
            <FileText size={16} />
            <span>Labels & Attachments</span>
          </div>
          <div className="search-grid">
            <div className="select-field">
              <label>Label</label>
              <select
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                className="label-select"
                disabled={loadingLabels}
              >
                <option value="">Any label</option>
                {labels.map((label) => (
                  <option key={label.id} value={label.name || label.id}>
                    {label.name || label.id}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Attachment filename"
              type="text"
              placeholder="document.pdf"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              icon={<Paperclip size={16} />}
              fullWidth
            />
          </div>
        </div>

        {/* Size Filter */}
        <div className="search-section">
          <div className="section-header">
            <HardDrive size={16} />
            <span>Size Filter</span>
          </div>
          <div className="size-filter-row">
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="size-select"
            >
              <option value="any">Any size</option>
              <option value="larger">Larger than</option>
              <option value="smaller">Smaller than</option>
            </select>
            {sizeFilter !== 'any' && (
              <>
                <input
                  type="number"
                  value={sizeValue}
                  onChange={(e) => setSizeValue(e.target.value)}
                  className="size-input"
                  placeholder="5"
                  min="1"
                />
                <select
                  value={sizeUnit}
                  onChange={(e) => setSizeUnit(e.target.value)}
                  className="size-unit-select"
                >
                  <option value="K">KB</option>
                  <option value="M">MB</option>
                  <option value="G">GB</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Generated Query Preview */}
        <div className="search-section query-preview">
          <div className="section-header">
            <Search size={16} />
            <span>Generated Query</span>
            <button
              className="copy-query-btn"
              onClick={handleCopyQuery}
              title="Copy query"
              disabled={!generatedQuery}
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="query-display">
            {generatedQuery || <span className="placeholder">Build your search using the form above</span>}
          </div>
        </div>
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="save-search-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-search-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="save-dialog-header">
              <h3>Save Search</h3>
              <button className="close-btn" onClick={() => setShowSaveDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="save-dialog-body">
              <Input
                label="Search Name"
                type="text"
                placeholder="My saved search"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                fullWidth
                autoFocus
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={saveFavorite}
                  onChange={(e) => setSaveFavorite(e.target.checked)}
                />
                <Star size={16} />
                <span>Add to favorites</span>
              </label>
              <div className="query-preview-small">
                <label>Query:</label>
                <code>{generatedQuery}</code>
              </div>
            </div>
            <div className="save-dialog-footer">
              <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Save size={18} />}
                onClick={handleSaveSearch}
                loading={saving}
                disabled={!saveName.trim() || saving}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
