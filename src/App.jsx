import React, { useState, useEffect } from 'react';
import Sidebar from './components/shared/Sidebar';
import HomeScreen from './components/shared/HomeScreen';
import TabNavigation from './components/shared/TabNavigation';
import ErrorBoundary from './components/shared/ErrorBoundary';
import MemoryViewer from './components/memory-viewer/MemoryViewer';
import VisionApp from './components/vision/VisionApp';
import ChainRunner from './components/chain-runner/ChainRunner';
import Dashboard from './components/dashboard/Dashboard';
import Projects from './components/projects/Projects';
import Reminders from './components/reminders/Reminders';
import Relationships from './components/relationships/Relationships';
import Settings from './components/settings/Settings';
import Meetings from './components/meetings/Meetings';
import Knowledge from './components/knowledge/Knowledge';
import Admin from './components/admin/Admin';
import ChatApp from './components/chat/ChatApp';
import './styles/app.css';

// Load database test utility in development
if (import.meta.env.DEV) {
  import('./utils/testDatabase.js');
}

const APPS = {
  dashboard: { id: 'dashboard', name: 'Dashboard', component: Dashboard, accent: '#ffd700' },
  memory: { id: 'memory', name: 'Memory Viewer', component: MemoryViewer, accent: '#f87171' },
  vision: { id: 'vision', name: 'Vision', component: VisionApp, accent: '#8b5cf6' },
  chain: { id: 'chain', name: 'Chain Runner', component: ChainRunner, accent: '#3b82f6' },
  projects: { id: 'projects', name: 'Projects', component: Projects, accent: '#8b5cf6' },
  reminders: { id: 'reminders', name: 'Reminders', component: Reminders, accent: '#22c55e' },
  relationships: { id: 'relationships', name: 'Relationships', component: Relationships, accent: '#ec4899' },
  meetings: { id: 'meetings', name: 'Meetings', component: Meetings, accent: '#3b82f6' },
  knowledge: { id: 'knowledge', name: 'Knowledge', component: Knowledge, accent: '#06b6d4' },
  chat: { id: 'chat', name: 'Chat', component: ChatApp, accent: '#8b5cf6' },
  admin: { id: 'admin', name: 'Admin Panel', component: Admin, accent: '#64748b' },
  settings: { id: 'settings', name: 'Settings', component: Settings, accent: '#64748b' },
};

export default function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [apiKeys, setApiKeys] = useState({});
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      if (window.electronAPI) {
        const keys = await window.electronAPI.getEnvKeys();
        setApiKeys(keys);
        setApiKeysLoaded(true);

        // Check if any keys are missing
        const missingKeys = [];
        if (!keys.ANTHROPIC_API_KEY) missingKeys.push('Anthropic');
        if (!keys.OPENAI_API_KEY) missingKeys.push('OpenAI');
        if (!keys.HF_TOKEN) missingKeys.push('HuggingFace');

        if (missingKeys.length > 0) {
          setApiKeyError(`Missing API keys: ${missingKeys.join(', ')}`);
        }
      } else {
        setApiKeyError('Electron API not available - running in web-only mode');
        setApiKeysLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setApiKeyError('Failed to load API keys: ' + error.message);
      setApiKeysLoaded(true);
    }
  };

  const openApp = (appId) => {
    const existingTab = tabs.find(t => t.appId === appId);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      setActiveModule(appId);
      return;
    }

    const newTab = {
      id: `${appId}-${Date.now()}`,
      appId,
      ...APPS[appId],
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setActiveModule(appId);
  };

  const handleNavigate = (moduleId) => {
    console.log('Navigate to:', moduleId);
    setActiveModule(moduleId);

    // If the module has an app component, open it as a tab
    if (APPS[moduleId]) {
      openApp(moduleId);
    } else {
      // For unimplemented modules, close tabs
      setActiveTabId(null);
    }
  };

  const closeTab = (tabId) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      if (newTabs.length === 0) {
        setActiveTabId(null);
      } else {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newIndex].id);
      }
    }
  };

  const goHome = () => {
    setActiveTabId(null);
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Set accent color CSS variable
  useEffect(() => {
    const accent = activeTab?.accent || '#8b5cf6';
    document.documentElement.style.setProperty('--accent', accent);
  }, [activeTab]);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onNavigate={handleNavigate}
        onOpenApp={openApp}
      />

      {/* Main Content Area */}
      <div className="app-content">
        {tabs.length > 0 && (
          <TabNavigation
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onGoHome={goHome}
          />
        )}

        {apiKeysLoaded && apiKeyError && (
          <div className="api-key-warning">
            <span className="warning-icon">⚠</span>
            <span className="warning-text">{apiKeyError}</span>
            <button
              className="warning-dismiss"
              onClick={() => setApiKeyError(null)}
              title="Dismiss warning"
            >
              ×
            </button>
          </div>
        )}

        <main className="app-main">
          {!activeTabId ? (
            <HomeScreen onOpenApp={openApp} />
          ) : (
            tabs.map(tab => (
              <div
                key={tab.id}
                className="tab-content"
                style={{ display: tab.id === activeTabId ? 'flex' : 'none' }}
              >
                <ErrorBoundary key={tab.id}>
                  <tab.component apiKeys={apiKeys} />
                </ErrorBoundary>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
