import React from 'react';

export default function ChainConfig({
  agents,
  PROVIDERS,
  ollamaEndpoint,
  dgxConnected,
  updateAgent,
  moveAgent,
  duplicateAgent,
  removeAgent,
  addAgent,
  setOllamaEndpoint,
}) {
  return (
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

            {agent.provider === 'ollama' && (
              <div className="config-row endpoint-selector">
                <label>Endpoint</label>
                <select
                  value={ollamaEndpoint}
                  onChange={(e) => setOllamaEndpoint(e.target.value)}
                >
                  <option value="local">Local (localhost:11434)</option>
                  {dgxConnected && (
                    <option value="dgx">DGX Spark (192.168.3.20)</option>
                  )}
                </select>
                {ollamaEndpoint === 'dgx' && dgxConnected && (
                  <span className="dgx-indicator">✓ Connected</span>
                )}
              </div>
            )}

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
  );
}
