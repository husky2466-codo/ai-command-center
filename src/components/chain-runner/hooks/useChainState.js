import { useState, useRef, useEffect } from 'react';

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  huggingface: {
    name: 'HuggingFace',
    models: ['mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Llama-2-7b-chat-hf'],
  },
  ollama: {
    name: 'Ollama',
    models: ['mistral', 'llama3.2', 'phi3', 'deepseek-coder:6.7b'],
  },
  'claude-cli': {
    name: 'Claude CLI (Subscription)',
    models: ['default'], // CLI uses default model, no selection needed
  },
};

const DEFAULT_AGENT = {
  id: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  taskSpec: 'You are a helpful AI assistant.',
  output: '',
  displayedOutput: '',
};

export function useChainState() {
  // Agent configuration
  const [agents, setAgents] = useState([
    { ...DEFAULT_AGENT, id: '1' },
  ]);
  const [panelWidths, setPanelWidths] = useState(() => [100]);

  // Execution state
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('setup');
  const [runMode, setRunMode] = useState('once');
  const [sessionCount, setSessionCount] = useState(3);
  const [currentAgent, setCurrentAgent] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [enableTypewriter, setEnableTypewriter] = useState(true);

  // Batch prompt generator state
  const [promptList, setPromptList] = useState([]);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [generatorProvider, setGeneratorProvider] = useState('anthropic');
  const [generatorModel, setGeneratorModel] = useState('claude-sonnet-4-20250514');
  const [promptCount, setPromptCount] = useState(10);
  const [promptTopic, setPromptTopic] = useState('');

  // Quality validator state
  const [enableValidator, setEnableValidator] = useState(false);
  const [validatorProvider, setValidatorProvider] = useState('anthropic');
  const [validatorModel, setValidatorModel] = useState('claude-sonnet-4-20250514');
  const [qualityThreshold, setQualityThreshold] = useState(0.7);
  const [isValidating, setIsValidating] = useState(false);

  // DGX Spark / Ollama endpoint state
  const [ollamaEndpoint, setOllamaEndpoint] = useState('local');
  const [dgxConnected, setDgxConnected] = useState(false);

  // Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalMode, setConfigModalMode] = useState('load');

  // Refs
  const abortRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const typewriterTimersRef = useRef([]);
  const sessionLogRef = useRef({ agents: [], prompt: '', outputs: [], startTime: null });

  // Initialize panel widths when agents change
  useEffect(() => {
    if (agents.length > 0 && panelWidths.length !== agents.length) {
      setPanelWidths(agents.map(() => 100 / agents.length));
    }
  }, [agents.length, panelWidths.length]);

  // Cleanup typewriter timers
  useEffect(() => {
    return () => {
      typewriterTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Check DGX connection status
  useEffect(() => {
    const checkDgxConnection = async () => {
      if (!window.electronAPI?.dgxCheckStatus) {
        setDgxConnected(false);
        return;
      }

      try {
        const result = await window.electronAPI.dgxCheckStatus('active');
        setDgxConnected(result?.connected || false);
      } catch (err) {
        setDgxConnected(false);
      }
    };

    checkDgxConnection();
    const interval = setInterval(checkDgxConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  // Agent management functions
  const addAgent = () => {
    const newAgent = { ...DEFAULT_AGENT, id: Date.now().toString() };
    setAgents([...agents, newAgent]);
  };

  const removeAgent = (id) => {
    if (agents.length <= 1) return;
    setAgents(agents.filter(a => a.id !== id));
  };

  const duplicateAgent = (agent) => {
    const newAgent = { ...agent, id: Date.now().toString(), output: '', displayedOutput: '' };
    const idx = agents.findIndex(a => a.id === agent.id);
    const newAgents = [...agents];
    newAgents.splice(idx + 1, 0, newAgent);
    setAgents(newAgents);
  };

  const updateAgent = (id, updates) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const moveAgent = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= agents.length) return;
    const newAgents = [...agents];
    [newAgents[idx], newAgents[newIdx]] = [newAgents[newIdx], newAgents[idx]];
    setAgents(newAgents);
  };

  // Panel resize
  const handlePanelResize = (index, e) => {
    const startX = e.clientX;
    const startWidths = [...panelWidths];

    const onMouseMove = (moveEvent) => {
      const delta = ((moveEvent.clientX - startX) / window.innerWidth) * 100;
      const newWidths = [...startWidths];
      newWidths[index] = Math.max(15, startWidths[index] + delta);
      newWidths[index + 1] = Math.max(15, startWidths[index + 1] - delta);
      setPanelWidths(newWidths);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Get current configuration for saving
  const getCurrentConfig = () => ({
    agents: agents.map(a => ({
      provider: a.provider,
      model: a.model,
      taskSpec: a.taskSpec
    })),
    prompt,
    runMode,
    sessionCount,
    showPromptGenerator,
    promptTopic,
    promptCount,
    promptList,
    generatorProvider,
    generatorModel,
    enableValidator,
    validatorProvider,
    validatorModel,
    qualityThreshold,
    enableTypewriter,
    ollamaEndpoint
  });

  // Load configuration
  const handleLoadConfig = (config) => {
    if (config.agents) {
      setAgents(config.agents.map((a, i) => ({
        ...a,
        id: String(i + 1),
        output: '',
        displayedOutput: ''
      })));
    }
    if (config.prompt !== undefined) setPrompt(config.prompt);
    if (config.runMode) setRunMode(config.runMode);
    if (config.sessionCount) setSessionCount(config.sessionCount);
    if (config.showPromptGenerator !== undefined) setShowPromptGenerator(config.showPromptGenerator);
    if (config.promptTopic !== undefined) setPromptTopic(config.promptTopic);
    if (config.promptCount) setPromptCount(config.promptCount);
    if (config.promptList) setPromptList(config.promptList);
    if (config.generatorProvider) setGeneratorProvider(config.generatorProvider);
    if (config.generatorModel) setGeneratorModel(config.generatorModel);
    if (config.enableValidator !== undefined) setEnableValidator(config.enableValidator);
    if (config.validatorProvider) setValidatorProvider(config.validatorProvider);
    if (config.validatorModel) setValidatorModel(config.validatorModel);
    if (config.qualityThreshold !== undefined) setQualityThreshold(config.qualityThreshold);
    if (config.enableTypewriter !== undefined) setEnableTypewriter(config.enableTypewriter);
    if (config.ollamaEndpoint !== undefined) setOllamaEndpoint(config.ollamaEndpoint);
  };

  return {
    // State
    agents,
    setAgents,
    panelWidths,
    setPanelWidths,
    prompt,
    setPrompt,
    isRunning,
    setIsRunning,
    mode,
    setMode,
    runMode,
    setRunMode,
    sessionCount,
    setSessionCount,
    currentAgent,
    setCurrentAgent,
    isRecording,
    setIsRecording,
    recordingError,
    setRecordingError,
    enableTypewriter,
    setEnableTypewriter,
    promptList,
    setPromptList,
    showPromptGenerator,
    setShowPromptGenerator,
    currentPromptIndex,
    setCurrentPromptIndex,
    isGeneratingPrompts,
    setIsGeneratingPrompts,
    generatorProvider,
    setGeneratorProvider,
    generatorModel,
    setGeneratorModel,
    promptCount,
    setPromptCount,
    promptTopic,
    setPromptTopic,
    enableValidator,
    setEnableValidator,
    validatorProvider,
    setValidatorProvider,
    validatorModel,
    setValidatorModel,
    qualityThreshold,
    setQualityThreshold,
    isValidating,
    setIsValidating,
    ollamaEndpoint,
    setOllamaEndpoint,
    dgxConnected,
    setDgxConnected,
    showExportModal,
    setShowExportModal,
    showConfigModal,
    setShowConfigModal,
    configModalMode,
    setConfigModalMode,

    // Refs
    abortRef,
    mediaRecorderRef,
    recordedChunksRef,
    typewriterTimersRef,
    sessionLogRef,

    // Functions
    addAgent,
    removeAgent,
    duplicateAgent,
    updateAgent,
    moveAgent,
    handlePanelResize,
    getCurrentConfig,
    handleLoadConfig,

    // Constants
    PROVIDERS,
    DEFAULT_AGENT,
  };
}
