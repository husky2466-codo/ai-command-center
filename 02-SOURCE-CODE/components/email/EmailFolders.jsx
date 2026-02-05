import React from 'react';
import { Settings, Tag, User } from 'lucide-react';
import Button from '../shared/Button';
import SavedSearches from './SavedSearches';
import { FOLDERS, FILTERS } from './utils/emailConstants';

/**
 * EmailFolders - Left sidebar with account selector, folders, and labels
 */
export default function EmailFolders({
  accounts,
  selectedAccountId,
  onAccountChange,
  onCompose,
  selectedFolder,
  onFolderChange,
  emails,
  userLabels,
  selectedLabelFilter,
  onLabelFilterChange,
  onShowLabelManager,
  showSavedSearches,
  onToggleSavedSearches,
  onSavedSearchSelect,
  filter,
  onFilterChange,
  currentPage,
  onPageChange
}) {
  const handleFolderClick = (folderId) => {
    onFolderChange(folderId);
    onLabelFilterChange(null); // Clear label filter when selecting folder
    // Reset filter to ALL when changing folders to avoid redundant filtering
    onFilterChange(FILTERS.ALL);
    onPageChange(1);
  };

  const handleLabelClick = (labelId) => {
    onLabelFilterChange(labelId);
    onFolderChange(null);
    onFilterChange(FILTERS.ALL);
    onPageChange(1);
  };

  return (
    <aside className="email-sidebar">
      {/* Account Selector */}
      <div className="email-account-selector">
        <select
          className="account-select"
          value={selectedAccountId || ''}
          onChange={(e) => onAccountChange(e.target.value)}
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.email}
            </option>
          ))}
        </select>
      </div>

      {/* Compose Button */}
      <Button
        variant="primary"
        icon={<Tag size={18} />}
        fullWidth
        onClick={onCompose}
        className="compose-btn"
      >
        Compose
      </Button>

      {/* Folders */}
      <nav className="email-folders">
        {FOLDERS.map(folder => {
          const FolderIcon = folder.icon;
          const folderEmailsArray = Array.isArray(emails) ? emails : [];
          const count = folderEmailsArray.filter(e => {
            if (folder.id === 'inbox') return !e.labels?.includes('SENT') && !e.labels?.includes('TRASH');
            if (folder.id === 'sent') return e.labels?.includes('SENT');
            if (folder.id === 'starred') return e.starred;
            if (folder.id === 'trash') return e.labels?.includes('TRASH');
            return false;
          }).length;

          return (
            <button
              key={folder.id}
              className={`folder-item ${selectedFolder === folder.id && !selectedLabelFilter ? 'active' : ''}`}
              onClick={() => handleFolderClick(folder.id)}
            >
              <FolderIcon size={20} className="folder-icon" />
              <span className="folder-name">{folder.name}</span>
              {count > 0 && <span className="folder-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Labels Section */}
      {userLabels.length > 0 && (
        <div className="sidebar-user-labels">
          <div className="sidebar-labels-header">
            <span className="sidebar-labels-title">Labels</span>
            <button
              className="sidebar-labels-manage-btn"
              onClick={onShowLabelManager}
              title="Manage labels"
            >
              <Settings size={14} />
            </button>
          </div>
          {userLabels.map(label => (
            <button
              key={label.id}
              className={`sidebar-label-item ${selectedLabelFilter === label.id ? 'active' : ''}`}
              onClick={() => handleLabelClick(label.id)}
            >
              <span
                className="sidebar-label-color"
                style={{ backgroundColor: label.color?.backgroundColor || '#999999' }}
              />
              <span className="sidebar-label-name">{label.name}</span>
              {label.messagesTotal > 0 && (
                <span className="sidebar-label-count">{label.messagesTotal}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Saved Searches */}
      <SavedSearches
        accountId={selectedAccountId}
        onSelectSearch={onSavedSearchSelect}
        isExpanded={showSavedSearches}
        onToggleExpand={onToggleSavedSearches}
      />

      {/* Manage Labels Button */}
      <Button
        variant="ghost"
        icon={<Tag size={16} />}
        onClick={onShowLabelManager}
        fullWidth
        style={{ marginTop: 'auto', justifyContent: 'flex-start' }}
      >
        Manage Labels
      </Button>
    </aside>
  );
}
