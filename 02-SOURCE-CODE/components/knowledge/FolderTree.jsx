import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Trash2, MoreVertical } from 'lucide-react';
import './FolderTree.css';

/**
 * FolderTree Component
 * Recursive folder tree with expand/collapse and selection
 */
function FolderTree({ folders, selectedFolder, onFolderSelect, onDeleteFolder }) {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [contextMenuFolder, setContextMenuFolder] = useState(null);

  const toggleFolder = (folderId, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderClick = (folder) => {
    onFolderSelect(folder);
  };

  const handleAllClick = () => {
    onFolderSelect(null);
  };

  const handleContextMenu = (folder, e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuFolder(folder);
  };

  const handleDeleteClick = (folder, e) => {
    e.stopPropagation();
    setContextMenuFolder(null);
    onDeleteFolder(folder.id);
  };

  const renderFolder = (folder, depth = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder?.id === folder.id;
    const showContextMenu = contextMenuFolder?.id === folder.id;

    return (
      <div key={folder.id} className="folder-tree-item-wrapper">
        <div
          className={`folder-tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
          onClick={() => handleFolderClick(folder)}
          onContextMenu={(e) => handleContextMenu(folder, e)}
        >
          {/* Expand/Collapse Icon */}
          <button
            className="folder-expand-btn"
            onClick={(e) => toggleFolder(folder.id, e)}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {/* Folder Icon */}
          <div className="folder-icon">
            {isExpanded ? (
              <FolderOpen size={18} />
            ) : (
              <Folder size={18} />
            )}
          </div>

          {/* Folder Name */}
          <span className="folder-name">{folder.name}</span>

          {/* Context Menu Button */}
          <button
            className="folder-menu-btn"
            onClick={(e) => handleContextMenu(folder, e)}
          >
            <MoreVertical size={14} />
          </button>

          {/* Context Menu */}
          {showContextMenu && (
            <div className="folder-context-menu">
              <button
                className="context-menu-item danger"
                onClick={(e) => handleDeleteClick(folder, e)}
              >
                <Trash2 size={14} />
                Delete Folder
              </button>
            </div>
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="folder-children">
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="folder-tree">
      {/* "All Articles" option */}
      <div
        className={`folder-tree-item ${!selectedFolder ? 'selected' : ''}`}
        style={{ paddingLeft: '0.75rem' }}
        onClick={handleAllClick}
      >
        <div className="folder-expand-btn" style={{ visibility: 'hidden' }}></div>
        <div className="folder-icon">
          <FolderOpen size={18} />
        </div>
        <span className="folder-name">All Articles</span>
      </div>

      {/* Folder Tree */}
      {folders.map(folder => renderFolder(folder, 0))}

      {/* Click outside to close context menu */}
      {contextMenuFolder && (
        <div
          className="context-menu-overlay"
          onClick={() => setContextMenuFolder(null)}
        />
      )}
    </div>
  );
}

FolderTree.propTypes = {
  folders: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    parent_id: PropTypes.string,
    children: PropTypes.array
  })).isRequired,
  selectedFolder: PropTypes.object,
  onFolderSelect: PropTypes.func.isRequired,
  onDeleteFolder: PropTypes.func.isRequired
};

export default FolderTree;
