import { useState, useCallback } from 'react';

export function useFolderTree(rootPath) {
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [loadingPaths, setLoadingPaths] = useState(new Set());
  const [contents, setContents] = useState(new Map());
  const [errors, setErrors] = useState(new Map());

  const loadDirectory = useCallback(async (dirPath) => {
    if (contents.has(dirPath)) return; // Already loaded

    setLoadingPaths(prev => new Set(prev).add(dirPath));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(dirPath);
      return next;
    });

    try {
      const result = await window.electronAPI.listDirectoryDetailed(dirPath);

      if (result.success) {
        setContents(prev => new Map(prev).set(dirPath, {
          items: result.items,
          truncated: result.truncated,
          totalCount: result.totalCount
        }));
      } else {
        setErrors(prev => new Map(prev).set(dirPath, result.error));
      }
    } catch (error) {
      setErrors(prev => new Map(prev).set(dirPath, error.message));
    } finally {
      setLoadingPaths(prev => {
        const next = new Set(prev);
        next.delete(dirPath);
        return next;
      });
    }
  }, [contents]);

  const toggleFolder = useCallback(async (folderPath) => {
    const isExpanded = expandedPaths.has(folderPath);

    if (isExpanded) {
      // Collapse
      setExpandedPaths(prev => {
        const next = new Set(prev);
        next.delete(folderPath);
        return next;
      });
    } else {
      // Expand - load contents first if needed
      if (!contents.has(folderPath)) {
        await loadDirectory(folderPath);
      }
      setExpandedPaths(prev => new Set(prev).add(folderPath));
    }
  }, [expandedPaths, contents, loadDirectory]);

  const clearCache = useCallback(() => {
    setContents(new Map());
    setExpandedPaths(new Set());
    setErrors(new Map());
  }, []);

  const isExpanded = useCallback((path) => expandedPaths.has(path), [expandedPaths]);
  const isLoading = useCallback((path) => loadingPaths.has(path), [loadingPaths]);
  const getContents = useCallback((path) => contents.get(path), [contents]);
  const getError = useCallback((path) => errors.get(path), [errors]);

  return {
    expandedPaths,
    loadingPaths,
    contents,
    errors,
    toggleFolder,
    loadDirectory,
    clearCache,
    isExpanded,
    isLoading,
    getContents,
    getError
  };
}
