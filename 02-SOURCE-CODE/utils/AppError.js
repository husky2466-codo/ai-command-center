/**
 * Custom application error class with status codes and error codes
 * Provides consistent error handling across the app
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging or API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

/**
 * Common error factory functions for consistent error creation
 */

// 400 - Bad Request
const badRequest = (message, details = null) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

// 401 - Unauthorized
const unauthorized = (message = 'Authentication required', details = null) =>
  new AppError(message, 401, 'UNAUTHORIZED', details);

// 403 - Forbidden
const forbidden = (message = 'Access denied', details = null) =>
  new AppError(message, 403, 'FORBIDDEN', details);

// 404 - Not Found
const notFound = (resource, identifier = null) =>
  new AppError(
    identifier ? `${resource} not found: ${identifier}` : `${resource} not found`,
    404,
    'NOT_FOUND',
    { resource, identifier }
  );

// 409 - Conflict
const conflict = (message, details = null) =>
  new AppError(message, 409, 'CONFLICT', details);

// 422 - Unprocessable Entity
const validationError = (message, fields = null) =>
  new AppError(message, 422, 'VALIDATION_ERROR', fields);

// 500 - Internal Server Error
const internal = (message, details = null) =>
  new AppError(message, 500, 'INTERNAL_ERROR', details);

// 503 - Service Unavailable
const serviceUnavailable = (service, details = null) =>
  new AppError(
    `Service unavailable: ${service}`,
    503,
    'SERVICE_UNAVAILABLE',
    { service, ...details }
  );

// Database-specific errors
const databaseError = (operation, table, originalError) =>
  new AppError(
    `Database error during ${operation} on ${table}`,
    500,
    'DATABASE_ERROR',
    { operation, table, originalError: originalError?.message }
  );

// API-specific errors
const apiError = (apiName, statusCode, originalError) =>
  new AppError(
    `External API error: ${apiName}`,
    statusCode || 500,
    'EXTERNAL_API_ERROR',
    { apiName, originalError: originalError?.message }
  );

// File system errors
const fileSystemError = (operation, path, originalError) =>
  new AppError(
    `File system error during ${operation}`,
    500,
    'FILESYSTEM_ERROR',
    { operation, path, originalError: originalError?.message }
  );

/**
 * Check if an error is an operational error (vs programming error)
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert unknown errors to AppError instances
 */
function normalizeError(error) {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(
      error.message,
      500,
      'UNKNOWN_ERROR',
      { originalError: error.name }
    );
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(error, 500, 'UNKNOWN_ERROR');
  }

  // Unknown error type
  return new AppError(
    'An unknown error occurred',
    500,
    'UNKNOWN_ERROR',
    { originalError: String(error) }
  );
}

export {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  internal,
  serviceUnavailable,
  databaseError,
  apiError,
  fileSystemError,
  isOperationalError,
  normalizeError
};
