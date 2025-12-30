# Error Handling System

AI Command Center uses a comprehensive, centralized error handling system to provide consistent error management across the entire application.

## Overview

The error handling system consists of:

1. **Custom Error Classes** (`AppError`) - Structured error objects with status codes and error codes
2. **Error Boundary** - React error boundary for catching component errors
3. **Global Error Handlers** - Window-level handlers for uncaught errors and promise rejections
4. **Error Logging** - Centralized logging to files and console
5. **User-Friendly Fallbacks** - Beautiful error UI with helpful messages

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Components                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Component  │  │  Component  │  │  Component  │        │
│  │      A      │  │      B      │  │      C      │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │ Error Boundary  │ ◄─── Catches errors   │
│                  └────────┬────────┘                        │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │ ErrorFallback   │ ◄─── Shows UI         │
│                  └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │  Global Error Handlers  │
              │  - unhandledrejection  │
              │  - window.error        │
              └────────────┬────────────┘
                           │
                  ┌────────▼────────┐
                  │  Error Logging  │
                  │  - Console      │
                  │  - Log Files    │
                  └─────────────────┘
```

## Core Components

### 1. AppError Class (`src/utils/AppError.js`)

Custom error class with structured data:

```javascript
import { AppError, notFound, badRequest } from '@/utils/AppError.js';

// Create custom error
throw new AppError('User not found', 404, 'USER_NOT_FOUND', { userId: 123 });

// Use factory functions
throw notFound('User', 'abc-123');
throw badRequest('Invalid email format', { field: 'email' });
```

**Available Factory Functions:**

| Function | Status Code | Use Case |
|----------|-------------|----------|
| `badRequest(message, details)` | 400 | Invalid input or malformed requests |
| `unauthorized(message, details)` | 401 | Authentication required |
| `forbidden(message, details)` | 403 | Insufficient permissions |
| `notFound(resource, identifier)` | 404 | Resource doesn't exist |
| `conflict(message, details)` | 409 | Resource conflict (e.g., duplicate) |
| `validationError(message, fields)` | 422 | Validation failures |
| `internal(message, details)` | 500 | Internal server errors |
| `serviceUnavailable(service, details)` | 503 | External service down |
| `databaseError(operation, table, originalError)` | 500 | Database operation failures |
| `apiError(apiName, statusCode, originalError)` | 500 | External API failures |
| `fileSystemError(operation, path, originalError)` | 500 | File operation failures |

### 2. Error Boundary (`src/utils/errorHandler.js`)

React error boundary that catches errors in component tree:

```jsx
import { ErrorBoundary } from '@/utils/errorHandler.js';
import ErrorFallback from '@/components/shared/ErrorFallback';

function App() {
  return (
    <ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

**Props:**
- `fallback` - Custom fallback component (receives `error`, `errorInfo`, `resetError`)
- `onError` - Callback when error is caught
- `onReset` - Callback when error is reset

### 3. Error Fallback UI (`src/components/shared/ErrorFallback.jsx`)

User-friendly error display:

![Error Fallback](./images/error-fallback.png)

**Features:**
- Beautiful, themed UI
- Clear error message
- "Try Again" and "Go to Dashboard" actions
- Technical details (development only)
- Collapsible stack trace and error info

### 4. Global Error Handlers

Setup in `App.jsx`:

```javascript
import { setupGlobalErrorHandlers } from '@/utils/errorHandler.js';

// Call once at app startup
setupGlobalErrorHandlers();
```

**Catches:**
- Unhandled promise rejections
- Uncaught errors
- React errors outside error boundaries

### 5. Electron Error Handlers (`electron/utils/errorHandler.cjs`)

Main process error handling:

```javascript
const { setupErrorHandlers, wrapIpcHandler } = require('./utils/errorHandler.cjs');

// Setup at app startup
setupErrorHandlers();

// Wrap IPC handlers
ipcMain.handle('my-handler', wrapIpcHandler(async (event, data) => {
  // Your code here
  // Errors are caught and logged automatically
}, 'my-handler'));
```

**Features:**
- Catches uncaught exceptions
- Handles unhandled promise rejections
- Logs to file with winston
- Shows native error dialogs (production)
- Prevents crashes

## Usage Patterns

### Pattern 1: Service Methods

```javascript
import { notFound, databaseError } from '@/utils/AppError.js';

class UserService {
  async getUser(id) {
    try {
      const user = await dataService.get('SELECT * FROM users WHERE id = ?', [id]);

      if (!user) {
        throw notFound('User', id);
      }

      return user;
    } catch (error) {
      // Re-throw if already an AppError
      if (error.isOperational) {
        throw error;
      }

      // Wrap unknown errors
      throw databaseError('get user', 'users', error);
    }
  }
}
```

### Pattern 2: React Components

```jsx
import { logError } from '@/utils/errorHandler.js';

function MyComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await someService.getData();
        setData(result);
      } catch (err) {
        logError(err, { component: 'MyComponent', action: 'loadData' });
        setError(err);
      }
    }

    loadData();
  }, []);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{/* your UI */}</div>;
}
```

### Pattern 3: Try-Catch Helper

```javascript
import { tryCatch } from '@/utils/errorHandler.js';

async function handleSubmit() {
  // Returns [error, result]
  const [error, result] = await tryCatch(
    someService.submitForm(data)
  );

  if (error) {
    showToast('Error: ' + error.message);
    return;
  }

  showToast('Success!');
}
```

### Pattern 4: Safe Functions

```javascript
import { makeSafe } from '@/utils/errorHandler.js';

// Wrap function to catch errors and return fallback
const safeGetUser = makeSafe(userService.getUser, null);

// Won't throw - returns null on error
const user = await safeGetUser(userId);
```

### Pattern 5: Retry with Backoff

```javascript
import { retry } from '@/utils/errorHandler.js';

const data = await retry(
  () => fetchFromUnreliableAPI(),
  {
    maxAttempts: 3,
    delay: 1000,
    backoff: 2, // Exponential backoff
    onRetry: (error, attempt, waitTime) => {
      console.log(`Retry ${attempt} after ${waitTime}ms:`, error.message);
    }
  }
);
```

## Error Codes Reference

| Code | HTTP | Description | User Message |
|------|------|-------------|--------------|
| `BAD_REQUEST` | 400 | Invalid input | "Please check your input and try again" |
| `UNAUTHORIZED` | 401 | Not authenticated | "Please log in to continue" |
| `FORBIDDEN` | 403 | Insufficient permissions | "You don't have permission" |
| `NOT_FOUND` | 404 | Resource not found | "The requested item was not found" |
| `CONFLICT` | 409 | Resource conflict | "This item already exists" |
| `VALIDATION_ERROR` | 422 | Validation failed | (Show specific validation message) |
| `INTERNAL_ERROR` | 500 | Internal error | "An unexpected error occurred" |
| `DATABASE_ERROR` | 500 | Database failure | "A database error occurred" |
| `EXTERNAL_API_ERROR` | 500 | API failure | "External service unavailable" |
| `SERVICE_UNAVAILABLE` | 503 | Service down | "This service is temporarily unavailable" |
| `FILESYSTEM_ERROR` | 500 | File operation failed | "File operation failed" |

## Logging

### Renderer Process

```javascript
import { logError } from '@/utils/errorHandler.js';

logError(error, {
  component: 'Dashboard',
  action: 'loadWidgets',
  userId: currentUser?.id
});
```

**Logged to:**
- Browser console (development)
- Electron log files via IPC (production)

### Main Process

```javascript
const logger = require('./utils/logger.cjs');

logger.error('Operation failed:', {
  operation: 'database:insert',
  table: 'users',
  error: error.message,
  stack: error.stack
});
```

**Logged to:**
- Console (always)
- `%APPDATA%/ai-command-center/logs/error-YYYY-MM-DD.log`
- `%APPDATA%/ai-command-center/logs/combined-YYYY-MM-DD.log`

## Best Practices

### ✅ DO

```javascript
// Use factory functions for common errors
throw notFound('Project', projectId);

// Include context in error details
throw validationError('Invalid email', { field: 'email', value: email });

// Log errors with context
logError(error, { component: 'ProjectForm', projectId });

// Use try-catch in async functions
async function loadData() {
  try {
    return await service.getData();
  } catch (error) {
    logError(error, { context: 'loadData' });
    throw error; // Re-throw if caller should handle
  }
}
```

### ❌ DON'T

```javascript
// Don't throw generic errors
throw new Error('Something went wrong'); // ❌

// Don't swallow errors silently
try {
  await riskyOperation();
} catch (error) {
  // Nothing - error lost! ❌
}

// Don't log and throw the same error
catch (error) {
  logError(error); // ❌ Already logged by boundary
  throw error;
}

// Don't hardcode error messages
if (!user) throw new Error('Not found'); // ❌
// Use: throw notFound('User', userId); ✅
```

## Testing Error Handling

### Test Component Errors

```jsx
import { render } from '@testing-library/react';
import { ErrorBoundary } from '@/utils/errorHandler.js';

test('error boundary catches errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(getByText(/something went wrong/i)).toBeInTheDocument();
});
```

### Test Service Errors

```javascript
import { notFound } from '@/utils/AppError.js';

test('service throws notFound for missing user', async () => {
  await expect(
    userService.getUser('nonexistent')
  ).rejects.toThrow(notFound('User', 'nonexistent'));
});
```

## Troubleshooting

### Error not caught by boundary

**Cause:** Error thrown outside React render phase (e.g., in event handler)

**Solution:** Use try-catch in event handlers:

```jsx
const handleClick = async () => {
  try {
    await riskyOperation();
  } catch (error) {
    logError(error);
    setError(error);
  }
};
```

### Errors not logged to file

**Cause:** Electron IPC not available (running in browser)

**Check:**
```javascript
if (window.electronAPI?.logError) {
  // Running in Electron
} else {
  // Running in browser (dev server)
}
```

### Error details not showing

**Cause:** Running in production mode

**Fix:** Error details only show in development (`import.meta.env.DEV`)

## Advanced: Custom Error Handlers

### Add Custom Error Boundary

```jsx
class CustomErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Send to monitoring service
    sendToSentry(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return <CustomErrorUI error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Add Custom Error Logger

```javascript
import { logError as baseLogError } from '@/utils/errorHandler.js';

export function logError(error, context) {
  // Call base logger
  baseLogError(error, context);

  // Add custom logging (e.g., to external service)
  if (window.analytics) {
    window.analytics.trackError(error);
  }
}
```

## Migration Guide

### Updating Existing Code

**Before:**
```javascript
async function getData() {
  const result = await api.get('/data');
  if (!result) {
    throw new Error('Data not found');
  }
  return result;
}
```

**After:**
```javascript
import { notFound, apiError } from '@/utils/AppError.js';

async function getData() {
  try {
    const result = await api.get('/data');
    if (!result) {
      throw notFound('Data');
    }
    return result;
  } catch (error) {
    if (error.isOperational) throw error;
    throw apiError('Data API', error.statusCode, error);
  }
}
```

## See Also

- [winston Logger Documentation](https://github.com/winstonjs/winston)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [MDN: Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
