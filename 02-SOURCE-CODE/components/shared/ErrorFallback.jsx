/**
 * ErrorFallback - User-friendly error display component
 * Shown when ErrorBoundary catches a component error
 */

import React, { useState } from 'react';
import './ErrorFallback.css';
import { AlertCircle, ChevronDown, ChevronRight, RefreshCw, Home } from 'lucide-react';

export default function ErrorFallback({ error, errorInfo, resetError }) {
  const [showDetails, setShowDetails] = useState(false);
  const isDev = import.meta.env.DEV;

  const handleRetry = () => {
    if (resetError) {
      resetError();
    } else {
      // Fallback: reload the page
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (resetError) {
      resetError();
    }
    // Navigate to dashboard
    window.location.hash = '#dashboard';
  };

  const errorMessage = error?.message || 'An unexpected error occurred';
  const errorCode = error?.code || 'UNKNOWN_ERROR';
  const timestamp = error?.timestamp || new Date().toISOString();

  return (
    <div className="error-fallback-container">
      <div className="error-fallback-card">
        {/* Icon & Title */}
        <div className="error-fallback-header">
          <div className="error-icon">
            <AlertCircle size={48} />
          </div>
          <h1 className="error-title">Something went wrong</h1>
          <p className="error-subtitle">
            We encountered an unexpected error. Don't worry, your data is safe.
          </p>
        </div>

        {/* Error Message */}
        <div className="error-message-box">
          <p className="error-message">{errorMessage}</p>
          {errorCode !== 'UNKNOWN_ERROR' && (
            <p className="error-code">Error Code: {errorCode}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="error-actions">
          <button className="error-button primary" onClick={handleRetry}>
            <RefreshCw size={18} />
            Try Again
          </button>
          <button className="error-button secondary" onClick={handleGoHome}>
            <Home size={18} />
            Go to Dashboard
          </button>
        </div>

        {/* Error Details (Dev Only) */}
        {isDev && (
          <div className="error-details-section">
            <button
              className="error-details-toggle"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span>Technical Details</span>
            </button>

            {showDetails && (
              <div className="error-details-content">
                {/* Timestamp */}
                <div className="error-detail-item">
                  <strong>Timestamp:</strong>
                  <pre>{new Date(timestamp).toLocaleString()}</pre>
                </div>

                {/* Error Object */}
                {error && (
                  <div className="error-detail-item">
                    <strong>Error Details:</strong>
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                  </div>
                )}

                {/* Stack Trace */}
                {error?.stack && (
                  <div className="error-detail-item">
                    <strong>Stack Trace:</strong>
                    <pre className="error-stack">{error.stack}</pre>
                  </div>
                )}

                {/* Component Stack */}
                {errorInfo?.componentStack && (
                  <div className="error-detail-item">
                    <strong>Component Stack:</strong>
                    <pre className="error-stack">{errorInfo.componentStack}</pre>
                  </div>
                )}

                {/* Additional Details */}
                {error?.details && (
                  <div className="error-detail-item">
                    <strong>Additional Details:</strong>
                    <pre>{JSON.stringify(error.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="error-help-text">
          <p>
            If this problem persists, please{' '}
            <a href="#" onClick={() => window.electronAPI?.openExternal('https://github.com/husky2466-codo/ai-command-center/issues')}>
              report an issue
            </a>{' '}
            or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
