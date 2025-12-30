import React from 'react';

export default function ChainOutput({
  agents,
  PROVIDERS,
  currentAgent,
  isRunning,
  panelWidths,
  sessionLogRef,
  qualityThreshold,
  updateAgent,
  handlePanelResize,
}) {
  return (
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
              {idx === agents.length - 1 && (() => {
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

          {idx < agents.length - 1 && (
            <div
              className="panel-resize-handle"
              onMouseDown={(e) => handlePanelResize(idx, e)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
