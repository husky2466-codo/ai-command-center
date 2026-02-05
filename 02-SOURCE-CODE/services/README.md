# Service Layer

The service layer provides domain-specific business logic and database operations for AI Command Center. All services follow a consistent architecture built on `BaseService` and `DataService`.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Components                        │
│                    (UI Layer - src/components)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Domain Services                         │
│  memoryService | sessionService | entityService | ...       │
│                    (Business Logic)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   BaseService    │  │  embeddingService│
        │  (CRUD Pattern)  │  │  (Ollama API)    │
        └──────────────────┘  └──────────────────┘
                    │
                    ▼
        ┌──────────────────┐
        │   DataService    │
        │  (DB Operations) │
        └──────────────────┘
                    │
                    ▼
        ┌──────────────────┐
        │  Electron IPC    │
        │   (main.cjs)     │
        └──────────────────┘
                    │
                    ▼
        ┌──────────────────┐
        │  SQLite Database │
        │  (+ sqlite-vss)  │
        └──────────────────┘
```

## Core Services

### BaseService.js

Abstract base class providing standard CRUD operations for all database tables.

**Methods:**
- `getAll()` - Get all records
- `getById(id)` - Get single record
- `create(data)` - Create new record
- `update(id, data)` - Update record
- `delete(id)` - Delete record
- `query(whereClause, params)` - Custom queries
- `count(whereClause, params)` - Count records

**Usage:**
```javascript
class MyService extends BaseService {
  constructor() {
    super('my_table');
  }
}
```

### DataService.js

Low-level database access layer providing direct SQL operations.

**Methods:**
- `query(sql, params)` - SELECT queries
- `run(sql, params)` - INSERT/UPDATE/DELETE
- `get(sql, params)` - Single row SELECT
- `transaction(operations)` - Multiple operations
- `checkHealth()` - Database health check
- `vectorSearch(table, embedding, limit)` - Vector similarity search

**Caching:**
- `setCache(key, value, ttl)` - Cache a value
- `getCache(key)` - Get cached value
- `clearCache(key)` - Clear cache

**Usage:**
```javascript
import { dataService } from './DataService.js';

const users = await dataService.query('SELECT * FROM users WHERE active = ?', [true]);
```

## Domain Services

### memoryService.js

Manages the `memories` table - extracted memories from Claude Code sessions.

**Key Methods:**
- `createMemory(data)` - Create with validation
- `getByType(type, limit)` - Filter by memory type
- `getHighConfidence(threshold, limit)` - High-confidence memories
- `getByDateRange(start, end)` - Date range queries
- `search(term)` - Full-text search
- `updateEmbedding(id, embedding)` - Update embedding
- `incrementRecallCount(id)` - Track usage
- `addPositiveFeedback(id)` / `addNegativeFeedback(id)` - Feedback
- `getStatistics()` - Comprehensive stats
- `getMostRecalled(limit)` - Most used memories
- `getBestRated(limit)` - Highest rated memories

**Memory Types:**
- High priority: `correction`, `decision`, `commitment`
- Medium priority: `insight`, `learning`, `confidence`
- Lower priority: `pattern_seed`, `cross_agent`, `workflow_note`, `gap`

**Usage:**
```javascript
import { memoryService } from './services';

// Create a memory
const memory = await memoryService.createMemory({
  type: 'decision',
  title: 'Use Vite for bundling',
  content: 'User decided to use Vite instead of Webpack for faster builds',
  category: 'build-tools',
  confidence_score: 0.9,
  reasoning: 'Explicit user decision with clear reasoning'
});

// Get high-confidence memories
const important = await memoryService.getHighConfidence(0.8);

// Search
const results = await memoryService.search('database');
```

### embeddingService.js

Integrates with Ollama for vector embedding generation (1024 dimensions).

**Configuration:**
- Model: `mxbai-embed-large`
- Dimensions: `1024`
- Endpoint: `http://localhost:11434/api/embed`

**Key Methods:**
- `generateEmbedding(text)` - Single embedding
- `generateBatchEmbeddings(texts)` - Batch processing
- `checkOllamaStatus()` - Health check
- `cosineSimilarity(a, b)` - Similarity calculation
- `embeddingToBlob(embedding)` - Convert to BLOB
- `blobToEmbedding(blob)` - Convert from BLOB
- `findSimilar(query, candidates, threshold, limit)` - Brute-force search

**Wave 3 Note:**
Currently returns mock embeddings (deterministic hash-based vectors). Full Ollama integration will be implemented in Wave 4.

**Usage:**
```javascript
import { embeddingService } from './services';

// Check Ollama status
const status = await embeddingService.checkOllamaStatus();
console.log('Ollama available:', status.available);

// Generate embedding (returns mock for now)
const embedding = await embeddingService.generateEmbedding('Hello world');
console.log('Dimensions:', embedding.length); // 1024

// Calculate similarity
const similarity = embeddingService.cosineSimilarity(embedding1, embedding2);

// Store in database
const blob = embeddingService.embeddingToBlob(embedding);
await memoryService.updateEmbedding(memoryId, blob);

// Retrieve from database
const retrieved = embeddingService.blobToEmbedding(memory.embedding);
```

### sessionService.js

Manages the `chat_sessions` table - Claude Code session tracking.

**Key Methods:**
- `createSession(data)` - Create with validation
- `getByClaudeSessionId(id)` - Get by Claude session ID
- `updateMessageCount(id, count)` - Update message count
- `incrementMessageCount(id, increment)` - Increment messages
- `addTokens(id, tokens)` - Add token count
- `updateLastMessage(id, message)` - Update last message
- `setImportance(id, level)` - Set importance (low/medium/high)
- `getByImportance(level, limit)` - Filter by importance
- `getByWorkType(type)` - Filter by work type
- `getRecent(days, limit)` - Recent sessions
- `getLinkedMemories(id)` - Get session's memories
- `getSessionRecalls(id)` - Get recalled memories
- `linkFiles(id, paths)` - Link touched files
- `getStatistics()` - Session statistics

**Usage:**
```javascript
import { sessionService } from './services';

// Create session
const session = await sessionService.createSession({
  claude_session_id: 'abc123',
  title: 'Build login page',
  importance: 'high',
  work_type: 'feature'
});

// Track activity
await sessionService.incrementMessageCount(session.id, 1);
await sessionService.addTokens(session.id, 500);

// Get high importance sessions
const important = await sessionService.getByImportance('high');
```

### entityService.js

Manages the `entities` and `entity_occurrences` tables - entity resolution and tracking.

**Entity Types:**
- `person` - People mentioned in conversations
- `project` - Software projects
- `business` - Companies/organizations
- `location` - Physical locations

**Key Methods:**
- `createEntity(data)` - Create with validation
- `generateSlug(name)` - Generate URL-safe slug
- `getBySlug(slug)` - Get by slug
- `getByType(type)` - Filter by type
- `findByName(name, type)` - Search by name or alias
- `findOrCreate(info)` - Find or create (deduplication)
- `addAlias(id, alias)` - Add alternative name
- `linkToContact(id, contactId)` - Link to contact
- `linkToProject(id, projectId)` - Link to project
- `trackOccurrence(data)` - Track mention in memory
- `getOccurrences(entityId)` - Get all mentions
- `getEntitiesForMemory(memoryId)` - Get memory's entities
- `mergeEntities(keepId, mergeId)` - Merge duplicates
- `getStatistics()` - Entity statistics

**Usage:**
```javascript
import { entityService } from './services';

// Find or create entity
const project = await entityService.findOrCreate({
  type: 'project',
  raw: 'ai-command-center',
  canonical_name: 'AI Command Center'
});

// Track occurrence in memory
await entityService.trackOccurrence({
  entity_id: project.id,
  memory_id: memory.id,
  context: 'User was working on AI Command Center features'
});

// Get all mentions of an entity
const occurrences = await entityService.getOccurrences(project.id);

// Merge duplicates
await entityService.mergeEntities(canonicalId, duplicateId);
```

## Service Initialization

Initialize all services when the app starts:

```javascript
import { initializeServices } from './services';

// In your app initialization
const status = await initializeServices();

console.log('Database healthy:', status.database.healthy);
console.log('Vector search available:', status.database.vectorSearchAvailable);
console.log('Ollama available:', status.embedding.available);
```

## Error Handling

All services throw errors on failure. Use try-catch:

```javascript
try {
  const memory = await memoryService.createMemory(data);
  console.log('Created:', memory);
} catch (error) {
  console.error('Failed to create memory:', error.message);
}
```

## Best Practices

1. **Use Services, Not Direct Database Access**
   - Always use domain services instead of calling `dataService` directly
   - Services provide validation, business logic, and consistency

2. **Transaction Support**
   - Use `dataService.transaction()` for multi-step operations
   - All operations in a transaction succeed or fail together

3. **Caching**
   - Use `dataService` caching for expensive queries
   - Default TTL: 5 minutes
   - Clear cache when data changes

4. **Embeddings**
   - Always check Ollama status before batch operations
   - Use batch generation for multiple texts
   - Store as BLOB using `embeddingToBlob()`

5. **Entity Resolution**
   - Use `findOrCreate()` to avoid duplicates
   - Add aliases for alternative names
   - Track occurrences for relationship building

6. **Statistics**
   - Use built-in `getStatistics()` methods
   - Cache statistics for dashboards
   - Update periodically, not on every render

## Development Workflow

### Adding a New Service

1. Create `src/services/myService.js`
2. Extend `BaseService` or create standalone
3. Add domain-specific methods
4. Export singleton instance
5. Add to `src/services/index.js`

```javascript
// myService.js
import { BaseService } from './BaseService.js';

class MyService extends BaseService {
  constructor() {
    super('my_table');
  }

  async customMethod() {
    // Domain-specific logic
  }
}

export const myService = new MyService();
```

### Testing Services

```javascript
// Test database connection
import { dataService } from './services';
const health = await dataService.checkHealth();

// Test service methods
import { memoryService } from './services';
const count = await memoryService.count();
console.log('Total memories:', count);
```

## File Structure

```
src/services/
├── README.md              # This file
├── index.js               # Service exports
├── BaseService.js         # Abstract CRUD base
├── DataService.js         # Low-level DB access
├── memoryService.js       # Memory management
├── embeddingService.js    # Ollama integration
├── sessionService.js      # Session tracking
└── entityService.js       # Entity resolution
```

## Future Enhancements

**Wave 4:**
- Full Ollama integration in `embeddingService`
- sqlite-vss acceleration for vector search
- Background embedding queue
- Real-time memory extraction

**Wave 5+:**
- Additional domain services (contacts, projects, knowledge, etc.)
- Service-to-service communication patterns
- Event system for cross-service notifications
- Performance monitoring and metrics

## Related Documentation

- [DATABASE-LAYER.md](../../specs/features/DATABASE-LAYER.md) - Database schema
- [MEMORY-EXTRACTION.md](../../specs/features/MEMORY-EXTRACTION.md) - Memory extraction system
- [EMBEDDING-SYSTEM.md](../../specs/features/EMBEDDING-SYSTEM.md) - Embedding configuration
- [AI-COMMAND-CENTER-PLAN.md](../../docs/planning/AI-COMMAND-CENTER-PLAN.md) - Complete system plan

---

**Last Updated:** Wave 3 - Service Layer Implementation
**Status:** Complete (Mock embeddings until Wave 4)
