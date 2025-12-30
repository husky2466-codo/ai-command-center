# Winston Logger - Quick Reference

## Import

```javascript
const logger = require('./utils/logger.cjs');
```

## Basic Usage

```javascript
// Info
logger.info('User logged in', { userId: '123', timestamp: Date.now() });

// Warning
logger.warn('API key missing', { feature: 'Google OAuth' });

// Error (with stack trace)
logger.error('Database connection failed', {
  error: err.message,
  stack: err.stack,
  dbPath: '/path/to/db'
});

// Debug
logger.debug('Cache hit', { key: 'user:123', ttl: 3600 });
```

## Helper Methods

```javascript
// HTTP API requests
logger.api('GET', '/api/projects', 200, 45, { userId: '123' });
// Output: API Request { method: 'GET', path: '/api/projects', status: 200, duration: '45ms', userId: '123' }

// Database operations
logger.db('INSERT', 'users', { email: 'user@example.com' });
// Output: Database Operation { operation: 'INSERT', table: 'users', email: 'user@example.com' }

// IPC communication
logger.ipc('get-user-data', 'receive', { userId: '123' });
// Output: IPC Communication { channel: 'get-user-data', direction: 'receive', userId: '123' }
```

## Log Levels (in order)

1. `error` - Errors that need immediate attention
2. `warn` - Warnings, potential issues
3. `info` - General informational messages (default)
4. `debug` - Detailed debugging information

**Set via ENV**: `set LOG_LEVEL=debug`

## Log File Locations

- **Production**: `%APPDATA%\ai-command-center\logs\`
- **Files**:
  - `combined-YYYY-MM-DD.log` (7-day retention)
  - `error-YYYY-MM-DD.log` (14-day retention)

## Best Practices

### ✅ DO

```javascript
// Include context
logger.error('Migration failed', {
  name: migrationName,
  error: err.message,
  stack: err.stack
});

// Filter sensitive data
const { password, apiKey, ...safeData } = userData;
logger.info('User created', safeData);

// Use helper methods
logger.api(req.method, req.path, res.statusCode, duration);
```

### ❌ DON'T

```javascript
// Don't log raw strings
logger.error('Migration failed'); // Missing context!

// Don't log sensitive data
logger.info('User logged in', { password: user.password }); // NEVER!

// Don't use console.log
console.log('[Main] Database ready'); // Use logger.info() instead
```

## Common Patterns

### Async Error Handling

```javascript
try {
  const result = await someAsyncOperation();
  logger.info('Operation completed', { result });
} catch (err) {
  logger.error('Operation failed', {
    operation: 'someAsyncOperation',
    error: err.message,
    stack: err.stack
  });
  throw err;
}
```

### Database Queries

```javascript
try {
  logger.db('SELECT', 'users', { filter: email });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  logger.debug('User found', { userId: user.id });
} catch (err) {
  logger.error('Database query failed', {
    query: 'SELECT users',
    error: err.message,
    stack: err.stack
  });
}
```

### HTTP Endpoints

```javascript
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    logger.error('GET /api/users failed', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, error: err.message });
  }
});
```

## View Logs

### PowerShell

```powershell
# Latest 50 lines
Get-Content "$env:APPDATA\ai-command-center\logs\combined-*.log" -Tail 50

# Errors only
Get-Content "$env:APPDATA\ai-command-center\logs\error-*.log"

# Follow live
Get-Content "$env:APPDATA\ai-command-center\logs\combined-*.log" -Wait -Tail 20
```

### Parse JSON Logs

```javascript
const fs = require('fs');
const logFile = 'combined-2025-12-30.log';
const logs = fs.readFileSync(logFile, 'utf-8')
  .split('\n')
  .filter(line => line)
  .map(line => JSON.parse(line));

// Filter errors
const errors = logs.filter(log => log.level === 'error');
console.log(errors);
```

## Environment Variables

```bash
# Windows CMD
set LOG_LEVEL=debug

# Windows PowerShell
$env:LOG_LEVEL = "debug"

# Linux/Mac
export LOG_LEVEL=debug
```

## Migration from console.log

**Before:**
```javascript
console.log('[Main] Server started on port', port);
console.error('[Main] Failed to connect:', err.message);
```

**After:**
```javascript
logger.info('Server started', { port });
logger.error('Failed to connect', { error: err.message, stack: err.stack });
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logs not appearing | Check `%APPDATA%\ai-command-center\logs\` exists |
| Too verbose | Set `LOG_LEVEL=warn` to reduce output |
| Disk space | Logs auto-rotate (7-14 days retention) |
| Performance | File writes are async, minimal impact |

---

**Full Documentation**: See `LOGGING.md`
