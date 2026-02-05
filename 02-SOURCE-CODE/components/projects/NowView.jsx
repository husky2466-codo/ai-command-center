import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Edit2,
  Trash2,
  Calendar,
  Folder,
  Zap,
  Brain,
  Palette,
  Rocket,
  Users,
  BatteryLow
} from 'lucide-react';
import { projectService } from '../../services/ProjectService';
import { ENERGY_TYPES, getEnergyTypesList } from '../../constants/energyTypes';
import Badge from '../shared/Badge';

const ENERGY_ICONS = {
  low: BatteryLow,
  quick_win: Zap,
  deep_work: Brain,
  creative: Palette,
  execution: Rocket,
  people_work: Users
};

// Default fallback for unknown energy types
const DEFAULT_ENERGY = {
  id: 'unknown',
  label: 'Medium',
  color: '#9ca3af',
  description: 'Moderate effort task'

};

export default function NowView({
  tasks,
  projects,
  selectedProject,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onReload
}) {
  const [selectedEnergies, setSelectedEnergies] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [energyCounts, setEnergyCounts] = useState({});

  useEffect(() => {
    calculateEnergyCounts();
    filterTasks();
  }, [tasks, selectedProject, selectedEnergies]);

  const calculateEnergyCounts = () => {
    const counts = {};
    const taskList = selectedProject
      ? tasks.filter(t => t.project_id === selectedProject.id)
      : tasks;

    getEnergyTypesList().forEach(energy => {
      counts[energy.id] = taskList.filter(t => t.energy_type === energy.id).length;
    });

    setEnergyCounts(counts);
  };

  const filterTasks = () => {
    let taskList = selectedProject
      ? tasks.filter(t => t.project_id === selectedProject.id)
      : tasks;

    // Filter by energy type if any selected
    if (selectedEnergies.length > 0) {
      taskList = taskList.filter(t => selectedEnergies.includes(t.energy_type));
    }

    setFilteredTasks(taskList);
  };

  const toggleEnergyFilter = (energyId) => {
    setSelectedEnergies(prev => {
      if (prev.includes(energyId)) {
        return prev.filter(e => e !== energyId);
      } else {
        return [...prev, energyId];
      }
    });
  };

  const clearFilters = () => {
    setSelectedEnergies([]);
  };

  if (tasks.length === 0) {
    return (
      <div className="now-view-empty">
        <CheckSquare size={64} className="empty-icon" />
        <h2>No Tasks Yet</h2>
        <p>Create your first task to start getting things done</p>
      </div>
    );
  }

  return (
    <div className="now-view">
      {/* Energy Filter Bar */}
      <div className="energy-filter-bar">
        <div className="energy-filter-header">
          <h3 className="energy-filter-title">Match Your Energy</h3>
          {selectedEnergies.length > 0 && (
            <button
              className="energy-filter-clear"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="energy-filter-buttons">
          {getEnergyTypesList().map(energy => {
            const isSelected = selectedEnergies.includes(energy.id);
            const count = energyCounts[energy.id] || 0;
            const Icon = ENERGY_ICONS[energy.id];

            return (
              <button
                key={energy.id}
                className={`energy-filter-btn ${isSelected ? 'active' : ''}`}
                onClick={() => toggleEnergyFilter(energy.id)}
                style={{
                  '--energy-color': energy.color
                }}
                disabled={count === 0}
                title={energy.description}
              >
                <Icon size={16} className="energy-icon" />
                <span className="energy-label">{energy.label}</span>
                <span className="energy-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="now-view-no-results">
          <p>No tasks match your selected energy filters</p>
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              project={projects.find(p => p.id === task.project_id)}
              onToggle={() => onToggleTask(task.id)}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, project, onToggle, onEdit, onDelete }) {
  const isCompleted = task.status === 'completed';
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const energy = ENERGY_TYPES[task.energy_type] || DEFAULT_ENERGY;
  const Icon = ENERGY_ICONS[task.energy_type] || Zap;

  return (
    <div className={`task-item ${isCompleted ? 'completed' : ''}`}>
      {/* Checkbox */}
      <button
        className="task-checkbox"
        onClick={onToggle}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        {isCompleted ? (
          <CheckSquare size={20} className="task-check-icon checked" />
        ) : (
          <Square size={20} className="task-check-icon" />
        )}
      </button>

      {/* Main Content */}
      <div className="task-item-content">
        <div className="task-item-header">
          <h4 className="task-title">{task.title}</h4>
          <div className="task-item-actions">
            <button
              className="task-action-btn"
              onClick={onEdit}
              title="Edit task"
            >
              <Edit2 size={14} />
            </button>
            <button
              className="task-action-btn task-delete-btn"
              onClick={onDelete}
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="task-description">{task.description}</p>
        )}

        <div className="task-item-footer">
          {/* Project */}
          {project && (
            <div className="task-project">
              <Folder size={12} />
              <span>{project.name}</span>
            </div>
          )}

          {/* Energy Badge */}
          <Badge
            variant="filled"
            style={{
              backgroundColor: energy.color,
              color: '#ffffff'
            }}
            className="task-energy-badge"
          >
            <Icon size={12} />
            <span>{energy.label}</span>
          </Badge>

          {/* Due Date */}
          {task.due_date && (
            <div className={`task-due-date ${isOverdue ? 'overdue' : ''}`}>
              <Calendar size={12} />
              <span>{formatDueDate(task.due_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDueDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
