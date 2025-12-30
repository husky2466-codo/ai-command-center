/**
 * Test Error Handling
 *
 * This file contains functions to manually test the error handling system.
 * Open the browser console and call these functions to trigger different errors.
 *
 * Usage:
 * 1. Open AI Command Center in dev mode
 * 2. Open browser DevTools (F12)
 * 3. In console, type: window.testErrors.componentError()
 */

import {
  notFound,
  badRequest,
  unauthorized,
  validationError,
  databaseError,
  apiError,
  serviceUnavailable
} from './AppError.js';
import { logError, retry } from './errorHandler.js';

/**
 * Test throwing different types of errors
 */
export const testErrors = {

  /**
   * Test not found error
   */
  notFound: () => {
    throw notFound('User', 'abc-123');
  },

  /**
   * Test bad request error
   */
  badRequest: () => {
    throw badRequest('Invalid email format', { field: 'email', value: 'notanemail' });
  },

  /**
   * Test validation error
   */
  validation: () => {
    throw validationError('Form validation failed', {
      email: 'Invalid email format',
      password: 'Password too short (min 8 characters)'
    });
  },

  /**
   * Test unauthorized error
   */
  unauthorized: () => {
    throw unauthorized('Please log in to continue');
  },

  /**
   * Test database error
   */
  database: () => {
    throw databaseError('insert', 'users', new Error('UNIQUE constraint failed'));
  },

  /**
   * Test API error
   */
  api: () => {
    throw apiError('OpenAI API', 429, new Error('Rate limit exceeded'));
  },

  /**
   * Test service unavailable
   */
  serviceUnavailable: () => {
    throw serviceUnavailable('Vector Search', {
      reason: 'sqlite-vss extension not loaded'
    });
  },

  /**
   * Test unhandled promise rejection
   */
  async promiseRejection() {
    // This should be caught by global error handler
    Promise.reject(new Error('Unhandled promise rejection test'));
    console.log('Promise rejection thrown - check global error handler');
  },

  /**
   * Test component error (to trigger ErrorBoundary)
   * Note: This needs to be called from within a React component render
   */
  componentError: () => {
    // This will trigger React's error boundary
    throw new Error('Component render error test');
  },

  /**
   * Test error logging
   */
  logging: () => {
    const testError = notFound('TestResource', '12345');
    logError(testError, {
      component: 'TestComponent',
      action: 'testAction',
      userId: 'test-user'
    });
    console.log('Error logged - check console and log files');
  },

  /**
   * Test retry mechanism
   */
  async retry() {
    let attempts = 0;

    try {
      const result = await retry(
        async () => {
          attempts++;
          console.log(`Attempt ${attempts}`);

          if (attempts < 3) {
            throw new Error('Temporary failure');
          }

          return 'Success!';
        },
        {
          maxAttempts: 3,
          delay: 500,
          backoff: 2,
          onRetry: (error, attempt, waitTime) => {
            console.log(`Retry ${attempt} after ${waitTime}ms: ${error.message}`);
          }
        }
      );

      console.log('Retry succeeded:', result);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }
};

/**
 * Test React component that throws an error
 * Import and use this in a route to test ErrorBoundary
 */
export function TestErrorComponent() {
  // Trigger error on first render
  if (Math.random() > -1) {
    throw new Error('Test component error - ErrorBoundary should catch this');
  }

  return <div>This should never render</div>;
}

/**
 * Test async error in component
 */
export function TestAsyncErrorComponent() {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function causeError() {
      try {
        // Simulate async operation that fails
        await new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Async operation failed')), 1000);
        });
      } catch (err) {
        logError(err, { component: 'TestAsyncErrorComponent' });
        setError(err);
      }
    }

    causeError();
  }, []);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>Loading...</div>;
}

// Expose to window for easy testing
if (typeof window !== 'undefined') {
  window.testErrors = testErrors;
  console.log('Error testing functions available at window.testErrors');
  console.log('Available tests:');
  console.log('  - window.testErrors.notFound()');
  console.log('  - window.testErrors.badRequest()');
  console.log('  - window.testErrors.validation()');
  console.log('  - window.testErrors.unauthorized()');
  console.log('  - window.testErrors.database()');
  console.log('  - window.testErrors.api()');
  console.log('  - window.testErrors.serviceUnavailable()');
  console.log('  - window.testErrors.promiseRejection()');
  console.log('  - window.testErrors.logging()');
  console.log('  - window.testErrors.retry()');
}

export default testErrors;
