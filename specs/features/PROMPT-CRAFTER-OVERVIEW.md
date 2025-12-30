# Prompt Crafter - System Overview & Wiring

## Executive Summary

Add a collapsible side panel to the Terminal component that uses **Ollama LLMs only** to help users craft better prompts for Claude Code. No cloud APIs - entirely local and private.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AI COMMAND CENTER                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                              App.jsx                                        │ │
│ │  ┌───────────────┐   ┌──────────────────────────────────────────────────┐  │ │
│ │  │   Sidebar     │   │              SplitLayout                         │  │ │
│ │  │               │   │  ┌────────────────────────────────────────────┐  │  │ │
│ │  │  [Dashboard]  │   │  │              PaneContainer                 │  │  │ │
│ │  │  [Projects]   │   │  │   ┌─────────────────────────────────────┐  │  │  │ │
│ │  │  [Terminal] ◄─┼───┼──┼───│            Terminal Tab              │  │  │  │ │
│ │  │  [Chain]      │   │  │   │  ┌────────────────┬───────────────┐ │  │  │  │ │
│ │  │  [Vision]     │   │  │   │  │   Terminal    │ PromptCrafter │ │  │  │  │ │
│ │  │  [Email]      │   │  │   │  │   (xterm.js)  │   (Panel)     │ │  │  │  │ │
│ │  │  ...          │   │  │   │  │               │               │ │  │  │  │ │
│ │  └───────────────┘   │  │   │  │  ┌─────────┐  │  ┌──────────┐ │ │  │  │  │ │
│ │                      │  │   │  │  │ PTY     │  │  │ Ollama   │ │ │  │  │  │ │
│ │                      │  │   │  │  │ Process │  │  │ Client   │ │ │  │  │  │ │
│ │                      │  │   │  │  └────┬────┘  │  └────┬─────┘ │ │  │  │  │ │
│ │                      │  │   │  └───────┼───────┴───────┼───────┘ │  │  │  │ │
│ │                      │  │   └──────────┼───────────────┼─────────┘  │  │  │ │
│ │                      │  └──────────────┼───────────────┼────────────┘  │  │ │
│ └──────────────────────┴─────────────────┼───────────────┼───────────────┘  │ │
│                                          │               │                   │ │
│                          ┌───────────────┘               │                   │ │
│                          ▼                               ▼                   │ │
│               ┌──────────────────┐            ┌────────────────────┐         │ │
│               │  Electron Main   │            │  Ollama Server     │         │ │
│               │  (node-pty)      │            │  localhost:11434   │         │ │
│               └──────────────────┘            └────────────────────┘         │ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Wiring Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Terminal.jsx                                   │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │                         State Management                              │ │
│ │  const [showCrafter, setShowCrafter] = useState(false);              │ │
│ │  const xtermRef = useRef(null);                                      │ │
│ │  const terminalIdRef = useRef(null);                                 │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─────────────────────────┐    ┌────────────────────────────────────────┐│
│ │   Terminal Section      │    │      PromptCrafter Section             ││
│ │   flex: showCrafter     │    │      (conditional render)              ││
│ │         ? 0.65 : 1      │    │                                        ││
│ │                         │    │  Props:                                ││
│ │  ┌───────────────────┐  │    │  • onSendToTerminal={(text) => {       ││
│ │  │  terminal-header  │  │    │      writeToTerminal(terminalId, text) ││
│ │  │  ┌─────────────┐  │  │    │    }}                                  ││
│ │  │  │ Toggle Btn  │◄─┼──┼────│  • onClose={() => setShowCrafter(false)││
│ │  │  │   [Wand2]   │  │  │    │                                        ││
│ │  │  └─────────────┘  │  │    │  ┌────────────────────────────────────┐││
│ │  └───────────────────┘  │    │  │   PromptCrafter.jsx                │││
│ │                         │    │  │   ┌──────────────────────────────┐ │││
│ │  ┌───────────────────┐  │    │  │   │  Categories, Intent, Options │ │││
│ │  │ terminal-wrapper  │  │    │  │   │  ┌────────────────────────┐  │ │││
│ │  │  (xterm.js)       │  │    │  │   │  │  refinePrompt()        │  │ │││
│ │  │                   │  │    │  │   │  │  ↓ Ollama API Call     │  │ │││
│ │  │  Receives text    │◄─┼────┼──│   │  │  ↓ Returns refined    │  │ │││
│ │  │  from crafter     │  │    │  │   │  │    prompt text         │  │ │││
│ │  │                   │  │    │  │   │  └────────────────────────┘  │ │││
│ │  └───────────────────┘  │    │  │   │                              │ │││
│ │                         │    │  │   │  [Copy] [Send to Terminal]   │ │││
│ └─────────────────────────┘    │  │   └──────────────────────────────┘ │││
│                                │  └────────────────────────────────────┘││
│                                └────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

User Types Intent
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         PromptCrafter State                                │
│  ┌────────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ intent         │  │ category    │  │ refinements  │  │ contextFiles │  │
│  │ "make login"   │  │ "code_gen"  │  │ ["specific", │  │ ["src/auth/  │  │
│  │                │  │             │  │  "examples"] │  │   Login.jsx"]│  │
│  └────────────────┘  └─────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼ User clicks "Refine Prompt"
┌───────────────────────────────────────────────────────────────────────────┐
│                        promptRefiners.js                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  refinePrompt({                                                      │  │
│  │    intent,                                                           │  │
│  │    category,                                                         │  │
│  │    selectedRefinements,                                              │  │
│  │    contextFiles,                                                     │  │
│  │    model: 'mistral'                                                  │  │
│  │  })                                                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼ HTTP POST
┌───────────────────────────────────────────────────────────────────────────┐
│                    Ollama API (localhost:11434)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  POST /api/chat                                                      │  │
│  │  {                                                                   │  │
│  │    model: "mistral",                                                 │  │
│  │    messages: [                                                       │  │
│  │      { role: "system", content: REFINEMENT_SYSTEM_PROMPT },          │  │
│  │      { role: "user", content: buildUserPrompt(...) }                 │  │
│  │    ],                                                                │  │
│  │    stream: false                                                     │  │
│  │  }                                                                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼ JSON Response
┌───────────────────────────────────────────────────────────────────────────┐
│                       Refined Prompt                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  "Create a React login component in src/auth/Login.jsx with:        │  │
│  │   - Email and password fields with validation                       │  │
│  │   - Error message display using existing ErrorAlert component       │  │
│  │   - Loading state during API call                                   │  │
│  │   - Form submission handler that calls authService.login()          │  │
│  │   - Follow the existing form patterns in src/components/forms/"     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼ User clicks "Send to Terminal"
┌───────────────────────────────────────────────────────────────────────────┐
│                         Terminal.jsx                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  handleSendToTerminal = (text) => {                                  │  │
│  │    window.electronAPI.writeToTerminal(terminalIdRef.current, text);  │  │
│  │  }                                                                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼ IPC to Electron Main
┌───────────────────────────────────────────────────────────────────────────┐
│                       Electron Main Process                                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  ipcMain.on('terminal-write', (event, { id, data }) => {            │  │
│  │    terminals.get(id).write(data);                                   │  │
│  │  });                                                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
        │
        ▼ PTY Write
┌───────────────────────────────────────────────────────────────────────────┐
│                          Terminal PTY                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  $ Create a React login component in src/auth/Login.jsx with...     │  │
│  │  _                                                                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Claude Code Prompt Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PROMPT CATEGORIES & TEMPLATES                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CODE GENERATION                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: Code2                                                                 │
│ Templates:                                                                  │
│   • "Write a {type} that {action}"                                         │
│   • "Create a {component} for {purpose}"                                   │
│   • "Implement {feature} with {constraints}"                               │
│ Best Refinements: specificity, constraints, examples                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DEBUGGING                                                                   │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: Bug                                                                   │
│ Templates:                                                                  │
│   • "Debug the issue in {file} where {symptom}"                            │
│   • "Fix the bug causing {error}"                                          │
│   • "Investigate why {component} fails when {trigger}"                     │
│ Best Refinements: error_context, reproduction, expected                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ REFACTORING                                                                 │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: RefreshCw                                                             │
│ Templates:                                                                  │
│   • "Refactor {target} to {improvement}"                                   │
│   • "Extract {pattern} from {source}"                                      │
│   • "Simplify {complex_code} without changing behavior"                    │
│ Best Refinements: scope, preserveBehavior, patterns                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ EXPLANATION                                                                 │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: HelpCircle                                                            │
│ Templates:                                                                  │
│   • "Explain how {code} works"                                             │
│   • "What does {function} do step by step"                                 │
│   • "Why was {pattern} used here"                                          │
│ Best Refinements: depth, examples, diagrams                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PLANNING                                                                    │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: Map                                                                   │
│ Templates:                                                                  │
│   • "Plan the implementation of {feature}"                                 │
│   • "Design the architecture for {system}"                                 │
│   • "Break down {task} into steps"                                         │
│ Best Refinements: scope, phases, dependencies                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TESTING                                                                     │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: TestTube2                                                             │
│ Templates:                                                                  │
│   • "Write unit tests for {function}"                                      │
│   • "Add integration tests for {feature}"                                  │
│   • "Test edge cases in {component}"                                       │
│ Best Refinements: coverage, edge_cases, mocks                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ GIT OPERATIONS                                                              │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: GitBranch                                                             │
│ Templates:                                                                  │
│   • "Commit changes with message describing {summary}"                     │
│   • "Create a PR for {feature}"                                            │
│   • "Review the diff in {files}"                                           │
│ Best Refinements: message_style, scope                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FILE OPERATIONS                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Icon: FolderSearch                                                          │
│ Templates:                                                                  │
│   • "Find all files containing {pattern}"                                  │
│   • "Search for usages of {symbol}"                                        │
│   • "List files matching {glob}"                                           │
│ Best Refinements: scope, filters                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Refinement Options

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REFINEMENT OPTIONS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────┬────────────────────────────────────────────────────────────┐
│ specificity    │ Add specific details: file names, function names,          │
│    [Target]    │ expected behavior, input/output examples                   │
├────────────────┼────────────────────────────────────────────────────────────┤
│ constraints    │ Add constraints: libraries to use/avoid, performance       │
│    [Lock]      │ requirements, compatibility needs                          │
├────────────────┼────────────────────────────────────────────────────────────┤
│ explanation    │ Ask for explanation of the approach and key decisions      │
│ [MessageSquare]│                                                            │
├────────────────┼────────────────────────────────────────────────────────────┤
│ step_by_step   │ Break down into clear sequential steps                     │
│ [ListOrdered]  │                                                            │
├────────────────┼────────────────────────────────────────────────────────────┤
│ examples       │ Add concrete examples of expected input/output or usage    │
│   [FileCode]   │                                                            │
├────────────────┼────────────────────────────────────────────────────────────┤
│ context_files  │ Reference specific files that provide context              │
│   [FileText]   │                                                            │
├────────────────┼────────────────────────────────────────────────────────────┤
│ edge_cases     │ Address potential edge cases and error handling            │
│[AlertTriangle] │                                                            │
├────────────────┼────────────────────────────────────────────────────────────┤
│ patterns       │ Follow existing patterns and conventions in the codebase   │
│    [Layers]    │                                                            │
└────────────────┴────────────────────────────────────────────────────────────┘
```

---

## Theme Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THEME COMPLIANCE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Prompt Crafter uses these CSS variables (works with all 6 themes):

Background Layers:
  Panel:     var(--bg-secondary)     ┌─────────────────┐
  Sections:  var(--bg-tertiary)      │                 │
  Inputs:    var(--input-bg)         │  ┌───────────┐  │ ◄─ bg-secondary
                                     │  │           │  │
                                     │  │           │  │ ◄─ bg-tertiary
                                     │  │  ┌─────┐  │  │
                                     │  │  │     │  │  │ ◄─ input-bg
                                     │  │  └─────┘  │  │
                                     │  └───────────┘  │
                                     └─────────────────┘

Accents:
  Primary Button:   linear-gradient(var(--gradient-start), var(--gradient-end))
  Toggle Active:    var(--accent-primary)
  Focus Ring:       var(--accent-primary)
  Status Icons:     var(--success) / var(--error)

Text:
  Headers:          var(--text-primary)
  Labels:           var(--text-secondary)
  Placeholder:      var(--text-secondary) @ 60% opacity

Borders:
  Default:          var(--border-primary)
  Focused:          var(--accent-primary)

Theme Examples:
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Default    │    Cipher    │   Voltage    │    Magma     │
│  Navy/Gold   │  Matrix/Grn  │  Black/Yel   │  Ember/Org   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓ │ ░░░░░░░░░░░░ │ ▒▒▒▒▒▒▒▒▒▒▒▒ │ ▓▓▓▓▓▓▓▓▓▓▓▓ │
│ █ [Refine] █ │ █ [Refine] █ │ █ [Refine] █ │ █ [Refine] █ │
│  Gold Btn    │  Green Btn   │ Yellow Btn   │ Orange Btn   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## File Structure

```
src/components/terminal/
├── Terminal.jsx              # MODIFY - Add toggle + side panel layout
├── Terminal.css              # MODIFY - Add flex layout for crafter
├── PromptCrafter.jsx         # NEW - Main panel component
├── PromptCrafter.css         # NEW - Panel styling (theme-aware)
├── promptCategories.js       # NEW - Category/template definitions
├── promptRefiners.js         # NEW - Ollama API integration
└── promptTemplates.js        # NEW - Template string utilities

Dependencies (already installed):
├── lucide-react              # Icons (Wand2, Send, Copy, etc.)
├── @xterm/xterm              # Terminal emulation
└── (fetch)                   # Native - for Ollama API calls
```

---

## Implementation Phases

```
Phase 1: Core Foundation                                   [Week 1]
┌─────────────────────────────────────────────────────────────────┐
│ • Create promptCategories.js with all 8 categories             │
│ • Create promptRefiners.js with Ollama integration              │
│ • Create basic PromptCrafter.jsx scaffold                       │
│ • Create PromptCrafter.css with theme variables                 │
│ • Test Ollama connection and refinement                         │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
Phase 2: Terminal Integration                              [Week 1]
┌─────────────────────────────────────────────────────────────────┐
│ • Update Terminal.jsx with toggle button in header              │
│ • Update Terminal.css with flex layout for side panel           │
│ • Implement "Send to Terminal" (write to PTY)                   │
│ • Add keyboard shortcut (Ctrl+Shift+P)                          │
│ • Test panel open/close, terminal still works                   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
Phase 3: Enhanced Context                                  [Week 2]
┌─────────────────────────────────────────────────────────────────┐
│ • Add file browser dialog for context files                     │
│ • Add code snippet modal with syntax highlighting               │
│ • Add error message parser (extract relevant info)              │
│ • Add prompt history (localStorage persistence)                 │
│ • Test all context types flow correctly to refinement           │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
Phase 4: Polish & UX                                       [Week 2]
┌─────────────────────────────────────────────────────────────────┐
│ • Add loading animations during refinement                      │
│ • Add keyboard navigation between sections                      │
│ • Add tooltips explaining each option                           │
│ • Add quick templates dropdown per category                     │
│ • Test all 6 themes render correctly                            │
│ • Performance optimization (debounce, memoization)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ACCEPTANCE CRITERIA                                  │
└─────────────────────────────────────────────────────────────────────────────┘

[ ] OLLAMA ONLY
    No cloud API calls - works 100% with local Ollama
    Graceful degradation if Ollama not running

[ ] THEME AWARE
    Renders correctly with all 6 themes (Default, Cipher, Voltage,
    Evergreen, Depths, Magma)
    Colors update in real-time when theme changes

[ ] NON-INTRUSIVE
    Panel is collapsible - terminal works fine when closed
    Panel remembers open/closed state
    Terminal remains fully functional when panel is open

[ ] RESPONSIVE
    Panel works at 300-450px width
    Content scrolls properly
    No layout breaking

[ ] FAST
    Refinement completes in <5 seconds
    UI remains responsive during refinement
    No blocking of terminal input

[ ] FUNCTIONAL
    Copy to clipboard works
    Send to terminal types directly into PTY
    All 8 categories produce meaningful refinements
    All refinement options modify output appropriately
```

---

## Quick Reference: Ollama Models

```
Recommended models for prompt refinement (in order of quality):

┌─────────────────┬─────────┬───────────────────────────────────────────┐
│ Model           │ Size    │ Notes                                     │
├─────────────────┼─────────┼───────────────────────────────────────────┤
│ llama3.2        │ 3.2GB   │ Best quality, fast enough                 │
│ mistral         │ 4.1GB   │ Good balance of speed/quality             │
│ phi3            │ 2.3GB   │ Fast, good for simple refinements         │
│ gemma2          │ 5.5GB   │ High quality but slower                   │
│ qwen2.5         │ 4.7GB   │ Good at following instructions            │
│ deepseek-coder  │ 6.7GB   │ Best for code-related prompts             │
└─────────────────┴─────────┴───────────────────────────────────────────┘

Pull command: ollama pull <model_name>
```
