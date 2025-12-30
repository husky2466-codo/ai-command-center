# ChainRunner Architecture

## Component Hierarchy

```
ChainRunner (Main Orchestrator)
│
├── Custom Hooks (State & Logic)
│   ├── useChainState()        - All state management
│   ├── useChainExecution()    - Run chain, API calls, recording
│   └── usePromptGeneration()  - Batch prompt logic
│
├── Setup View (mode === 'setup')
│   ├── Header
│   │   ├── Load Config button → ConfigModal
│   │   └── Save Config button → ConfigModal
│   │
│   ├── ChainConfig
│   │   ├── Agent panels (map over agents)
│   │   │   ├── Provider selector
│   │   │   ├── Model selector
│   │   │   ├── Ollama endpoint (if provider === 'ollama')
│   │   │   ├── Task spec textarea
│   │   │   └── Actions (↑↓⧉×)
│   │   └── Add Agent button
│   │
│   └── ChainExecution
│       ├── ChainPromptGenerator (conditional)
│       │   ├── Toggle checkbox
│       │   ├── Provider/Model/Count inputs
│       │   ├── Topic input + Generate button
│       │   ├── Prompt list (editable)
│       │   └── Save/Load buttons
│       │
│       ├── Initial Prompt textarea (if !showPromptGenerator)
│       │
│       └── Run Config
│           ├── Run mode (once/sessions/continuous)
│           ├── Typewriter toggle
│           ├── Quality Validator config
│           └── Run Chain button
│
└── Output View (mode === 'output')
    ├── Header
    │   ├── Prompt progress (if batch mode)
    │   ├── Validating indicator (if validating)
    │   ├── Recording badge (REC)
    │   ├── Stop button (if running)
    │   └── Export RAG / Back to Setup (if stopped)
    │
    └── ChainOutput
        └── Output panels (map over agents)
            ├── Header (agent name, running indicator, quality badge)
            ├── Editable task spec
            └── Output content (with typewriter cursor)

Modals (Overlay)
├── RAGExportModal (format, tags, output path)
└── ConfigModal (save/load chain configs)
```

## Data Flow

```
User Action
    ↓
ChainRunner (receives event)
    ↓
Calls hook function (e.g., execution.runChain())
    ↓
Hook updates state (via setters from useChainState)
    ↓
State change triggers re-render
    ↓
Child components receive new props
    ↓
UI updates
```

## State Management

### useChainState (Single Source of Truth)

All state lives in this hook:

```javascript
const state = useChainState();

// Agent config
state.agents
state.panelWidths
state.updateAgent(id, updates)
state.addAgent()
state.removeAgent(id)

// Execution state
state.isRunning
state.currentAgent
state.mode  // 'setup' or 'output'

// Prompt generator
state.showPromptGenerator
state.promptList
state.promptTopic

// Quality validator
state.enableValidator
state.qualityThreshold

// Refs
state.abortRef
state.sessionLogRef
```

## Hook Composition

```javascript
export default function ChainRunner({ apiKeys }) {
  // 1. Get all state
  const state = useChainState();

  // 2. Get execution functions (needs state + apiKeys)
  const execution = useChainExecution({
    agents: state.agents,
    setAgents: state.setAgents,
    apiKeys,
    // ... all execution-related state
  });

  // 3. Get prompt generation functions (needs state + execution.getOllamaUrl)
  const promptGeneration = usePromptGeneration({
    apiKeys,
    setPromptList: state.setPromptList,
    promptTopic: state.promptTopic,
    getOllamaUrl: execution.getOllamaUrl,
    // ... all prompt-related state
  });

  // 4. Render components, passing props from state/hooks
  return (
    <div className="chain-runner">
      <ChainConfig {...state} />
      <ChainPromptGenerator {...state} {...promptGeneration} />
      <ChainExecution {...state} runChain={execution.runChain} />
      <ChainOutput {...state} />
    </div>
  );
}
```

## Execution Flow

### Single Prompt Mode

```
User clicks "Run Chain"
    ↓
execution.runChain()
    ↓
1. Initialize session log
2. Clear agent outputs
3. Start screen recording
4. FOR each agent:
   - Call API (Anthropic/OpenAI/HuggingFace/Ollama)
   - Store full output
   - Typewriter effect (if enabled)
   - Log to session
   - Pass output to next agent
5. Quality validation (if enabled)
   - For each Q&A pair, call validator API
   - Attach quality scores to outputs
6. Save session log
7. Stop recording
```

### Batch Prompt Mode

```
User clicks "Run Chain" (with prompt list)
    ↓
execution.runChain()
    ↓
FOR each prompt in promptList:
  1. Set currentPromptIndex
  2. Run full agent chain (same as above)
  3. Log iteration output
NEXT prompt
    ↓
Quality validation (all Q&A pairs)
    ↓
Save session log
```

## API Provider Routing

```javascript
callApi(agent, input)
    ↓
Switch on agent.provider:
    ├── 'anthropic'    → POST https://api.anthropic.com/v1/messages
    ├── 'openai'       → POST https://api.openai.com/v1/chat/completions
    ├── 'huggingface'  → POST https://router.huggingface.co/v1/chat/completions
    └── 'ollama'       → POST {getOllamaUrl()}/api/chat
                          ├── 'local' → http://localhost:11434
                          └── 'dgx'   → http://192.168.3.20:11434
```

## File Size Comparison

```
BEFORE:
ChainRunner.jsx          1,225 lines  ████████████████████████

AFTER:
ChainRunner.jsx            231 lines  ████▌
ChainConfig.jsx             95 lines  █▊
ChainExecution.jsx         159 lines  ███▏
ChainOutput.jsx             68 lines  █▎
ChainPromptGenerator.jsx   147 lines  ██▊
useChainState.js           304 lines  ██████
useChainExecution.js       455 lines  █████████
usePromptGeneration.js      95 lines  █▊
                        ─────────────
TOTAL:                   1,554 lines  ██████████████████████████████
```

## Benefits Visualization

### Before (Monolithic)
```
┌─────────────────────────────────┐
│       ChainRunner.jsx           │
│  - State (300 lines)            │
│  - UI Setup (400 lines)         │
│  - UI Output (200 lines)        │
│  - Execution (300 lines)        │
│  - Recording (100 lines)        │
│  - Validation (100 lines)       │
│  - Utilities (125 lines)        │
│                                 │
│  Total: 1,225 lines in 1 file  │
│  Hard to navigate               │
│  Hard to test                   │
└─────────────────────────────────┘
```

### After (Modular)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ChainRunner  │  │ ChainConfig  │  │ ChainExec    │
│  Orchestrator│  │  Agent Setup │  │  Run Controls│
│  231 lines   │  │  95 lines    │  │  159 lines   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ChainOutput  │  │ ChainPrompt  │  │ useChainState│
│  Display     │  │  Batch UI    │  │  State Mgmt  │
│  68 lines    │  │  147 lines   │  │  304 lines   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│ useChainExec │  │ usePromptGen │
│  Execution   │  │  Prompts     │
│  455 lines   │  │  95 lines    │
└──────────────┘  └──────────────┘

Each component:
✓ Single responsibility
✓ Easy to navigate
✓ Easy to test
✓ Clear boundaries
```

## Testing Strategy (Future)

### Unit Tests
```javascript
// Test hooks in isolation
describe('useChainState', () => {
  it('should add agent', () => {
    const { result } = renderHook(() => useChainState());
    act(() => result.current.addAgent());
    expect(result.current.agents).toHaveLength(2);
  });
});

// Test components with mocked props
describe('ChainConfig', () => {
  it('should render agent panels', () => {
    render(<ChainConfig agents={mockAgents} {...mockProps} />);
    expect(screen.getByText('Agent 1')).toBeInTheDocument();
  });
});
```

### Integration Tests
```javascript
describe('ChainRunner', () => {
  it('should execute chain and display output', async () => {
    render(<ChainRunner apiKeys={mockKeys} />);

    // Configure agent
    userEvent.click(screen.getByText('Add Agent'));

    // Enter prompt
    userEvent.type(screen.getByPlaceholderText('Enter the prompt'), 'Hello');

    // Run chain
    userEvent.click(screen.getByText('Run Chain'));

    // Assert output appears
    await waitFor(() => {
      expect(screen.getByText(/Processing.../)).toBeInTheDocument();
    });
  });
});
```

## Key Design Decisions

1. **Hooks over Context**: State management via custom hooks (simpler than Context for this use case)
2. **Component Composition**: Small, focused components that are easy to reason about
3. **Props Drilling**: Acceptable for this depth (only 2 levels)
4. **Single State Hook**: All state in one place prevents prop-drilling hell
5. **Execution as Hook**: Complex logic isolated but still testable
6. **No Redux**: App isn't large enough to justify Redux complexity

## Performance Considerations

### Current (Good Enough)
- Components re-render when state changes
- Acceptable performance for this use case

### Future Optimizations (If Needed)
```javascript
// Memoize components
const ChainConfig = React.memo(ChainConfigComponent);

// Memoize expensive calculations
const sortedAgents = useMemo(() =>
  agents.sort((a, b) => a.id - b.id),
  [agents]
);

// Debounce textarea updates
const debouncedUpdateTaskSpec = useCallback(
  debounce((id, value) => updateAgent(id, { taskSpec: value }), 300),
  []
);
```

## Conclusion

The refactored architecture achieves:

- **Separation of Concerns**: State, logic, and UI are cleanly separated
- **Testability**: Each piece can be tested independently
- **Maintainability**: Easy to find and fix bugs
- **Scalability**: Easy to add new features without touching existing code
- **Readability**: Clear, self-documenting structure

No sacrifices were made to functionality - all features work exactly as before.
