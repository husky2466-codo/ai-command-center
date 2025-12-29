import React from 'react';
import { Plus, CheckSquare, Bell, Users, Calendar, FileText } from 'lucide-react';
import Card from '../../shared/Card';
import Button from '../../shared/Button';

/**
 * QuickActionsWidget - Common task buttons for quick actions
 */
function QuickActionsWidget({ onNavigate, onQuickAction }) {
  const actions = [
    {
      id: 'new-task',
      label: 'New Task',
      icon: CheckSquare,
      variant: 'primary',
      onClick: () => {
        if (onQuickAction) {
          onQuickAction('new-task');
        } else {
          onNavigate('projects');
        }
      },
    },
    {
      id: 'new-reminder',
      label: 'New Reminder',
      icon: Bell,
      variant: 'secondary',
      onClick: () => {
        if (onQuickAction) {
          onQuickAction('new-reminder');
        } else {
          onNavigate('reminders');
        }
      },
    },
    {
      id: 'new-contact',
      label: 'New Contact',
      icon: Users,
      variant: 'secondary',
      onClick: () => {
        if (onQuickAction) {
          onQuickAction('new-contact');
        } else {
          onNavigate('relationships');
        }
      },
    },
    {
      id: 'new-meeting',
      label: 'New Meeting',
      icon: Calendar,
      variant: 'secondary',
      onClick: () => {
        if (onQuickAction) {
          onQuickAction('new-meeting');
        } else {
          onNavigate('meetings');
        }
      },
    },
    {
      id: 'quick-note',
      label: 'Quick Note',
      icon: FileText,
      variant: 'secondary',
      onClick: () => {
        if (onQuickAction) {
          onQuickAction('quick-note');
        } else {
          onNavigate('knowledge');
        }
      },
    },
  ];

  return (
    <Card
      title="Quick Actions"
      className="quick-actions-widget"
      variant="default"
      padding="md"
    >
      <div className="widget-icon">
        <Plus size={20} />
      </div>

      <div className="quick-actions-grid">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            onClick={action.onClick}
            className="quick-action-btn"
          >
            <action.icon size={16} />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}

export default QuickActionsWidget;
