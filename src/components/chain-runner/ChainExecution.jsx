import React from 'react';

export default function ChainExecution({
  prompt,
  setPrompt,
  runMode,
  setRunMode,
  sessionCount,
  setSessionCount,
  enableTypewriter,
  setEnableTypewriter,
  enableValidator,
  setEnableValidator,
  validatorProvider,
  setValidatorProvider,
  validatorModel,
  setValidatorModel,
  qualityThreshold,
  setQualityThreshold,
  PROVIDERS,
  runChain,
  isRunning,
  agents,
  showPromptGenerator,
  promptList,
}) {
  return (
    <div className="cr-run-config">
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
  );
}
