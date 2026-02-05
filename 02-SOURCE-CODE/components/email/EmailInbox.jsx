import React, { useRef } from 'react';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Star,
  Loader,
  CheckSquare,
  Square,
  MinusSquare,
  MailOpen,
  Mail,
  Trash2,
  X,
  Settings,
  Keyboard,
  SlidersHorizontal,
  XCircle
} from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { FILTERS } from './utils/emailConstants';

/**
 * EmailInbox - Email list panel with toolbar, filters, and pagination
 */
export default function EmailInbox({
  // State
  syncing,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  activeSearchQuery,
  activeSearchName,
  searchResults,
  paginatedEmails,
  loading,
  selectedEmail,
  selectMode,
  selectedEmailIds,
  bulkOperationLoading,
  currentPage,
  totalPages,

  // Handlers
  onSyncEmails,
  onShowSettings,
  onShowKeyboardHelp,
  onAdvancedSearch,
  onClearSearch,
  onShowAdvancedSearch,
  onEmailClick,
  onToggleStar,
  onToggleSelectMode,
  onToggleEmailSelection,
  onSelectAll,
  onCancelSelection,
  onBulkMarkAsRead,
  onBulkMarkAsUnread,
  onBulkStar,
  onBulkTrash,
  onPageChange
}) {
  const searchInputRef = useRef(null);

  return (
    <div className="email-list-panel">
      {/* Bulk Action Bar - appears when emails are selected */}
      {selectedEmailIds.size > 0 && (
        <div className="bulk-action-bar">
          <div className="bulk-action-left">
            <button
              className="select-all-checkbox"
              onClick={onSelectAll}
              title={selectedEmailIds.size === paginatedEmails.length ? "Deselect all" : "Select all"}
            >
              {selectedEmailIds.size === paginatedEmails.length ? (
                <CheckSquare size={20} />
              ) : selectedEmailIds.size > 0 ? (
                <MinusSquare size={20} />
              ) : (
                <Square size={20} />
              )}
            </button>
            <span className="bulk-selection-count">
              {selectedEmailIds.size} selected
            </span>
          </div>
          <div className="bulk-action-buttons">
            <Button
              variant="ghost"
              size="small"
              icon={<MailOpen size={16} />}
              onClick={onBulkMarkAsRead}
              disabled={bulkOperationLoading}
              title="Mark as read"
            >
              Read
            </Button>
            <Button
              variant="ghost"
              size="small"
              icon={<Mail size={16} />}
              onClick={onBulkMarkAsUnread}
              disabled={bulkOperationLoading}
              title="Mark as unread"
            >
              Unread
            </Button>
            <Button
              variant="ghost"
              size="small"
              icon={<Star size={16} />}
              onClick={onBulkStar}
              disabled={bulkOperationLoading}
              title="Star"
            >
              Star
            </Button>
            <Button
              variant="ghost"
              size="small"
              icon={<Trash2 size={16} />}
              onClick={onBulkTrash}
              disabled={bulkOperationLoading}
              title="Move to trash"
            >
              Trash
            </Button>
            <Button
              variant="ghost"
              size="small"
              icon={<X size={16} />}
              onClick={onCancelSelection}
              disabled={bulkOperationLoading}
              title="Cancel selection"
            >
              Cancel
            </Button>
          </div>
          {bulkOperationLoading && (
            <div className="bulk-loading-indicator">
              <Loader size={16} className="loading-spinner" />
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="email-toolbar">
        <div className="toolbar-left">
          {/* Select Mode Toggle */}
          <button
            className={`select-mode-toggle ${selectMode ? 'active' : ''}`}
            onClick={onToggleSelectMode}
            title={selectMode ? "Exit selection mode" : "Enter selection mode"}
          >
            {selectMode ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>

          <Button
            variant="ghost"
            icon={<RefreshCw size={18} />}
            onClick={onSyncEmails}
            loading={syncing}
            disabled={syncing}
            title="Sync emails"
          />

          <Button
            variant="ghost"
            icon={<Settings size={18} />}
            onClick={onShowSettings}
            title="Email settings"
          />

          <Button
            variant="ghost"
            icon={<Keyboard size={18} />}
            onClick={onShowKeyboardHelp}
            title="Keyboard shortcuts (?)"
          />

          {/* Filter Buttons */}
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === FILTERS.ALL ? 'active' : ''}`}
              onClick={() => onFilterChange(FILTERS.ALL)}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === FILTERS.UNREAD ? 'active' : ''}`}
              onClick={() => onFilterChange(FILTERS.UNREAD)}
            >
              Unread
            </button>
            <button
              className={`filter-btn ${filter === FILTERS.STARRED ? 'active' : ''}`}
              onClick={() => onFilterChange(FILTERS.STARRED)}
            >
              Starred
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="toolbar-search-wrapper">
          <div className="toolbar-search">
            <Input
              type="search"
              placeholder={activeSearchQuery ? `Searching: ${activeSearchName || 'Custom'}` : "Search emails..."}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  onAdvancedSearch(searchQuery);
                }
              }}
              icon={<Search size={16} />}
            />
          </div>
          <Button
            variant="ghost"
            icon={<SlidersHorizontal size={16} />}
            onClick={onShowAdvancedSearch}
            title="Advanced search"
            className="advanced-search-btn"
          />
          {activeSearchQuery && (
            <Button
              variant="ghost"
              icon={<XCircle size={16} />}
              onClick={onClearSearch}
              title="Clear search"
              className="clear-search-btn"
            />
          )}
        </div>
      </div>

      {/* Active Search Indicator */}
      {activeSearchQuery && (
        <div className="active-search-bar">
          <Search size={14} />
          <span className="search-label">
            {activeSearchName ? `"${activeSearchName}"` : 'Search results'}:
          </span>
          <span className="search-query-display">{activeSearchQuery}</span>
          <span className="search-result-count">
            {searchResults ? `${searchResults.total} results` : 'Searching...'}
          </span>
          <button className="clear-search-inline" onClick={onClearSearch}>
            <X size={14} />
            Clear
          </button>
        </div>
      )}

      {/* Email List */}
      <div className="email-list">
        {loading ? (
          <div className="loading-state">
            <Loader size={24} className="loading-spinner" />
            <span>Loading emails...</span>
          </div>
        ) : paginatedEmails.length === 0 ? (
          <div className="empty-state">
            <Mail size={32} className="empty-icon" />
            <p>No emails found</p>
          </div>
        ) : (
          paginatedEmails.map(email => (
            <div
              key={email.id}
              className={`email-item ${email.unread ? 'unread' : ''} ${selectedEmail?.id === email.id ? 'selected' : ''} ${selectedEmailIds.has(email.id) ? 'bulk-selected' : ''}`}
              onClick={() => selectMode ? onToggleEmailSelection(email.id) : onEmailClick(email)}
            >
              <div className="email-item-checkbox">
                <button
                  className={`email-checkbox ${selectedEmailIds.has(email.id) ? 'checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEmailSelection(email.id, e);
                  }}
                >
                  {selectedEmailIds.has(email.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </div>
              <div className="email-item-left">
                <div className="email-avatar">
                  {(email.from || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              </div>
              <div className="email-item-content">
                <div className="email-item-header">
                  <span className="email-from">{email.from || 'Unknown'}</span>
                  <span className="email-date">{new Date(email.date).toLocaleDateString()}</span>
                </div>
                <div className="email-subject">
                  {email.unread && <span className="unread-dot" />}
                  {email.subject || '(No subject)'}
                </div>
                <div className="email-snippet">{email.snippet || ''}</div>
              </div>
              <div className="email-item-actions">
                <button
                  className={`star-btn ${email.starred ? 'starred' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(email.id, email.starred);
                  }}
                >
                  <Star size={16} fill={email.starred ? 'currentColor' : 'none'} />
                </button>
                {email.attachments?.length > 0 && <Paperclip size={16} className="attachment-icon" />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="email-pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
