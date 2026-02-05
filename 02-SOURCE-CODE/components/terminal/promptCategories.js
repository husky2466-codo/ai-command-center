/**
 * Prompt Crafter - Category Definitions and Refinement Options
 *
 * Defines the 8 core categories of Claude Code prompts with their templates,
 * context hints, and refinement focus areas. Also defines the 8 refinement
 * options that can be applied to any prompt.
 */

/**
 * PROMPT_CATEGORIES
 *
 * Each category represents a type of task Claude Code can handle.
 * Contains templates, context hints, and refinement focus to guide users.
 */
export const PROMPT_CATEGORIES = {
  code_generation: {
    id: 'code_generation',
    name: 'Code Generation',
    icon: 'Code2',
    description: 'Write new code, functions, components',
    templates: [
      'Write a {type} that {action}',
      'Create a {component} for {purpose}',
      'Implement {feature} with {constraints}',
      'Generate a {pattern} to handle {use_case}'
    ],
    contextHints: ['file', 'style', 'constraints'],
    refinementFocus: ['specificity', 'constraints', 'examples']
  },

  debugging: {
    id: 'debugging',
    name: 'Debugging',
    icon: 'Bug',
    description: 'Fix bugs, investigate errors',
    templates: [
      'Debug the issue in {file} where {symptom}',
      'Fix the bug causing {error}',
      'Investigate why {component} fails when {trigger}',
      'Find the root cause of {problem}'
    ],
    contextHints: ['file', 'error', 'steps'],
    refinementFocus: ['error_context', 'reproduction', 'expected']
  },

  refactoring: {
    id: 'refactoring',
    name: 'Refactoring',
    icon: 'RefreshCw',
    description: 'Improve code structure and quality',
    templates: [
      'Refactor {target} to {improvement}',
      'Extract {pattern} from {source}',
      'Simplify {complex_code} without changing behavior',
      'Optimize the performance of {component}'
    ],
    contextHints: ['file', 'constraints'],
    refinementFocus: ['scope', 'preserveBehavior', 'patterns']
  },

  explanation: {
    id: 'explanation',
    name: 'Explanation',
    icon: 'HelpCircle',
    description: 'Understand code and concepts',
    templates: [
      'Explain how {code} works',
      'What does {function} do step by step',
      'Why was {pattern} used here',
      'Walk me through the flow of {feature}'
    ],
    contextHints: ['file', 'scope'],
    refinementFocus: ['depth', 'examples', 'diagrams']
  },

  planning: {
    id: 'planning',
    name: 'Planning',
    icon: 'Map',
    description: 'Design and plan implementations',
    templates: [
      'Plan the implementation of {feature}',
      'Design the architecture for {system}',
      'Break down {task} into steps',
      'Create a roadmap for {project}'
    ],
    contextHints: ['repo', 'constraints'],
    refinementFocus: ['scope', 'phases', 'dependencies']
  },

  testing: {
    id: 'testing',
    name: 'Testing',
    icon: 'TestTube2',
    description: 'Write and improve tests',
    templates: [
      'Write unit tests for {function}',
      'Add integration tests for {feature}',
      'Test edge cases in {component}',
      'Mock the dependencies for {test}'
    ],
    contextHints: ['file', 'framework'],
    refinementFocus: ['coverage', 'edge_cases', 'mocks']
  },

  git_operations: {
    id: 'git_operations',
    name: 'Git Operations',
    icon: 'GitBranch',
    description: 'Commits, PRs, diffs',
    templates: [
      'Commit changes with message describing {summary}',
      'Create a PR for {feature}',
      'Review the diff in {files}',
      'Revert the changes to {target}'
    ],
    contextHints: ['scope'],
    refinementFocus: ['message_style', 'scope']
  },

  file_operations: {
    id: 'file_operations',
    name: 'File Operations',
    icon: 'FolderSearch',
    description: 'Search, read, navigate files',
    templates: [
      'Find all files containing {pattern}',
      'Search for usages of {symbol}',
      'List files matching {glob}',
      'Read {file} and summarize {aspect}'
    ],
    contextHints: ['path', 'pattern'],
    refinementFocus: ['scope', 'filters']
  }
};

/**
 * REFINEMENT_OPTIONS
 *
 * Options that can be applied to any prompt to make it more effective.
 * Each option includes a prompt instruction that gets sent to Ollama.
 */
export const REFINEMENT_OPTIONS = {
  specificity: {
    id: 'specificity',
    label: 'Be more specific',
    prompt: 'Add specific details: file names, function names, expected behavior, input/output examples',
    icon: 'Target'
  },

  constraints: {
    id: 'constraints',
    label: 'Add constraints',
    prompt: 'Add constraints: libraries to use/avoid, performance requirements, compatibility needs',
    icon: 'Lock'
  },

  explanation: {
    id: 'explanation',
    label: 'Request explanation',
    prompt: 'Ask for explanation of the approach and key decisions',
    icon: 'MessageSquare'
  },

  step_by_step: {
    id: 'step_by_step',
    label: 'Step-by-step approach',
    prompt: 'Break down into clear sequential steps',
    icon: 'ListOrdered'
  },

  examples: {
    id: 'examples',
    label: 'Include examples',
    prompt: 'Add concrete examples of expected input/output or usage',
    icon: 'FileCode'
  },

  context_files: {
    id: 'context_files',
    label: 'Reference files',
    prompt: 'Reference specific files that provide context',
    icon: 'FileText'
  },

  edge_cases: {
    id: 'edge_cases',
    label: 'Consider edge cases',
    prompt: 'Address potential edge cases and error handling',
    icon: 'AlertTriangle'
  },

  patterns: {
    id: 'patterns',
    label: 'Follow patterns',
    prompt: 'Follow existing patterns and conventions in the codebase',
    icon: 'Layers'
  }
};
