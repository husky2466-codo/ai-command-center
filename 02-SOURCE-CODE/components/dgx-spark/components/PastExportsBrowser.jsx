import { useState, useEffect } from 'react';
import { FileJson, Trash2, Eye, GitCompare, RefreshCw } from 'lucide-react';

function PastExportsBrowser({ connectionId, onViewExport, onCompareExports }) {
  const [exports, setExports] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Load exports on mount and when connection changes
  useEffect(() => {
    loadExports();

    // Start watching for changes
    window.electronAPI.dgxExportsStartWatching();

    // Listen for changes
    const unsubscribe = window.electronAPI.onDgxExportsChanged((change) => {
      console.log('[Exports] Change detected:', change);
      loadExports();
    });

    return () => {
      unsubscribe();
      window.electronAPI.dgxExportsStopWatching();
    };
  }, [connectionId]);

  const loadExports = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.dgxExportsList(connectionId);
      if (result.success) {
        setExports(result.data);
      }
    } catch (err) {
      console.error('Failed to load exports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (filename) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        // Max 2 selections for comparison
        if (next.size >= 2) {
          const first = Array.from(next)[0];
          next.delete(first);
        }
        next.add(filename);
      }
      return next;
    });
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;

    setDeleting(filename);
    try {
      const result = await window.electronAPI.dgxExportsDelete(filename);
      if (result.success) {
        setExports(prev => prev.filter(e => e.filename !== filename));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(filename);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleView = async () => {
    const selected = Array.from(selectedIds)[0];
    if (!selected) return;

    const result = await window.electronAPI.dgxExportsRead(selected);
    if (result.success) {
      onViewExport(result.data, selected);
    }
  };

  const handleCompare = async () => {
    const selectedArray = Array.from(selectedIds);
    if (selectedArray.length !== 2) return;

    const [result1, result2] = await Promise.all([
      window.electronAPI.dgxExportsRead(selectedArray[0]),
      window.electronAPI.dgxExportsRead(selectedArray[1])
    ]);

    if (result1.success && result2.success) {
      onCompareExports(
        { data: result1.data, filename: selectedArray[0] },
        { data: result2.data, filename: selectedArray[1] }
      );
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="past-exports-section">
      <div className="past-exports-header">
        <h4>Past Exports</h4>
        <button className="btn btn-icon" onClick={loadExports} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {exports.length === 0 ? (
        <div className="exports-empty">
          <FileJson size={32} strokeWidth={1.5} />
          <p>No saved exports yet</p>
        </div>
      ) : (
        <>
          <div className="exports-list">
            {exports.map(exp => (
              <div
                key={exp.filename}
                className={`export-item ${selectedIds.has(exp.filename) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(exp.filename)}
                  onChange={() => handleSelect(exp.filename)}
                  className="export-checkbox"
                />
                <div className="export-info" onClick={() => handleSelect(exp.filename)}>
                  <span className="export-name">{exp.filename}</span>
                  <span className="export-meta">
                    {formatDate(exp.modified)} • {formatSize(exp.size)}
                  </span>
                </div>
                <button
                  className="btn btn-icon btn-danger"
                  onClick={() => handleDelete(exp.filename)}
                  disabled={deleting === exp.filename}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="exports-actions">
            <button
              className="btn btn-secondary"
              onClick={handleView}
              disabled={selectedIds.size !== 1}
            >
              <Eye size={16} />
              View Selected
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCompare}
              disabled={selectedIds.size !== 2}
            >
              <GitCompare size={16} />
              Compare ({selectedIds.size}/2)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default PastExportsBrowser;
