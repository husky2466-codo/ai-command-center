/**
 * Energy Types - Task matching for different mental states
 * Part of Andy's three-tier project system
 */

export const ENERGY_TYPES = {
  low: {
    id: 'low',
    label: 'Low Energy',
    color: '#6b7280',
    description: 'Simple tasks that require minimal focus',
    icon: 'battery-low'
  },
  quick_win: {
    id: 'quick_win',
    label: 'Quick Win',
    color: '#22c55e',
    description: '5-15 minute tasks with immediate payoff',
    icon: 'zap'
  },
  deep_work: {
    id: 'deep_work',
    label: 'Deep Work',
    color: '#8b5cf6',
    description: 'Complex problems requiring sustained focus',
    icon: 'brain'
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    color: '#ec4899',
    description: 'Brainstorming, design, ideation tasks',
    icon: 'palette'
  },
  execution: {
    id: 'execution',
    label: 'Execution',
    color: '#f59e0b',
    description: 'Action-oriented, getting things done',
    icon: 'rocket'
  },
  people_work: {
    id: 'people_work',
    label: 'People Work',
    color: '#3b82f6',
    description: 'Communication, meetings, collaboration',
    icon: 'users'
  }
};

export const PROJECT_STATUS = {
  active_focus: {
    id: 'active_focus',
    label: 'Active Focus',
    description: 'Currently working on this',
    order: 0
  },
  on_deck: {
    id: 'on_deck',
    label: 'On Deck',
    description: 'Ready to start soon',
    order: 1
  },
  growing: {
    id: 'growing',
    label: 'Growing',
    description: 'Planning and gathering resources',
    order: 2
  },
  on_hold: {
    id: 'on_hold',
    label: 'On Hold',
    description: 'Paused, waiting for something',
    order: 3
  },
  completed: {
    id: 'completed',
    label: 'Completed',
    description: 'Done and celebrated',
    order: 4
  }
};

export const TASK_STATUS = {
  pending: { id: 'pending', label: 'Pending' },
  in_progress: { id: 'in_progress', label: 'In Progress' },
  completed: { id: 'completed', label: 'Completed' },
  blocked: { id: 'blocked', label: 'Blocked' }
};

// Helper to get energy type array for filters
export const getEnergyTypesList = () => Object.values(ENERGY_TYPES);

// Helper to get project status array ordered
export const getProjectStatusList = () =>
  Object.values(PROJECT_STATUS).sort((a, b) => a.order - b.order);

// Helper to get task status array
export const getTaskStatusList = () => Object.values(TASK_STATUS);
