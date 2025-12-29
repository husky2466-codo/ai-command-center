import React from 'react';
import './TabNavigation.css';

export default function TabNavigation({ tabs, activeTabId, onSelectTab, onCloseTab, onGoHome }) {
  return (
    <div className="tab-bar">
      <button className="home-btn" onClick={onGoHome} title="Home">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </button>

      <div className="tabs-container">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            style={{ '--tab-accent': tab.accent }}
          >
            <button
              className="tab-button"
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.name}
            </button>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
