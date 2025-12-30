/**
 * Request Logger Middleware
 * Logs all incoming API requests with timestamp
 */

function logRequest(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[API Server] ${timestamp} ${req.method} ${req.path}`);
  next();
}

module.exports = logRequest;
