import React from 'react';

export default function ChainPromptGenerator({
  showPromptGenerator,
  setShowPromptGenerator,
  generatorProvider,
  setGeneratorProvider,
  generatorModel,
  setGeneratorModel,
  promptCount,
  setPromptCount,
  promptTopic,
  setPromptTopic,
  promptList,
  isGeneratingPrompts,
  PROVIDERS,
  handleGeneratePrompts,
  handleEditPrompt,
  handleRemovePrompt,
  handleAddPrompt,
  handleSavePromptList,
  handleLoadPromptList,
  setPromptList,
}) {
  return (
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

            {generatorProvider !== 'claude-cli' && (
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
            )}

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
  );
}
