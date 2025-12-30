import React, { useState, useEffect } from 'react';
import Sidebar from './components/shared/Sidebar';
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
import Accounts from './components/accounts/Accounts';
import Email from './components/email/Email';
import CalendarView from './components/calendar/CalendarView';
import Contacts from './components/contacts/Contacts';
import Terminal from './components/terminal/Terminal';
import DGXSpark from './components/dgx-spark/DGXSpark';
import { ThemeProvider } from './themes/ThemeContext';
import { LayoutProvider, useLayout } from './components/layout/LayoutContext';
import SplitLayout from './components/layout/SplitLayout';
import { ErrorBoundary, setupGlobalErrorHandlers } from './utils/errorHandler.js';
import ErrorFallback from './components/shared/ErrorFallback';
import './styles/app.css';

// Load database test utility in development
if (import.meta.env.DEV) {
  import('./utils/testDatabase.js');
}

// Setup global error handlers once
setupGlobalErrorHandlers();

const APPS = {
  dashboard: { id: 'dashboard', name: 'Dashboard', component: Dashboard, accent: '#ffd700' },
  memory: { id: 'memory', name: 'Memory Viewer', component: MemoryViewer, accent: '#f87171' },
  vision: { id: 'vision', name: 'Vision', component: VisionApp, accent: '#8b5cf6' },
  chain: { id: 'chain', name: 'Chain Runner', component: ChainRunner, accent: '#3b82f6' },
  terminal: { id: 'terminal', name: 'Terminal', component: Terminal, accent: '#22c55e' },
  'dgx-spark': { id: 'dgx-spark', name: 'DGX Spark', component: DGXSpark, accent: '#22c55e' },
  projects: { id: 'projects', name: 'Projects', component: Projects, accent: '#8b5cf6' },
  reminders: { id: 'reminders', name: 'Reminders', component: Reminders, accent: '#22c55e' },
  relationships: { id: 'relationships', name: 'Relationships', component: Relationships, accent: '#ec4899' },
  meetings: { id: 'meetings', name: 'Meetings', component: Meetings, accent: '#3b82f6' },
  knowledge: { id: 'knowledge', name: 'Knowledge', component: Knowledge, accent: '#06b6d4' },
  chat: { id: 'chat', name: 'Chat', component: ChatApp, accent: '#8b5cf6' },
  email: { id: 'email', name: 'Email', component: Email, accent: '#ea4335' },
  calendar: { id: 'calendar', name: 'Calendar', component: CalendarView, accent: '#4285f4' },
  contacts: { id: 'contacts', name: 'Contacts', component: Contacts, accent: '#0f9d58' },
  accounts: { id: 'accounts', name: 'Accounts', component: Accounts, accent: '#8b5cf6' },
  admin: { id: 'admin', name: 'Admin Panel', component: Admin, accent: '#64748b' },
  settings: { id: 'settings', name: 'Settings', component: Settings, accent: '#64748b' },
};

function AppContent() {
  const [activeModule, setActiveModule] = useState(null);
  const [apiKeys, setApiKeys] = useState({});
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { openAppInPane, panes } = useLayout();

  useEffect(() => {
    loadApiKeys();

    // Listen for menu navigation events
    if (window.electronAPI?.onNavigateTo) {
      const cleanup = window.electronAPI.onNavigateTo((moduleId) => {
        console.log('Menu navigate to:', moduleId);
        if (APPS[moduleId]) {
          openApp(moduleId);
        }
      });
      return cleanup;
    }
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
    setActiveModule(appId);
    // Open in the first pane by default
    if (panes.length > 0 && APPS[appId]) {
      openAppInPane(panes[0].id, APPS[appId]);
    }
  };

  const handleNavigate = (moduleId) => {
    console.log('Navigate to:', moduleId);
    setActiveModule(moduleId);

    // If the module has an app component, open it as a tab
    if (APPS[moduleId]) {
      openApp(moduleId);
    }
  };

  return (
    <div className={`app-container ${!sidebarCollapsed ? 'sidebar-expanded' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onNavigate={handleNavigate}
        onOpenApp={openApp}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="app-content">
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
          <SplitLayout APPS={APPS} apiKeys={apiKeys} />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
      <ThemeProvider>
        <LayoutProvider>
          <ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
            <AppContent />
          </ErrorBoundary>
        </LayoutProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
