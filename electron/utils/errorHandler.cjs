/**
 * Electron Main Process Error Handler
 * Handles uncaught exceptions and unhandled promise rejections
 */

const logger = require('./logger.cjs');
const { app, dialog } = require('electron');

/**
 * Setup global error handlers for the main process
 */
function setupErrorHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception in Main Process:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // In production, show error dialog to user
    if (!isDevelopment()) {
      showErrorDialog('Uncaught Exception', error);
    }

    // Don't exit in development to allow debugging
    if (!isDevelopment()) {
      // Give logger time to write before exiting
      setTimeout(() => {
        app.quit();
      }, 1000);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack,
        name: reason.name
      } : reason,
      promise: String(promise)
    });

    // In production, show error dialog
    if (!isDevelopment()) {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      showErrorDialog('Unhandled Promise Rejection', error);
    }
  });

  // Handle warnings
  process.on('warning', (warning) => {
    logger.warn('Process Warning:', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });

  logger.info('Error handlers initialized');
}

/**
 * Check if running in development mode
 */
function isDevelopment() {
  return !app.isPackaged;
}

/**
 * Show native error dialog to user
 */
function showErrorDialog(title, error) {
  const message = error.message || String(error);
  const detail = isDevelopment() ? error.stack : 'Please restart the application.';

  dialog.showErrorBox(title, `${message}\n\n${detail}`);
}

/**
 * Wrap async IPC handler with error handling
 */
function wrapIpcHandler(handler, handlerName = 'IPC Handler') {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      logger.error(`Error in ${handlerName}:`, {
        message: error.message,
        stack: error.stack,
        args: args.map(arg => {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
      });

      // Return error in consistent format
      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        ...(isDevelopment() && { stack: error.stack })
      };
    }
  };
}

/**
 * Wrap sync IPC handler with error handling
 */
function wrapIpcHandlerSync(handler, handlerName = 'IPC Handler') {
  return (event, ...args) => {
    try {
      return handler(event, ...args);
    } catch (error) {
      logger.error(`Error in ${handlerName}:`, {
        message: error.message,
        stack: error.stack,
        args: args.map(arg => {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
      });

      // Return error in consistent format
      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        ...(isDevelopment() && { stack: error.stack })
      };
    }
  };
}

/**
 * Try-catch wrapper for async operations
 */
async function tryCatch(operation, context = {}) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    logger.error('Operation failed:', {
      context,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    });

    return {
      success: false,
      error: error.message,
      code: error.code || 'OPERATION_FAILED',
      ...(isDevelopment() && { stack: error.stack })
    };
  }
}

/**
 * Format database errors for user consumption
 */
function formatDatabaseError(error, operation, table) {
  logger.error('Database Error:', {
    operation,
    table,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  });

  // SQLite-specific error codes
  const sqliteErrors = {
    'SQLITE_CONSTRAINT': 'A database constraint was violated',
    'SQLITE_BUSY': 'Database is busy, please try again',
    'SQLITE_LOCKED': 'Database is locked',
    'SQLITE_READONLY': 'Database is read-only',
    'SQLITE_CORRUPT': 'Database file is corrupted',
    'SQLITE_NOTFOUND': 'Record not found',
    'SQLITE_CANTOPEN': 'Cannot open database file'
  };

  const userMessage = sqliteErrors[error.code] || `Database error during ${operation}`;

  return {
    success: false,
    error: userMessage,
    code: error.code || 'DATABASE_ERROR',
    details: { operation, table },
    ...(isDevelopment() && {
      originalError: error.message,
      stack: error.stack
    })
  };
}

/**
 * Format filesystem errors
 */
function formatFileSystemError(error, operation, path) {
  logger.error('Filesystem Error:', {
    operation,
    path,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  });

  const fsErrors = {
    'ENOENT': 'File or directory not found',
    'EACCES': 'Permission denied',
    'EEXIST': 'File already exists',
    'EISDIR': 'Expected a file, found a directory',
    'ENOTDIR': 'Expected a directory, found a file',
    'ENOSPC': 'No space left on device',
    'EPERM': 'Operation not permitted'
  };

  const userMessage = fsErrors[error.code] || `File system error during ${operation}`;

  return {
    success: false,
    error: userMessage,
    code: error.code || 'FILESYSTEM_ERROR',
    details: { operation, path },
    ...(isDevelopment() && {
      originalError: error.message,
      stack: error.stack
    })
  };
}

/**
 * Safe JSON stringify that handles circular references
 */
function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

module.exports = {
  setupErrorHandlers,
  wrapIpcHandler,
  wrapIpcHandlerSync,
  tryCatch,
  formatDatabaseError,
  formatFileSystemError,
  safeStringify,
  showErrorDialog
};
