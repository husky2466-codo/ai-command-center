# Logging Framework Documentation

## Overview

AI Command Center uses **Winston** for comprehensive structured logging across the Electron main process, API server, and database operations.

## Features

- **Daily Log Rotation**: Logs are automatically rotated by date
- **Multiple Transports**: Console (development) + File (production)
- **Structured Logging**: JSON format for easy parsing and analysis
- **Log Levels**: error, warn, info, debug
- **Request Logging**: All HTTP API requests are logged with timing
- **Error Stack Traces**: Full stack traces for debugging
- **Security**: No sensitive data (passwords, API keys) are logged

## Log Files Location

All logs are stored in: `%APPDATA%\ai-command-center\logs\`

**File Structure:**
```
logs/
├── error-2025-12-30.log      # Error logs (14-day retention)
├── combined-2025-12-30.log   # All logs (7-day retention)
└── (older logs auto-deleted)
```

## Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `error` | Errors and exceptions | Database connection failed, API request error |
| `warn` | Warnings and potential issues | Missing optional config, deprecated feature |
| `info` | General informational messages | App started, database initialized, API server ready |
| `debug` | Detailed debugging information | Migration already applied, IPC communication details |

## Usage

### Basic Logging

```javascript
const logger = require('./utils/logger.cjs');

// Info
logger.info('Application started', { version: '2.0.0', env: 'production' });

// Error with stack trace
logger.error('Database query failed', {
  error: err.message,
  stack: err.stack,
  query: 'SELECT * FROM users'
});

// Warning
logger.warn('API key not configured', { feature: 'Google OAuth' });

// Debug
logger.debug('Migration already applied', { name: '001_initial' });
```

### Helper Methods

The logger includes specialized helper methods for common operations:

#### API Request Logging
```javascript
logger.api('GET', '/api/projects', 200, 45, { userId: '123' });
// Output: API Request { method: 'GET', path: '/api/projects', status: 200, duration: '45ms', userId: '123' }
```

#### Database Operations
```javascript
logger.db('SELECT', 'users', { filters: { email: 'user@example.com' } });
// Output: Database Operation { operation: 'SELECT', table: 'users', filters: {...} }
```

#### IPC Communication
```javascript
logger.ipc('get-user-data', 'receive', { userId: '123' });
// Output: IPC Communication { channel: 'get-user-data', direction: 'receive', userId: '123' }
```

## Implementation Details

### Logger Configuration

**File**: `electron/utils/logger.cjs`

- **Console Transport**: Colorized output with timestamps (always enabled)
- **File Transports**:
  - `error-{DATE}.log`: Error-level logs only (14-day retention)
  - `combined-{DATE}.log`: All log levels (7-day retention)
- **Format**: JSON with timestamp, level, message, and metadata

### Request Logging Middleware

**File**: `electron/middleware/requestLogger.cjs`

Automatically logs all HTTP API requests:
- Method, path, status code
- Request duration in milliseconds
- IP address and user agent (debug level)
- Errors logged at `warn` level for 4xx/5xx responses

### Error Handler Integration

**File**: `electron/utils/errorHandler.cjs`

- All uncaught exceptions logged to error level
- Unhandled promise rejections logged with context
- IPC handler errors wrapped and logged
- Database errors formatted with context

## Integration Points

### Main Process (`electron/main.cjs`)

```javascript
const logger = require('./utils/logger.cjs');
const { setupErrorHandlers } = require('./utils/errorHandler.cjs');

// Setup error handlers (includes logging)
setupErrorHandlers();

// Log application lifecycle
logger.info('Application starting', { version: app.getVersion() });
logger.info('Database initialized successfully');
logger.info('API Server started', { port: 3939 });
logger.info('Application shutting down');
```

### API Server (`electron/services/apiServer.cjs`)

```javascript
const logger = require('../utils/logger.cjs');
const requestLogger = require('../middleware/requestLogger.cjs');

app.use(requestLogger); // Log all requests
app.use(errorHandler);  // Log all errors

// Custom endpoint logging
logger.error('GET /api/emails error', { error: err.message });
```

### Database (`electron/database/db.cjs`)

```javascript
const logger = require('../utils/logger.cjs');

logger.info('Initializing database', { dbPath });
logger.db('WAL mode enabled', 'system');
logger.db('Applying migration', 'migrations', { name: '001_initial' });
logger.error('Migration failed', { name, error: err.message, stack: err.stack });
```

## Environment Variables

**Optional**: Set log level via environment variable

```bash
# Windows (PowerShell)
$env:LOG_LEVEL = "debug"

# Windows (CMD)
set LOG_LEVEL=debug

# Default: "info"
```

**Available Levels**: `error`, `warn`, `info`, `debug`

## Production vs Development

### Development
- Console output is colorized and human-readable
- Full stack traces displayed
- Debug logs visible

### Production
- Console logs still visible (for Electron console)
- File logs contain JSON for parsing
- Automatic rotation and cleanup
- Error dialogs shown to users (via errorHandler)

## Viewing Logs

### In Application

Use the **Debug → View Console Logs** menu option to:
1. Open the logs folder in File Explorer
2. View logs in real-time with a text editor

### Command Line

```powershell
# View latest combined log
Get-Content "$env:APPDATA\ai-command-center\logs\combined-2025-12-30.log" -Tail 50

# View error log
Get-Content "$env:APPDATA\ai-command-center\logs\error-2025-12-30.log"

# Search for specific errors
Select-String -Path "$env:APPDATA\ai-command-center\logs\*.log" -Pattern "Migration failed"
```

### Log Parsing

Since logs are in JSON format, you can parse them:

```javascript
const fs = require('fs');
const logFile = 'combined-2025-12-30.log';
const lines = fs.readFileSync(logFile, 'utf-8').split('\n');

const errors = lines
  .filter(line => line.includes('"level":"error"'))
  .map(line => JSON.parse(line));

console.log(errors);
```

## Security Considerations

### What is Logged
- Application lifecycle events
- Database operations (queries, migrations)
- HTTP API requests (method, path, status, duration)
- Error messages and stack traces
- IPC channel names and directions

### What is NOT Logged
- API keys (automatically filtered)
- Passwords
- Email content (only metadata)
- User credentials
- OAuth tokens
- File contents (only paths/names)

### Sensitive Data Protection

If you need to log objects that might contain sensitive data, use filtering:

```javascript
const { API_KEY, ...safeData } = config;
logger.info('Config loaded', safeData);
```

## Troubleshooting

### Logs not being written

1. Check if log directory exists:
   ```powershell
   Test-Path "$env:APPDATA\ai-command-center\logs"
   ```

2. Check file permissions (logs directory should be writable)

3. Check console for logger errors (logged via `console.error`)

### Logs too verbose

Set environment variable to reduce log level:
```powershell
$env:LOG_LEVEL = "warn"  # Only warnings and errors
```

### Disk space concerns

- Error logs: 14-day retention (auto-cleanup)
- Combined logs: 7-day retention (auto-cleanup)
- Adjust retention in `electron/utils/logger.cjs`:
  ```javascript
  maxFiles: '7d'  // Change to '3d' for 3 days
  ```

## Future Enhancements

Potential improvements for the logging system:

1. **Log Aggregation**: Send logs to external service (Sentry, LogRocket)
2. **Log Viewer UI**: In-app log viewer component
3. **Performance Metrics**: Track slow queries, API response times
4. **User Activity Logging**: Track feature usage (opt-in)
5. **Remote Debug Mode**: Enable verbose logging via API
6. **Log Export**: Export logs as ZIP for bug reports

## Related Files

- `electron/utils/logger.cjs` - Logger configuration
- `electron/utils/errorHandler.cjs` - Error handling integration
- `electron/middleware/requestLogger.cjs` - HTTP request logging
- `electron/main.cjs` - Main process logging
- `electron/services/apiServer.cjs` - API server logging
- `electron/database/db.cjs` - Database logging

---

**Last Updated**: 2025-12-30
**Version**: 2.0.0
