# Prompt Crafter - Terminal Side Panel

**Status**: Planning
**Priority**: High
**Depends On**: Terminal Component, Theme System, Ollama Integration

---

## Overview

A collapsible side panel for the Terminal component that helps users craft, refine, and optimize prompts for Claude Code using local Ollama LLMs only. No cloud API usage - entirely local and private.

---

## ASCII Architecture

```
+-----------------------------------------------------------------------------------+
|                              Terminal Header                                       |
|  [>] Integrated Terminal                    [Connected]  [Prompt Crafter Toggle]  |
+-----------------------------------------------------------------------------------+
|                                    |                                              |
|                                    |    +--------------------------------------+  |
|                                    |    |   PROMPT CRAFTER                    |  |
|                                    |    +--------------------------------------+  |
|     TERMINAL                       |    |                                      |  |
|     (xterm.js)                     |    |  [Category Dropdown]                 |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |  | Task Type: Code Generation  v  | |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |                                      |  |
|                                    |    |  [Intent Input]                      |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |  | What do you want to do?        | |  |
|                                    |    |  |                                 | |  |
|                                    |    |  |                                 | |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |                                      |  |
|                                    |    |  [Context Helpers]                   |  |
|                                    |    |  [+File] [+Code] [+Error] [+Repo]    |  |
|                                    |    |                                      |  |
|                                    |    |  [Refinement Options]                |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |  | [ ] Be specific                 | |  |
|                                    |    |  | [ ] Add constraints             | |  |
|                                    |    |  | [ ] Request explanation         | |  |
|                                    |    |  | [ ] Step-by-step                | |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |                                      |  |
|                                    |    |  [Refine with Ollama]                |  |
|                                    |    |  +---------------+                   |  |
|                                    |    |  | Model: v      |  [Refine Prompt]  |  |
|                                    |    |  +---------------+                   |  |
|                                    |    |                                      |  |
|                                    |    |  [Refined Prompt Output]             |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |  |                                 | |  |
|                                    |    |  |  Your refined prompt will      | |  |
|                                    |    |  |  appear here...                | |  |
|                                    |    |  |                                 | |  |
|                                    |    |  +---------------------------------+ |  |
|                                    |    |                                      |  |
|                                    |    |  [Copy to Clipboard] [Send to Term]  |  |
|                                    |    +--------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## Claude Code Prompt Types & Patterns

### 1. Slash Commands (Built-in)

| Command | Purpose | Example |
|---------|---------|---------|
| `/help` | Show help and available commands | `/help` |
| `/clear` | Clear conversation history | `/clear` |
| `/compact` | Condense conversation (save context) | `/compact` |
| `/init` | Initialize CLAUDE.md in project | `/init` |
| `/config` | Open configuration | `/config` |
| `/bug` | Report a bug | `/bug` |
| `/doctor` | Diagnose environment issues | `/doctor` |
| `/review` | Review code changes | `/review` |
| `/pr-comments` | Review PR comments | `/pr-comments` |

### 2. Task Categories

```
+-------------------+------------------------------------------+
| CATEGORY          | PROMPT PATTERNS                          |
+-------------------+------------------------------------------+
| Code Generation   | "Write a function that..."               |
|                   | "Create a component for..."              |
|                   | "Implement a service to..."              |
|                   | "Generate tests for..."                  |
+-------------------+------------------------------------------+
| Debugging         | "Fix the bug in..."                      |
|                   | "Debug why X isn't working"              |
|                   | "Investigate the error in..."            |
|                   | "Find the root cause of..."              |
+-------------------+------------------------------------------+
| Refactoring       | "Refactor X to use..."                   |
|                   | "Simplify this function"                 |
|                   | "Extract X into a reusable..."           |
|                   | "Optimize the performance of..."         |
+-------------------+------------------------------------------+
| Explanation       | "Explain how X works"                    |
|                   | "What does this code do?"                |
|                   | "Walk me through the flow of..."         |
|                   | "Why was this designed this way?"        |
+-------------------+------------------------------------------+
| Planning          | "Plan the implementation of..."          |
|                   | "Design the architecture for..."         |
|                   | "Break down the task of..."              |
|                   | "Create a roadmap for..."                |
+-------------------+------------------------------------------+
| File Operations   | "Read file X and summarize"              |
|                   | "Search for files containing..."         |
|                   | "Find all usages of..."                  |
|                   | "List files matching..."                 |
+-------------------+------------------------------------------+
| Git Operations    | "Commit these changes with message..."   |
|                   | "Create a PR for..."                     |
|                   | "Review the diff in..."                  |
|                   | "Revert the changes to..."               |
+-------------------+------------------------------------------+
| Testing           | "Write unit tests for..."                |
|                   | "Add integration tests covering..."      |
|                   | "Test the edge cases in..."              |
|                   | "Mock the dependencies for..."           |
+-------------------+------------------------------------------+
```

### 3. Context Enhancements

```
+------------------+-----------------------------------------------+
| CONTEXT TYPE     | HOW TO ADD                                    |
+------------------+-----------------------------------------------+
| File Reference   | "in src/components/X.jsx"                     |
|                  | "look at the file path/to/file"              |
+------------------+-----------------------------------------------+
| Code Snippet     | Include ``` code blocks with language         |
|                  | Paste error messages directly                 |
+------------------+-----------------------------------------------+
| Constraints      | "without using library X"                     |
|                  | "using only native APIs"                      |
|                  | "keep it under 50 lines"                      |
+------------------+-----------------------------------------------+
| Style Hints      | "follow the existing pattern in..."          |
|                  | "match the style of..."                       |
|                  | "use TypeScript"                              |
+------------------+-----------------------------------------------+
| Scope Limits     | "only modify function X"                      |
|                  | "don't touch the imports"                     |
|                  | "keep the public API the same"                |
+------------------+-----------------------------------------------+
```

### 4. Refinement Strategies

```
BASIC → REFINED EXAMPLES:

"Make a login form"
    ↓
"Create a React login form component with email/password fields,
validation, error display, and a submit button. Use the existing
Input and Button components from src/components/shared/. Include
loading state during submission."

"Fix the bug"
    ↓
"Debug the issue in src/services/authService.js where the login
request returns 401 but the error message shows 'Network Error'.
The token refresh might be failing. Check if the interceptor is
properly handling token expiry."

"Make it faster"
    ↓
"Optimize the ProductList component to reduce re-renders. Consider:
1. Memoizing the product cards with React.memo
2. Using useMemo for the filtered product list
3. Virtualizing the list if it exceeds 100 items
Currently renders take ~200ms for 50 products."
```

---

## Component Architecture

```
src/components/terminal/
├── Terminal.jsx           # Updated - adds toggle button
├── Terminal.css           # Updated - side panel layout
├── PromptCrafter.jsx      # NEW - Main panel component
├── PromptCrafter.css      # NEW - Panel styling
├── promptCategories.js    # NEW - Category definitions
├── promptRefiners.js      # NEW - Ollama refinement logic
└── promptTemplates.js     # NEW - Template strings
```

### Component Wiring

```jsx
// Terminal.jsx (updated structure)
<div className="terminal-with-crafter">
  <div className="terminal-main" style={{ flex: showCrafter ? 0.65 : 1 }}>
    <div className="terminal-header">
      <span>Integrated Terminal</span>
      <button onClick={() => setShowCrafter(!showCrafter)}>
        <Wand2 size={16} />
      </button>
    </div>
    <div ref={terminalRef} className="terminal-wrapper" />
  </div>

  {showCrafter && (
    <PromptCrafter
      onSendToTerminal={handleSendToTerminal}
      onClose={() => setShowCrafter(false)}
    />
  )}
</div>
```

---

## Data Structures

### Prompt Category Definition

```javascript
// promptCategories.js
export const PROMPT_CATEGORIES = {
  code_generation: {
    id: 'code_generation',
    name: 'Code Generation',
    icon: 'Code2',
    description: 'Write new code, functions, components',
    templates: [
      'Write a {type} that {action}',
      'Create a {component} for {purpose}',
      'Implement {feature} with {constraints}'
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
      'Investigate why {component} fails when {trigger}'
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
      'Simplify {complex_code} without changing behavior'
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
      'Why was {pattern} used here'
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
      'Break down {task} into steps'
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
      'Test edge cases in {component}'
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
      'Review the diff in {files}'
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
      'List files matching {glob}'
    ],
    contextHints: ['path', 'pattern'],
    refinementFocus: ['scope', 'filters']
  }
};
```

### Refinement Options

```javascript
// promptRefiners.js
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
```

---

## Ollama Refinement Service

```javascript
// promptRefiners.js

const REFINEMENT_SYSTEM_PROMPT = `You are a prompt engineering assistant specialized in crafting effective prompts for Claude Code (an AI-powered CLI coding assistant).

Your job is to take a user's rough prompt intent and transform it into a well-structured, effective prompt that will get better results from Claude Code.

Key principles:
1. BE SPECIFIC: Include file names, function names, line numbers when relevant
2. PROVIDE CONTEXT: Reference existing code patterns, project structure
3. SET CONSTRAINTS: Clarify what should NOT be changed, libraries to use/avoid
4. DEFINE SUCCESS: Describe the expected outcome clearly
5. STAY FOCUSED: One clear task per prompt, avoid scope creep

DO NOT:
- Add unnecessary pleasantries or filler words
- Make the prompt longer than necessary
- Add features/requirements the user didn't ask for
- Assume technology choices without evidence

Output ONLY the refined prompt text. No explanations, no markdown formatting.`;

export async function refinePrompt(options) {
  const {
    intent,
    category,
    selectedRefinements,
    contextFiles,
    codeSnippets,
    errorMessage,
    model = 'mistral',
    ollamaUrl = 'http://localhost:11434'
  } = options;

  // Build the refinement request
  const categoryInfo = PROMPT_CATEGORIES[category];

  let userPrompt = `CATEGORY: ${categoryInfo.name}
ORIGINAL INTENT: ${intent}

REFINEMENT REQUESTS:
${selectedRefinements.map(r => `- ${REFINEMENT_OPTIONS[r].prompt}`).join('\n')}

${contextFiles.length > 0 ? `RELEVANT FILES:\n${contextFiles.join('\n')}` : ''}
${codeSnippets.length > 0 ? `CODE CONTEXT:\n${codeSnippets.join('\n\n')}` : ''}
${errorMessage ? `ERROR MESSAGE:\n${errorMessage}` : ''}

Transform this into an effective Claude Code prompt.`;

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: REFINEMENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      refinedPrompt: data.message?.content?.trim() || '',
      model
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function checkOllamaModels(ollamaUrl = 'http://localhost:11434') {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    const data = await response.json();
    return {
      available: true,
      models: data.models?.map(m => m.name) || []
    };
  } catch (error) {
    return {
      available: false,
      models: [],
      error: error.message
    };
  }
}
```

---

## React Component

```jsx
// PromptCrafter.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../themes/ThemeContext';
import {
  X, Wand2, Copy, Send, Plus, FileText, Code2, AlertCircle,
  FolderTree, Target, Lock, MessageSquare, ListOrdered, Check
} from 'lucide-react';
import { PROMPT_CATEGORIES, REFINEMENT_OPTIONS } from './promptCategories';
import { refinePrompt, checkOllamaModels } from './promptRefiners';
import './PromptCrafter.css';

const PromptCrafter = ({ onSendToTerminal, onClose }) => {
  const { currentTheme } = useTheme();

  // Ollama state
  const [ollamaStatus, setOllamaStatus] = useState({ available: false, models: [] });
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [isRefining, setIsRefining] = useState(false);

  // Prompt building state
  const [category, setCategory] = useState('code_generation');
  const [intent, setIntent] = useState('');
  const [selectedRefinements, setSelectedRefinements] = useState([]);
  const [contextFiles, setContextFiles] = useState([]);
  const [codeSnippets, setCodeSnippets] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Output state
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaModels().then(status => {
      setOllamaStatus(status);
      if (status.models.length > 0) {
        setSelectedModel(status.models[0]);
      }
    });
  }, []);

  const handleRefine = async () => {
    if (!intent.trim()) return;

    setIsRefining(true);
    const result = await refinePrompt({
      intent,
      category,
      selectedRefinements,
      contextFiles,
      codeSnippets,
      errorMessage,
      model: selectedModel
    });

    if (result.success) {
      setRefinedPrompt(result.refinedPrompt);
    } else {
      setRefinedPrompt(`Error: ${result.error}`);
    }
    setIsRefining(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(refinedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToTerminal = () => {
    if (refinedPrompt && onSendToTerminal) {
      onSendToTerminal(refinedPrompt);
    }
  };

  const toggleRefinement = (id) => {
    setSelectedRefinements(prev =>
      prev.includes(id)
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const addContextFile = () => {
    const path = prompt('Enter file path:');
    if (path) {
      setContextFiles(prev => [...prev, path]);
    }
  };

  const addCodeSnippet = () => {
    const snippet = prompt('Paste code snippet:');
    if (snippet) {
      setCodeSnippets(prev => [...prev, snippet]);
    }
  };

  return (
    <div className="prompt-crafter">
      <div className="crafter-header">
        <div className="crafter-title">
          <Wand2 size={18} />
          <span>Prompt Crafter</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="crafter-content">
        {/* Ollama Status */}
        <div className={`ollama-status ${ollamaStatus.available ? 'connected' : 'disconnected'}`}>
          <span className="status-dot" />
          <span>Ollama: {ollamaStatus.available ? 'Connected' : 'Not Available'}</span>
        </div>

        {/* Category Selection */}
        <div className="crafter-section">
          <label>Task Type</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="category-select"
          >
            {Object.values(PROMPT_CATEGORIES).map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} - {cat.description}
              </option>
            ))}
          </select>
        </div>

        {/* Intent Input */}
        <div className="crafter-section">
          <label>What do you want to do?</label>
          <textarea
            className="intent-input"
            placeholder={PROMPT_CATEGORIES[category].templates[0]}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={4}
          />
        </div>

        {/* Context Helpers */}
        <div className="crafter-section">
          <label>Add Context</label>
          <div className="context-buttons">
            <button onClick={addContextFile}>
              <FileText size={14} /> File
            </button>
            <button onClick={addCodeSnippet}>
              <Code2 size={14} /> Code
            </button>
            <button onClick={() => setErrorMessage(prompt('Paste error message:') || '')}>
              <AlertCircle size={14} /> Error
            </button>
          </div>

          {/* Show added context */}
          {contextFiles.length > 0 && (
            <div className="context-tags">
              {contextFiles.map((f, i) => (
                <span key={i} className="context-tag">
                  {f}
                  <button onClick={() => setContextFiles(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Refinement Options */}
        <div className="crafter-section">
          <label>Refinement Options</label>
          <div className="refinement-grid">
            {Object.values(REFINEMENT_OPTIONS).map(opt => (
              <button
                key={opt.id}
                className={`refinement-option ${selectedRefinements.includes(opt.id) ? 'selected' : ''}`}
                onClick={() => toggleRefinement(opt.id)}
              >
                {selectedRefinements.includes(opt.id) && <Check size={12} />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection & Refine Button */}
        <div className="crafter-section refine-row">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-select"
            disabled={!ollamaStatus.available}
          >
            {ollamaStatus.models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <button
            className="refine-btn"
            onClick={handleRefine}
            disabled={!intent.trim() || !ollamaStatus.available || isRefining}
          >
            <Wand2 size={14} />
            {isRefining ? 'Refining...' : 'Refine Prompt'}
          </button>
        </div>

        {/* Refined Output */}
        {refinedPrompt && (
          <div className="crafter-section">
            <label>Refined Prompt</label>
            <div className="refined-output">
              <pre>{refinedPrompt}</pre>
            </div>
            <div className="output-actions">
              <button onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={handleSendToTerminal} className="send-btn">
                <Send size={14} /> Send to Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptCrafter;
```

---

## CSS Styling

```css
/* PromptCrafter.css */

.terminal-with-crafter {
  display: flex;
  height: 100vh;
  width: 100%;
}

.terminal-main {
  display: flex;
  flex-direction: column;
  transition: flex 0.3s ease;
  min-width: 400px;
}

.prompt-crafter {
  width: 350px;
  min-width: 300px;
  max-width: 450px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.crafter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.crafter-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.crafter-title svg {
  color: var(--accent-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.crafter-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ollama-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--bg-tertiary);
}

.ollama-status.connected {
  color: var(--success);
}

.ollama-status.disconnected {
  color: var(--error);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.crafter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.crafter-section label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-select,
.model-select {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.category-select:focus,
.model-select:focus {
  border-color: var(--accent-primary);
  outline: none;
}

.intent-input {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

.intent-input:focus {
  border-color: var(--accent-primary);
  outline: none;
}

.intent-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.context-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.context-buttons button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.context-buttons button:hover {
  background: var(--bg-primary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.context-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.context-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--accent-primary);
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
  color: white;
  font-size: 11px;
  border-radius: 4px;
}

.context-tag button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
}

.refinement-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.refinement-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.refinement-option:hover {
  border-color: var(--accent-primary);
}

.refinement-option.selected {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--bg-primary);
}

.refine-row {
  flex-direction: row;
  align-items: stretch;
  gap: 8px;
}

.refine-row .model-select {
  flex: 1;
}

.refine-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
  border: none;
  color: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.refine-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.refine-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refined-output {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.refined-output pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 13px;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.output-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.output-actions button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.output-actions button:hover {
  background: var(--bg-primary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.output-actions .send-btn {
  flex: 1;
  justify-content: center;
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--bg-primary);
}

.output-actions .send-btn:hover {
  background: var(--accent-secondary);
}

/* Scrollbar styling */
.crafter-content::-webkit-scrollbar,
.refined-output::-webkit-scrollbar {
  width: 8px;
}

.crafter-content::-webkit-scrollbar-track,
.refined-output::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
}

.crafter-content::-webkit-scrollbar-thumb,
.refined-output::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 4px;
}

.crafter-content::-webkit-scrollbar-thumb:hover,
.refined-output::-webkit-scrollbar-thumb:hover {
  background: var(--accent-secondary);
}
```

---

## Implementation Tasks

### Phase 1: Core Setup
- [ ] Create `promptCategories.js` with all category definitions
- [ ] Create `promptRefiners.js` with Ollama integration
- [ ] Create basic `PromptCrafter.jsx` component
- [ ] Create `PromptCrafter.css` with theme-aware styling

### Phase 2: Terminal Integration
- [ ] Update `Terminal.jsx` to add toggle button and side panel layout
- [ ] Update `Terminal.css` for flex layout with crafter panel
- [ ] Add "Send to Terminal" functionality (write to PTY)
- [ ] Add keyboard shortcut (Ctrl+Shift+P) to toggle panel

### Phase 3: Enhanced Features
- [ ] Add context file picker (browse dialog)
- [ ] Add code snippet modal (syntax highlighted input)
- [ ] Add error message parser (extract key info)
- [ ] Add prompt history (localStorage)

### Phase 4: Polish
- [ ] Add loading animations
- [ ] Add keyboard navigation
- [ ] Add tooltips for options
- [ ] Add quick templates dropdown per category

---

## Acceptance Criteria

1. **Ollama Only**: Must work entirely with local Ollama - no cloud APIs
2. **Theme Aware**: Must respect current app theme (all 6 themes)
3. **Non-Intrusive**: Panel should be collapsible, not block terminal
4. **Responsive**: Panel should work at various widths
5. **Fast**: Refinement should complete in <5 seconds for most prompts
6. **Copy/Send**: Both clipboard and direct terminal injection must work

---

## Design System Compliance

**Colors**: Use CSS variables from DESIGN-SYSTEM.md
- Primary BG: `var(--bg-secondary)` for panel
- Accent: `var(--accent-primary)` for buttons and highlights
- Gradient: `var(--gradient-start)` to `var(--gradient-end)` for CTA buttons

**Icons**: Lucide React
- Wand2 for refinement/magic
- Target for specificity
- Lock for constraints
- Send for terminal injection

**Typography**:
- Labels: 12px uppercase, letter-spacing 0.5px
- Body: 14px regular
- Code: Consolas/Monaco

---

## Testing Checklist

- [ ] Panel opens/closes correctly
- [ ] All categories display with correct templates
- [ ] Ollama connection detection works
- [ ] Model dropdown populates from Ollama
- [ ] Refinement produces reasonable output
- [ ] Copy to clipboard works
- [ ] Send to terminal types into PTY
- [ ] All themes render correctly
- [ ] Keyboard shortcut works
- [ ] Panel state persists on tab switch
