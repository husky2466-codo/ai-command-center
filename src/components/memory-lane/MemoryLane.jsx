import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Brain,
  Search,
  SlidersHorizontal,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Filter,
  ChevronDown,
  X,
  AlertCircle
} from 'lucide-react';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Badge from '../shared/Badge';
import { memoryService } from '../../services/memoryService';
import { entityService } from '../../services/entityService';
import './MemoryLane.css';

/**
 * Memory Lane Component
 *
 * UI for browsing and viewing extracted AI memories.
 * Features:
 * - Memory list view with filters (type, confidence, date, search)
 * - Memory type badges with colors
 * - Memory detail modal with full info
 * - Feedback buttons (helpful/not helpful)
 * - Entity association display
 */

// Memory type configurations with colors
const MEMORY_TYPES = [
  { value: 'correction', label: 'Correction', variant: 'memory-correction' },
  { value: 'decision', label: 'Decision', variant: 'memory-decision' },
  { value: 'commitment', label: 'Commitment', variant: 'memory-commitment' },
  { value: 'insight', label: 'Insight', variant: 'memory-insight' },
  { value: 'learning', label: 'Learning', variant: 'memory-learning' },
  { value: 'confidence', label: 'Confidence', variant: 'memory-confidence' },
  { value: 'pattern_seed', label: 'Pattern', variant: 'memory-pattern' },
  { value: 'cross_agent', label: 'Cross-Agent', variant: 'memory-cross-agent' },
  { value: 'workflow_note', label: 'Workflow', variant: 'memory-workflow' },
  { value: 'gap', label: 'Gap', variant: 'memory-gap' }
];

function MemoryLane({ apiKeys }) {
  // State
  const [memories, setMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [memoryEntities, setMemoryEntities] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load memories on mount
  useEffect(() => {
    loadMemories();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [memories, searchQuery, selectedTypes, confidenceMin, dateRange]);

  /**
   * Load all memories from database
   */
  const loadMemories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await memoryService.getAll();
      setMemories(data);
    } catch (err) {
      console.error('Failed to load memories:', err);
      setError('Failed to load memories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply all active filters to memories list
   */
  const applyFilters = () => {
    let filtered = [...memories];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title?.toLowerCase().includes(query) ||
        m.content?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(m => selectedTypes.includes(m.type));
    }

    // Confidence filter
    filtered = filtered.filter(m => (m.confidence_score || 0) >= confidenceMin);

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(m =>
        new Date(m.first_observed_at) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(m =>
        new Date(m.first_observed_at) <= new Date(dateRange.end)
      );
    }

    // Sort by confidence and date
    filtered.sort((a, b) => {
      const confDiff = (b.confidence_score || 0) - (a.confidence_score || 0);
      if (confDiff !== 0) return confDiff;
      return new Date(b.first_observed_at) - new Date(a.first_observed_at);
    });

    setFilteredMemories(filtered);
  };

  /**
   * Toggle memory type filter
   */
  const toggleTypeFilter = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setConfidenceMin(0);
    setDateRange({ start: '', end: '' });
  };

  /**
   * Open memory detail modal
   */
  const openMemoryDetail = async (memory) => {
    setSelectedMemory(memory);
    setShowDetailModal(true);

    // Load entities for this memory
    try {
      const entities = await entityService.getEntitiesForMemory(memory.id);
      setMemoryEntities(entities);
    } catch (err) {
      console.error('Failed to load memory entities:', err);
      setMemoryEntities([]);
    }
  };

  /**
   * Close memory detail modal
   */
  const closeMemoryDetail = () => {
    setShowDetailModal(false);
    setSelectedMemory(null);
    setMemoryEntities([]);
  };

  /**
   * Submit feedback for a memory
   */
  const submitFeedback = async (memoryId, isPositive) => {
    try {
      if (isPositive) {
        await memoryService.addPositiveFeedback(memoryId);
      } else {
        await memoryService.addNegativeFeedback(memoryId);
      }

      // Reload memories to reflect updated feedback counts
      await loadMemories();

      // Update selected memory if modal is open
      if (selectedMemory?.id === memoryId) {
        const updated = await memoryService.getById(memoryId);
        setSelectedMemory(updated);
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Get memory type config
   */
  const getMemoryTypeConfig = (type) => {
    return MEMORY_TYPES.find(t => t.value === type) || {
      value: type,
      label: type,
      variant: 'default'
    };
  };

  /**
   * Truncate text for preview
   */
  const truncateText = (text, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Active filter count
  const activeFilterCount = selectedTypes.length +
    (confidenceMin > 0 ? 1 : 0) +
    (dateRange.start ? 1 : 0) +
    (dateRange.end ? 1 : 0);

  return (
    <div className="memory-lane">
      {/* Header */}
      <div className="memory-lane-header">
        <div className="memory-lane-header-content">
          <div className="memory-lane-title">
            <Brain className="memory-lane-icon" size={32} />
            <div>
              <h1>Memory Lane</h1>
              <p className="memory-lane-subtitle">Browse extracted AI memories</p>
            </div>
          </div>

          <div className="memory-lane-stats">
            <div className="stat">
              <span className="stat-value">{filteredMemories.length}</span>
              <span className="stat-label">Memories</span>
            </div>
            {memories.length !== filteredMemories.length && (
              <div className="stat">
                <span className="stat-value">{memories.length}</span>
                <span className="stat-label">Total</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="memory-lane-controls">
        <Input
          type="search"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search size={16} />}
          className="memory-search"
          fullWidth
        />

        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          icon={<SlidersHorizontal size={16} />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            icon={<X size={16} />}
            onClick={clearFilters}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="memory-lane-filters">
          {/* Memory Type Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <Filter size={14} />
              Memory Type
            </label>
            <div className="filter-badges">
              {MEMORY_TYPES.map(type => (
                <Badge
                  key={type.value}
                  variant={type.variant}
                  className={`filter-badge-item ${
                    selectedTypes.includes(type.value) ? 'active' : ''
                  }`}
                  onClick={() => toggleTypeFilter(type.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Confidence Filter */}
          <div className="filter-group">
            <label className="filter-label">
              Minimum Confidence: {Math.round(confidenceMin * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidenceMin}
              onChange={(e) => setConfidenceMin(parseFloat(e.target.value))}
              className="confidence-slider"
            />
          </div>

          {/* Date Range Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <Calendar size={14} />
              Date Range
            </label>
            <div className="date-range">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                placeholder="Start date"
              />
              <span className="date-separator">to</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                placeholder="End date"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="memory-lane-loading">
          <div className="spinner"></div>
          <p>Loading memories...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="memory-lane-error">
          <AlertCircle size={24} />
          <p>{error}</p>
          <Button onClick={loadMemories}>Retry</Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMemories.length === 0 && (
        <div className="memory-lane-empty">
          <Brain size={48} className="empty-icon" />
          <h3>No memories found</h3>
          <p>
            {memories.length === 0
              ? 'No memories have been extracted yet.'
              : 'No memories match your current filters.'}
          </p>
          {activeFilterCount > 0 && (
            <Button onClick={clearFilters}>Clear Filters</Button>
          )}
        </div>
      )}

      {/* Memory List */}
      {!loading && !error && filteredMemories.length > 0 && (
        <div className="memory-lane-list">
          {filteredMemories.map(memory => {
            const typeConfig = getMemoryTypeConfig(memory.type);
            const confidencePercent = Math.round((memory.confidence_score || 0) * 100);

            return (
              <Card
                key={memory.id}
                className="memory-card"
                hoverable
                onClick={() => openMemoryDetail(memory)}
              >
                {/* Type Badge */}
                <div className="memory-card-header">
                  <Badge variant={typeConfig.variant} hexagon>
                    {typeConfig.label}
                  </Badge>

                  {/* Confidence Score */}
                  <div className="memory-confidence">
                    <span className="confidence-value">{confidencePercent}%</span>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Title and Content */}
                <div className="memory-card-content">
                  <h3 className="memory-title">{memory.title}</h3>
                  <p className="memory-preview">
                    {truncateText(memory.content)}
                  </p>
                </div>

                {/* Footer */}
                <div className="memory-card-footer">
                  <div className="memory-meta">
                    <span className="memory-date">
                      {formatDate(memory.first_observed_at)}
                    </span>
                    {memory.recall_count > 0 && (
                      <span className="memory-recalls">
                        Recalled {memory.recall_count}x
                      </span>
                    )}
                  </div>

                  {/* Feedback Buttons */}
                  <div className="memory-feedback">
                    <button
                      className="feedback-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        submitFeedback(memory.id, true);
                      }}
                      title="Helpful"
                    >
                      <ThumbsUp size={14} />
                      {memory.positive_feedback > 0 && (
                        <span>{memory.positive_feedback}</span>
                      )}
                    </button>
                    <button
                      className="feedback-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        submitFeedback(memory.id, false);
                      }}
                      title="Not helpful"
                    >
                      <ThumbsDown size={14} />
                      {memory.negative_feedback > 0 && (
                        <span>{memory.negative_feedback}</span>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Memory Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeMemoryDetail}
        title="Memory Details"
        size="large"
      >
        {selectedMemory && (
          <div className="memory-detail">
            {/* Type and Confidence */}
            <div className="memory-detail-header">
              <Badge
                variant={getMemoryTypeConfig(selectedMemory.type).variant}
                hexagon
                size="md"
              >
                {getMemoryTypeConfig(selectedMemory.type).label}
              </Badge>
              <div className="detail-confidence">
                <span className="label">Confidence:</span>
                <span className="value">
                  {Math.round((selectedMemory.confidence_score || 0) * 100)}%
                </span>
              </div>
            </div>

            {/* Title */}
            <h2 className="memory-detail-title">{selectedMemory.title}</h2>

            {/* Content */}
            <div className="memory-detail-section">
              <h3 className="section-title">Content</h3>
              <p className="memory-detail-content">{selectedMemory.content}</p>
            </div>

            {/* Category */}
            {selectedMemory.category && (
              <div className="memory-detail-section">
                <h3 className="section-title">Category</h3>
                <Badge variant="info">{selectedMemory.category}</Badge>
              </div>
            )}

            {/* Reasoning */}
            {selectedMemory.reasoning && (
              <div className="memory-detail-section">
                <h3 className="section-title">AI Reasoning</h3>
                <p className="memory-detail-reasoning">{selectedMemory.reasoning}</p>
              </div>
            )}

            {/* Evidence */}
            {selectedMemory.evidence && (
              <div className="memory-detail-section">
                <h3 className="section-title">Evidence</h3>
                <p className="memory-detail-evidence">{selectedMemory.evidence}</p>
              </div>
            )}

            {/* Source Chunk */}
            {selectedMemory.source_chunk && (
              <div className="memory-detail-section">
                <h3 className="section-title">Source</h3>
                <pre className="memory-source">{selectedMemory.source_chunk}</pre>
              </div>
            )}

            {/* Associated Entities */}
            {memoryEntities.length > 0 && (
              <div className="memory-detail-section">
                <h3 className="section-title">Related Entities</h3>
                <div className="entity-tags">
                  {memoryEntities.map(entity => (
                    <Badge key={entity.id} variant="default">
                      {entity.canonical_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="memory-detail-section">
              <h3 className="section-title">Metadata</h3>
              <div className="metadata-grid">
                <div className="metadata-item">
                  <span className="metadata-label">First Observed:</span>
                  <span className="metadata-value">
                    {formatDate(selectedMemory.first_observed_at)}
                  </span>
                </div>
                {selectedMemory.last_observed_at && (
                  <div className="metadata-item">
                    <span className="metadata-label">Last Observed:</span>
                    <span className="metadata-value">
                      {formatDate(selectedMemory.last_observed_at)}
                    </span>
                  </div>
                )}
                <div className="metadata-item">
                  <span className="metadata-label">Times Observed:</span>
                  <span className="metadata-value">{selectedMemory.times_observed || 1}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Recall Count:</span>
                  <span className="metadata-value">{selectedMemory.recall_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="memory-detail-footer">
              <Button
                variant="secondary"
                icon={<ThumbsUp size={16} />}
                onClick={() => submitFeedback(selectedMemory.id, true)}
              >
                Helpful ({selectedMemory.positive_feedback || 0})
              </Button>
              <Button
                variant="secondary"
                icon={<ThumbsDown size={16} />}
                onClick={() => submitFeedback(selectedMemory.id, false)}
              >
                Not Helpful ({selectedMemory.negative_feedback || 0})
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

MemoryLane.propTypes = {
  apiKeys: PropTypes.object
};

export default MemoryLane;
