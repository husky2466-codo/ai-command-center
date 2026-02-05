import React from 'react';
import PropTypes from 'prop-types';
import { FileText, Link as LinkIcon, Code, Zap, Tag as TagIcon, Folder, Calendar } from 'lucide-react';
import './KnowledgeList.css';

/**
 * KnowledgeList Component
 * Displays articles in grid or list view
 */
function KnowledgeList({ articles, selectedArticle, viewMode, onArticleSelect, onTagClick }) {

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const getArticleIcon = (article) => {
    if (article.is_spark) return <Zap size={16} />;
    if (article.source_url) return <LinkIcon size={16} />;
    if (article.content?.includes('```')) return <Code size={16} />;
    return <FileText size={16} />;
  };

  const getArticleTypeLabel = (article) => {
    if (article.is_spark) return 'Spark';
    if (article.source_url) return 'Link';
    if (article.content?.includes('```')) return 'Snippet';
    return 'Note';
  };

  const truncateContent = (content, maxLength = 150) => {
    if (!content) return '';
    const plainText = content.replace(/[#*`[\]]/g, '').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  if (articles.length === 0) {
    return (
      <div className="knowledge-list-empty">
        <FileText size={48} className="empty-icon" />
        <p>No articles found</p>
      </div>
    );
  }

  return (
    <div className={`knowledge-list ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
      {articles.map(article => {
        const isSelected = selectedArticle?.id === article.id;

        return (
          <article
            key={article.id}
            className={`knowledge-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onArticleSelect(article)}
          >
            {/* Header */}
            <div className="knowledge-card-header">
              <div className="article-type">
                {getArticleIcon(article)}
                <span className="article-type-label">{getArticleTypeLabel(article)}</span>
              </div>
              {article.is_spark && (
                <span className="spark-badge">
                  <Zap size={12} />
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="knowledge-card-title">{article.title}</h3>

            {/* Preview */}
            {article.content && (
              <p className="knowledge-card-preview">
                {truncateContent(article.content)}
              </p>
            )}

            {/* Metadata */}
            <div className="knowledge-card-meta">
              {article.folder_name && (
                <div className="meta-item">
                  <Folder size={12} />
                  <span>{article.folder_name}</span>
                </div>
              )}
              <div className="meta-item">
                <Calendar size={12} />
                <span>{formatDate(article.updated_at)}</span>
              </div>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="knowledge-card-tags">
                <TagIcon size={12} className="tag-icon" />
                {article.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="knowledge-tag"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick(tag);
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {article.tags.length > 3 && (
                  <span className="knowledge-tag-more">
                    +{article.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Source URL Indicator */}
            {article.source_url && (
              <div className="knowledge-card-source">
                <LinkIcon size={12} />
                <span className="source-url">
                  {new URL(article.source_url).hostname}
                </span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

KnowledgeList.propTypes = {
  articles: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string,
    source_url: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    is_spark: PropTypes.bool,
    folder_name: PropTypes.string,
    updated_at: PropTypes.string
  })).isRequired,
  selectedArticle: PropTypes.object,
  viewMode: PropTypes.oneOf(['grid', 'list']).isRequired,
  onArticleSelect: PropTypes.func.isRequired,
  onTagClick: PropTypes.func.isRequired
};

export default KnowledgeList;
