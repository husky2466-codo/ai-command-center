const logger = require('../utils/logger.cjs');

/**
 * Express middleware for logging API requests
 * Logs method, path, status code, and duration
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request received
  logger.debug('API Request Received', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('API Request Completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

module.exports = requestLogger;
