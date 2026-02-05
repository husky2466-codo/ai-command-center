import React from 'react';
import { Brain, Sparkles } from 'lucide-react';
import Card from '../../shared/Card';
import Badge from '../../shared/Badge';

/**
 * RecentMemoriesWidget - Latest extracted memories
 */
function RecentMemoriesWidget({ memories, onNavigate }) {
  if (!memories) return null;

  const getMemoryTypeIcon = (type) => {
    // Could expand with specific icons per type
    return <Sparkles size={14} />;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = Date.now();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleMemoryClick = (memory) => {
    if (onNavigate) {
      // Navigate to Memory Lane with this memory selected
      onNavigate('memory-lane', { memoryId: memory.id });
    }
  };

  const truncateText = (text, maxLength = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card
      title="Recent Memories"
      className="recent-memories-widget"
      variant="default"
      padding="md"
      hoverable
    >
      <div className="widget-icon">
        <Brain size={20} />
      </div>

      {memories.memories.length === 0 ? (
        <div className="widget-empty">
          <p>No memories extracted yet</p>
          <button
            className="btn-link"
            onClick={() => onNavigate && onNavigate('memory-lane')}
          >
            Start extracting memories
          </button>
        </div>
      ) : (
        <div className="memories-list">
          {memories.memories.map((memory) => (
            <div
              key={memory.id}
              className="memory-item"
              onClick={() => handleMemoryClick(memory)}
            >
              <div className="memory-header">
                {memory.type && (
                  <Badge
                    text={memory.type}
                    variant={memory.type.toLowerCase()}
                    size="sm"
                    icon={getMemoryTypeIcon(memory.type)}
                  />
                )}
                <span className="memory-time">
                  {formatTimeAgo(memory.created_at)}
                </span>
              </div>
              <p className="memory-content">
                {truncateText(memory.content)}
              </p>
              {memory.session_id && (
                <span className="memory-session">
                  Session: {memory.session_id.substring(0, 8)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {memories.count > 0 && (
        <div className="widget-footer">
          <span className="widget-count">{memories.count} recent</span>
          <button
            className="btn-link"
            onClick={() => onNavigate && onNavigate('memory-lane')}
          >
            View all
          </button>
        </div>
      )}
    </Card>
  );
}

export default RecentMemoriesWidget;
