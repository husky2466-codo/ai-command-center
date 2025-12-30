import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Bell,
  Users,
  Calendar,
  BookOpen,
  MessageSquare,
  Mail,
  Settings,
  Brain,
  Camera,
  Workflow,
  Terminal,
  Server,
  ChevronLeft,
  ChevronRight,
  User,
  Contact
} from 'lucide-react';
import './Sidebar.css';

const NAVIGATION_SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, accent: 'var(--module-dashboard)' },
      { id: 'projects', name: 'Projects', icon: FolderKanban, accent: 'var(--module-projects)' },
      { id: 'reminders', name: 'Reminders', icon: Bell, accent: 'var(--module-reminders)' },
      { id: 'relationships', name: 'Relationships', icon: Users, accent: 'var(--module-relationships)' },
      { id: 'contacts', name: 'Contacts', icon: Contact, accent: '#0f9d58' },
      { id: 'meetings', name: 'Meetings', icon: Calendar, accent: 'var(--module-meetings)' },
      { id: 'calendar', name: 'Calendar', icon: Calendar, accent: '#4285f4' },
      { id: 'knowledge', name: 'Knowledge', icon: BookOpen, accent: 'var(--module-knowledge)' },
      { id: 'email', name: 'Email', icon: Mail, accent: '#ea4335' }
    ]
  },
  {
    title: 'AI',
    items: [
      { id: 'chat', name: 'Chat', icon: MessageSquare, accent: 'var(--module-chat)' }
    ]
  },
  {
    title: 'TOOLS',
    items: [
      { id: 'memory', name: 'Memory Lane', icon: Brain, accent: 'var(--module-memory-lane)', special: 'brain' },
      { id: 'vision', name: 'Vision', icon: Camera, accent: 'var(--module-vision)', special: 'eye' },
      { id: 'chain', name: 'Chain Runner', icon: Workflow, accent: 'var(--module-chain-runner)', special: 'network' },
      { id: 'terminal', name: 'Terminal', icon: Terminal, accent: '#22c55e' },
      { id: 'dgx-spark', name: 'DGX Spark', icon: Server, accent: 'var(--module-dgx)' }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'accounts', name: 'Accounts', icon: User, accent: 'var(--accent)' },
      { id: 'admin', name: 'Admin', icon: Settings, accent: 'var(--module-admin)' }
    ]
  }
];

export default function Sidebar({ activeModule, onNavigate, onOpenApp, isCollapsed, onToggleCollapse }) {
  // Use controlled state if provided, otherwise internal state
  const [internalCollapsed, setInternalCollapsed] = useState(true); // Default to collapsed
  const collapsed = isCollapsed !== undefined ? isCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!collapsed);
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const handleItemClick = (item) => {
    // Auto-collapse sidebar after selection
    if (onToggleCollapse) {
      onToggleCollapse(true); // Collapse
    } else {
      setInternalCollapsed(true);
    }

    // All modules now use the openApp system
    if (['memory', 'vision', 'chain', 'terminal', 'dgx-spark', 'dashboard', 'admin', 'projects', 'reminders', 'relationships', 'contacts', 'meetings', 'calendar', 'knowledge', 'chat', 'email', 'accounts'].includes(item.id)) {
      onOpenApp?.(item.id);
    } else {
      // Fallback for any future modules
      onNavigate?.(item.id);
    }
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item);
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Collapse Toggle */}
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={handleToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {NAVIGATION_SECTIONS.map((section, sectionIdx) => (
          <div key={section.title} className="sidebar-section">
            {!collapsed && (
              <div className="sidebar-section-title">{section.title}</div>
            )}
            <ul className="sidebar-items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;

                return (
                  <li key={item.id}>
                    <button
                      className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''} ${item.special ? `sidebar-item-${item.special}` : ''}`}
                      onClick={() => handleItemClick(item)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      title={collapsed ? item.name : ''}
                      aria-label={item.name}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        '--item-accent': item.accent
                      }}
                    >
                      <Icon
                        className="sidebar-item-icon"
                        size={24}
                        strokeWidth={2}
                      />
                      {!collapsed && (
                        <span className="sidebar-item-label">{item.name}</span>
                      )}
                      {isActive && <div className="sidebar-item-indicator" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
