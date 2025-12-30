/**
 * API Key Authentication Middleware
 * Validates X-API-Key header if API_SERVER_KEY environment variable is set
 */

const API_KEY = process.env.API_SERVER_KEY || null;

/**
 * Middleware for API key authentication (if configured)
 */
function authenticateApiKey(req, res, next) {
  if (!API_KEY) {
    // No API key configured, allow all requests
    return next();
  }

  const providedKey = req.headers['x-api-key'];
  if (providedKey === API_KEY) {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid or missing API key'
    });
  }
}

module.exports = authenticateApiKey;
