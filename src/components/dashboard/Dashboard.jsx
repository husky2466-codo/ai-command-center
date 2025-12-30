import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService.js';
import Button from '../shared/Button';
import GoodMorningWidget from './widgets/GoodMorningWidget';
import TodaysFocusWidget from './widgets/TodaysFocusWidget';
import TodaysMeetingsWidget from './widgets/TodaysMeetingsWidget';
import RemindersDueWidget from './widgets/RemindersDueWidget';
import RelationshipsWidget from './widgets/RelationshipsWidget';
import RecentMemoriesWidget from './widgets/RecentMemoriesWidget';
import QuickActionsWidget from './widgets/QuickActionsWidget';
import './Dashboard.css';

/**
 * Dashboard - Daily Briefing System
 * Aggregates data from all modules into a command center view
 */
function Dashboard({ apiKeys }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getTodaysBriefing();
      setBriefing(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      dashboardService.clearCache(); // Clear cache to force fresh data
      const data = await dashboardService.getTodaysBriefing();
      setBriefing(data);
    } catch (err) {
      console.error('Failed to refresh dashboard:', err);
      setError('Failed to refresh dashboard. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleNavigate = (moduleId, context = {}) => {
    console.log('Navigate to module:', moduleId, context);
    // This will be implemented by parent App component
    // For now, we'll use window events
    window.dispatchEvent(
      new CustomEvent('dashboard-navigate', {
        detail: { moduleId, context },
      })
    );
  };

  const handleQuickAction = (actionId) => {
    console.log('Quick action:', actionId);
    // Handle quick actions (new task, reminder, etc.)
    // This will trigger modals or navigate to modules
    window.dispatchEvent(
      new CustomEvent('dashboard-quick-action', {
        detail: { actionId },
      })
    );
  };

  const handleReminderComplete = async (reminderId) => {
    console.log('Complete reminder:', reminderId);
    // This will call reminderService to complete the reminder
    // Then refresh the dashboard
    // For now, just log it
    // await reminderService.completeReminder(reminderId);
    // await loadDashboard();
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <LayoutDashboard size={48} className="loading-icon" />
          <p>Loading your daily briefing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <p className="error-message">{error}</p>
          <Button onClick={loadDashboard} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <LayoutDashboard size={24} className="header-icon" />
          <h1 className="header-title">Dashboard</h1>
        </div>
        <Button
          onClick={handleRefresh}
          variant="secondary"
          disabled={refreshing}
          className="refresh-btn"
        >
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Good Morning - Full Width */}
        <div className="dashboard-row full-width">
          <GoodMorningWidget greeting={briefing?.greeting} />
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="dashboard-column left">
            <TodaysMeetingsWidget
              meetings={briefing?.meetings}
              onNavigate={handleNavigate}
            />
            <RemindersDueWidget
              reminders={briefing?.reminders}
              onNavigate={handleNavigate}
              onComplete={handleReminderComplete}
            />
          </div>

          {/* Right Column */}
          <div className="dashboard-column right">
            <TodaysFocusWidget
              focus={briefing?.focus}
              onNavigate={handleNavigate}
            />
            <RelationshipsWidget
              relationships={briefing?.relationships}
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="dashboard-row">
          <RecentMemoriesWidget
            memories={briefing?.memories}
            onNavigate={handleNavigate}
          />
          <QuickActionsWidget
            onNavigate={handleNavigate}
            onQuickAction={handleQuickAction}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <span className="footer-text">
          Last updated: {briefing?.timestamp ? new Date(briefing.timestamp).toLocaleTimeString() : 'Unknown'}
        </span>
      </div>
    </div>
  );
}

export default Dashboard;
