import React, { useState, useMemo } from 'react';
import { Activity, Search, RefreshCw, Info, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import './DGXProcessList.css';

/**
 * Enhanced process list with filtering, search, and actions
 * @param {Array} processes - Array of GPU process objects
 * @param {string} connectionId - DGX connection ID
 * @param {Function} onRefresh - Callback to refresh process list
 * @param {Function} onShowDetails - Callback when details button clicked
 */
export function DGXProcessList({
  processes = [],
  connectionId = null,
  onRefresh = null,
  onShowDetails = null
}) {
  const [sortBy, setSortBy] = useState('gpu_memory');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [gpuFilter, setGpuFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [killingPids, setKillingPids] = useState([]);

  // Extract unique GPU indices and users
  const uniqueGpus = useMemo(() => {
    const gpus = new Set(processes.map(p => p.gpu_index));
    return Array.from(gpus).sort((a, b) => a - b);
  }, [processes]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(processes.map(p => p.user || 'unknown').filter(Boolean));
    return Array.from(users).sort();
  }, [processes]);

  // Filter and sort processes
  const filteredAndSorted = useMemo(() => {
    if (!processes || processes.length === 0) return [];

    // Apply filters
    let filtered = processes.filter(proc => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = proc.name?.toLowerCase().includes(search);
        const matchesCommand = proc.command?.toLowerCase().includes(search);
        if (!matchesName && !matchesCommand) return false;
      }

      // GPU filter
      if (gpuFilter !== 'all' && proc.gpu_index !== parseInt(gpuFilter)) {
        return false;
      }

      // User filter
      if (userFilter !== 'all' && proc.user !== userFilter) {
        return false;
      }

      return true;
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [processes, sortBy, sortOrder, searchTerm, gpuFilter, userFilter]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleKillProcess = async (proc) => {
    const confirmed = window.confirm(
      `Are you sure you want to kill process ${proc.pid} (${proc.name})?\n\n` +
      `This will terminate: ${proc.command}`
    );

    if (!confirmed) return;

    setKillingPids(prev => [...prev, proc.pid]);

    try {
      // Call kill API (placeholder - will be implemented in backend)
      const response = await fetch(`http://localhost:3939/api/dgx/kill-process/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: proc.pid, signal: 'TERM' })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to kill process');
      }

      console.log(`Process ${proc.pid} killed successfully`);

      // Refresh process list
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to kill process:', error);
      alert(`Failed to kill process: ${error.message}`);
    } finally {
      setKillingPids(prev => prev.filter(pid => pid !== proc.pid));
    }
  };

  const formatMemory = (mb) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const truncate = (str, maxLen) => {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  };

  const getRowClassName = (proc) => {
    const classes = ['process-row'];
    if (proc.status === 'zombie') classes.push('zombie');
    if (proc.gpu_memory > 10240) classes.push('high-memory');
    return classes.join(' ');
  };

  const getStatusClassName = (status) => {
    if (!status || status === 'running') return 'status-running';
    if (status === 'zombie') return 'status-zombie';
    return 'status-unknown';
  };

  if (!processes || processes.length === 0) {
    return (
      <div className="process-list empty">
        <Activity size={48} />
        <p>No GPU processes running</p>
      </div>
    );
  }

  return (
    <div className="process-list">
      <div className="process-list-header">
        <div className="header-left">
          <Activity size={16} />
          <h3>GPU Processes</h3>
          <span className="process-count">{filteredAndSorted.length} of {processes.length}</span>
        </div>
        <div className="header-right">
          {onRefresh && (
            <button
              className="btn-refresh"
              onClick={onRefresh}
              title="Refresh process list"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="process-filters">
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search processes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={gpuFilter}
          onChange={(e) => setGpuFilter(e.target.value)}
        >
          <option value="all">All GPUs</option>
          {uniqueGpus.map(gpu => (
            <option key={gpu} value={gpu}>GPU {gpu}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        >
          <option value="all">All Users</option>
          {uniqueUsers.map(user => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
      </div>

      <div className="process-table-wrapper">
        <table className="process-table">
          <thead>
            <tr>
              <th
                className={sortBy === 'pid' ? 'sorted' : ''}
                onClick={() => handleSort('pid')}
              >
                PID {sortBy === 'pid' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className={sortBy === 'name' ? 'sorted' : ''}
                onClick={() => handleSort('name')}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className={sortBy === 'user' ? 'sorted' : ''}
                onClick={() => handleSort('user')}
              >
                User {sortBy === 'user' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className={sortBy === 'gpu_index' ? 'sorted' : ''}
                onClick={() => handleSort('gpu_index')}
              >
                GPU {sortBy === 'gpu_index' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className={sortBy === 'gpu_memory' ? 'sorted' : ''}
                onClick={() => handleSort('gpu_memory')}
              >
                Memory {sortBy === 'gpu_memory' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Command</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((proc) => (
              <tr key={proc.pid} className={getRowClassName(proc)}>
                <td className="process-pid">{proc.pid}</td>
                <td className="process-name">{proc.name}</td>
                <td className="process-user">{proc.user || 'N/A'}</td>
                <td className="process-gpu">GPU {proc.gpu_index}</td>
                <td className="process-memory">
                  {formatMemory(proc.gpu_memory)}
                  {proc.gpu_memory > 10240 && (
                    <AlertTriangle size={14} className="warning-icon" title="High memory usage" />
                  )}
                </td>
                <td className="process-command" title={proc.command}>
                  {truncate(proc.command, 40)}
                </td>
                <td>
                  <span className={`status-indicator ${getStatusClassName(proc.status)}`}>
                    {proc.status || 'running'}
                  </span>
                </td>
                <td className="process-actions">
                  {onShowDetails && (
                    <button
                      className="btn-icon btn-details"
                      onClick={() => onShowDetails(proc)}
                      title="View details"
                    >
                      <Info size={16} />
                    </button>
                  )}
                  <button
                    className="btn-icon btn-kill"
                    onClick={() => handleKillProcess(proc)}
                    title="Kill process"
                    disabled={killingPids.includes(proc.pid)}
                  >
                    {killingPids.includes(proc.pid) ? (
                      <Loader2 size={16} className="spinning" />
                    ) : (
                      <XCircle size={16} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length === 0 && processes.length > 0 && (
        <div className="process-list-footer">
          No processes match the current filters
        </div>
      )}
    </div>
  );
}
