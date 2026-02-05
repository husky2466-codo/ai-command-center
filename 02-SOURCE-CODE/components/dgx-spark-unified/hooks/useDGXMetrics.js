import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Transform API metrics data to UI format
 * Backend returns: { gpus, memory, network, storage, timestamp }
 * UI expects: { timestamp, gpus, system, processes }
 */
function transformMetrics(apiData) {
  if (!apiData) return null;

  // Transform GPU data
  const gpus = (apiData.gpus || []).map(gpu => ({
    index: gpu.index,
    name: gpu.name,
    utilization: gpu.gpuUtilization || 0,
    memory_used: gpu.memoryUsed || 0,
    memory_total: gpu.memoryTotal || 0,
    temperature: gpu.temperature || 0,
    power_draw: gpu.powerDraw || 0,
    power_limit: 350 // Default power limit, not available from current API
  }));

  // Transform system data
  const system = {
    cpu_usage: 0, // Not available from current API
    memory_used: apiData.memory?.used || 0,
    memory_total: apiData.memory?.total || 0,
    disk_usage: apiData.storage?.usedPercent || 0
  };

  // Mock process data (will be replaced with real data from backend)
  const processes = [
    {
      pid: 12345,
      name: 'python',
      user: 'myers',
      gpu_index: 0,
      gpu_memory: 8192,
      command: 'python train.py --model vit --epochs 100 --batch-size 32',
      status: 'running',
      start_time: '2026-01-25 10:30:00'
    },
    {
      pid: 23456,
      name: 'python',
      user: 'myers',
      gpu_index: 0,
      gpu_memory: 15360,
      command: 'python inference.py --checkpoint best.pt --input data/test_images --output results/',
      status: 'running',
      start_time: '2026-01-25 11:45:00'
    },
    {
      pid: 34567,
      name: 'ComfyUI',
      user: 'root',
      gpu_index: 0,
      gpu_memory: 4096,
      command: 'python main.py --listen 0.0.0.0 --port 8188',
      status: 'running',
      start_time: '2026-01-25 09:15:00'
    },
    {
      pid: 45678,
      name: 'tensorboard',
      user: 'myers',
      gpu_index: 0,
      gpu_memory: 512,
      command: 'tensorboard --logdir=./logs --port=6006 --bind_all',
      status: 'running',
      start_time: '2026-01-25 10:00:00'
    }
  ];

  return {
    timestamp: apiData.timestamp,
    gpus,
    system,
    processes
  };
}

/**
 * Hook for polling DGX metrics at regular intervals
 * @param {string} connectionId - DGX connection ID
 * @param {boolean} enabled - Whether polling is enabled
 * @returns {Object} { metrics, loading, error, refresh }
 */
export function useDGXMetrics(connectionId, enabled = true) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchMetrics = useCallback(async () => {
    if (!connectionId) {
      setError('No connection ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3939/api/dgx/metrics/${connectionId}`);
      const result = await response.json();

      if (!mountedRef.current) return;

      if (result.success) {
        // Transform API data to UI format
        const transformedData = transformMetrics(result.data);
        setMetrics(transformedData);
      } else {
        setError(result.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'Network error');
      console.error('Error fetching DGX metrics:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [connectionId]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Setup polling interval
  useEffect(() => {
    if (!enabled || !connectionId) {
      // Clear interval if disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchMetrics();

    // Setup interval (5 seconds)
    intervalRef.current = setInterval(() => {
      fetchMetrics();
    }, 5000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [connectionId, enabled, fetchMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    metrics,
    loading,
    error,
    refresh
  };
}
