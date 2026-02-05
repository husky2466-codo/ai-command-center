const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Get log directory (app might not be ready yet, so use lazy initialization)
let logDir = null;

function getLogDir() {
  if (!logDir) {
    // Try to get from electron app if available
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        logDir = path.join(app.getPath('userData'), 'logs');
      } else {
        // App exists but not ready yet, use fallback
        const os = require('os');
        logDir = path.join(os.tmpdir(), 'ai-command-center-logs');
      }
    } catch (err) {
      // Electron not available (e.g., during testing), use fallback
      const os = require('os');
      logDir = path.join(os.tmpdir(), 'ai-command-center-logs');
    }

    // Ensure log directory exists
    if (logDir && !fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  return logDir;
}

// Initialize log directory
const initialLogDir = getLogDir();

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'ai-command-center' },
  transports: [
    // Error log file with daily rotation
    new DailyRotateFile({
      filename: path.join(initialLogDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d', // Keep 14 days of error logs
      format: fileFormat
    }),

    // Combined log file with daily rotation
    new DailyRotateFile({
      filename: path.join(initialLogDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d', // Keep 7 days of combined logs
      format: fileFormat
    }),

    // Console output (development)
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Handle transport errors
logger.on('error', (err) => {
  console.error('Logger error:', err);
});

// Add helper methods for structured logging
logger.api = (method, path, status, duration, meta = {}) => {
  logger.info('API Request', {
    method,
    path,
    status,
    duration: `${duration}ms`,
    ...meta
  });
};

logger.db = (operation, table, meta = {}) => {
  logger.debug('Database Operation', {
    operation,
    table,
    ...meta
  });
};

logger.ipc = (channel, direction, meta = {}) => {
  logger.debug('IPC Communication', {
    channel,
    direction, // 'send' or 'receive'
    ...meta
  });
};

module.exports = logger;
