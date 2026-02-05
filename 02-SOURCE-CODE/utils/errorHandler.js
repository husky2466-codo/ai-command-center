/**
 * React Error Boundary and global error handling utilities
 */

import React from 'react';
import { AppError, normalizeError } from './AppError.js';

/**
 * Error Boundary Component
 * Catches React component errors and displays a fallback UI
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const normalizedError = normalizeError(error);

    // Log error
    console.error('React Error Boundary caught an error:', {
      error: normalizedError,
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    // Store error in state
    this.setState({
      error: normalizedError,
      errorInfo
    });

    // Report to error tracking service if configured
    if (this.props.onError) {
      this.props.onError(normalizedError, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset
        });
      }

      // Default fallback UI
      return this.props.children;
    }

    return this.props.children;
  }
}

/**
 * Global error handler for uncaught errors
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);

    const error = normalizeError(event.reason);

    // Prevent default browser handling
    event.preventDefault();

    // Show user-friendly error notification
    showErrorNotification(error);
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught Error:', event.error);

    const error = normalizeError(event.error || event.message);

    // Show user-friendly error notification
    showErrorNotification(error);
  });
}

/**
 * Show a user-friendly error notification
 */
function showErrorNotification(error) {
  // In development, show detailed error
  if (import.meta.env.DEV) {
    console.error('Error Details:', error);
  }

  // You can integrate with a toast notification system here
  // For now, we'll just log it
  const userMessage = getUserFriendlyMessage(error);
  console.warn('User Notification:', userMessage);

  // If Electron API is available, you could show a native notification
  if (window.electronAPI?.showErrorDialog) {
    window.electronAPI.showErrorDialog({
      title: 'Error',
      message: userMessage,
      detail: import.meta.env.DEV ? error.message : undefined
    });
  }
}

/**
 * Convert error to user-friendly message
 */
function getUserFriendlyMessage(error) {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'NOT_FOUND':
        return 'The requested item could not be found.';
      case 'UNAUTHORIZED':
        return 'You need to be logged in to perform this action.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'VALIDATION_ERROR':
        return error.message; // Validation messages are usually user-friendly
      case 'DATABASE_ERROR':
        return 'A database error occurred. Please try again.';
      case 'EXTERNAL_API_ERROR':
        return 'An external service is unavailable. Please try again later.';
      case 'SERVICE_UNAVAILABLE':
        return 'This service is currently unavailable. Please try again later.';
      case 'FILESYSTEM_ERROR':
        return 'A file operation failed. Please check permissions and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error, includeStack = false) {
  const normalized = normalizeError(error);

  const formatted = {
    title: normalized.code?.replace(/_/g, ' ') || 'Error',
    message: normalized.message,
    code: normalized.code,
    timestamp: normalized.timestamp,
    details: normalized.details
  };

  if (includeStack && normalized.stack) {
    formatted.stack = normalized.stack;
  }

  return formatted;
}

/**
 * Async error handler wrapper
 * Wraps async functions to catch and handle errors consistently
 */
export function asyncHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const normalized = normalizeError(error);
      console.error('Async Handler Error:', normalized);
      throw normalized;
    }
  };
}

/**
 * Try-catch wrapper that returns [error, result]
 * Similar to Go's error handling pattern
 */
export async function tryCatch(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    const normalized = normalizeError(error);
    return [normalized, null];
  }
}

/**
 * Log error with context
 */
export function logError(error, context = {}) {
  const normalized = normalizeError(error);

  const logData = {
    error: normalized.toJSON ? normalized.toJSON() : normalized,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Error Log:', logData);
  }

  // Send to Electron main process for file logging
  if (window.electronAPI?.logError) {
    window.electronAPI.logError(logData);
  }

  return logData;
}

/**
 * Create a safe version of a function that catches and logs errors
 */
export function makeSafe(fn, fallbackValue = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { function: fn.name, args });
      return fallbackValue;
    }
  };
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = normalizeError(error);

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const waitTime = delay * Math.pow(backoff, attempt - 1);

      if (onRetry) {
        onRetry(lastError, attempt, waitTime);
      }

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

export default {
  ErrorBoundary,
  setupGlobalErrorHandlers,
  formatErrorForDisplay,
  asyncHandler,
  tryCatch,
  logError,
  makeSafe,
  retry
};
