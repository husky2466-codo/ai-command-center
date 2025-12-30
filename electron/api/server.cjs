/**
 * API Server for AI Command Center
 * Modular Express server with route-based organization
 *
 * Security:
 * - Localhost only (127.0.0.1)
 * - Optional API key authentication
 * - All requests logged
 */

const express = require('express');
const cors = require('cors');

// Middleware
const authenticateApiKey = require('./middleware/auth.cjs');
const logRequest = require('./middleware/requestLogger.cjs');
const errorHandler = require('./middleware/errorHandler.cjs');

// Routes
const routes = require('./routes/index.cjs');

// Configuration
const DEFAULT_PORT = 3939;

let server = null;
let app = null;

/**
 * Start the HTTP API server
 * @param {number} port - Port to listen on (default: 3939)
 * @returns {Promise<void>}
 */
async function startApiServer(port = DEFAULT_PORT) {
  if (server) {
    console.log('[API Server] Server already running');
    return;
  }

  app = express();

  // Middleware setup
  app.use(cors({ origin: 'http://localhost:*' })); // Allow CORS for local development
  app.use(express.json());
  app.use(logRequest);
  app.use(authenticateApiKey);

  // Mount all routes at /api
  app.use('/api', routes);

  // Error handler (must be last)
  app.use(errorHandler);

  // Start listening (localhost only)
  return new Promise((resolve, reject) => {
    server = app.listen(port, '127.0.0.1', () => {
      const apiKeyStatus = process.env.API_SERVER_KEY ? 'enabled' : 'disabled';
      console.log(`[API Server] Listening on http://127.0.0.1:${port}`);
      console.log(`[API Server] API key auth: ${apiKeyStatus}`);
      console.log('[API Server] Ready to accept connections from localhost');
      resolve();
    });

    server.on('error', (err) => {
      console.error('[API Server] Failed to start:', err.message);
      reject(err);
    });
  });
}

/**
 * Stop the HTTP API server
 * @returns {Promise<void>}
 */
async function stopApiServer() {
  if (!server) {
    console.log('[API Server] No server to stop');
    return;
  }

  return new Promise((resolve) => {
    server.close(() => {
      console.log('[API Server] Server stopped');
      server = null;
      app = null;
      resolve();
    });
  });
}

/**
 * Get server status
 * @returns {object} Server status
 */
function getServerStatus() {
  return {
    running: server !== null,
    port: server ? server.address()?.port : null,
    address: server ? server.address()?.address : null
  };
}

module.exports = {
  startApiServer,
  stopApiServer,
  getServerStatus
};
