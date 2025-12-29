import React, { useState, useEffect } from 'react';
import { memoryExtractionService } from '../../services/memoryExtractionService.js';
import { embeddingService } from '../../services/embeddingService.js';
import './TestExtraction.css';

/**
 * TestExtraction - Simple UI for testing memory extraction pipeline
 */
function TestExtraction({ apiKeys }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    checkOllama();
  }, []);

  async function loadSessions() {
    setStatus('Finding Claude Code sessions...');
    const result = await window.electronAPI.memoryFindClaudeSessions();

    if (result.success) {
      setSessions(result.sessions);
      setStatus(`Found ${result.sessions.length} sessions`);
    } else {
      setStatus(`Error: ${result.error}`);
    }
  }

  async function checkOllama() {
    const status = await embeddingService.checkOllamaStatus();
    setOllamaStatus(status);
  }

  async function runExtraction() {
    if (!selectedSession) {
      alert('Please select a session first');
      return;
    }

    if (!apiKeys.ANTHROPIC_API_KEY) {
      alert('Anthropic API key not found');
      return;
    }

    setLoading(true);
    setStatus('Starting extraction...');
    setResults(null);

    try {
      // Extract from full session
      const result = await memoryExtractionService.extractFromSession(
        selectedSession.path,
        apiKeys.ANTHROPIC_API_KEY,
        (current, total) => {
          setStatus(`Processing chunk ${current}/${total}...`);
        }
      );

      setResults(result);
      setStatus('Extraction complete!');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error('Extraction failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="test-extraction">
      <div className="header">
        <h1>Memory Extraction Test</h1>
        <p>Test the complete memory extraction pipeline with real Claude Code sessions</p>
      </div>

      <div className="ollama-status">
        <h3>Ollama Status</h3>
        {ollamaStatus ? (
          <div className={`status-badge ${ollamaStatus.available ? 'success' : 'warning'}`}>
            {ollamaStatus.available ? (
              <span>✓ Available - Using {ollamaStatus.model}</span>
            ) : (
              <span>! {ollamaStatus.error}</span>
            )}
          </div>
        ) : (
          <span>Checking...</span>
        )}
      </div>

      <div className="sessions-panel">
        <h3>Available Sessions ({sessions.length})</h3>
        <div className="sessions-list">
          {sessions.slice(0, 20).map((session, i) => (
            <div
              key={i}
              className={`session-item ${selectedSession === session ? 'selected' : ''}`}
              onClick={() => setSelectedSession(session)}
            >
              <div className="session-title">
                {session.project}/{session.filename}
              </div>
              <div className="session-meta">
                Modified: {new Date(session.modified).toLocaleString()} |
                Size: {(session.size / 1024).toFixed(2)} KB
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="actions">
        <button
          onClick={runExtraction}
          disabled={!selectedSession || loading}
          className="btn-extract"
        >
          {loading ? 'Extracting...' : 'Extract Memories'}
        </button>
        <button onClick={loadSessions} className="btn-refresh">
          Refresh Sessions
        </button>
      </div>

      {status && (
        <div className="status-bar">
          {status}
        </div>
      )}

      {results && (
        <div className="results-panel">
          <h3>Extraction Results</h3>
          <div className="results-summary">
            <div className="stat">
              <label>Session:</label>
              <span>{results.sessionId}</span>
            </div>
            <div className="stat">
              <label>Chunks Processed:</label>
              <span>{results.totalChunks}</span>
            </div>
            <div className="stat">
              <label>Memories Extracted:</label>
              <span>{results.memoriesExtracted}</span>
            </div>
          </div>

          {results.memories.length > 0 && (
            <div className="memories-list">
              <h4>Extracted Memories</h4>
              {results.memories.map((memory, i) => (
                <div key={i} className="memory-card">
                  <div className="memory-header">
                    <span className={`memory-type type-${memory.type}`}>
                      {memory.type}
                    </span>
                    <span className="memory-confidence">
                      {(memory.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h4>{memory.title}</h4>
                  <p className="memory-content">{memory.content}</p>
                  <div className="memory-meta">
                    <span>Category: {memory.category}</span>
                    {memory.related_entities && JSON.parse(memory.related_entities).length > 0 && (
                      <span>Entities: {JSON.parse(memory.related_entities).length}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TestExtraction;
