/**
 * MemoryLaneBar.jsx - Displays relevant memories for current conversation
 * Shows 3-5 most relevant memories with pink gradient branding
 */

import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import './MemoryLaneBar.css';

/**
 * Memory Lane Bar Component
 * Horizontal bar at top of Chat showing relevant memories
 *
 * @param {Array} memories - Array of memory objects with scores
 * @param {Function} onFeedback - Callback for memory feedback (memoryId, type)
 * @param {boolean} visible - Whether bar is visible
 * @param {Function} onToggleCollapse - Callback for collapse/expand
 */
const MemoryLaneBar = ({
  memories = [],
  onFeedback = null,
  visible = true,
  onToggleCollapse = null
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  // Animate in when memories appear
  useEffect(() => {
    if (memories.length > 0) {
      setAnimateIn(true);
      const timer = setTimeout(() => setAnimateIn(false), 600);
      return () => clearTimeout(timer);
    }
  }, [memories.length]);

  // Don't render if no memories or not visible
  if (!visible || memories.length === 0) {
    return null;
  }

  // Handle collapse toggle
  const handleToggleCollapse = () => {
    setCollapsed(!collapsed);
    if (onToggleCollapse) {
      onToggleCollapse(!collapsed);
    }
  };

  // Handle memory click to expand
  const handleMemoryClick = (memoryId) => {
    setExpandedMemory(expandedMemory === memoryId ? null : memoryId);
  };

  // Handle feedback
  const handleFeedback = (memoryId, type, e) => {
    e.stopPropagation();
    if (onFeedback) {
      onFeedback(memoryId, type);
    }
  };

  // Get type badge color
  const getTypeBadgeColor = (type) => {
    const colors = {
      correction: '#ef4444',
      decision: '#3b82f6',
      commitment: '#8b5cf6',
      insight: '#f59e0b',
      learning: '#10b981',
      confidence: '#06b6d4',
      pattern_seed: '#ec4899',
      cross_agent: '#a855f7',
      workflow_note: '#6b7280',
      gap: '#f97316'
    };
    return colors[type] || '#6b7280';
  };

  // Format type for display
  const formatType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Calculate confidence bar width
  const getConfidenceWidth = (score) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <div className={`memory-lane-bar ${collapsed ? 'collapsed' : ''} ${animateIn ? 'animate-in' : ''}`}>
      {/* Header */}
      <div className="memory-lane-header" onClick={handleToggleCollapse}>
        <div className="memory-lane-title">
          <Brain className="brain-icon" size={20} />
          <span>Memory Lane</span>
          <span className="memory-count">{memories.length} {memories.length === 1 ? 'memory' : 'memories'}</span>
        </div>
        <button className="collapse-btn" aria-label={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Memory Pills */}
      {!collapsed && (
        <div className="memory-pills">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className={`memory-pill ${expandedMemory === memory.id ? 'expanded' : ''}`}
              onClick={() => handleMemoryClick(memory.id)}
            >
              {/* Compact View */}
              <div className="memory-pill-compact">
                <div className="memory-pill-header">
                  <span
                    className="type-badge"
                    style={{ backgroundColor: getTypeBadgeColor(memory.type) }}
                  >
                    {formatType(memory.type)}
                  </span>
                  <span className="memory-title">{memory.title}</span>
                </div>

                <div className="confidence-bar-container">
                  <div
                    className="confidence-bar"
                    style={{ width: getConfidenceWidth(memory.finalScore || memory.confidence_score || 0) }}
                  />
                </div>

                <div className="memory-metadata">
                  <span className="score">
                    {Math.round((memory.finalScore || memory.confidence_score || 0) * 100)}%
                  </span>
                  {memory.retrievalMethod && (
                    <span className="retrieval-method">{memory.retrievalMethod}</span>
                  )}
                </div>
              </div>

              {/* Expanded View */}
              {expandedMemory === memory.id && (
                <div className="memory-pill-expanded">
                  <button
                    className="close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedMemory(null);
                    }}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>

                  <div className="memory-content">
                    <p>{memory.content}</p>
                  </div>

                  {memory.category && (
                    <div className="memory-category">
                      <strong>Category:</strong> {memory.category}
                    </div>
                  )}

                  {memory.related_entities && (
                    <div className="memory-entities">
                      <strong>Related:</strong> {
                        typeof memory.related_entities === 'string'
                          ? JSON.parse(memory.related_entities).join(', ')
                          : memory.related_entities.join(', ')
                      }
                    </div>
                  )}

                  <div className="memory-stats">
                    <span>Observed: {memory.times_observed || 1}x</span>
                    <span>Recalled: {memory.recall_count || 0}x</span>
                    {memory.last_observed_at && (
                      <span>
                        Last: {new Date(memory.last_observed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {onFeedback && (
                    <div className="feedback-buttons">
                      <button
                        className="feedback-btn positive"
                        onClick={(e) => handleFeedback(memory.id, 'positive', e)}
                        aria-label="Helpful"
                      >
                        <ThumbsUp size={14} />
                        <span>{memory.positive_feedback || 0}</span>
                      </button>
                      <button
                        className="feedback-btn negative"
                        onClick={(e) => handleFeedback(memory.id, 'negative', e)}
                        aria-label="Not helpful"
                      >
                        <ThumbsDown size={14} />
                        <span>{memory.negative_feedback || 0}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoryLaneBar;
