# Error Handling Migration Guide

This guide helps you migrate existing services to use the new centralized error handling system.

## Quick Start

1. Import error factory functions
2. Replace `throw new Error()` with appropriate factory
3. Add try-catch blocks around database calls
4. Use `logError()` in components

## Step-by-Step Migration

### Step 1: Import AppError Functions

Add this to the top of your service file:

```javascript
import {
  notFound,
  badRequest,
  validationError,
  databaseError
} from '../utils/AppError.js';
```

### Step 2: Identify Error Patterns

Look for these patterns in your existing code:

#### Pattern A: Simple Error Throws

**Before:**
```javascript
if (!user) {
  throw new Error('User not found');
}
```

**After:**
```javascript
if (!user) {
  throw notFound('User', userId);
}
```

#### Pattern B: Validation Errors

**Before:**
```javascript
if (!email || !isValidEmail(email)) {
  throw new Error('Invalid email');
}
```

**After:**
```javascript
if (!email) {
  throw validationError('Email is required', { field: 'email' });
}

if (!isValidEmail(email)) {
  throw validationError('Invalid email format', { field: 'email', value: email });
}
```

#### Pattern C: Database Operations

**Before:**
```javascript
async getUser(id) {
  const user = await dataService.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}
```

**After:**
```javascript
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

    // Wrap unexpected errors
    throw databaseError('get user', 'users', error);
  }
}
```

## Service-by-Service Migration

### ProjectService.js

**Current Issues:**

Line 85:
```javascript
throw new Error('Cannot delete space with existing projects');
```

Line 381:
```javascript
if (!task) throw new Error('Task not found');
```

Line 450:
```javascript
if (!task) throw new Error('Task not found');
```

Line 461:
```javascript
if (!task) throw new Error('Task not found');
```

**Migration:**

```javascript
// Add imports at top
import {
  notFound,
  badRequest,
  conflict,
  databaseError
} from '../utils/AppError.js';

// Line 85 - change to:
if (projects[0].count > 0) {
  throw conflict('Cannot delete space with existing projects', {
    spaceId: id,
    projectCount: projects[0].count
  });
}

// Lines 381, 450, 461 - change to:
if (!task) {
  throw notFound('Task', id);
}

// Wrap database operations:
async createProject(data) {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    await dataService.run(
      `INSERT INTO projects (...) VALUES (...)`,
      [...]
    );

    return await this.getProject(id);
  } catch (error) {
    if (error.isOperational) throw error;
    throw databaseError('create project', 'projects', error);
  }
}
```

### ReminderService.js

**Common Pattern:**

```javascript
import { notFound, databaseError, validationError } from '../utils/AppError.js';

class ReminderService {
  async getReminder(id) {
    try {
      const reminder = await dataService.get(
        'SELECT * FROM reminders WHERE id = ?',
        [id]
      );

      if (!reminder) {
        throw notFound('Reminder', id);
      }

      return reminder;
    } catch (error) {
      if (error.isOperational) throw error;
      throw databaseError('get reminder', 'reminders', error);
    }
  }

  async createReminder(data) {
    // Validate
    if (!data.title) {
      throw validationError('Title is required', { field: 'title' });
    }

    if (!data.due_at) {
      throw validationError('Due date is required', { field: 'due_at' });
    }

    try {
      const id = uuidv4();
      // ... insert logic ...
      return await this.getReminder(id);
    } catch (error) {
      if (error.isOperational) throw error;
      throw databaseError('create reminder', 'reminders', error);
    }
  }
}
```

### RelationshipService.js

**Pattern for relationship-specific errors:**

```javascript
import { notFound, conflict, databaseError } from '../utils/AppError.js';

async addRelationship(personAId, personBId, type) {
  // Check if relationship already exists
  const existing = await this.findRelationship(personAId, personBId);

  if (existing) {
    throw conflict('Relationship already exists', {
      personAId,
      personBId,
      existingType: existing.type
    });
  }

  try {
    // Create relationship...
  } catch (error) {
    if (error.isOperational) throw error;
    throw databaseError('add relationship', 'relationships', error);
  }
}
```

### KnowledgeService.js

**Pattern for full-text search errors:**

```javascript
import { notFound, badRequest, databaseError } from '../utils/AppError.js';

async searchArticles(query, limit = 20) {
  // Validate input
  if (!query || query.trim().length === 0) {
    throw badRequest('Search query cannot be empty', { query });
  }

  if (query.length < 3) {
    throw badRequest('Search query too short (minimum 3 characters)', {
      query,
      minLength: 3
    });
  }

  try {
    const results = await dataService.query(
      'SELECT * FROM knowledge_articles WHERE content LIKE ? LIMIT ?',
      [`%${query}%`, limit]
    );

    return results;
  } catch (error) {
    if (error.isOperational) throw error;
    throw databaseError('search articles', 'knowledge_articles', error);
  }
}
```

### ChatService.js

**Pattern for API integration:**

```javascript
import { apiError, serviceUnavailable, databaseError } from '../utils/AppError.js';

async sendMessage(conversationId, content, apiKey) {
  try {
    // Call AI API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ /* ... */ })
    });

    if (!response.ok) {
      if (response.status === 503) {
        throw serviceUnavailable('Anthropic API', {
          status: response.status,
          statusText: response.statusText
        });
      }

      throw apiError('Anthropic API', response.status, new Error(response.statusText));
    }

    const data = await response.json();

    // Save to database
    await dataService.run(
      'INSERT INTO messages (...) VALUES (...)',
      [...]
    );

    return data;
  } catch (error) {
    if (error.isOperational) throw error;

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw serviceUnavailable('Anthropic API', { originalError: error.message });
    }

    throw apiError('Anthropic API', 500, error);
  }
}
```

## Component Migration

### Before: Generic Error Handling

```jsx
function ProjectDetail({ projectId }) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await projectService.getProject(projectId);
        setProject(data);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError(err.message);
      }
    }
    load();
  }, [projectId]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  // ...
}
```

### After: Structured Error Handling

```jsx
import { logError, formatErrorForDisplay } from '@/utils/errorHandler.js';

function ProjectDetail({ projectId }) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await projectService.getProject(projectId);
        setProject(data);
        setError(null);
      } catch (err) {
        // Log with context
        logError(err, {
          component: 'ProjectDetail',
          projectId,
          action: 'load'
        });

        setError(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    const formattedError = formatErrorForDisplay(error);

    // Show user-friendly message based on error code
    if (error.code === 'NOT_FOUND') {
      return (
        <div className="error-state">
          <p>Project not found</p>
          <button onClick={() => navigate('/projects')}>Back to Projects</button>
        </div>
      );
    }

    return (
      <div className="error-state">
        <p>{formattedError.message}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  // ...
}
```

## Testing Your Migration

### 1. Test Each Error Type

```javascript
import { testErrors } from '@/utils/testErrorHandling.js';

// In browser console
window.testErrors.notFound();        // Should show "Not Found" UI
window.testErrors.validation();      // Should show validation errors
window.testErrors.database();        // Should log database error
```

### 2. Test Component Errors

```jsx
// Add to a test route
import { TestErrorComponent } from '@/utils/testErrorHandling.js';

<Route path="/test-error" element={<TestErrorComponent />} />
```

Navigate to `/test-error` and verify ErrorBoundary catches it.

### 3. Test Logging

```javascript
// Check logs
window.testErrors.logging();

// Check: %APPDATA%/ai-command-center/logs/error-YYYY-MM-DD.log
```

## Common Mistakes

### ❌ Mistake 1: Not Re-throwing AppErrors

```javascript
// WRONG
try {
  const user = await userService.getUser(id); // Throws notFound
} catch (error) {
  throw databaseError('get user', 'users', error); // Double-wrapped!
}
```

```javascript
// CORRECT
try {
  const user = await userService.getUser(id);
} catch (error) {
  if (error.isOperational) {
    throw error; // Already an AppError, don't wrap
  }
  throw databaseError('get user', 'users', error);
}
```

### ❌ Mistake 2: Logging Before Throwing

```javascript
// WRONG - logged twice (here and in global handler)
catch (error) {
  logError(error);
  throw error;
}
```

```javascript
// CORRECT - only log if you're handling it
catch (error) {
  logError(error);
  setError(error); // Handled, don't re-throw
}

// OR

catch (error) {
  throw error; // Will be logged by caller or global handler
}
```

### ❌ Mistake 3: Generic Error Messages

```javascript
// WRONG
throw new Error('Invalid input');
```

```javascript
// CORRECT
throw validationError('Email is required', { field: 'email' });
```

## Checklist

Use this checklist for each service you migrate:

- [ ] Import error factory functions
- [ ] Replace all `throw new Error()` with appropriate factories
- [ ] Add try-catch to all database operations
- [ ] Add input validation with `validationError`
- [ ] Check for duplicate resources with `conflict`
- [ ] Wrap external API calls with `apiError`
- [ ] Check for missing resources with `notFound`
- [ ] Test each error path manually
- [ ] Verify errors are logged correctly
- [ ] Update tests to expect new error types

## Getting Help

If you're unsure which error type to use:

1. Check `docs/ERROR-HANDLING.md` for error code reference
2. Look at `src/services/ExampleErrorHandling.js` for patterns
3. Review existing usage in `DataService.js`
4. Ask in the dev channel with example code

## Next Steps After Migration

1. **Update Tests**: Ensure unit tests expect the new error types
2. **Add Toast Notifications**: Show user-friendly messages for errors
3. **Monitor Logs**: Check error logs for patterns
4. **Iterate**: Refine error messages based on user feedback

---

**Happy migrating!** The error handling system will make debugging much easier and provide better UX for users.
