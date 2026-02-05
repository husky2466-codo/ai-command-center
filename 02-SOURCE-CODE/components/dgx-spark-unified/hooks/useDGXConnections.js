/**
 * useDGXConnections Hook
 * Phase 2: Multi-Connection Management
 *
 * Manages multiple active DGX server connections with:
 * - Loading all connections from database
 * - Parallel SSH connection logic
 * - Status polling every 5 seconds
 * - Reconnection logic on failure
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Get DGX service from window (will be added to DataService exports)
const getDGXAPI = () => {
  if (window.electronAPI && window.electronAPI.dgx) {
    return window.electronAPI.dgx;
  }
  throw new Error('DGX API not available');
};

/**
 * Hook for managing DGX connections
 * @returns {Object} Connection state and methods
 */
export const useDGXConnections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status polling interval ref
  const pollingIntervalRef = useRef(null);

  /**
   * Load all connections from database
   */
  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dgxAPI = getDGXAPI();

      // Fetch all connections from database
      const result = await dgxAPI.getConnections();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load connections');
      }

      // Parse and enrich connection data
      const enrichedConnections = (result.data || []).map(conn => ({
        ...conn,
        connected: conn.is_active === 1,
        status: conn.is_active === 1 ? 'online' : 'offline',
        lastPing: null,
        errorMessage: null
      }));

      setConnections(enrichedConnections);
      setLoading(false);
    } catch (err) {
      console.error('[useDGXConnections] Load error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  /**
   * Connect to a single DGX server
   * @param {string} connectionId - Connection ID
   */
  const connectSingle = useCallback(async (connectionId) => {
    try {
      const dgxAPI = getDGXAPI();
      const connection = connections.find(c => c.id === connectionId);

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Update status to connecting
      setConnections(prev => prev.map(c =>
        c.id === connectionId
          ? { ...c, status: 'connecting', errorMessage: null }
          : c
      ));

      // Attempt SSH connection
      const result = await dgxAPI.connect(connectionId);

      if (!result.success) {
        throw new Error(result.error || 'Connection failed');
      }

      // Update status to online
      setConnections(prev => prev.map(c =>
        c.id === connectionId
          ? { ...c, connected: true, status: 'online', lastPing: new Date().toISOString() }
          : c
      ));

      return { success: true };
    } catch (err) {
      console.error(`[useDGXConnections] Connect error (${connectionId}):`, err);

      // Update status to error
      setConnections(prev => prev.map(c =>
        c.id === connectionId
          ? { ...c, connected: false, status: 'error', errorMessage: err.message }
          : c
      ));

      return { success: false, error: err.message };
    }
  }, [connections]);

  /**
   * Disconnect from a single DGX server
   * @param {string} connectionId - Connection ID
   */
  const disconnectSingle = useCallback(async (connectionId) => {
    try {
      const dgxAPI = getDGXAPI();

      const result = await dgxAPI.disconnect(connectionId);

      if (!result.success) {
        throw new Error(result.error || 'Disconnect failed');
      }

      // Update status to offline
      setConnections(prev => prev.map(c =>
        c.id === connectionId
          ? { ...c, connected: false, status: 'offline', lastPing: null }
          : c
      ));

      return { success: true };
    } catch (err) {
      console.error(`[useDGXConnections] Disconnect error (${connectionId}):`, err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Connect to all DGX servers in parallel
   */
  const connectAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Connect to all in parallel
    const results = await Promise.allSettled(
      connections.map(conn => connectSingle(conn.id))
    );

    setLoading(false);

    // Check if any failed
    const failedCount = results.filter(r => r.status === 'rejected' || !r.value?.success).length;

    if (failedCount > 0) {
      setError(`${failedCount} connection(s) failed`);
    }

    return {
      success: failedCount === 0,
      failedCount,
      totalCount: connections.length
    };
  }, [connections, connectSingle]);

  /**
   * Disconnect from all DGX servers
   */
  const disconnectAll = useCallback(async () => {
    setLoading(true);

    await Promise.allSettled(
      connections.map(conn => disconnectSingle(conn.id))
    );

    setLoading(false);

    return { success: true };
  }, [connections, disconnectSingle]);

  /**
   * Poll connection status for all connections
   */
  const pollStatuses = useCallback(async () => {
    try {
      const dgxAPI = getDGXAPI();

      // Check status for each connection
      const statusChecks = await Promise.allSettled(
        connections.map(async (conn) => {
          try {
            const result = await dgxAPI.getStatus(conn.id);
            return {
              id: conn.id,
              connected: result.success && result.data?.connected === true,
              lastPing: new Date().toISOString()
            };
          } catch {
            return {
              id: conn.id,
              connected: false,
              lastPing: null
            };
          }
        })
      );

      // Update connection statuses
      setConnections(prev => prev.map(conn => {
        const check = statusChecks.find(s => s.value?.id === conn.id);
        if (!check || check.status === 'rejected') {
          return conn;
        }

        const { connected, lastPing } = check.value;
        return {
          ...conn,
          connected,
          status: connected ? 'online' : 'offline',
          lastPing
        };
      }));
    } catch (err) {
      console.error('[useDGXConnections] Polling error:', err);
    }
  }, [connections]);

  /**
   * Attempt to reconnect failed connections
   */
  const reconnectFailed = useCallback(async () => {
    const failedConnections = connections.filter(c => c.status === 'error' || c.status === 'offline');

    if (failedConnections.length === 0) {
      return { success: true, reconnectedCount: 0 };
    }

    const results = await Promise.allSettled(
      failedConnections.map(conn => connectSingle(conn.id))
    );

    const reconnectedCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;

    return {
      success: reconnectedCount > 0,
      reconnectedCount,
      attemptedCount: failedConnections.length
    };
  }, [connections, connectSingle]);

  /**
   * Load connections on mount
   */
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  /**
   * Start status polling after connections load
   */
  useEffect(() => {
    if (loading || connections.length === 0) {
      return;
    }

    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollStatuses();
    }, 5000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [loading, connections.length, pollStatuses]);

  return {
    connections,
    loading,
    error,
    connectSingle,
    disconnectSingle,
    connectAll,
    disconnectAll,
    reconnectFailed,
    refresh: loadConnections
  };
};
