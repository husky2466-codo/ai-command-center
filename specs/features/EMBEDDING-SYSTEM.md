# Embedding System

**Status**: Not Started
**Priority**: P0 (Critical)
**Estimated Effort**: 3 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite for vector storage

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) - Not directly applicable (backend)

---

## Design Consistency Notes

This feature is primarily backend infrastructure with no direct UI. However:

- **Ollama Status**: In Admin panel, display using status colors:
  - Available: `--status-success` (#22c55e)
  - Model missing: `--status-warning` (#f59e0b)
  - Not running: `--status-error` (#ef4444)
- **Embedding Progress**: Use shared loading spinner during generation
- **Similarity Scores**: Display as percentage with appropriate color coding

---

## Overview

The Embedding System provides vector embeddings for semantic search across AI Command Center. It integrates with Ollama running locally to generate embeddings using the mxbai-embed-large model (1024 dimensions). Embeddings are stored in SQLite and used for similarity search in Memory Lane, Knowledge, and Chat.

## Acceptance Criteria

- [ ] Connect to local Ollama instance for embedding generation
- [ ] Generate 1024-dimensional embeddings using mxbai-embed-large
- [ ] Store embeddings as BLOBs in SQLite
- [ ] Provide cosine similarity calculation
- [ ] Batch embedding generation for performance
- [ ] Graceful fallback when Ollama unavailable
- [ ] Health check for Ollama status

## Tasks

### Section 1: Ollama Integration
- [ ] Create `src/services/EmbeddingService.js`
- [ ] Define Ollama endpoint configuration:
  ```javascript
  const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embed';
  const MODEL = 'mxbai-embed-large';
  const EMBEDDING_DIMENSIONS = 1024;
  ```
- [ ] Implement connection test/health check
- [ ] Handle connection errors gracefully

### Section 2: Single Embedding Generation
- [ ] Implement `generateEmbedding(text)` function
  ```javascript
  async function generateEmbedding(text) {
    const response = await fetch(OLLAMA_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embeddings[0]; // Float32Array
  }
  ```
- [ ] Return Float32Array for storage efficiency
- [ ] Handle API errors with retry logic

### Section 3: Batch Embedding Generation
- [ ] Implement `generateEmbeddings(texts)` function
  - [ ] Send multiple texts in single request
  - [ ] Return array of embeddings
  - [ ] Match order to input texts
- [ ] Implement chunking for large batches
  - [ ] Max 100 texts per request
  - [ ] Process chunks sequentially

### Section 4: Cosine Similarity
- [ ] Implement `cosineSimilarity(a, b)` function
  ```javascript
  function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  ```
- [ ] Optimize for performance (typed arrays)
- [ ] Handle edge cases (zero vectors)

### Section 5: Embedding Storage
- [ ] Define BLOB format for SQLite
  - [ ] Store as binary Float32Array buffer
  - [ ] 1024 floats = 4096 bytes per embedding
- [ ] Implement `embeddingToBlob(embedding)` function
- [ ] Implement `blobToEmbedding(blob)` function

### Section 6: Similarity Search
- [ ] Implement `findSimilar(queryEmbedding, threshold)` function
  - [ ] Load all embeddings from table
  - [ ] Calculate similarity scores
  - [ ] Filter by threshold
  - [ ] Sort by similarity descending
  - [ ] Return top K results
- [ ] Note: For v1, brute force is acceptable (< 10k embeddings)

### Section 7: sqlite-vss Integration (Optional)
- [ ] Attempt to load sqlite-vss extension
- [ ] If available, use for accelerated similarity search
- [ ] Fall back to brute force if unavailable
- [ ] Create virtual tables for vector indices
  ```sql
  CREATE VIRTUAL TABLE memories_vss USING vss0(
    embedding(1024)
  );
  ```

### Section 8: Health Check
- [ ] Implement `checkOllamaHealth()` function
  - [ ] Test connection to Ollama API
  - [ ] Verify mxbai-embed-large model available
  - [ ] Return status object
- [ ] Expose via IPC for status display
- [ ] Cache health status (check every 5 minutes)

### Section 9: Fallback Handling
- [ ] When Ollama unavailable:
  - [ ] Log warning
  - [ ] Skip embedding generation
  - [ ] Store null embedding
  - [ ] Exclude from similarity search
- [ ] Provide "embedding status" in Admin panel

### Section 10: Background Processing
- [ ] Queue embeddings for batch processing
- [ ] Process queue in background
- [ ] Notify when complete
- [ ] Handle app shutdown gracefully

## Technical Details

### Files to Create
- `src/services/EmbeddingService.js` - Core embedding logic

### Files to Modify
- `electron/main.cjs` - Add Ollama health check IPC

### Database Schema
```sql
-- Embedding stored as BLOB in existing tables
-- memories.embedding
-- knowledge_articles.embedding

-- Convert Float32Array to BLOB
const blob = Buffer.from(new Float32Array(embedding).buffer);

-- Convert BLOB back to Float32Array
const embedding = new Float32Array(blob.buffer, blob.byteOffset, blob.length / 4);
```

### IPC Channels
- `embedding:generate` - Generate single embedding
- `embedding:generate-batch` - Generate batch embeddings
- `embedding:similarity` - Calculate similarity
- `embedding:health-check` - Check Ollama status
- `embedding:find-similar` - Search similar items

## Ollama Setup (Prerequisites)

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull embedding model
ollama pull mxbai-embed-large

# Verify
ollama run mxbai-embed-large "test"
```

## Implementation Hints

- mxbai-embed-large is optimized for retrieval tasks
- 1024 dimensions balance quality vs storage
- Typed arrays (Float32Array) are 4x more memory efficient than Number[]
- Consider Web Workers for similarity calculations (CPU-intensive)
- Cache frequently used embeddings
- Batch processing significantly faster than individual calls
- Agent to use: `electron-react-dev`

## Performance Considerations

```
Single embedding: ~50ms
Batch (100 items): ~500ms
Similarity (1000 items, brute force): ~10ms
With sqlite-vss (10000 items): ~5ms
```

## Testing Checklist

- [ ] Single embedding generation returns 1024 floats
- [ ] Batch embedding matches single embedding results
- [ ] Cosine similarity returns values in [-1, 1]
- [ ] BLOB storage/retrieval preserves precision
- [ ] Similarity search returns ranked results
- [ ] Health check detects Ollama availability
- [ ] Fallback handles Ollama unavailability
- [ ] Performance acceptable for typical workloads
- [ ] Memory usage stable during batch processing

---
**Notes**: The embedding system is foundational for Memory Lane's semantic search. Quality embeddings = useful memory retrieval. Start with brute force similarity, optimize with sqlite-vss if needed later.
