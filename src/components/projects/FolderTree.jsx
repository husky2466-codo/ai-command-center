import React from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  Loader2,
  AlertCircle
} from 'lucide-react';

const FILE_ICONS = {
  '.js': FileCode, '.jsx': FileCode, '.ts': FileCode, '.tsx': FileCode,
  '.mjs': FileCode, '.cjs': FileCode, '.html': FileCode, '.css': FileCode,
  '.scss': FileCode, '.py': FileCode,
  '.json': FileJson,
  '.md': FileText, '.txt': FileText, '.yml': FileText, '.yaml': FileText,
  '.png': FileImage, '.jpg': FileImage, '.jpeg': FileImage, '.gif': FileImage,
  '.svg': FileImage, '.ico': FileImage, '.webp': FileImage
};

function getFileIcon(filename) {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return FILE_ICONS[ext] || File;
}

function TreeNode({ item, level, isExpanded, isLoading, error, children, onToggle }) {
  const IconComponent = item.isDirectory
    ? (isExpanded ? FolderOpen : Folder)
    : getFileIcon(item.name);

  return (
    <div className="folder-tree-node">
      <div
        className={`folder-tree-item ${item.isDirectory ? 'directory' : 'file'}`}
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={item.isDirectory ? () => onToggle(item.path) : undefined}
        title={item.name}
      >
        {item.isDirectory && (
          <ChevronRight
            size={14}
            className={`tree-icon chevron ${isExpanded ? 'expanded' : ''}`}
          />
        )}
        {!item.isDirectory && <span style={{ width: 14 }} />}
        <IconComponent
          size={16}
          className={`tree-icon ${item.isDirectory ? 'folder' : 'file'} ${isExpanded ? 'open' : ''}`}
        />
        <span className="tree-name">{item.name}</span>
        {isLoading && <Loader2 size={12} className="tree-loading-spinner" />}
      </div>
      {error && (
        <div className="tree-error" style={{ paddingLeft: `${(level + 1) * 20}px` }}>
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
      {isExpanded && children && (
        <div className="folder-tree-children">
          {children}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  items,
  level = 0,
  isExpanded,
  isLoading,
  getContents,
  getError,
  onToggle
}) {
  if (!items || items.length === 0) {
    return level > 0 ? (
      <div className="tree-empty" style={{ paddingLeft: `${level * 20}px` }}>
        Empty folder
      </div>
    ) : null;
  }

  return (
    <div className="folder-tree">
      {items.map((item) => {
        const expanded = item.isDirectory && isExpanded(item.path);
        const loading = item.isDirectory && isLoading(item.path);
        const contentData = item.isDirectory ? getContents(item.path) : null;
        const error = item.isDirectory ? getError(item.path) : null;

        return (
          <TreeNode
            key={item.path}
            item={item}
            level={level}
            isExpanded={expanded}
            isLoading={loading}
            error={error}
            onToggle={onToggle}
          >
            {expanded && contentData && (
              <FolderTree
                items={contentData.items}
                level={level + 1}
                isExpanded={isExpanded}
                isLoading={isLoading}
                getContents={getContents}
                getError={getError}
                onToggle={onToggle}
              />
            )}
          </TreeNode>
        );
      })}
    </div>
  );
}

export default FolderTree;
