import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Edit2, Trash2, ExternalLink, Calendar, Folder, Tag as TagIcon, Zap } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Button from '../shared/Button';
import './ArticleView.css';

// Configure marked for better code highlighting
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false
});

/**
 * ArticleView Component
 * Displays article content with rendered markdown
 */
function ArticleView({ article, onEdit, onDelete, onTagClick }) {

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render markdown safely
  const renderedContent = useMemo(() => {
    if (!article.content) return '';
    const rawHtml = marked.parse(article.content);
    return DOMPurify.sanitize(rawHtml);
  }, [article.content]);

  return (
    <div className="article-view">
      {/* Header */}
      <header className="article-view-header">
        <div className="article-view-title-section">
          {article.is_spark && (
            <div className="spark-indicator">
              <Zap size={20} />
              <span>Spark</span>
            </div>
          )}
          <h1 className="article-view-title">{article.title}</h1>
        </div>

        <div className="article-view-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<Edit2 size={16} />}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={16} />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </header>

      {/* Metadata Bar */}
      <div className="article-view-meta">
        {article.folder_name && (
          <div className="meta-item">
            <Folder size={14} />
            <span>{article.folder_name}</span>
          </div>
        )}
        {article.created_at && (
          <div className="meta-item">
            <Calendar size={14} />
            <span>Created {formatDate(article.created_at)}</span>
          </div>
        )}
        {article.updated_at && article.updated_at !== article.created_at && (
          <div className="meta-item">
            <Calendar size={14} />
            <span>Updated {formatDate(article.updated_at)}</span>
          </div>
        )}
      </div>

      {/* Source URL */}
      {article.source_url && (
        <div className="article-view-source">
          <ExternalLink size={14} />
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            {article.source_url}
          </a>
        </div>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="article-view-tags">
          <TagIcon size={14} className="tags-icon" />
          <div className="tags-list">
            {article.tags.map(tag => (
              <span
                key={tag}
                className="article-tag"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="article-view-divider"></div>
      <div
        className="article-view-content markdown-body"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    </div>
  );
}

ArticleView.propTypes = {
  article: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    content: PropTypes.string,
    source_url: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    is_spark: PropTypes.bool,
    folder_name: PropTypes.string,
    created_at: PropTypes.string,
    updated_at: PropTypes.string
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onTagClick: PropTypes.func.isRequired
};

export default ArticleView;
