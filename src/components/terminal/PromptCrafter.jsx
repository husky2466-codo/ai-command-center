/**
 * AI Command Center - Prompt Crafter
 *
 * Side panel for the Terminal component that helps users craft, refine,
 * and optimize prompts for Claude Code using local Ollama LLMs only.
 * No cloud API usage - entirely local and private.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../themes/ThemeContext';
import {
  X,
  Wand2,
  Copy,
  Send,
  Plus,
  FileText,
  Code2,
  AlertCircle,
  FolderTree,
  Target,
  Lock,
  MessageSquare,
  ListOrdered,
  Check,
  Bug,
  RefreshCw,
  HelpCircle,
  Map,
  TestTube2,
  GitBranch,
  FolderSearch
} from 'lucide-react';
import { PROMPT_CATEGORIES, REFINEMENT_OPTIONS } from './promptCategories';
import { refinePrompt, checkOllamaModels } from './promptRefiners';
import './PromptCrafter.css';

// Model tier configuration - maps Ollama models to parameter size tiers
const MODEL_TIERS = {
  most_refined: {
    label: 'Most Params',
    color: '#22c55e', // green
    description: 'Largest models, highest quality',
    models: [
      'llama3.1:70b', 'llama3:70b', 'llama2:70b',
      'mixtral', 'mixtral:8x7b', 'mixtral:8x22b',
      'qwen2.5:32b', 'qwen2.5:72b', 'qwen2:72b',
      'deepseek-r1', 'deepseek-r1:32b', 'deepseek-r1:70b',
      'deepseek-coder:33b', 'codellama:70b',
      'wizardlm2:8x22b', 'command-r-plus'
    ]
  },
  refined: {
    label: 'Good Params',
    color: '#eab308', // yellow
    description: 'Balanced size and performance',
    models: [
      'mistral', 'mistral:7b', 'mistral-nemo',
      'llama3.1:8b', 'llama3.1', 'llama3:8b', 'llama3', 'llama2:13b',
      'qwen2.5:7b', 'qwen2.5:14b', 'qwen2.5', 'qwen2:7b',
      'deepseek-coder:6.7b', 'deepseek-coder',
      'codellama:13b', 'codellama:7b', 'codellama',
      'phi3:medium', 'phi3', 'gemma2:9b', 'gemma2',
      'wizardcoder', 'starcoder2:7b', 'command-r'
    ]
  },
  unrefined: {
    label: 'Little Params',
    color: '#ef4444', // red
    description: 'Smaller models, faster',
    models: [
      'llama3.2:3b', 'llama3.2:1b', 'llama3.2',
      'phi3:mini', 'phi3:small', 'phi',
      'gemma:2b', 'gemma2:2b', 'gemma',
      'qwen2.5:3b', 'qwen2.5:1.5b', 'qwen2.5:0.5b',
      'tinyllama', 'orca-mini', 'neural-chat',
      'stablelm', 'stablelm2', 'starcoder2:3b'
    ]
  }
};

// Get tier info for a model
const getModelTier = (modelName) => {
  const normalizedName = modelName.toLowerCase();

  for (const [tierId, tier] of Object.entries(MODEL_TIERS)) {
    if (tier.models.some(m => normalizedName.includes(m.split(':')[0]) || normalizedName === m)) {
      return { id: tierId, ...tier };
    }
  }

  // Default to refined for unknown models
  return { id: 'refined', ...MODEL_TIERS.refined };
};

// Group available models by tier
const groupModelsByTier = (models) => {
  const grouped = {
    most_refined: [],
    refined: [],
    unrefined: []
  };

  models.forEach(model => {
    const tier = getModelTier(model);
    grouped[tier.id].push(model);
  });

  return grouped;
};

const PromptCrafter = ({ onSendToTerminal, onClose }) => {
  const { currentTheme } = useTheme();

  // Ollama state
  const [ollamaStatus, setOllamaStatus] = useState({ available: false, models: [] });
  const [selectedModel, setSelectedModel] = useState('mistral');
  const [isRefining, setIsRefining] = useState(false);

  // Prompt building state
  const [category, setCategory] = useState('code_generation');
  const [intent, setIntent] = useState('');
  const [selectedRefinements, setSelectedRefinements] = useState([]);
  const [contextFiles, setContextFiles] = useState([]);
  const [codeSnippets, setCodeSnippets] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Output state
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaModels().then(status => {
      setOllamaStatus(status);
      if (status.models.length > 0) {
        setSelectedModel(status.models[0]);
      }
    });
  }, []);

  const handleRefine = async () => {
    if (!intent.trim()) return;

    setIsRefining(true);
    const result = await refinePrompt({
      intent,
      category,
      selectedRefinements,
      contextFiles,
      codeSnippets,
      errorMessage,
      model: selectedModel
    });

    if (result.success) {
      setRefinedPrompt(result.refinedPrompt);
    } else {
      setRefinedPrompt(`Error: ${result.error}`);
    }
    setIsRefining(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(refinedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToTerminal = () => {
    if (refinedPrompt && onSendToTerminal) {
      onSendToTerminal(refinedPrompt);
    }
  };

  const toggleRefinement = (id) => {
    setSelectedRefinements(prev =>
      prev.includes(id)
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const addContextFile = () => {
    const path = prompt('Enter file path:');
    if (path) {
      setContextFiles(prev => [...prev, path]);
    }
  };

  const addCodeSnippet = () => {
    const snippet = prompt('Paste code snippet:');
    if (snippet) {
      setCodeSnippets(prev => [...prev, snippet]);
    }
  };

  const addErrorMessage = () => {
    const error = prompt('Paste error message:');
    if (error) {
      setErrorMessage(error);
    }
  };

  return (
    <div className="prompt-crafter">
      <div className="crafter-header">
        <div className="crafter-title">
          <Wand2 size={18} />
          <span>Prompt Crafter</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="crafter-content">
        {/* Left Column - Inputs */}
        <div className="crafter-inputs">
          {/* Ollama Status */}
          <div className={`ollama-status ${ollamaStatus.available ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            <span>Ollama: {ollamaStatus.available ? 'Connected' : 'Not Available'}</span>
          </div>

          {/* Category Selection */}
          <div className="crafter-section">
            <label>Task Type</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="category-select"
            >
              {Object.values(PROMPT_CATEGORIES).map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Intent Input */}
          <div className="crafter-section">
            <label>What do you want to do?</label>
            <textarea
              className="intent-input"
              placeholder={PROMPT_CATEGORIES[category].templates[0]}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3}
            />
          </div>

          {/* Context Helpers */}
          <div className="crafter-section">
            <label>Add Context</label>
            <div className="context-buttons">
              <button onClick={addContextFile}>
                <FileText size={14} /> File
              </button>
              <button onClick={addCodeSnippet}>
                <Code2 size={14} /> Code
              </button>
              <button onClick={addErrorMessage}>
                <AlertCircle size={14} /> Error
              </button>
            </div>

            {/* Show added context */}
            {(contextFiles.length > 0 || codeSnippets.length > 0 || errorMessage) && (
              <div className="context-tags">
                {contextFiles.map((f, i) => (
                  <span key={`file-${i}`} className="context-tag">
                    {f}
                    <button onClick={() => setContextFiles(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                  </span>
                ))}
                {codeSnippets.map((snippet, i) => (
                  <span key={`code-${i}`} className="context-tag">
                    Code {i + 1}
                    <button onClick={() => setCodeSnippets(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                  </span>
                ))}
                {errorMessage && (
                  <span className="context-tag">
                    Error
                    <button onClick={() => setErrorMessage('')}>×</button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Refinement Options */}
          <div className="crafter-section">
            <label>Refinement Options</label>
            <div className="refinement-grid">
              {Object.values(REFINEMENT_OPTIONS).map(opt => (
                <button
                  key={opt.id}
                  className={`refinement-option ${selectedRefinements.includes(opt.id) ? 'selected' : ''}`}
                  onClick={() => toggleRefinement(opt.id)}
                >
                  {selectedRefinements.includes(opt.id) && <Check size={12} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection & Refine Button */}
          <div className="crafter-section refine-row">
            <div className="model-select-wrapper">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="model-select"
                disabled={!ollamaStatus.available}
                style={{
                  borderColor: ollamaStatus.available && selectedModel
                    ? getModelTier(selectedModel).color
                    : undefined
                }}
              >
                {(() => {
                  const grouped = groupModelsByTier(ollamaStatus.models);
                  return (
                    <>
                      {grouped.most_refined.length > 0 && (
                        <optgroup label="🟢 Most Params">
                          {grouped.most_refined.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </optgroup>
                      )}
                      {grouped.refined.length > 0 && (
                        <optgroup label="🟡 Good Params">
                          {grouped.refined.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </optgroup>
                      )}
                      {grouped.unrefined.length > 0 && (
                        <optgroup label="🔴 Little Params">
                          {grouped.unrefined.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
              {ollamaStatus.available && selectedModel && (
                <span
                  className="model-tier-badge"
                  style={{ backgroundColor: getModelTier(selectedModel).color }}
                >
                  {getModelTier(selectedModel).label}
                </span>
              )}
            </div>
            <button
              className="refine-btn"
              onClick={handleRefine}
              disabled={!intent.trim() || !ollamaStatus.available || isRefining}
            >
              <Wand2 size={14} />
              {isRefining ? 'Refining...' : 'Refine'}
            </button>
          </div>
        </div>

        {/* Right Column - Output */}
        <div className="crafter-output">
          <label>Refined Prompt</label>
          <div className="refined-output">
            {refinedPrompt ? (
              <pre>{refinedPrompt}</pre>
            ) : (
              <div className="output-placeholder">
                Your refined prompt will appear here...
              </div>
            )}
          </div>
          <div className="output-actions">
            <button onClick={handleCopy} disabled={!refinedPrompt}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={handleSendToTerminal} className="send-btn" disabled={!refinedPrompt}>
              <Send size={14} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptCrafter;
