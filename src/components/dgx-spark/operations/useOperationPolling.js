import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for polling DGX operations from the API
 * Groups operations by type (servers, jobs, programs)
 * Auto-refreshes every 2 seconds
 */
export default function useOperationPolling(connectionId, isConnected) {
  const [operations, setOperations] = useState({
    servers: [],
    jobs: [],
    programs: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOperations = useCallback(async () => {
    if (!isConnected || !connectionId) {
      setOperations({ servers: [], jobs: [], programs: [] });
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3939/api/dgx/operations?connection_id=${connectionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch operations');
      }

      // Group operations by type
      const grouped = {
        servers: data.data.filter(op => op.type === 'server'),
        jobs: data.data.filter(op => op.type === 'training_job' || op.type === 'job'),
        programs: data.data.filter(op => op.type === 'script' || op.type === 'program')
      };

      setOperations(grouped);
    } catch (err) {
      console.error('Operation polling error:', err);
      setError(err.message);
      setOperations({ servers: [], jobs: [], programs: [] });
    } finally {
      setLoading(false);
    }
  }, [connectionId, isConnected]);

  // Initial fetch
  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Polling interval (2 seconds)
  useEffect(() => {
    if (!isConnected || !connectionId) return;

    const interval = setInterval(() => {
      fetchOperations();
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, connectionId, fetchOperations]);

  return {
    operations,
    loading,
    error,
    refresh: fetchOperations
  };
}
