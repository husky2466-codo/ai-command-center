import React, { useState, useEffect } from 'react';
import { listChainConfigs, saveChainConfig, loadChainConfig, deleteChainConfig } from './configManager';

export default function ConfigModal({ isOpen, mode, onClose, onSave, onLoad, currentConfig }) {
  const [configs, setConfigs] = useState([]);
  const [configName, setConfigName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'load') {
      loadConfigList();
    }
  }, [isOpen, mode]);

  const loadConfigList = async () => {
    if (!window.electronAPI) return;
    setIsLoading(true);
    const result = await listChainConfigs(window.electronAPI);
    if (result.success) setConfigs(result.configs);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!configName.trim() || !window.electronAPI) return;
    const result = await saveChainConfig(currentConfig, configName.trim(), window.electronAPI);
    if (result.success) {
      onSave?.(result.filename);
      onClose();
    }
  };

  const handleLoad = async (filename) => {
    if (!window.electronAPI) return;
    const result = await loadChainConfig(filename, window.electronAPI);
    if (result.success) {
      onLoad?.(result.config);
      onClose();
    }
  };

  const handleDelete = async (filename) => {
    if (!window.electronAPI || !confirm('Delete this configuration?')) return;
    await deleteChainConfig(filename, window.electronAPI);
    loadConfigList();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && mode === 'save' && configName.trim()) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="config-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="config-modal">
        <div className="config-modal-header">
          <h3>{mode === 'save' ? 'Save Configuration' : 'Load Configuration'}</h3>
          <button className="config-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="config-modal-content">
          {mode === 'save' ? (
            <div className="config-save-form">
              <label>Configuration Name</label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., AV Training - Microphones"
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleSave} disabled={!configName.trim()}>
                Save Configuration
              </button>
            </div>
          ) : (
            <div className="config-load-list">
              {isLoading ? (
                <div className="config-loading">Loading...</div>
              ) : configs.length === 0 ? (
                <div className="config-empty">No saved configurations</div>
              ) : (
                configs.map((config) => (
                  <div key={config.filename} className="config-item">
                    <div className="config-item-info">
                      <div className="config-item-name">{config.name}</div>
                      <div className="config-item-meta">
                        {config.agents?.length || 0} agents • {new Date(config.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="config-item-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => handleLoad(config.filename)}>
                        Load
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(config.filename)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
