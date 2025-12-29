# Dual Retrieval System

**Status**: Not Started
**Priority**: P0 (Critical)
**Estimated Effort**: 4 days
**Dependencies**:
- `specs/features/EMBEDDING-SYSTEM.md` - Embeddings for semantic search
- `specs/features/MEMORY-EXTRACTION.md` - Memories to retrieve
- `specs/features/DATABASE-LAYER.md` - SQLite queries

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) - UI elements reference Chat and Memory Lane specs

---

## Design Consistency Notes

This feature is primarily backend but surfaces in Chat's Memory Lane Bar:

- **Memory Lane Bar**: Uses gradient background (cyan `#06b6d4` to purple `#8b5cf6`)
- **Retrieval Badges**: Display count badges using appropriate module colors
- **Score Visualization**: Relevance scores as subtle bar or percentage
- **Feedback Buttons**: Thumbs up/down using `--status-success` and `--status-error`
- **Retrieved Memory Cards**: Follow Memory Lane card design patterns

---

## Overview

The Dual Retrieval System combines two complementary search strategies: entity-based search (exact matches on people, projects, etc.) and semantic search (embedding similarity). Results are merged and re-ranked using a sophisticated scoring algorithm that considers recency, confidence, observation count, and user feedback.

## Acceptance Criteria

- [ ] Entity-based retrieval finds memories by exact entity match
- [ ] Semantic retrieval finds memories by embedding similarity
- [ ] Results merged and deduplicated
- [ ] Re-ranking algorithm considers multiple factors
- [ ] Query-aware type boosting (e.g., "mistake" boosts corrections)
- [ ] Top K results returned with scores
- [ ] Fast retrieval (< 500ms for typical queries)
- [ ] Feedback loop affects future rankings

## Retrieval Flow

```
Query: "What did we decide about the database schema?"
                    │
    ┌───────────────┴───────────────┐
    │                               │
    ▼                               ▼
┌─────────────┐             ┌─────────────┐
│   ENTITY    │             │  SEMANTIC   │
│   SEARCH    │             │   SEARCH    │
│             │             │             │
│ "database"  │             │ Embedding   │
│ "schema"    │             │ similarity  │
└─────────────┘             └─────────────┘
    │                               │
    └───────────────┬───────────────┘
                    │
                    ▼
            ┌─────────────┐
            │   MERGE &   │
            │ DEDUPLICATE │
            └─────────────┘
                    │
                    ▼
            ┌─────────────┐
            │  RE-RANK    │
            │             │
            │ • Similarity│
            │ • Recency   │
            │ • Confidence│
            │ • Feedback  │
            │ • Type boost│
            └─────────────┘
                    │
                    ▼
            ┌─────────────┐
            │  TOP K      │
            │  RESULTS    │
            └─────────────┘
```

## Tasks

### Section 1: Entity Search
- [ ] Create `src/utils/memoryRetrieval.js`
- [ ] Implement `entitySearch(query)` function
  - [ ] Extract potential entities from query
  - [ ] Search entities table for matches
  - [ ] Find memories linked to matched entities
  - [ ] Return with entity match scores

### Section 2: Semantic Search
- [ ] Implement `semanticSearch(query)` function
  - [ ] Generate query embedding
  - [ ] Load memory embeddings from database
  - [ ] Calculate cosine similarity for each
  - [ ] Filter by minimum threshold (0.4)
  - [ ] Return with similarity scores

### Section 3: Merge and Deduplicate
- [ ] Implement `mergeResults(entityResults, semanticResults)` function
  - [ ] Combine result sets
  - [ ] Deduplicate by memory ID
  - [ ] Keep highest score for duplicates
  - [ ] Track source (entity/semantic/both)

### Section 4: Re-Ranking Algorithm
- [ ] Implement `calculateFinalScore()` function
  ```javascript
  function calculateFinalScore(memory, similarity, query, feedbackHistory) {
    const weights = {
      vectorSimilarity: 0.60,
      recency: 0.10,
      confidence: 0.15,
      observationCount: 0.10,
      typeBoost: 0.05
    };

    // Base score from vector similarity
    let score = similarity * weights.vectorSimilarity;

    // Recency decay (4 weeks half-life)
    const daysSince = daysBetween(memory.last_observed_at, new Date());
    const recencyScore = Math.exp(-daysSince / 28);
    score += recencyScore * weights.recency;

    // Confidence score
    score += memory.confidence_score * weights.confidence;

    // Observation count (capped at 10)
    const obsScore = Math.min(memory.times_observed / 10, 1);
    score += obsScore * weights.observationCount;

    // Type boost for high-priority types
    if (['correction', 'decision', 'commitment'].includes(memory.type)) {
      score += weights.typeBoost;
    }

    // Query-aware type boosting (+15%)
    score = applyQueryTypeBoost(score, query, memory.type);

    // Feedback adjustment (+/- 5% per vote)
    const netFeedback = memory.positive_feedback - memory.negative_feedback;
    score += netFeedback * 0.05;

    return Math.min(Math.max(score, 0), 1);
  }
  ```

### Section 5: Query-Aware Type Boosting
- [ ] Implement keyword-to-type mapping
  ```javascript
  const typeBoostKeywords = {
    'mistake|wrong|error': ['correction', 'gap'],
    'decided|chose|decision': ['decision'],
    'always|usually|prefer': ['commitment', 'pattern_seed'],
    'learned|realized': ['learning', 'insight']
  };
  ```
- [ ] Apply +15% boost when query matches keyword pattern
- [ ] Boost corresponding memory types

### Section 6: Top K Selection
- [ ] Implement `getTopResults(results, k)` function
  - [ ] Sort by final score descending
  - [ ] Return top K items
  - [ ] Include score metadata

### Section 7: Retrieval Service
- [ ] Create main retrieval function:
  ```javascript
  async function retrieveMemories(query, options = {}) {
    const {
      limit = 10,
      entityThreshold = 0.5,
      semanticThreshold = 0.4,
      includeMetadata = true
    } = options;

    // Parallel searches
    const [entityResults, semanticResults] = await Promise.all([
      entitySearch(query, entityThreshold),
      semanticSearch(query, semanticThreshold)
    ]);

    // Merge and dedupe
    const merged = mergeResults(entityResults, semanticResults);

    // Re-rank
    const ranked = merged.map(m => ({
      ...m,
      finalScore: calculateFinalScore(m, m.similarity, query)
    }));

    // Sort and limit
    return getTopResults(ranked, limit);
  }
  ```

### Section 8: Recall Logging
- [ ] Log each retrieval to session_recalls table
  - [ ] Query text
  - [ ] Memory IDs returned
  - [ ] Similarity scores
  - [ ] Final ranks
- [ ] Track for feedback analysis

### Section 9: Feedback Integration
- [ ] Create `submitFeedback(memoryId, sessionId, type)` function
  - [ ] Record in memory_feedback table
  - [ ] Update memory positive/negative counts
  - [ ] Recalculate memory quality over time

### Section 10: Performance Optimization
- [ ] Cache frequent queries (5-minute TTL)
- [ ] Pre-compute entity index
- [ ] Batch embedding comparisons
- [ ] Profile and optimize hot paths

## Technical Details

### Files to Create
- `src/utils/memoryRetrieval.js` - Core retrieval logic
- `src/hooks/useMemoryRetrieval.js` - React hook for retrieval

### Files to Modify
- `src/services/MemoryService.js` - Integrate retrieval
- `src/components/chat/ChatApp.jsx` - Use for memory injection

### Database Queries
```sql
-- Entity search
SELECT m.*
FROM memories m
WHERE m.related_entities LIKE '%"' || ? || '"%';

-- Get memories with embeddings
SELECT id, embedding, type, confidence_score,
       times_observed, positive_feedback, negative_feedback,
       last_observed_at
FROM memories
WHERE embedding IS NOT NULL;

-- Log recall
INSERT INTO session_recalls (
    id, session_id, memory_id, query_text,
    similarity_score, final_rank
) VALUES (?, ?, ?, ?, ?, ?);

-- Submit feedback
INSERT INTO memory_feedback (
    id, memory_id, session_id, query_context, feedback_type
) VALUES (?, ?, ?, ?, ?);

UPDATE memories
SET positive_feedback = positive_feedback + 1
WHERE id = ?;
```

### IPC Channels
- `retrieval:search` - Execute retrieval query
- `retrieval:log-recall` - Log memory recall
- `retrieval:submit-feedback` - Submit feedback

## Scoring Weights Explained

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Vector Similarity | 60% | Primary relevance signal |
| Recency | 10% | Recent memories more relevant |
| Confidence | 15% | Higher confidence = more reliable |
| Observation Count | 10% | Frequently observed = important |
| Type Boost | 5% | Priority types get slight boost |

## Implementation Hints

- Entity extraction can use simple regex for v1
- Consider Web Workers for similarity calculations
- Cache embeddings in memory for active session
- Feedback should feel instant (optimistic update)
- Log retrieval latency for monitoring
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Entity search finds memories by entity name
- [ ] Semantic search returns similar memories
- [ ] Merge correctly deduplicates
- [ ] Re-ranking produces sensible ordering
- [ ] Query type boosting activates correctly
- [ ] Feedback affects future rankings
- [ ] Performance under 500ms for typical queries
- [ ] Edge cases handled (no results, empty query)
- [ ] Recall logging captures all retrievals

---
**Notes**: The dual retrieval approach captures both explicit references (entity) and implicit meaning (semantic). The re-ranking algorithm is tunable - start with these weights and adjust based on user feedback patterns.
