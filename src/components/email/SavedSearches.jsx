import React, { useState, useEffect } from 'react';
import {
  Search,
  Star,
  Trash2,
  Clock,
  Loader,
  BookMarked,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Button from '../shared/Button';

/**
 * SavedSearches - Displays and manages saved email searches
 * Shows favorites at top, then recent, then all others
 */
export default function SavedSearches({
  accountId,
  onSelectSearch,
  isExpanded = false,
  onToggleExpand
}) {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (accountId) {
      loadSearches();
    }
  }, [accountId]);

  const loadSearches = async () => {
    if (!window.electronAPI?.googleGetSavedSearches) return;

    try {
      setLoading(true);
      const result = await window.electronAPI.googleGetSavedSearches(accountId);
      if (result.success) {
        setSearches(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearch = async (search) => {
    // Record usage
    if (window.electronAPI?.googleRecordSearchUsage) {
      await window.electronAPI.googleRecordSearchUsage(search.id).catch(console.error);
    }

    // Execute search
    onSelectSearch(search.query, search.name);
  };

  const handleToggleFavorite = async (search, e) => {
    e.stopPropagation();

    if (!window.electronAPI?.googleUpdateSavedSearch) return;

    try {
      const result = await window.electronAPI.googleUpdateSavedSearch(search.id, {
        is_favorite: !search.is_favorite
      });

      if (result.success) {
        setSearches(prev =>
          prev.map(s =>
            s.id === search.id ? { ...s, is_favorite: !s.is_favorite } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDeleteSearch = async (searchId, e) => {
    e.stopPropagation();

    if (!confirm('Delete this saved search?')) return;

    try {
      setDeleting(searchId);

      if (window.electronAPI?.googleDeleteSavedSearch) {
        const result = await window.electronAPI.googleDeleteSavedSearch(searchId);
        if (result.success) {
          setSearches(prev => prev.filter(s => s.id !== searchId));
        }
      }
    } catch (error) {
      console.error('Failed to delete search:', error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Separate favorites from regular searches
  const favorites = searches.filter(s => s.is_favorite);
  const regular = searches.filter(s => !s.is_favorite);

  if (!accountId) return null;

  return (
    <div className="saved-searches">
      <button
        className="saved-searches-header"
        onClick={onToggleExpand}
      >
        <BookMarked size={18} />
        <span>Saved Searches</span>
        {searches.length > 0 && (
          <span className="search-count">{searches.length}</span>
        )}
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="saved-searches-content">
          {loading ? (
            <div className="saved-searches-loading">
              <Loader size={16} className="loading-spinner" />
              <span>Loading...</span>
            </div>
          ) : searches.length === 0 ? (
            <div className="saved-searches-empty">
              <p>No saved searches yet</p>
              <p className="hint">Use Advanced Search to save your favorite queries</p>
            </div>
          ) : (
            <>
              {/* Favorites Section */}
              {favorites.length > 0 && (
                <div className="search-group">
                  <div className="search-group-header">
                    <Star size={14} />
                    <span>Favorites</span>
                  </div>
                  {favorites.map((search) => (
                    <div
                      key={search.id}
                      className="saved-search-item favorite"
                      onClick={() => handleSelectSearch(search)}
                    >
                      <div className="search-item-main">
                        <Search size={14} className="search-icon" />
                        <div className="search-item-content">
                          <span className="search-name">{search.name}</span>
                          <span className="search-query">{search.query}</span>
                        </div>
                      </div>
                      <div className="search-item-actions">
                        <button
                          className="star-btn starred"
                          onClick={(e) => handleToggleFavorite(search, e)}
                          title="Remove from favorites"
                        >
                          <Star size={14} fill="currentColor" />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={(e) => handleDeleteSearch(search.id, e)}
                          disabled={deleting === search.id}
                          title="Delete search"
                        >
                          {deleting === search.id ? (
                            <Loader size={14} className="loading-spinner" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Regular Searches Section */}
              {regular.length > 0 && (
                <div className="search-group">
                  {favorites.length > 0 && (
                    <div className="search-group-header">
                      <Clock size={14} />
                      <span>All Searches</span>
                    </div>
                  )}
                  {regular.map((search) => (
                    <div
                      key={search.id}
                      className="saved-search-item"
                      onClick={() => handleSelectSearch(search)}
                    >
                      <div className="search-item-main">
                        <Search size={14} className="search-icon" />
                        <div className="search-item-content">
                          <span className="search-name">{search.name}</span>
                          <span className="search-query">{search.query}</span>
                          {search.last_used_at && (
                            <span className="search-meta">
                              Used {search.use_count || 0} times | Last: {formatDate(search.last_used_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="search-item-actions">
                        <button
                          className="star-btn"
                          onClick={(e) => handleToggleFavorite(search, e)}
                          title="Add to favorites"
                        >
                          <Star size={14} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={(e) => handleDeleteSearch(search.id, e)}
                          disabled={deleting === search.id}
                          title="Delete search"
                        >
                          {deleting === search.id ? (
                            <Loader size={14} className="loading-spinner" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
