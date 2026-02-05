import { useCallback } from 'react';
import { validateQAPair } from '../qualityValidator';

export function useChainExecution({
  agents,
  setAgents,
  apiKeys,
  abortRef,
  mediaRecorderRef,
  recordedChunksRef,
  typewriterTimersRef,
  sessionLogRef,
  setIsRunning,
  setMode,
  setCurrentAgent,
  setIsRecording,
  setRecordingError,
  setIsValidating,
  ollamaEndpoint,
  enableTypewriter,
  enableValidator,
  validatorProvider,
  validatorModel,
  qualityThreshold,
  showPromptGenerator,
  prompt,
  promptList,
  setCurrentPromptIndex,
  runMode,
  sessionCount,
}) {
  // Get Ollama URL based on endpoint selection
  const getOllamaUrl = () => {
    if (ollamaEndpoint === 'dgx') {
      return 'http://192.168.3.20:11434';
    }
    return 'http://localhost:11434';
  };

  // Typewriter effect with abort support
  const typewriterEffect = useCallback((agentIndex, fullText, speed = 15) => {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const type = () => {
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
  }, [setAgents, abortRef, typewriterTimersRef]);

  // Screen recording
  const startRecording = async () => {
    setRecordingError('');
    try {
      const sources = await window.electronAPI?.getDesktopSources?.();
      console.log('Desktop sources:', sources);

      if (!sources || sources.length === 0) {
        setRecordingError('No sources returned');
        console.log('No sources returned from desktopCapturer');
        return;
      }

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

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
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

  // API calls
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
      const res = await fetch(`${getOllamaUrl()}/api/chat`, {
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

    if (provider === 'claude-cli') {
      // Use Claude CLI via Electron API
      if (!window.electronAPI?.claudeCli?.query) {
        throw new Error('Claude CLI is not available');
      }

      const cliResult = await window.electronAPI.claudeCli.query(
        `${taskSpec}\n\n${input}`,
        {
          maxTokens: 4096
        }
      );

      if (cliResult.success) {
        return cliResult.content || 'No response';
      }
      throw new Error(cliResult.error || 'Claude CLI query failed');
    }

    return 'Unknown provider';
  };

  // Main chain execution
  const runChain = async () => {
    const promptsToRun = showPromptGenerator
      ? promptList.filter(p => p.trim())
      : [prompt];

    if (promptsToRun.length === 0) return;

    abortRef.current = false;
    setIsRunning(true);
    setMode('output');

    sessionLogRef.current = {
      prompt: showPromptGenerator ? `[Batch: ${promptsToRun.length} prompts]` : prompt,
      promptList: showPromptGenerator ? promptsToRun : null,
      startTime: new Date().toISOString(),
      runMode: showPromptGenerator ? 'batch' : runMode,
      outputs: []
    };

    setAgents(prev => prev.map(a => ({ ...a, output: '', displayedOutput: '' })));
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

          setAgents(prev => prev.map((a, idx) =>
            idx === i ? { ...a, output } : a
          ));

          if (enableTypewriter) {
            await typewriterEffect(i, output);
          } else {
            setAgents(prev => prev.map((a, idx) =>
              idx === i ? { ...a, displayedOutput: output } : a
            ));
          }

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

        await new Promise(r => setTimeout(r, 2000));
      }

      if (runMode === 'continuous' && !abortRef.current) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Quality Validation
    if (enableValidator && !abortRef.current && sessionLogRef.current.outputs.length > 0) {
      setIsValidating(true);

      try {
        const validatorApiKey = validatorProvider === 'anthropic'
          ? apiKeys.ANTHROPIC_API_KEY
          : validatorProvider === 'openai'
            ? apiKeys.OPENAI_API_KEY
            : null;

        const iterations = {};
        sessionLogRef.current.outputs.forEach((output) => {
          const iter = output.iteration || 1;
          if (!iterations[iter]) {
            iterations[iter] = [];
          }
          iterations[iter].push(output);
        });

        let validatedCount = 0;
        const totalIterations = Object.keys(iterations).length;

        for (const [iterNum, outputs] of Object.entries(iterations)) {
          validatedCount++;
          console.log(`Validating Q&A pair ${validatedCount}/${totalIterations}...`);

          const question = outputs[0].promptText || outputs[0].input || 'Unknown question';
          const lastOutput = outputs[outputs.length - 1];
          const answer = lastOutput.output;

          const validationResult = await validateQAPair(
            question,
            answer,
            validatorProvider,
            validatorApiKey,
            validatorModel,
            getOllamaUrl()
          );

          if (validationResult.success) {
            const outputIndex = sessionLogRef.current.outputs.findIndex(
              o => o.iteration === parseInt(iterNum) && o.agentIndex === lastOutput.agentIndex
            );
            if (outputIndex !== -1) {
              sessionLogRef.current.outputs[outputIndex].qualityScore = validationResult.scores;
            }
          } else {
            console.error(`Validation failed for iteration ${iterNum}:`, validationResult.error);
          }

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

  // Stop chain
  const stopChain = async () => {
    abortRef.current = true;

    typewriterTimersRef.current.forEach(timer => clearTimeout(timer));
    typewriterTimersRef.current = [];

    setAgents(prev => prev.map(a => ({ ...a, displayedOutput: a.output })));
    setIsRunning(false);

    await saveSessionLog();
    stopRecording();
  };

  // Reset to setup
  const resetToSetup = () => {
    setMode('setup');
    setAgents(prev => prev.map(a => ({ ...a, output: '', displayedOutput: '' })));
  };

  return {
    runChain,
    stopChain,
    resetToSetup,
    getOllamaUrl,
  };
}
