import React from 'react';
import './HomeScreen.css';

const apps = [
  {
    id: 'memory',
    name: 'Memory Viewer',
    description: 'Track CLAUDE.md changes, view diffs, manage snapshots',
    icon: '🧠',
    accent: '#f87171',
  },
  {
    id: 'vision',
    name: 'Vision',
    description: 'Live camera feed with Claude Vision API integration',
    icon: '👁️',
    accent: '#8b5cf6',
  },
  {
    id: 'chain',
    name: 'Chain Runner',
    description: 'Multi-agent AI chains with OpenAI, Anthropic, HuggingFace, Ollama',
    icon: '🔗',
    accent: '#3b82f6',
  },
];

export default function HomeScreen({ onOpenApp }) {
  return (
    <div className="home-screen">
      <header className="home-header">
        <div className="home-header-content">
          <h1>AI Command Center</h1>
          <p>Your unified AI dashboard</p>
        </div>
        <button
          className="settings-btn"
          onClick={() => onOpenApp('settings')}
          title="Settings"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      <div className="app-grid">
        {apps.map(app => (
          <button
            key={app.id}
            className="app-card"
            onClick={() => onOpenApp(app.id)}
            style={{ '--card-accent': app.accent }}
          >
            <div className="app-icon">{app.icon}</div>
            <h2>{app.name}</h2>
            <p>{app.description}</p>
          </button>
        ))}
      </div>

      <footer className="home-footer">
        <p>v2.0 • Built with Electron + React</p>
      </footer>
    </div>
  );
}
