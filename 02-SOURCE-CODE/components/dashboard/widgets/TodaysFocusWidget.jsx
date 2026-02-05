import React from 'react';
import { Target, CheckCircle } from 'lucide-react';
import Card from '../../shared/Card';
import Badge from '../../shared/Badge';

/**
 * TodaysFocusWidget - Top 3-5 priority tasks from Projects (Now view)
 */
function TodaysFocusWidget({ focus, onNavigate }) {
  if (!focus) return null;

  const handleTaskClick = (task) => {
    if (onNavigate) {
      onNavigate('projects', { taskId: task.id });
    }
  };

  return (
    <Card
      title="Today's Focus"
      className="todays-focus-widget"
      variant="default"
      padding="md"
      hoverable
    >
      <div className="widget-icon">
        <Target size={20} />
      </div>

      {focus.tasks.length === 0 ? (
        <div className="widget-empty">
          <p>No focus tasks for today</p>
          <button
            className="btn-link"
            onClick={() => onNavigate && onNavigate('projects')}
          >
            Add tasks to your project
          </button>
        </div>
      ) : (
        <div className="focus-list">
          {focus.tasks.map((task, index) => (
            <div
              key={task.id}
              className="focus-item"
              onClick={() => handleTaskClick(task)}
            >
              <div className="focus-item-header">
                <span className="focus-number">{index + 1}</span>
                <span className="focus-title">{task.title}</span>
              </div>
              {task.energy_type && (
                <Badge
                  text={task.energy_type}
                  variant={task.energy_type.toLowerCase().replace(' ', '-')}
                  size="sm"
                />
              )}
              {task.due_date && (
                <span className="focus-due">
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {focus.count > 0 && (
        <div className="widget-footer">
          <span className="widget-count">{focus.count} focus tasks</span>
          <button
            className="btn-link"
            onClick={() => onNavigate && onNavigate('projects')}
          >
            View all
          </button>
        </div>
      )}
    </Card>
  );
}

export default TodaysFocusWidget;
