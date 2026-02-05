/**
 * Error Handler Middleware
 * Centralized error handling for all routes
 */

function errorHandler(err, req, res, next) {
  console.error('[API Server] Error:', err.message);
  console.error('[API Server] Stack:', err.stack);

  res.status(500).json({
    success: false,
    error: err.message
  });
}

module.exports = errorHandler;
