import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChainRunner.css';
import RAGExportModal from './RAGExportModal';
import ConfigModal from './ConfigModal';
import { loadExistingRAGTopics, generatePrompts, savePromptList, loadPromptList } from './promptGenerator';
import { validateQAPair } from './qualityValidator';

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
};

const DEFAULT_AGENT = {
  id: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  taskSpec: 'You are a helpful AI assistant.',
  output: '',
  displayedOutput: '',
};

export default function ChainRunner({ apiKeys }) {
  const [agents, setAgents] = useState([
    { ...DEFAULT_AGENT, id: '1' },
  ]);
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('setup');
  const [runMode, setRunMode] = useState('once');
  const [sessionCount, setSessionCount] = useState(3);
  const [currentAgent, setCurrentAgent] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [panelWidths, setPanelWidths] = useState(() => [100]); // Initialize with default 1-agent split
  const [showExportModal, setShowExportModal] = useState(false);

  // Config Modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalMode, setConfigModalMode] = useState('load'); // 'save' or 'load'

  // Batch Prompt Generator state
  const [promptList, setPromptList] = useState([]);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [generatorProvider, setGeneratorProvider] = useState('anthropic');
  const [generatorModel, setGeneratorModel] = useState('claude-sonnet-4-20250514');
  const [promptCount, setPromptCount] = useState(10);
  const [promptTopic, setPromptTopic] = useState('');
  const [enableTypewriter, setEnableTypewriter] = useState(true);

  // Quality Validator state
  const [enableValidator, setEnableValidator] = useState(false);
  const [validatorProvider, setValidatorProvider] = useState('anthropic');
  const [validatorModel, setValidatorModel] = useState('claude-sonnet-4-20250514');
  const [qualityThreshold, setQualityThreshold] = useState(0.7);
  const [isValidating, setIsValidating] = useState(false);

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
  }, [agents.length]);

  // Cleanup typewriter timers
  useEffect(() => {
    return () => {
      typewriterTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

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

  // Typewriter effect with abort support
  const typewriterEffect = useCallback((agentIndex, fullText, speed = 15) => {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const type = () => {
        // Check if aborted - immediately show full text and resolve
        if (abortRef.current) {
          setAgents(prev => prev.map((a, idx) =>
            idx === agentIndex ? { ...a, displayedOutput: a.output } : a
          ));
          resolve();
          return;
        }

        if (currentIndex <= fullText.length) {
          setAgents(prev => prev.map((a, idx) =>
            idx === agentIndex ? { ...a, displayedOutput: fullText.slice(0, currentIndex) } : a
          ));
          currentIndex++;
          const timer = setTimeout(type, speed);
          typewriterTimersRef.current.push(timer);
        } else {
          resolve();
        }
      };
      type();
    });
  }, [setAgents]);

  // Screen recording - captures only this app window
  const [recordingError, setRecordingError] = useState('');

  const startRecording = async () => {
    setRecordingError('');
    try {
      // Get our app window from Electron
      const sources = await window.electronAPI?.getDesktopSources?.();
      console.log('Desktop sources:', sources);

      if (!sources || sources.length === 0) {
        setRecordingError('No sources returned');
        console.log('No sources returned from desktopCapturer');
        return;
      }

      // Check for error in response
      const appSource = sources[0];
      if (appSource.error) {
        setRecordingError(appSource.debug || 'Failed to get sources');
        console.log('Recording error:', appSource.debug);
        return;
      }

      if (!appSource.id) {
        setRecordingError('No valid source ID');
        console.log('Source has no ID:', appSource);
        return;
      }

      console.log('Using source:', appSource.name, appSource.id, appSource.debug);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: appSource.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080
          }
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        await saveRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      console.log('Recording started:', appSource.name);
    } catch (err) {
      setRecordingError(err.message);
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = async (blob) => {
    if (!window.electronAPI) return;

    try {
      const appPath = await window.electronAPI.getAppPath();
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const sanitizedPrompt = prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${timestamp}_${sanitizedPrompt}.webm`;
      const filePath = `${appPath}\\recordings\\${filename}`;

      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];

        // Write binary file
        const result = await window.electronAPI.writeFileBinary(filePath, base64);
        if (result.success) {
          console.log(`Recording saved: ${filename} (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
          console.error('Failed to save recording:', result.error);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error saving recording:', err);
    }
  };

  // Session logging
  const saveSessionLog = async () => {
    if (!window.electronAPI) return;
    const userDataPath = await window.electronAPI.getUserDataPath();
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const filename = `session_${timestamp}.json`;

    const log = {
      ...sessionLogRef.current,
      endTime: new Date().toISOString(),
      agents: agents.map(a => ({
        provider: a.provider,
        model: a.model,
        taskSpec: a.taskSpec,
        output: a.output
      }))
    };

    await window.electronAPI.writeFile(
      `${userDataPath}\\sessions\\${filename}`,
      JSON.stringify(log, null, 2)
    );
  };

  const callApi = async (agent, input) => {
    const { provider, model, taskSpec } = agent;

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: taskSpec,
          messages: [{ role: 'user', content: input }],
        }),
      });
      const data = await res.json();
      return data.content?.[0]?.text || 'No response';
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: taskSpec },
            { role: 'user', content: input },
          ],
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'No response';
    }

    if (provider === 'huggingface') {
      const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.HF_TOKEN}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: taskSpec },
            { role: 'user', content: input },
          ],
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'No response';
    }

    if (provider === 'ollama') {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: taskSpec },
            { role: 'user', content: input },
          ],
          stream: false,
        }),
      });
      const data = await res.json();
      return data.message?.content || 'No response';
    }

    return 'Unknown provider';
  };

  const runChain = async () => {
    // Determine prompts to run
    const promptsToRun = showPromptGenerator
      ? promptList.filter(p => p.trim())
      : [prompt];

    if (promptsToRun.length === 0) return;

    abortRef.current = false;
    setIsRunning(true);
    setMode('output');

    // Initialize session log
    sessionLogRef.current = {
      prompt: showPromptGenerator ? `[Batch: ${promptsToRun.length} prompts]` : prompt,
      promptList: showPromptGenerator ? promptsToRun : null,
      startTime: new Date().toISOString(),
      runMode: showPromptGenerator ? 'batch' : runMode,
      outputs: []
    };

    // Clear outputs
    setAgents(prev => prev.map(a => ({ ...a, output: '', displayedOutput: '' })));

    // Start recording
    await startRecording();

    const iterations = showPromptGenerator
      ? promptsToRun.length
      : (runMode === 'once' ? 1 : runMode === 'sessions' ? sessionCount : 999);

    for (let iter = 0; iter < iterations; iter++) {
      const currentPrompt = showPromptGenerator ? promptsToRun[iter] : prompt;
      setCurrentPromptIndex(iter);
      let input = currentPrompt;
      for (let i = 0; i < agents.length; i++) {
        if (abortRef.current) {
          await saveSessionLog();
          stopRecording();
          setIsRunning(false);
          return;
        }

        setCurrentAgent(i);

        try {
          const output = await callApi(agents[i], input);

          // Store full output
          setAgents(prev => prev.map((a, idx) =>
            idx === i ? { ...a, output } : a
          ));

          // Typewriter effect (conditional)
          if (enableTypewriter) {
            await typewriterEffect(i, output);
          } else {
            // Instant display - no animation
            setAgents(prev => prev.map((a, idx) =>
              idx === i ? { ...a, displayedOutput: output } : a
            ));
          }

          // Log output
          sessionLogRef.current.outputs.push({
            iteration: iter + 1,
            promptIndex: showPromptGenerator ? iter : 0,
            promptText: currentPrompt,
            agentIndex: i,
            input,
            output,
            timestamp: new Date().toISOString()
          });

          input = output;
        } catch (err) {
          const errorMsg = `Error: ${err.message}`;
          setAgents(prev => prev.map((a, idx) =>
            idx === i ? { ...a, output: errorMsg, displayedOutput: errorMsg } : a
          ));
          await saveSessionLog();
          stopRecording();
          setIsRunning(false);
          return;
        }

        // Delay between agents
        await new Promise(r => setTimeout(r, 2000));
      }

      // For continuous mode, feed output back to start
      if (runMode === 'continuous' && !abortRef.current) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Quality Validation step (after all iterations complete, before saving)
    if (enableValidator && !abortRef.current && sessionLogRef.current.outputs.length > 0) {
      setIsValidating(true);

      try {
        const validatorApiKey = validatorProvider === 'anthropic'
          ? apiKeys.ANTHROPIC_API_KEY
          : validatorProvider === 'openai'
            ? apiKeys.OPENAI_API_KEY
            : null;

        // Group outputs by iteration to get Q&A pairs
        const iterations = {};
        sessionLogRef.current.outputs.forEach((output) => {
          const iter = output.iteration || 1;
          if (!iterations[iter]) {
            iterations[iter] = [];
          }
          iterations[iter].push(output);
        });

        // Validate each iteration's Q&A pair
        let validatedCount = 0;
        const totalIterations = Object.keys(iterations).length;

        for (const [iterNum, outputs] of Object.entries(iterations)) {
          validatedCount++;
          console.log(`Validating Q&A pair ${validatedCount}/${totalIterations}...`);

          // Get the initial prompt/question
          const question = outputs[0].promptText || outputs[0].input || 'Unknown question';

          // Get the final answer (last agent's output)
          const lastOutput = outputs[outputs.length - 1];
          const answer = lastOutput.output;

          // Validate the Q&A pair
          const validationResult = await validateQAPair(
            question,
            answer,
            validatorProvider,
            validatorApiKey,
            validatorModel
          );

          if (validationResult.success) {
            // Attach quality score to the last output of this iteration
            const outputIndex = sessionLogRef.current.outputs.findIndex(
              o => o.iteration === parseInt(iterNum) && o.agentIndex === lastOutput.agentIndex
            );
            if (outputIndex !== -1) {
              sessionLogRef.current.outputs[outputIndex].qualityScore = validationResult.scores;
            }
          } else {
            console.error(`Validation failed for iteration ${iterNum}:`, validationResult.error);
          }

          // Small delay to avoid rate limiting
          if (validatedCount < totalIterations) {
            await new Promise(r => setTimeout(r, 500));
          }
        }

        console.log('Quality validation complete');
      } catch (err) {
        console.error('Quality validation failed:', err);
      } finally {
        setIsValidating(false);
      }
    }

    await saveSessionLog();
    stopRecording();
    setIsRunning(false);
  };

  const stopChain = async () => {
    abortRef.current = true;

    // Clear all typewriter timers immediately
    typewriterTimersRef.current.forEach(timer => clearTimeout(timer));
    typewriterTimersRef.current = [];

    // Immediately show full output for all agents (skip remaining typewriter)
    setAgents(prev => prev.map(a => ({ ...a, displayedOutput: a.output })));

    // Stop running state immediately
    setIsRunning(false);

    await saveSessionLog();
    stopRecording();
  };

  const resetToSetup = () => {
    setMode('setup');
    setAgents(prev => prev.map(a => ({ ...a, output: '', displayedOutput: '' })));
  };

  // Prompt Generator Handlers
  const handleGeneratePrompts = async () => {
    if (!promptTopic.trim()) return;
    setIsGeneratingPrompts(true);

    try {
      const existing = await loadExistingRAGTopics(window.electronAPI);
      console.log(`Loaded ${existing.questions?.length || 0} existing topics for deduplication`);

      // Ollama doesn't need an API key
      const apiKey = generatorProvider === 'ollama'
        ? null
        : generatorProvider === 'anthropic'
        ? apiKeys.ANTHROPIC_API_KEY
        : apiKeys.OPENAI_API_KEY;

      const result = await generatePrompts({
        topic: promptTopic,
        category: 'equipment_guides',
        count: promptCount,
        provider: generatorProvider,
        apiKey,
        model: generatorModel,
        existingTopics: existing.questions || []
      });

      if (result.success) {
        setPromptList(result.prompts);
      } else {
        alert(`Failed to generate prompts: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleEditPrompt = (index, newValue) => {
    setPromptList(prev => prev.map((p, i) => i === index ? newValue : p));
  };

  const handleRemovePrompt = (index) => {
    setPromptList(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPrompt = () => {
    setPromptList(prev => [...prev, '']);
  };

  const handleSavePromptList = async () => {
    if (!window.electronAPI || promptList.length === 0) return;
    const result = await savePromptList(promptList, promptTopic, window.electronAPI);
    if (result.success) {
      alert(`Saved: ${result.filename}`);
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  };

  const handleLoadPromptList = async () => {
    if (!window.electronAPI) return;
    const result = await loadPromptList(window.electronAPI);
    if (result.success) {
      setPromptList(result.data.prompts);
      setPromptTopic(result.data.topic || '');
      setShowPromptGenerator(true);
    } else {
      alert(result.error || 'No saved prompt lists found');
    }
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
    enableTypewriter
  });

  // Load configuration from modal
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
  };

  // Handle config save completion
  const handleConfigSaved = (filename) => {
    console.log(`Configuration saved: ${filename}`);
  };

  // Resizable panels
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

  return (
    <div className="chain-runner">
      {mode === 'setup' ? (
        <div className="cr-setup">
          <div className="cr-header">
            <h2>Chain Runner</h2>
            <div className="cr-header-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setConfigModalMode('load');
                  setShowConfigModal(true);
                }}
              >
                Load Config
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setConfigModalMode('save');
                  setShowConfigModal(true);
                }}
              >
                Save Config
              </button>
            </div>
          </div>

          <div className="cr-agents-container">
            {agents.map((agent, idx) => (
              <div key={agent.id} className="cr-agent-card">
                <div className="agent-header">
                  <span className="agent-number">Agent {idx + 1}</span>
                  <div className="agent-actions">
                    <button onClick={() => moveAgent(idx, -1)} disabled={idx === 0}>↑</button>
                    <button onClick={() => moveAgent(idx, 1)} disabled={idx === agents.length - 1}>↓</button>
                    <button onClick={() => duplicateAgent(agent)}>⧉</button>
                    <button onClick={() => removeAgent(agent.id)} disabled={agents.length <= 1}>×</button>
                  </div>
                </div>

                <div className="agent-config">
                  <div className="config-row">
                    <label>Provider</label>
                    <select
                      value={agent.provider}
                      onChange={(e) => {
                        const newProvider = e.target.value;
                        updateAgent(agent.id, {
                          provider: newProvider,
                          model: PROVIDERS[newProvider].models[0]
                        });
                      }}
                    >
                      {Object.entries(PROVIDERS).map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="config-row">
                    <label>Model</label>
                    <select
                      value={agent.model}
                      onChange={(e) => updateAgent(agent.id, { model: e.target.value })}
                    >
                      {PROVIDERS[agent.provider].models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="config-row">
                    <label>Task Spec</label>
                    <textarea
                      value={agent.taskSpec}
                      onChange={(e) => updateAgent(agent.id, { taskSpec: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button className="cr-add-agent" onClick={addAgent}>
              + Add Agent
            </button>
          </div>

          <div className="cr-run-config">
            {/* Batch Prompt Generator Section */}
            <div className="prompt-generator-section">
              <div className="pg-header">
                <label>
                  <input
                    type="checkbox"
                    checked={showPromptGenerator}
                    onChange={(e) => setShowPromptGenerator(e.target.checked)}
                  />
                  Use Batch Prompt Generator
                </label>
                {showPromptGenerator && (
                  <div className="pg-header-actions">
                    <button className="btn btn-ghost btn-sm" onClick={handleLoadPromptList}>
                      Load List
                    </button>
                    {promptList.length > 0 && (
                      <button className="btn btn-ghost btn-sm" onClick={handleSavePromptList}>
                        Save List
                      </button>
                    )}
                  </div>
                )}
              </div>

              {showPromptGenerator && (
                <div className="pg-content">
                  <div className="pg-config-row">
                    <div className="pg-field">
                      <label>Provider</label>
                      <select
                        value={generatorProvider}
                        onChange={(e) => {
                          setGeneratorProvider(e.target.value);
                          setGeneratorModel(PROVIDERS[e.target.value].models[0]);
                        }}
                      >
                        {Object.entries(PROVIDERS).map(([key, val]) => (
                          <option key={key} value={key}>{val.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pg-field">
                      <label>Model</label>
                      <select
                        value={generatorModel}
                        onChange={(e) => setGeneratorModel(e.target.value)}
                      >
                        {PROVIDERS[generatorProvider].models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pg-field pg-field-small">
                      <label>Count</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={promptCount}
                        onChange={(e) => setPromptCount(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="pg-topic-row">
                    <div className="pg-field pg-field-grow">
                      <label>Topic / Category</label>
                      <input
                        type="text"
                        value={promptTopic}
                        onChange={(e) => setPromptTopic(e.target.value)}
                        placeholder="e.g., Wireless microphone troubleshooting"
                      />
                    </div>

                    <button
                      className="btn btn-primary pg-generate-btn"
                      onClick={handleGeneratePrompts}
                      disabled={!promptTopic.trim() || isGeneratingPrompts}
                    >
                      {isGeneratingPrompts ? 'Generating...' : 'Generate Prompts'}
                    </button>
                  </div>

                  {promptList.length > 0 && (
                    <div className="pg-prompt-list">
                      <div className="pg-list-header">
                        <span>{promptList.length} Prompts</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPromptList([])}>
                          Clear All
                        </button>
                      </div>

                      <div className="pg-list-items">
                        {promptList.map((p, idx) => (
                          <div key={idx} className="pg-prompt-item">
                            <span className="pg-prompt-num">{idx + 1}</span>
                            <input
                              type="text"
                              value={p}
                              onChange={(e) => handleEditPrompt(idx, e.target.value)}
                              className="pg-prompt-input"
                            />
                            <button className="pg-prompt-remove" onClick={() => handleRemovePrompt(idx)}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <button className="btn btn-ghost pg-add-prompt" onClick={handleAddPrompt}>
                        + Add Prompt
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!showPromptGenerator && (
              <div className="prompt-section">
                <label>Initial Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the prompt to start the chain..."
                  rows={3}
                />
              </div>
            )}

            <div className="run-mode-section">
              <div className="run-mode-options">
                <label>
                  <input
                    type="radio"
                    value="once"
                    checked={runMode === 'once'}
                    onChange={(e) => setRunMode(e.target.value)}
                  />
                  Run Once
                </label>
                <label>
                  <input
                    type="radio"
                    value="sessions"
                    checked={runMode === 'sessions'}
                    onChange={(e) => setRunMode(e.target.value)}
                  />
                  Sessions
                  {runMode === 'sessions' && (
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sessionCount}
                      onChange={(e) => setSessionCount(Number(e.target.value))}
                      className="session-input"
                    />
                  )}
                </label>
                <label>
                  <input
                    type="radio"
                    value="continuous"
                    checked={runMode === 'continuous'}
                    onChange={(e) => setRunMode(e.target.value)}
                  />
                  Continuous
                </label>
              </div>

              <label className="typewriter-toggle">
                <input
                  type="checkbox"
                  checked={enableTypewriter}
                  onChange={(e) => setEnableTypewriter(e.target.checked)}
                />
                Typewriter Effect
              </label>

              {/* Quality Validator Section */}
              <div className="quality-validator-section">
                <label className="validator-toggle">
                  <input
                    type="checkbox"
                    checked={enableValidator}
                    onChange={(e) => setEnableValidator(e.target.checked)}
                  />
                  Quality Validator (score Q&A pairs after chain)
                </label>

                {enableValidator && (
                  <div className="validator-config">
                    <div className="validator-field">
                      <label>Provider</label>
                      <select
                        value={validatorProvider}
                        onChange={(e) => {
                          setValidatorProvider(e.target.value);
                          setValidatorModel(PROVIDERS[e.target.value].models[0]);
                        }}
                      >
                        {Object.entries(PROVIDERS).map(([key, val]) => (
                          <option key={key} value={key}>{val.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="validator-field">
                      <label>Model</label>
                      <select
                        value={validatorModel}
                        onChange={(e) => setValidatorModel(e.target.value)}
                      >
                        {PROVIDERS[validatorProvider].models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="validator-field">
                      <label>Min Quality</label>
                      <div className="threshold-slider">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={qualityThreshold}
                          onChange={(e) => setQualityThreshold(Number(e.target.value))}
                        />
                        <span className="threshold-value">{qualityThreshold}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary run-btn"
                onClick={runChain}
                disabled={isRunning || agents.length === 0 || (showPromptGenerator ? promptList.filter(p => p.trim()).length === 0 : !prompt.trim())}
                style={{ '--accent': 'var(--accent-chain)' }}
              >
                Run Chain
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="cr-output">
          <div className="cr-header">
            <h2>Chain Output</h2>
            {isRunning && showPromptGenerator && promptList.length > 0 && (
              <span className="prompt-progress">
                Prompt {currentPromptIndex + 1} / {promptList.filter(p => p.trim()).length}
              </span>
            )}
            {isValidating && (
              <div className="validating-indicator">
                Validating Q&A quality...
              </div>
            )}
            <div className="cr-header-actions">
              {isRecording && <span className="recording-badge">REC</span>}
              {recordingError && <span className="recording-error" title={recordingError}>REC ERR</span>}
              {isRunning ? (
                <button className="btn btn-secondary" onClick={stopChain}>Stop</button>
              ) : (
                <>
                  <button
                    className="btn btn-rag-export"
                    onClick={() => setShowExportModal(true)}
                    disabled={!sessionLogRef.current || sessionLogRef.current.outputs.length === 0}
                  >
                    Export RAG Training
                  </button>
                  <button className="btn btn-ghost" onClick={resetToSetup}>Back to Setup</button>
                </>
              )}
            </div>
          </div>

          <div className="cr-output-panels">
            {agents.map((agent, idx) => (
              <React.Fragment key={agent.id}>
                <div
                  className={`output-panel ${currentAgent === idx && isRunning ? 'active' : ''}`}
                  style={{ width: `${panelWidths[idx] || 100 / agents.length}%` }}
                >
                  <div className="output-header">
                    <span>Agent {idx + 1}: {PROVIDERS[agent.provider].name}</span>
                    {currentAgent === idx && isRunning && <span className="running-indicator">Running...</span>}
                    {/* Show quality score badge for last agent if available */}
                    {idx === agents.length - 1 && (() => {
                      // Find the most recent output for this agent with a quality score
                      const agentOutputsWithScores = sessionLogRef.current.outputs.filter(
                        o => o.agentIndex === idx && o.qualityScore
                      );
                      if (agentOutputsWithScores.length > 0) {
                        const latestScore = agentOutputsWithScores[agentOutputsWithScores.length - 1].qualityScore;
                        const overallScore = latestScore.overall;
                        const badgeClass = overallScore >= qualityThreshold ? 'quality-badge-good' : 'quality-badge-low';
                        return (
                          <span className={`quality-badge ${badgeClass}`} title={`Correctness: ${latestScore.correctness.toFixed(2)}\nCompleteness: ${latestScore.completeness.toFixed(2)}\nClarity: ${latestScore.clarity.toFixed(2)}\nRelevance: ${latestScore.relevance.toFixed(2)}\nIssues: ${latestScore.issues}`}>
                            Quality: {(overallScore * 100).toFixed(0)}%
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Live task spec editing */}
                  <div className="output-taskspec">
                    <textarea
                      value={agent.taskSpec}
                      onChange={(e) => updateAgent(agent.id, { taskSpec: e.target.value })}
                      placeholder="Task spec (editable during run)"
                      rows={2}
                    />
                  </div>

                  <div className="output-content">
                    {agent.displayedOutput || (currentAgent === idx && isRunning ? 'Processing...' : 'Waiting...')}
                    {currentAgent === idx && isRunning && <span className="cursor">|</span>}
                  </div>
                </div>

                {/* Resize handle */}
                {idx < agents.length - 1 && (
                  <div
                    className="panel-resize-handle"
                    onMouseDown={(e) => handlePanelResize(idx, e)}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <RAGExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportComplete={() => setMode('setup')}
        sessionLog={{
          ...sessionLogRef.current,
          agents: agents.map(a => ({
            provider: a.provider,
            model: a.model,
            taskSpec: a.taskSpec,
            output: a.output
          }))
        }}
      />

      <ConfigModal
        isOpen={showConfigModal}
        mode={configModalMode}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfigSaved}
        onLoad={handleLoadConfig}
        currentConfig={getCurrentConfig()}
      />
    </div>
  );
}
