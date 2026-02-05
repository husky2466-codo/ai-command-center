import React from 'react';
import { useLayout } from './LayoutContext';
import ErrorBoundary from '../shared/ErrorBoundary';
import { X, Columns, Rows } from 'lucide-react';
import './layout.css';

export default function PaneContainer({ paneId, APPS, apiKeys, canSplit, showCloseButton }) {
  const {
    getPane,
    openAppInPane,
    closeTabInPane,
    setActiveTabInPane,
    splitPane,
    closePane,
    closeAllTabsInPane,
    moveTab
  } = useLayout();

  const [dragOverPaneId, setDragOverPaneId] = React.useState(null);
  const pane = getPane(paneId);

  if (!pane) {
    return <div>Pane not found</div>;
  }

  const { tabs, activeTabId } = pane;
  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleGoHome = () => {
    setActiveTabInPane(paneId, null);
  };

  const handleSplitRight = () => {
    splitPane(paneId, 'horizontal');
  };

  const handleSplitDown = () => {
    splitPane(paneId, 'vertical');
  };

  const handleClosePane = () => {
    closePane(paneId);
  };

  const handleCloseAllTabs = () => {
    closeAllTabsInPane(paneId);
  };

  // Drag and drop handlers
  const handleDragStart = (e, tabId, fromPaneId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      tabId,
      fromPaneId
    }));
    // Add visual feedback
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDragOverPaneId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPaneId(paneId);
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the tabs-container itself, not child elements
    if (e.currentTarget === e.target) {
      setDragOverPaneId(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOverPaneId(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { tabId, fromPaneId } = data;

      if (tabId && fromPaneId && moveTab) {
        moveTab(fromPaneId, paneId, tabId);
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error);
    }
  };

  return (
    <div className="pane-container">
      {/* Tab Bar */}
      <div className="tab-bar">
        <button className="home-btn" onClick={handleGoHome} title="Home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </button>

        {/* Close All Tabs Button */}
        {tabs.length > 0 && (
          <button className="close-all-tabs-btn" onClick={handleCloseAllTabs} title="Close All Tabs">
            Close All
          </button>
        )}

        <div
          className={`tabs-container ${dragOverPaneId === paneId ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {tabs.map(tab => {
            // Look up missing properties from APPS if tab was restored from localStorage
            const appInfo = APPS[tab.appId];
            const tabName = tab.name || appInfo?.name || 'Unknown';
            const tabAccent = tab.accent || appInfo?.accent || '#ffd700';

            return (
              <div
                key={tab.id}
                className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                style={{ '--tab-accent': tabAccent }}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, tab.id, paneId)}
                onDragEnd={handleDragEnd}
              >
                <button
                  className="tab-button"
                  onClick={() => setActiveTabInPane(paneId, tab.id)}
                >
                  {tabName}
                </button>
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTabInPane(paneId, tab.id);
                  }}
                  title="Close tab"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Split controls */}
        <div className="split-controls">
          {canSplit && (
            <>
              <button
                className="split-btn"
                onClick={handleSplitRight}
                title="Split Right"
              >
                <Columns size={16} />
              </button>
              <button
                className="split-btn"
                onClick={handleSplitDown}
                title="Split Down"
              >
                <Rows size={16} />
              </button>
            </>
          )}
          {showCloseButton && (
            <button
              className="close-pane-btn"
              onClick={handleClosePane}
              title="Close Pane"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="pane-content">
        {/* Always render all tabs, hide inactive ones with CSS */}
        {tabs.length === 0 ? (
          <div className="pane-home">
            <h2>Select an app</h2>
            <div className="app-grid">
              {Object.values(APPS).map(app => (
                <button
                  key={app.id}
                  className="app-card"
                  onClick={() => openAppInPane(paneId, app)}
                  style={{ '--card-accent': app.accent }}
                >
                  <div className="app-name">{app.name}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {tabs.map(tab => {
              // Look up component from APPS if tab was restored from localStorage
              const AppComponent = tab.component || APPS[tab.appId]?.component;
              const isActive = tab.id === activeTabId;

              if (!AppComponent) {
                return (
                  <div
                    key={tab.id}
                    className="tab-content"
                    style={{ display: isActive ? 'flex' : 'none' }}
                  >
                    <div style={{ padding: '20px', color: 'var(--text-dim)' }}>
                      Component not found for app: {tab.appId}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={tab.id}
                  className="tab-content"
                  style={{ display: isActive ? 'flex' : 'none' }}
                >
                  <ErrorBoundary>
                    <AppComponent apiKeys={apiKeys} instanceId={tab.id} />
                  </ErrorBoundary>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
