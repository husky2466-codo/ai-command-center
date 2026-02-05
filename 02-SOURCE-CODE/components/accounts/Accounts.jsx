import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  Users,
  RefreshCw,
  Trash2,
  Plus,
  Shield,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader,
  User
} from 'lucide-react';
import './Accounts.css';

export default function Accounts({ apiKeys }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(new Map());
  const [error, setError] = useState(null);
  const [encryptionStatus, setEncryptionStatus] = useState(null);

  useEffect(() => {
    loadAccounts();
    checkEncryptionStatus();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.electronAPI?.googleListAccounts) {
        setError('Google Accounts API not available');
        setLoading(false);
        return;
      }

      const result = await window.electronAPI.googleListAccounts();
      const accountsList = result?.success ? (result.data || []) : [];
      setAccounts(accountsList);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const checkEncryptionStatus = async () => {
    try {
      if (!window.electronAPI?.googleAuthEncryptionStatus) {
        return;
      }

      const status = await window.electronAPI.googleAuthEncryptionStatus();
      setEncryptionStatus(status);
    } catch (err) {
      console.error('Failed to check encryption status:', err);
    }
  };

  const handleAddAccount = async () => {
    try {
      setError(null);

      if (!window.electronAPI?.googleAuthAuthenticate) {
        setError('Google Authentication API not available');
        return;
      }

      const result = await window.electronAPI.googleAuthAuthenticate();

      if (result.success) {
        await loadAccounts();
      } else {
        setError(result.error || 'Failed to add account');
      }
    } catch (err) {
      console.error('Failed to add account:', err);
      setError(err.message || 'Failed to add account');
    }
  };

  const handleSyncAccount = async (accountId) => {
    try {
      setError(null);
      setSyncing(prev => new Map(prev).set(accountId, true));

      if (!window.electronAPI?.googleSyncAll) {
        setError('Google Sync API not available');
        setSyncing(prev => {
          const next = new Map(prev);
          next.delete(accountId);
          return next;
        });
        return;
      }

      const result = await window.electronAPI.googleSyncAll(accountId);

      if (!result.success) {
        setError(result.error || 'Failed to sync account');
      }

      await loadAccounts();
    } catch (err) {
      console.error('Failed to sync account:', err);
      setError(err.message || 'Failed to sync account');
    } finally {
      setSyncing(prev => {
        const next = new Map(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const handleRemoveAccount = async (accountId, email) => {
    if (!confirm(`Remove account ${email}?\n\nThis will delete all synced data for this account.`)) {
      return;
    }

    try {
      setError(null);

      if (!window.electronAPI?.googleRemoveAccount) {
        setError('Google Remove Account API not available');
        return;
      }

      const result = await window.electronAPI.googleRemoveAccount(accountId);

      if (result.success) {
        await loadAccounts();
      } else {
        setError(result.error || 'Failed to remove account');
      }
    } catch (err) {
      console.error('Failed to remove account:', err);
      setError(err.message || 'Failed to remove account');
    }
  };

  const getSyncStatusIcon = (status) => {
    if (!status) {
      return <AlertCircle className="status-icon status-unknown" size={16} />;
    }

    switch (status.toLowerCase()) {
      case 'synced':
        return <CheckCircle className="status-icon status-synced" size={16} />;
      case 'syncing':
        return <Loader className="status-icon status-syncing" size={16} />;
      case 'error':
        return <XCircle className="status-icon status-error" size={16} />;
      default:
        return <AlertCircle className="status-icon status-unknown" size={16} />;
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="accounts-container">
      <div className="accounts-header">
        <div className="accounts-title-section">
          <h1>
            <User size={28} />
            Google Accounts
          </h1>
          <p className="accounts-subtitle">Manage connected Google accounts and sync status</p>
        </div>

        <button className="btn-add-account" onClick={handleAddAccount}>
          <Plus size={20} />
          Add Google Account
        </button>
      </div>

      {/* Encryption Status */}
      {encryptionStatus && (
        <div className="encryption-status">
          <Shield size={16} />
          <span>
            {encryptionStatus.secure
              ? 'Tokens are securely encrypted'
              : 'Warning: Tokens are not encrypted'}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="accounts-error">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="accounts-loading">
          <Loader className="spinner" size={32} />
          <p>Loading accounts...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && (
        <div className="accounts-empty">
          <User size={64} />
          <h2>No accounts connected</h2>
          <p>Add a Google account to sync emails, calendar events, and contacts</p>
          <button className="btn-add-account-large" onClick={handleAddAccount}>
            <Plus size={20} />
            Add Your First Account
          </button>
        </div>
      )}

      {/* Accounts List */}
      {!loading && accounts.length > 0 && (
        <div className="accounts-grid">
          {accounts.map((account) => (
            <div key={account.id} className="account-card">
              <div className="account-header">
                <div className="account-avatar">
                  {account.avatar_url ? (
                    <img src={account.avatar_url} alt={account.display_name} />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <div className="account-info">
                  <h3>{account.display_name || 'Unknown User'}</h3>
                  <p className="account-email">{account.email}</p>
                </div>
              </div>

              <div className="account-sync-info">
                <div className="sync-status">
                  {getSyncStatusIcon(account.syncStatus)}
                  <span className="sync-status-text">
                    {account.syncStatus || 'Unknown'}
                  </span>
                </div>
                <div className="last-sync">
                  <span className="last-sync-label">Last sync:</span>
                  <span className="last-sync-time">{formatLastSync(account.last_sync_at)}</span>
                </div>
              </div>

              <div className="account-stats">
                <div className="stat-item">
                  <Mail size={16} />
                  <span>{account.emailCount || 0} emails</span>
                </div>
                <div className="stat-item">
                  <Calendar size={16} />
                  <span>{account.eventCount || 0} events</span>
                </div>
                <div className="stat-item">
                  <Users size={16} />
                  <span>{account.contactCount || 0} contacts</span>
                </div>
              </div>

              <div className="account-actions">
                <button
                  className="btn-sync"
                  onClick={() => handleSyncAccount(account.id)}
                  disabled={syncing.get(account.id)}
                >
                  <RefreshCw
                    size={16}
                    className={syncing.get(account.id) ? 'spinning' : ''}
                  />
                  {syncing.get(account.id) ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveAccount(account.id, account.email)}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>

              {account.sync_enabled !== undefined && (
                <div className="account-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={account.sync_enabled === 1}
                      onChange={async (e) => {
                        try {
                          const enabled = e.target.checked;
                          if (!window.electronAPI?.googleToggleSync) {
                            setError('Toggle sync API not available');
                            return;
                          }

                          const result = await window.electronAPI.googleToggleSync(account.id, enabled);
                          if (result.success) {
                            await loadAccounts();
                          } else {
                            setError(result.error || 'Failed to toggle sync');
                          }
                        } catch (err) {
                          console.error('Failed to toggle sync:', err);
                          setError(err.message || 'Failed to toggle sync');
                        }
                      }}
                    />
                    <span>Auto-sync enabled</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
