import React, { useEffect, useState } from 'react';
import { FolderKanban, Edit2, Trash2, Star } from 'lucide-react';
import { projectService } from '../../services/ProjectService';
import Card from '../shared/Card';

export default function LifeView({ spaces, onSpaceClick, onEditSpace, onDeleteSpace }) {
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
        {spacesWithCounts.map(space => (
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
          />
        ))}
      </div>
    </div>
  );
}

function SpaceCard({ space, onClick, onEdit, onDelete }) {
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
