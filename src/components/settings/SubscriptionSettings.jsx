import React, { useState, useEffect } from 'react';
import './SubscriptionSettings.css';

export default function SubscriptionSettings() {
  const [cliStatus, setCliStatus] = useState({
    available: false,
    version: null,
    authenticated: false,
    email: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setCliStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check if CLI is available
      const cliCheck = await window.electronAPI.claudeCli.check();

      if (!cliCheck.available) {
        setCliStatus({
          available: false,
          version: null,
          authenticated: false,
          email: null,
          loading: false,
          error: null
        });
        return;
      }

      // Check OAuth status
      const authStatus = await window.electronAPI.claudeCli.checkOAuth();

      setCliStatus({
        available: true,
        version: cliCheck.version,
        authenticated: authStatus.authenticated,
        email: authStatus.email,
        loading: false,
        error: null
      });
    } catch (err) {
      setCliStatus(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to check CLI status'
      }));
    }
  };

  const handleConnect = async () => {
    setCliStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await window.electronAPI.claudeCli.setupToken();

      if (result.success) {
        // Refresh status after successful setup
        await checkStatus();
      } else {
        setCliStatus(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Failed to connect subscription'
        }));
      }
    } catch (err) {
      setCliStatus(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to connect subscription'
      }));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Claude subscription? You will need to reconnect to use free AI features.')) {
      return;
    }

    setCliStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      // For now, just inform user to manually revoke via CLI
      alert('To disconnect, run the following command in your terminal:\n\nclaude logout');
      await checkStatus();
    } catch (err) {
      setCliStatus(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to disconnect'
      }));
    }
  };

  return (
    <div className="subscription-settings">
      <div className="subscription-header">
        <h3>Claude Subscription</h3>
        {cliStatus.loading && (
          <span className="status-loading">Checking...</span>
        )}
      </div>

      {cliStatus.error && (
        <div className="subscription-error">
          {cliStatus.error}
        </div>
      )}

      {!cliStatus.loading && !cliStatus.available && (
        <div className="subscription-not-available">
          <div className="status-row">
            <span className="status-indicator offline"></span>
            <span className="status-text">CLI Not Installed</span>
          </div>

          <div className="subscription-info">
            <p>The Claude Code CLI is not installed on this system.</p>
            <p>Install it to connect your Claude Pro/Max subscription for free AI usage.</p>
          </div>

          <div className="install-instructions">
            <strong>Installation:</strong>
            <code>npm install -g @anthropic-ai/claude-code</code>
          </div>
        </div>
      )}

      {!cliStatus.loading && cliStatus.available && !cliStatus.authenticated && (
        <div className="subscription-disconnected">
          <div className="status-row">
            <span className="status-indicator offline"></span>
            <span className="status-text">Not Connected</span>
          </div>

          <div className="cli-info">
            <div className="info-item">
              <span className="info-label">CLI Version:</span>
              <span className="info-value">{cliStatus.version}</span>
            </div>
          </div>

          <div className="subscription-info">
            <p>Connect your Claude Pro/Max subscription for free AI usage across all AI Command Center features.</p>
          </div>

          <button className="btn btn-connect" onClick={handleConnect}>
            Connect Subscription
          </button>

          <div className="subscription-benefits">
            <strong>Benefits:</strong>
            <ul>
              <li>Free AI queries (uses your Pro/Max subscription)</li>
              <li>No API key required</li>
              <li>Works with Vision, Chat, Chain Runner</li>
            </ul>
          </div>
        </div>
      )}

      {!cliStatus.loading && cliStatus.authenticated && (
        <div className="subscription-connected">
          <div className="status-row">
            <span className="status-indicator online"></span>
            <span className="status-text">Connected</span>
          </div>

          <div className="cli-info">
            <div className="info-item">
              <span className="info-label">Account:</span>
              <span className="info-value account-email">{cliStatus.email || 'Connected'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">CLI Version:</span>
              <span className="info-value">{cliStatus.version}</span>
            </div>
          </div>

          <div className="subscription-actions">
            <button className="btn btn-ghost" onClick={checkStatus}>
              Refresh Status
            </button>
            <button className="btn btn-ghost btn-disconnect" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>

          <div className="subscription-benefits">
            <strong>Active Benefits:</strong>
            <ul>
              <li>Free AI queries (uses your Pro/Max subscription)</li>
              <li>No API key required</li>
              <li>Works with Vision, Chat, Chain Runner</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
