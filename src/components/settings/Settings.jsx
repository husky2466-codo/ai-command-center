import React, { useState, useEffect, useRef } from 'react';
import './Settings.css';

export default function Settings({ apiKeys }) {
  const [debugMode, setDebugMode] = useState(() => {
    // Load debug mode from localStorage on initial render
    return localStorage.getItem('debugMode') === 'true';
  });
  const [logs, setLogs] = useState([]);
  const [appPaths, setAppPaths] = useState({});
  const [sessionFiles, setSessionFiles] = useState([]);
  const [recordingFiles, setRecordingFiles] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    loadAppPaths();
    loadDataFiles();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!debugMode) return;

    // Store original console methods
    const original = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    // Override console methods to intercept logs
    console.log = (...args) => {
      addLog('log', args);
      original.log.apply(console, args);
    };
    console.error = (...args) => {
      addLog('error', args);
      original.error.apply(console, args);
    };
    console.warn = (...args) => {
      addLog('warn', args);
      original.warn.apply(console, args);
    };

    // Cleanup: restore original console methods
    return () => {
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
    };
  }, [debugMode]);

  const addLog = (type, args) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    setLogs(prev => [...prev.slice(-100), {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const loadAppPaths = async () => {
    if (!window.electronAPI) return;
    const userDataPath = await window.electronAPI.getUserDataPath();
    const appPath = await window.electronAPI.getAppPath();
    setAppPaths({
      userData: userDataPath,
      appPath: appPath,
      sessions: `${userDataPath}\\sessions`,
      recordings: `${appPath}\\recordings`,
      configs: `${userDataPath}\\configs`,
    });
  };

  const loadDataFiles = async () => {
    if (!window.electronAPI) return;
    const userDataPath = await window.electronAPI.getUserDataPath();
    const appPath = await window.electronAPI.getAppPath();

    // Load session files
    const sessions = await window.electronAPI.listDirectory(`${userDataPath}\\sessions`);
    if (sessions.success) {
      setSessionFiles(sessions.files.filter(f => f.endsWith('.json')).slice(-10).reverse());
    }

    // Load recording files from app folder
    const recordings = await window.electronAPI.listDirectory(`${appPath}\\recordings`);
    if (recordings.success) {
      setRecordingFiles(recordings.files.filter(f => f.endsWith('.webm')).slice(-10).reverse());
    }
  };

  const toggleDebugMode = () => {
    const newValue = !debugMode;
    setDebugMode(newValue);
    localStorage.setItem('debugMode', String(newValue));

    if (newValue) {
      addLog('log', ['Debug mode enabled']);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const clearAllData = async () => {
    if (!window.electronAPI) return;
    if (!confirm('This will delete all session logs and recordings. Continue?')) return;

    const userDataPath = await window.electronAPI.getUserDataPath();

    // Note: We'd need a deleteDirectory API for full cleanup
    // For now just notify user
    alert(`Data stored in:\n${userDataPath}\n\nManually delete sessions/ and recordings/ folders to clear.`);
    loadDataFiles();
  };

  const openDataFolder = async () => {
    if (!window.electronAPI) return;
    const userDataPath = await window.electronAPI.getUserDataPath();
    // Open in explorer
    window.electronAPI.openPath?.(userDataPath);
  };

  const maskApiKey = (key) => {
    if (!key) return 'Not set';
    if (key.length < 12) return '****';
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  const testApi = async (provider) => {
    addLog('log', [`Testing ${provider} API...`]);

    try {
      if (provider === 'anthropic' && apiKeys.ANTHROPIC_API_KEY) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKeys.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say OK' }],
          }),
        });
        const data = await res.json();
        if (data.content) {
          addLog('log', [`Anthropic API: OK - ${data.content[0]?.text}`]);
        } else {
          addLog('error', [`Anthropic API Error: ${JSON.stringify(data.error || data)}`]);
        }
      }

      if (provider === 'openai' && apiKeys.OPENAI_API_KEY) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say OK' }],
          }),
        });
        const data = await res.json();
        if (data.choices) {
          addLog('log', [`OpenAI API: OK - ${data.choices[0]?.message?.content}`]);
        } else {
          addLog('error', [`OpenAI API Error: ${JSON.stringify(data.error || data)}`]);
        }
      }

      if (provider === 'ollama') {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json();
        if (data.models) {
          addLog('log', [`Ollama: OK - ${data.models.length} models available`]);
        } else {
          addLog('error', ['Ollama: Not running or no models']);
        }
      }

      if (provider === 'huggingface' && apiKeys.HF_TOKEN) {
        addLog('log', ['HuggingFace: Token present (test requires actual inference call)']);
      }
    } catch (err) {
      addLog('error', [`${provider} API Error: ${err.message}`]);
    }
  };

  return (
    <div className="settings-app">
      <div className="settings-header">
        <h2>Settings</h2>
        <span className="app-version">AI Command Center v2.0.0</span>
      </div>

      <div className="settings-content">
        {/* Debug Mode Section */}
        <section className="settings-section">
          <h3>Debug Mode</h3>
          <div className="setting-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={toggleDebugMode}
              />
              <span>Enable Debug Mode</span>
            </label>
            <small>Shows console logs and additional diagnostics</small>
          </div>
        </section>

        {/* API Keys Section */}
        <section className="settings-section">
          <h3>API Keys Status</h3>
          <div className="api-keys-grid">
            <div className="api-key-item">
              <span className="key-name">Anthropic</span>
              <span className={`key-status ${apiKeys.ANTHROPIC_API_KEY ? 'active' : 'missing'}`}>
                {maskApiKey(apiKeys.ANTHROPIC_API_KEY)}
              </span>
              <button
                className="btn btn-sm"
                onClick={() => testApi('anthropic')}
                disabled={!apiKeys.ANTHROPIC_API_KEY}
              >
                Test
              </button>
            </div>
            <div className="api-key-item">
              <span className="key-name">OpenAI</span>
              <span className={`key-status ${apiKeys.OPENAI_API_KEY ? 'active' : 'missing'}`}>
                {maskApiKey(apiKeys.OPENAI_API_KEY)}
              </span>
              <button
                className="btn btn-sm"
                onClick={() => testApi('openai')}
                disabled={!apiKeys.OPENAI_API_KEY}
              >
                Test
              </button>
            </div>
            <div className="api-key-item">
              <span className="key-name">HuggingFace</span>
              <span className={`key-status ${apiKeys.HF_TOKEN ? 'active' : 'missing'}`}>
                {maskApiKey(apiKeys.HF_TOKEN)}
              </span>
              <button
                className="btn btn-sm"
                onClick={() => testApi('huggingface')}
                disabled={!apiKeys.HF_TOKEN}
              >
                Test
              </button>
            </div>
            <div className="api-key-item">
              <span className="key-name">Ollama</span>
              <span className="key-status active">Local</span>
              <button className="btn btn-sm" onClick={() => testApi('ollama')}>
                Test
              </button>
            </div>
          </div>
          <small className="api-hint">API keys loaded from ~/.env file</small>
        </section>

        {/* Data Management Section */}
        <section className="settings-section">
          <h3>Data Management</h3>
          <div className="data-paths">
            <div className="path-item">
              <span className="path-label">User Data:</span>
              <code>{appPaths.userData || 'Loading...'}</code>
            </div>
            <div className="path-item">
              <span className="path-label">Sessions:</span>
              <span className="file-count">{sessionFiles.length} files</span>
            </div>
            <div className="path-item">
              <span className="path-label">Recordings:</span>
              <span className="file-count">{recordingFiles.length} files</span>
            </div>
          </div>
          <div className="data-actions">
            <button className="btn btn-ghost" onClick={loadDataFiles}>
              Refresh
            </button>
            <button className="btn btn-ghost" onClick={openDataFolder}>
              Open Folder
            </button>
            <button className="btn btn-danger" onClick={clearAllData}>
              Clear All Data
            </button>
          </div>
        </section>

        {/* Recent Sessions */}
        {sessionFiles.length > 0 && (
          <section className="settings-section">
            <h3>Recent Sessions</h3>
            <ul className="file-list">
              {sessionFiles.map((file, idx) => (
                <li key={idx}>{file}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Console Logs (only when debug mode is on) */}
        {debugMode && (
          <section className="settings-section debug-console">
            <div className="console-header">
              <h3>Console Output</h3>
              <button className="btn btn-sm" onClick={clearLogs}>Clear</button>
            </div>
            <div className="console-logs">
              {logs.length === 0 ? (
                <div className="console-empty">No logs yet. Interact with the app to see output.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className={`log-entry log-${log.type}`}>
                    <span className="log-time">{log.timestamp}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
