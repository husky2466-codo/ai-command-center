import React, { useEffect } from 'react';
import { FolderTree } from './FolderTree';
import { useFolderTree } from './hooks/useFolderTree';
import './FolderBrowser.css';

export function FolderBrowser({ fsPath, projectId }) {
  const {
    toggleFolder,
    loadDirectory,
    isExpanded,
    isLoading,
    getContents,
    getError
  } = useFolderTree(fsPath);

  // Load root directory on mount
  useEffect(() => {
    if (fsPath) {
      loadDirectory(fsPath);
    }
  }, [fsPath, loadDirectory]);

  const rootContents = getContents(fsPath);
  const rootError = getError(fsPath);
  const rootLoading = isLoading(fsPath);

  // Truncate path for display
  const displayPath = fsPath && fsPath.length > 40
    ? '...' + fsPath.slice(-37)
    : fsPath;

  return (
    <div className="folder-browser">
      <div className="folder-browser-header">
        <span className="folder-browser-title">Folder Tree</span>
        <span className="folder-browser-path" title={fsPath}>{displayPath}</span>
      </div>
      <div className="folder-browser-content">
        {rootLoading && !rootContents && (
          <div className="folder-browser-loading">Loading...</div>
        )}
        {rootError && !rootContents && (
          <div className="folder-browser-error">{rootError}</div>
        )}
        {rootContents && (
          <>
            <FolderTree
              items={rootContents.items}
              level={0}
              isExpanded={isExpanded}
              isLoading={isLoading}
              getContents={getContents}
              getError={getError}
              onToggle={toggleFolder}
            />
            {rootContents.truncated && (
              <div className="folder-browser-truncated">
                ... and {rootContents.totalCount - rootContents.items.length} more items
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FolderBrowser;
