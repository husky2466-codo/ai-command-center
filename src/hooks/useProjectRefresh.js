import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing project refresh functionality via IPC events
 *
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoSubscribe=true] - Automatically subscribe to IPC events on mount
 * @param {Function} [options.onRefresh=null] - Callback fired when projects are refreshed
 * @param {Function} [options.onError=null] - Callback fired when refresh fails
 *
 * @returns {Object} Hook state and methods
 * @returns {Array} returns.projects - Array of project objects
 * @returns {Date|null} returns.lastRefresh - Timestamp of last successful refresh
 * @returns {boolean} returns.isRefreshing - Whether a refresh is currently in progress
 * @returns {Object|null} returns.daemonStatus - Status of the project watcher daemon
 * @returns {Error|null} returns.error - Last error that occurred
 * @returns {Function} returns.refresh - Manually trigger a project refresh
 * @returns {Function} returns.setRefreshInterval - Set the daemon refresh interval
 * @returns {Function} returns.getProject - Get a single project by ID
 * @returns {Function} returns.getProjectsByStatus - Get projects filtered by status
 *
 * @example
 * const {
 *   projects,
 *   lastRefresh,
 *   isRefreshing,
 *   refresh,
 *   getProjectsByStatus
 * } = useProjectRefresh({
 *   onRefresh: (projects) => console.log('Projects updated:', projects),
 *   onError: (error) => console.error('Refresh failed:', error)
 * });
 */
export function useProjectRefresh(options = {}) {
  const {
    autoSubscribe = true,
    onRefresh = null,
    onError = null
  } = options;

  // State
  const [projects, setProjects] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [daemonStatus, setDaemonStatus] = useState(null);
  const [error, setError] = useState(null);

  // Refs for callbacks to avoid stale closures
  const onRefreshRef = useRef(onRefresh);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  /**
   * Handle successful project refresh
   * @param {Object} data - Refresh event data
   * @param {Array} data.projects - Updated projects array
   * @param {number} data.timestamp - Timestamp of refresh
   */
  const handleProjectsRefreshed = useCallback((data) => {
    setProjects(data.projects || []);
    setLastRefresh(new Date(data.timestamp));
    setIsRefreshing(false);
    setError(null);

    // Fire optional callback
    if (onRefreshRef.current) {
      onRefreshRef.current(data.projects || []);
    }
  }, []);

  /**
   * Handle project refresh error
   * @param {Object} data - Error event data
   * @param {string} data.message - Error message
   * @param {Error} data.error - Error object
   */
  const handleProjectsRefreshError = useCallback((data) => {
    const errorObj = new Error(data.message || 'Project refresh failed');
    setError(errorObj);
    setIsRefreshing(false);

    // Fire optional callback
    if (onErrorRef.current) {
      onErrorRef.current(errorObj);
    }
  }, []);

  /**
   * Manually trigger a project refresh
   * @returns {Promise<void>}
   */
  const refresh = useCallback(async () => {
    if (!window.electronAPI?.projectsManualRefresh) {
      const err = new Error('electronAPI.projectsManualRefresh not available');
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      await window.electronAPI.projectsManualRefresh();
      // Note: actual state update happens via IPC event handler
    } catch (err) {
      setError(err);
      setIsRefreshing(false);
      if (onErrorRef.current) onErrorRef.current(err);
    }
  }, []);

  /**
   * Set the daemon refresh interval
   * @param {number} intervalMs - Interval in milliseconds (min: 10000)
   * @returns {Promise<void>}
   */
  const setRefreshInterval = useCallback(async (intervalMs) => {
    if (!window.electronAPI?.projectsSetRefreshInterval) {
      const err = new Error('electronAPI.projectsSetRefreshInterval not available');
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      return;
    }

    try {
      await window.electronAPI.projectsSetRefreshInterval(intervalMs);
    } catch (err) {
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
    }
  }, []);

  /**
   * Get a single project by ID
   * @param {string} id - Project UUID
   * @returns {Object|undefined} Project object or undefined if not found
   */
  const getProject = useCallback((id) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  /**
   * Get projects filtered by status
   * @param {string} status - Project status (active_focus, on_deck, growing, on_hold, completed)
   * @returns {Array} Filtered array of projects
   */
  const getProjectsByStatus = useCallback((status) => {
    return projects.filter(p => p.status === status);
  }, [projects]);

  /**
   * Fetch daemon status
   * @returns {Promise<void>}
   */
  const fetchDaemonStatus = useCallback(async () => {
    if (!window.electronAPI?.projectsDaemonStatus) {
      return;
    }

    try {
      const status = await window.electronAPI.projectsDaemonStatus();
      setDaemonStatus(status);
    } catch (err) {
      console.error('Failed to fetch daemon status:', err);
    }
  }, []);

  // Subscribe to IPC events
  useEffect(() => {
    if (!autoSubscribe || !window.electronAPI) {
      return;
    }

    let unsubscribeRefreshed;
    let unsubscribeError;

    // Subscribe to events
    if (window.electronAPI.onProjectsRefreshed) {
      unsubscribeRefreshed = window.electronAPI.onProjectsRefreshed(handleProjectsRefreshed);
    }

    if (window.electronAPI.onProjectsRefreshError) {
      unsubscribeError = window.electronAPI.onProjectsRefreshError(handleProjectsRefreshError);
    }

    // Fetch initial daemon status
    fetchDaemonStatus();

    // Cleanup function
    return () => {
      if (unsubscribeRefreshed) {
        unsubscribeRefreshed();
      }
      if (unsubscribeError) {
        unsubscribeError();
      }
    };
  }, [autoSubscribe, handleProjectsRefreshed, handleProjectsRefreshError, fetchDaemonStatus]);

  return {
    // State
    projects,
    lastRefresh,
    isRefreshing,
    daemonStatus,
    error,

    // Methods
    refresh,
    setRefreshInterval,
    getProject,
    getProjectsByStatus
  };
}

export default useProjectRefresh;
