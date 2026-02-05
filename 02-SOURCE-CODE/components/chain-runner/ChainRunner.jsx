import React from 'react';
import './ChainRunner.css';
import RAGExportModal from './RAGExportModal';
import ConfigModal from './ConfigModal';
import ChainConfig from './ChainConfig';
import ChainExecution from './ChainExecution';
import ChainOutput from './ChainOutput';
import ChainPromptGenerator from './ChainPromptGenerator';
import { useChainState } from './hooks/useChainState';
import { useChainExecution } from './hooks/useChainExecution';
import { usePromptGeneration } from './hooks/usePromptGeneration';

export default function ChainRunner({ apiKeys }) {
  const state = useChainState();

  const execution = useChainExecution({
    agents: state.agents,
    setAgents: state.setAgents,
    apiKeys,
    abortRef: state.abortRef,
    mediaRecorderRef: state.mediaRecorderRef,
    recordedChunksRef: state.recordedChunksRef,
    typewriterTimersRef: state.typewriterTimersRef,
    sessionLogRef: state.sessionLogRef,
    setIsRunning: state.setIsRunning,
    setMode: state.setMode,
    setCurrentAgent: state.setCurrentAgent,
    setIsRecording: state.setIsRecording,
    setRecordingError: state.setRecordingError,
    setIsValidating: state.setIsValidating,
    ollamaEndpoint: state.ollamaEndpoint,
    enableTypewriter: state.enableTypewriter,
    enableValidator: state.enableValidator,
    validatorProvider: state.validatorProvider,
    validatorModel: state.validatorModel,
    qualityThreshold: state.qualityThreshold,
    showPromptGenerator: state.showPromptGenerator,
    prompt: state.prompt,
    promptList: state.promptList,
    setCurrentPromptIndex: state.setCurrentPromptIndex,
    runMode: state.runMode,
    sessionCount: state.sessionCount,
  });

  const promptGeneration = usePromptGeneration({
    apiKeys,
    setPromptList: state.setPromptList,
    setPromptTopic: state.setPromptTopic,
    setShowPromptGenerator: state.setShowPromptGenerator,
    setIsGeneratingPrompts: state.setIsGeneratingPrompts,
    promptTopic: state.promptTopic,
    promptCount: state.promptCount,
    generatorProvider: state.generatorProvider,
    generatorModel: state.generatorModel,
    promptList: state.promptList,
    getOllamaUrl: execution.getOllamaUrl,
  });

  const handleConfigSaved = (filename) => {
    console.log(`Configuration saved: ${filename}`);
  };

  const handleReturnToSetup = () => {
    state.setMode('setup');
  };

  return (
    <div className="chain-runner">
      {state.mode === 'setup' ? (
        <div className="cr-setup">
          <div className="cr-header">
            <h2>Chain Runner</h2>
            <div className="cr-header-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  state.setConfigModalMode('load');
                  state.setShowConfigModal(true);
                }}
              >
                Load Config
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  state.setConfigModalMode('save');
                  state.setShowConfigModal(true);
                }}
              >
                Save Config
              </button>
            </div>
          </div>

          <ChainConfig
            agents={state.agents}
            PROVIDERS={state.PROVIDERS}
            ollamaEndpoint={state.ollamaEndpoint}
            dgxConnected={state.dgxConnected}
            updateAgent={state.updateAgent}
            moveAgent={state.moveAgent}
            duplicateAgent={state.duplicateAgent}
            removeAgent={state.removeAgent}
            addAgent={state.addAgent}
            setOllamaEndpoint={state.setOllamaEndpoint}
          />

          <div className="cr-run-config">
            <ChainPromptGenerator
              showPromptGenerator={state.showPromptGenerator}
              setShowPromptGenerator={state.setShowPromptGenerator}
              generatorProvider={state.generatorProvider}
              setGeneratorProvider={state.setGeneratorProvider}
              generatorModel={state.generatorModel}
              setGeneratorModel={state.setGeneratorModel}
              promptCount={state.promptCount}
              setPromptCount={state.setPromptCount}
              promptTopic={state.promptTopic}
              setPromptTopic={state.setPromptTopic}
              promptList={state.promptList}
              isGeneratingPrompts={state.isGeneratingPrompts}
              PROVIDERS={state.PROVIDERS}
              handleGeneratePrompts={promptGeneration.handleGeneratePrompts}
              handleEditPrompt={promptGeneration.handleEditPrompt}
              handleRemovePrompt={promptGeneration.handleRemovePrompt}
              handleAddPrompt={promptGeneration.handleAddPrompt}
              handleSavePromptList={promptGeneration.handleSavePromptList}
              handleLoadPromptList={promptGeneration.handleLoadPromptList}
              setPromptList={state.setPromptList}
            />

            <ChainExecution
              prompt={state.prompt}
              setPrompt={state.setPrompt}
              runMode={state.runMode}
              setRunMode={state.setRunMode}
              sessionCount={state.sessionCount}
              setSessionCount={state.setSessionCount}
              enableTypewriter={state.enableTypewriter}
              setEnableTypewriter={state.setEnableTypewriter}
              enableValidator={state.enableValidator}
              setEnableValidator={state.setEnableValidator}
              validatorProvider={state.validatorProvider}
              setValidatorProvider={state.setValidatorProvider}
              validatorModel={state.validatorModel}
              setValidatorModel={state.setValidatorModel}
              qualityThreshold={state.qualityThreshold}
              setQualityThreshold={state.setQualityThreshold}
              PROVIDERS={state.PROVIDERS}
              runChain={execution.runChain}
              isRunning={state.isRunning}
              agents={state.agents}
              showPromptGenerator={state.showPromptGenerator}
              promptList={state.promptList}
            />
          </div>
        </div>
      ) : (
        <div className="cr-output">
          <div className="cr-header">
            <h2>Chain Output</h2>
            {state.isRunning && state.showPromptGenerator && state.promptList.length > 0 && (
              <span className="prompt-progress">
                Prompt {state.currentPromptIndex + 1} / {state.promptList.filter(p => p.trim()).length}
              </span>
            )}
            {state.isValidating && (
              <div className="validating-indicator">
                Validating Q&A quality...
              </div>
            )}
            <div className="cr-header-actions">
              {state.isRecording && <span className="recording-badge">REC</span>}
              {state.recordingError && <span className="recording-error" title={state.recordingError}>REC ERR</span>}
              {state.isRunning ? (
                <button className="btn btn-secondary" onClick={execution.stopChain}>Stop</button>
              ) : (
                <>
                  <button
                    className="btn btn-rag-export"
                    onClick={() => state.setShowExportModal(true)}
                    disabled={!state.sessionLogRef.current || state.sessionLogRef.current.outputs.length === 0}
                  >
                    Export RAG Training
                  </button>
                  <button className="btn btn-ghost" onClick={execution.resetToSetup}>Back to Setup</button>
                </>
              )}
            </div>
          </div>

          <ChainOutput
            agents={state.agents}
            PROVIDERS={state.PROVIDERS}
            currentAgent={state.currentAgent}
            isRunning={state.isRunning}
            panelWidths={state.panelWidths}
            sessionLogRef={state.sessionLogRef}
            qualityThreshold={state.qualityThreshold}
            updateAgent={state.updateAgent}
            handlePanelResize={state.handlePanelResize}
          />
        </div>
      )}

      <RAGExportModal
        isOpen={state.showExportModal}
        onClose={() => state.setShowExportModal(false)}
        onExportComplete={handleReturnToSetup}
        sessionLog={{
          ...state.sessionLogRef.current,
          agents: state.agents.map(a => ({
            provider: a.provider,
            model: a.model,
            taskSpec: a.taskSpec,
            output: a.output
          }))
        }}
      />

      <ConfigModal
        isOpen={state.showConfigModal}
        mode={state.configModalMode}
        onClose={() => state.setShowConfigModal(false)}
        onSave={handleConfigSaved}
        onLoad={state.handleLoadConfig}
        currentConfig={state.getCurrentConfig()}
      />
    </div>
  );
}
