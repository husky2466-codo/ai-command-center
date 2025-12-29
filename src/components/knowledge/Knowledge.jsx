import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Grid, List, Zap, Tag as TagIcon, Folder } from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Modal from '../shared/Modal';
import FolderTree from './FolderTree';
import KnowledgeList from './KnowledgeList';
import ArticleView from './ArticleView';
import ArticleEditor from './ArticleEditor';
import SparkInput from './SparkInput';
import * as knowledgeService from '../../services/knowledgeService';
import './Knowledge.css';

/**
 * Knowledge Component
 * Andy's "Second Brain" - Knowledge base with folders, articles, and sparks
 */
export default function Knowledge() {
  // Data state
  const [folders, setFolders] = useState([]);
  const [articles, setArticles] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isEditing, setIsEditing] = useState(false);
  const [showNewArticleModal, setShowNewArticleModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showSparkInput, setShowSparkInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New folder state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize default folders if needed
      await knowledgeService.initializeDefaultFolders();

      // Load folders and tags
      const [foldersData, tagsData] = await Promise.all([
        knowledgeService.getAllFolders(),
        knowledgeService.getAllTags()
      ]);

      setFolders(foldersData);
      setAllTags(tagsData);

      // Load all articles initially
      await loadArticles();
    } catch (err) {
      console.error('Failed to load knowledge data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async (folderId = null) => {
    try {
      const articlesData = await knowledgeService.getAllArticles(folderId);
      setArticles(articlesData);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError(err.message);
    }
  };

  // Folder handlers
  const handleFolderSelect = async (folder) => {
    setSelectedFolder(folder);
    setSelectedArticle(null);
    setSearchQuery('');
    setSelectedTags([]);
    await loadArticles(folder?.id);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await knowledgeService.createFolder(newFolderName, newFolderParent);
      setNewFolderName('');
      setNewFolderParent(null);
      setShowNewFolderModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create folder:', err);
      setError(err.message);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      await knowledgeService.deleteFolder(folderId);
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to delete folder:', err);
      alert(err.message);
    }
  };

  // Article handlers
  const handleArticleSelect = async (article) => {
    try {
      const fullArticle = await knowledgeService.getArticle(article.id);
      setSelectedArticle(fullArticle);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to load article:', err);
      setError(err.message);
    }
  };

  const handleNewArticle = () => {
    const folderId = selectedFolder?.id || null;
    setSelectedArticle({
      id: null,
      folder_id: folderId,
      title: '',
      content: '',
      source_url: '',
      tags: [],
      is_spark: false
    });
    setIsEditing(true);
    setShowNewArticleModal(false);
  };

  const handleSaveArticle = async (articleData) => {
    try {
      if (articleData.id) {
        // Update existing
        await knowledgeService.updateArticle(articleData.id, articleData);
      } else {
        // Create new
        const newArticle = await knowledgeService.createArticle(articleData);
        setSelectedArticle(newArticle);
      }

      setIsEditing(false);
      await loadArticles(selectedFolder?.id);

      // Reload tags
      const tagsData = await knowledgeService.getAllTags();
      setAllTags(tagsData);
    } catch (err) {
      console.error('Failed to save article:', err);
      setError(err.message);
    }
  };

  const handleDeleteArticle = async (articleId) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      await knowledgeService.deleteArticle(articleId);
      setSelectedArticle(null);
      await loadArticles(selectedFolder?.id);
    } catch (err) {
      console.error('Failed to delete article:', err);
      setError(err.message);
    }
  };

  // Search and filter handlers
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadArticles(selectedFolder?.id);
      return;
    }

    try {
      const results = await knowledgeService.searchArticles(searchQuery);
      setArticles(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message);
    }
  };

  const handleTagClick = async (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
      await loadArticles(selectedFolder?.id);
    } else {
      setSelectedTags([...selectedTags, tag]);
      try {
        const results = await knowledgeService.getArticlesByTag(tag);
        setArticles(results);
      } catch (err) {
        console.error('Tag filter failed:', err);
        setError(err.message);
      }
    }
  };

  // Spark handlers
  const handleSparkCreate = async (content) => {
    try {
      // Find or create SparkFile folder
      let sparkFolder = folders.find(f => f.name === 'SparkFile');

      if (!sparkFolder) {
        sparkFolder = await knowledgeService.createFolder('SparkFile', null);
      }

      await knowledgeService.createArticle({
        folder_id: sparkFolder.id,
        title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        content,
        is_spark: true,
        tags: []
      });

      setShowSparkInput(false);
      await loadArticles(selectedFolder?.id);
    } catch (err) {
      console.error('Failed to create spark:', err);
      setError(err.message);
    }
  };

  // Flatten folders for dropdown
  const flattenFolders = (folderList, depth = 0) => {
    let result = [];
    folderList.forEach(folder => {
      result.push({ ...folder, depth });
      if (folder.children && folder.children.length > 0) {
        result = result.concat(flattenFolders(folder.children, depth + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folders);

  // Filter articles by selected tags (client-side)
  const filteredArticles = selectedTags.length > 0
    ? articles.filter(article =>
        selectedTags.some(tag => article.tags.includes(tag))
      )
    : articles;

  if (loading) {
    return (
      <div className="knowledge-container">
        <div className="knowledge-loading">
          <BookOpen size={48} className="loading-icon" />
          <p>Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="knowledge-container">
      {/* Header */}
      <header className="knowledge-header">
        <div className="knowledge-header-left">
          <BookOpen size={24} className="knowledge-icon" />
          <h1>Knowledge Base</h1>
          {selectedFolder && (
            <span className="knowledge-breadcrumb">/ {selectedFolder.name}</span>
          )}
        </div>
        <div className="knowledge-header-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<Zap size={16} />}
            onClick={() => setShowSparkInput(true)}
          >
            Quick Spark
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Folder size={16} />}
            onClick={() => setShowNewFolderModal(true)}
          >
            New Folder
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={handleNewArticle}
          >
            New Article
          </Button>
        </div>
      </header>

      {error && (
        <div className="knowledge-error">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Main Content - Three Panel Layout */}
      <div className="knowledge-main">
        {/* Left Panel - Folder Tree */}
        <aside className="knowledge-sidebar">
          <div className="knowledge-sidebar-header">
            <h3>Folders</h3>
          </div>
          <FolderTree
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderSelect={handleFolderSelect}
            onDeleteFolder={handleDeleteFolder}
          />
        </aside>

        {/* Middle Panel - Article List */}
        <section className="knowledge-article-list-panel">
          <div className="knowledge-list-header">
            <div className="knowledge-search">
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                icon={<Search size={16} />}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSearch}
              >
                Search
              </Button>
            </div>

            <div className="knowledge-list-controls">
              <div className="view-mode-toggle">
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <Grid size={16} />
                </button>
                <button
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {selectedTags.length > 0 && (
            <div className="knowledge-active-filters">
              <TagIcon size={14} />
              {selectedTags.map(tag => (
                <span key={tag} className="filter-tag" onClick={() => handleTagClick(tag)}>
                  {tag} ×
                </span>
              ))}
            </div>
          )}

          <KnowledgeList
            articles={filteredArticles}
            selectedArticle={selectedArticle}
            viewMode={viewMode}
            onArticleSelect={handleArticleSelect}
            onTagClick={handleTagClick}
          />
        </section>

        {/* Right Panel - Article View/Edit */}
        <section className="knowledge-article-panel">
          {selectedArticle ? (
            isEditing ? (
              <ArticleEditor
                article={selectedArticle}
                folders={flatFolders}
                allTags={allTags}
                onSave={handleSaveArticle}
                onCancel={() => {
                  if (selectedArticle.id) {
                    setIsEditing(false);
                  } else {
                    setSelectedArticle(null);
                  }
                }}
              />
            ) : (
              <ArticleView
                article={selectedArticle}
                onEdit={() => setIsEditing(true)}
                onDelete={() => handleDeleteArticle(selectedArticle.id)}
                onTagClick={handleTagClick}
              />
            )
          ) : (
            <div className="knowledge-empty-state">
              <BookOpen size={64} className="empty-icon" />
              <h3>Select an article</h3>
              <p>Choose an article from the list to view or edit</p>
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={handleNewArticle}
              >
                Create New Article
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* New Folder Modal */}
      <Modal
        isOpen={showNewFolderModal}
        onClose={() => {
          setShowNewFolderModal(false);
          setNewFolderName('');
          setNewFolderParent(null);
        }}
        title="Create New Folder"
        size="small"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowNewFolderModal(false);
                setNewFolderName('');
                setNewFolderParent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </Button>
          </>
        }
      >
        <div className="knowledge-modal-content">
          <Input
            label="Folder Name"
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name..."
            autoFocus
          />

          <div className="knowledge-form-group">
            <label>Parent Folder (optional)</label>
            <select
              value={newFolderParent || ''}
              onChange={(e) => setNewFolderParent(e.target.value || null)}
              className="knowledge-select"
            >
              <option value="">Root</option>
              {flatFolders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {'  '.repeat(folder.depth)}
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Spark Input Modal */}
      {showSparkInput && (
        <SparkInput
          onSave={handleSparkCreate}
          onCancel={() => setShowSparkInput(false)}
        />
      )}
    </div>
  );
}
