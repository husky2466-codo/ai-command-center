/**
 * ExampleErrorHandling.js
 *
 * This file demonstrates proper error handling patterns in AI Command Center.
 * Use these examples as templates when creating new services.
 */

import { dataService } from './DataService.js';
import {
  notFound,
  badRequest,
  validationError,
  databaseError,
  apiError
} from '../utils/AppError.js';

/**
 * Example Service showing error handling patterns
 */
class ExampleService {

  // ============================================================================
  // PATTERN 1: Simple CRUD with validation
  // ============================================================================

  async createItem(data) {
    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw validationError('Name is required', { field: 'name' });
    }

    if (data.name.length > 100) {
      throw validationError('Name is too long (max 100 characters)', {
        field: 'name',
        maxLength: 100,
        actualLength: data.name.length
      });
    }

    try {
      const id = crypto.randomUUID();
      await dataService.run(
        'INSERT INTO items (id, name, description) VALUES (?, ?, ?)',
        [id, data.name, data.description || null]
      );

      return await this.getItem(id);
    } catch (error) {
      // Check if it's already an operational error
      if (error.isOperational) {
        throw error;
      }

      // Wrap database errors
      throw databaseError('create item', 'items', error);
    }
  }

  async getItem(id) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw badRequest('Invalid item ID format', { id });
    }

    try {
      const item = await dataService.get(
        'SELECT * FROM items WHERE id = ?',
        [id]
      );

      if (!item) {
        throw notFound('Item', id);
      }

      return item;
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw databaseError('get item', 'items', error);
    }
  }

  // ============================================================================
  // PATTERN 2: External API calls
  // ============================================================================

  async fetchExternalData(apiKey, endpoint) {
    // Validate required parameters
    if (!apiKey) {
      throw badRequest('API key is required', { param: 'apiKey' });
    }

    try {
      const response = await fetch(`https://api.example.com/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw apiError(
          'Example API',
          response.status,
          new Error(response.statusText)
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw apiError('Example API', 503, new Error('Network error'));
      }

      // Already wrapped errors
      if (error.isOperational) {
        throw error;
      }

      // Unknown errors
      throw apiError('Example API', 500, error);
    }
  }

  // ============================================================================
  // PATTERN 3: File operations
  // ============================================================================

  async saveToFile(filePath, content) {
    try {
      // Check if electron API is available
      if (!window.electronAPI) {
        throw new Error('File operations not available in browser mode');
      }

      const result = await window.electronAPI.writeFile(filePath, content);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { path: filePath, size: content.length };
    } catch (error) {
      // Use fileSystemError from AppError
      const { fileSystemError } = await import('../utils/AppError.js');
      throw fileSystemError('write', filePath, error);
    }
  }

  // ============================================================================
  // PATTERN 4: Complex operations with multiple steps
  // ============================================================================

  async processComplexOperation(itemId) {
    let transaction = null;

    try {
      // Step 1: Fetch item
      const item = await this.getItem(itemId); // Can throw notFound

      // Step 2: Validate item state
      if (item.status === 'archived') {
        throw badRequest('Cannot process archived items', {
          itemId,
          status: item.status
        });
      }

      // Step 3: Update in transaction
      transaction = await dataService.transaction([
        {
          type: 'run',
          sql: 'UPDATE items SET status = ? WHERE id = ?',
          params: ['processing', itemId]
        },
        {
          type: 'run',
          sql: 'INSERT INTO item_logs (item_id, action, timestamp) VALUES (?, ?, ?)',
          params: [itemId, 'processing_started', new Date().toISOString()]
        }
      ]);

      // Step 4: External processing
      await this.fetchExternalData(process.env.API_KEY, `process/${itemId}`);

      // Step 5: Mark complete
      await dataService.run(
        'UPDATE items SET status = ?, processed_at = ? WHERE id = ?',
        ['completed', new Date().toISOString(), itemId]
      );

      return await this.getItem(itemId);
    } catch (error) {
      // Rollback is automatic with transactions, but log the failure
      if (transaction) {
        console.error('Transaction failed, rolled back:', error);
      }

      // Re-throw operational errors
      if (error.isOperational) {
        throw error;
      }

      // Wrap unknown errors
      throw databaseError('process item', 'items', error);
    }
  }

  // ============================================================================
  // PATTERN 5: Safe operations (don't throw, return error)
  // ============================================================================

  async safeGetItem(id) {
    try {
      return {
        success: true,
        data: await this.getItem(id)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  // ============================================================================
  // PATTERN 6: Batch operations with partial failures
  // ============================================================================

  async batchCreateItems(items) {
    const results = {
      successful: [],
      failed: []
    };

    for (const item of items) {
      try {
        const created = await this.createItem(item);
        results.successful.push(created);
      } catch (error) {
        results.failed.push({
          item,
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
          }
        });
      }
    }

    return results;
  }
}

// Export singleton
export const exampleService = new ExampleService();

/**
 * USAGE EXAMPLES IN REACT COMPONENTS
 */

/*
// Example 1: Basic error handling in component
import { logError } from '@/utils/errorHandler.js';

function ItemDetail({ itemId }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      try {
        const data = await exampleService.getItem(itemId);
        setItem(data);
        setError(null);
      } catch (err) {
        logError(err, { component: 'ItemDetail', itemId });
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!item) return <NotFound />;

  return <div>{item.name}</div>;
}

// Example 2: Using try-catch helper
import { tryCatch } from '@/utils/errorHandler.js';

async function handleSubmit(formData) {
  const [error, result] = await tryCatch(
    exampleService.createItem(formData)
  );

  if (error) {
    toast.error(error.message);
    return;
  }

  toast.success('Item created!');
  navigate(`/items/${result.id}`);
}

// Example 3: Safe operation (no exception)
async function loadItems() {
  const result = await exampleService.safeGetItem(itemId);

  if (!result.success) {
    showNotification('Failed to load item: ' + result.error);
    return;
  }

  setItem(result.data);
}

// Example 4: Batch operations with partial failures
async function importItems(csvData) {
  const items = parseCSV(csvData);
  const results = await exampleService.batchCreateItems(items);

  if (results.failed.length > 0) {
    showWarning(`Imported ${results.successful.length} items, ${results.failed.length} failed`);
  } else {
    showSuccess(`Successfully imported ${results.successful.length} items`);
  }
}
*/
