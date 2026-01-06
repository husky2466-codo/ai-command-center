import React, { useEffect, useState } from 'react';
import { FolderKanban, Edit2, Trash2, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { projectService } from '../../services/ProjectService';
import Card from '../shared/Card';

export default function LifeView({ spaces, onSpaceClick, onEditSpace, onDeleteSpace, onReload }) {
  const [spacesWithCounts, setSpacesWithCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpaceCounts();
  }, [spaces]);

  const loadSpaceCounts = async () => {
    try {
      setLoading(true);
      const spacesData = await Promise.all(
        spaces.map(space => projectService.getSpaceWithProjectCount(space.id))
      );
      setSpacesWithCounts(spacesData);
    } catch (error) {
      console.error('Failed to load space counts:', error);
      setSpacesWithCounts(spaces.map(s => ({ ...s, project_count: 0, active_count: 0 })));
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSpace = async (space, direction) => {
    try {
      const currentIndex = spacesWithCounts.findIndex(s => s.id === space.id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      // Boundary check
      if (targetIndex < 0 || targetIndex >= spacesWithCounts.length) {
        return;
      }

      const targetSpace = spacesWithCounts[targetIndex];

      // Swap sort_order values
      const currentSortOrder = space.sort_order;
      const targetSortOrder = targetSpace.sort_order;

      // Update both spaces in database
      await Promise.all([
        projectService.updateSpace(space.id, { sort_order: targetSortOrder }),
        projectService.updateSpace(targetSpace.id, { sort_order: currentSortOrder })
      ]);

      // Reload spaces from parent to get new order
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('Failed to reorder spaces:', error);
    }
  };

  if (loading) {
    return <div className="life-view-loading">Loading spaces...</div>;
  }

  if (spacesWithCounts.length === 0) {
    return (
      <div className="life-view-empty">
        <FolderKanban size={64} className="empty-icon" />
        <h2>No Spaces Yet</h2>
        <p>Create your first life area to get started organizing your projects</p>
      </div>
    );
  }

  return (
    <div className="life-view">
      <div className="space-grid">
        {spacesWithCounts.map((space, index) => (
          <SpaceCard
            key={space.id}
            space={space}
            onClick={() => onSpaceClick(space)}
            onEdit={(e) => {
              e.stopPropagation();
              onEditSpace(space);
            }}
            onDelete={(e) => {
              e.stopPropagation();
              onDeleteSpace(space.id);
            }}
            onMoveUp={(e) => {
              e.stopPropagation();
              handleMoveSpace(space, 'up');
            }}
            onMoveDown={(e) => {
              e.stopPropagation();
              handleMoveSpace(space, 'down');
            }}
            isFirst={index === 0}
            isLast={index === spacesWithCounts.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function SpaceCard({ space, onClick, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const hasActiveProjects = space.active_count > 0;

  return (
    <Card
      className="space-card"
      hoverable
      onClick={onClick}
    >
      <div className="space-card-content">
        {/* Color Indicator */}
        <div
          className="space-color-bar"
          style={{ backgroundColor: space.color }}
        />

        {/* Header */}
        <div className="space-card-header">
          <div className="space-card-title-row">
            <h3 className="space-card-title">{space.name}</h3>
            {hasActiveProjects && (
              <Star size={16} className="space-active-indicator" fill="var(--accent-gold)" />
            )}
          </div>

          <div className="space-card-actions">
            <button
              className="space-action-btn"
              onClick={onMoveUp}
              title="Move up"
              disabled={isFirst}
            >
              <ChevronUp size={16} />
            </button>
            <button
              className="space-action-btn"
              onClick={onMoveDown}
              title="Move down"
              disabled={isLast}
            >
              <ChevronDown size={16} />
            </button>
            <button
              className="space-action-btn"
              onClick={onEdit}
              title="Edit space"
            >
              <Edit2 size={16} />
            </button>
            <button
              className="space-action-btn space-delete-btn"
              onClick={onDelete}
              title="Delete space"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Description */}
        {space.description && (
          <p className="space-card-description">{space.description}</p>
        )}

        {/* Stats */}
        <div className="space-card-stats">
          <div className="space-stat">
            <span className="space-stat-value">{space.project_count || 0}</span>
            <span className="space-stat-label">Projects</span>
          </div>
          {hasActiveProjects && (
            <div className="space-stat active">
              <span className="space-stat-value">{space.active_count}</span>
              <span className="space-stat-label">Active</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
