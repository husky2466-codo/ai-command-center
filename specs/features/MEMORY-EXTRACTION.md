# Memory Extraction Service

**Status**: Not Started
**Priority**: P0 (Critical)
**Estimated Effort**: 5 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite for storage
- `specs/features/EMBEDDING-SYSTEM.md` - Embeddings for memories

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) - UI elements reference Memory Lane spec

---

## Design Consistency Notes

This feature is primarily backend but has UI touchpoints in Admin panel:

- **Extraction Status**: Use status colors for job health
- **Memory Type Colors**: When displaying extracted memories, use the memory type colors defined in DESIGN-SYSTEM.md:
  ```css
  --memory-correction: #ef4444;   /* Red */
  --memory-decision: #f59e0b;     /* Amber */
  --memory-commitment: #8b5cf6;   /* Violet */
  --memory-insight: #06b6d4;      /* Cyan */
  --memory-learning: #22c55e;     /* Green */
  ```
- **Confidence Display**: Use progress bar with appropriate color based on score

---

## Overview

The Memory Extraction service (Memory Catcher) is the core AI system that automatically extracts meaningful memories from Claude Code sessions. It parses JSONL session transcripts, identifies consequential moments (corrections, decisions, insights), and stores them with embeddings for future retrieval.

## Acceptance Criteria

- [ ] Parse Claude Code JSONL session files
- [ ] Extract memories across 10 defined types
- [ ] Generate confidence scores for each memory
- [ ] Create embeddings for semantic search
- [ ] Resolve entities (people, projects, businesses)
- [ ] Run automatically every 15 minutes
- [ ] Support manual extraction trigger
- [ ] Deduplicate similar memories

## Memory Types

```
HIGH PRIORITY (Always Extract):
- correction: User corrected agent behavior
- decision: Explicit choice with reasoning
- commitment: User preference expressed

MEDIUM PRIORITY (Extract if Clear):
- insight: Non-obvious discovery
- learning: New knowledge gained
- confidence: Strong confidence in approach

LOWER PRIORITY (Context Dependent):
- pattern_seed: Repeated behavior to formalize
- cross_agent: Info relevant to other agents
- workflow_note: Process observation
- gap: Missing capability or limitation
```

## Tasks

### Section 1: Session File Parsing
- [ ] Create `src/services/SessionParser.js`
  - [ ] Find session files: `~/.claude/projects/*/sessions/*.jsonl`
  - [ ] Parse JSONL format line by line
  - [ ] Extract message pairs (user/assistant)
  - [ ] Track tool calls and results
  - [ ] Handle malformed lines gracefully
- [ ] Implement session discovery
  - [ ] Scan all project directories
  - [ ] Track last processed position per file
  - [ ] Resume from where left off

### Section 2: Extraction Prompt
- [ ] Create `src/services/MemoryCatcher.js`
- [ ] Define extraction system prompt:
  ```
  You are analyzing a conversation to extract memorable moments.
  Look for these types of consequential decisions or events:

  HIGH PRIORITY:
  - correction: User corrected agent behavior
  - decision: Explicit choice with reasoning
  - commitment: User preference expressed

  MEDIUM PRIORITY:
  - insight: Non-obvious discovery
  - learning: New knowledge gained
  - confidence: Strong confidence in approach

  LOWER PRIORITY:
  - pattern_seed: Repeated behavior to formalize
  - gap: Parts of system not talking to each other

  TRIGGERS TO WATCH:
  1. Recovery patterns: error -> workaround -> success
  2. User corrections: "I want it this other way"
  3. Enthusiasm: "that's exactly what I wanted!"
  4. Negative reactions: "never do that"
  5. Repeated requests: same workflow multiple times
  ```
- [ ] Define output format (JSON)

### Section 3: Memory Extraction
- [ ] Implement `extractMemories(conversationChunk)` function
  - [ ] Chunk conversations (10-20 messages per chunk)
  - [ ] Call Claude API with extraction prompt
  - [ ] Parse returned JSON
  - [ ] Validate memory structure
- [ ] Handle extraction errors
  - [ ] Retry on API failure
  - [ ] Log failed extractions
  - [ ] Continue with next chunk

### Section 4: Confidence Scoring
- [ ] Extract confidence from AI response (0-100)
- [ ] Apply confidence adjustments:
  - [ ] Boost for high-priority types (+10)
  - [ ] Boost for strong signals (enthusiasm, corrections)
  - [ ] Reduce for ambiguous context (-10)
- [ ] Normalize to 0-1 scale for storage

### Section 5: Entity Resolution
- [ ] Create `src/services/EntityResolver.js`
- [ ] Extract entities from memories:
  - [ ] People: @mentions, names in context
  - [ ] Projects: repository names, project references
  - [ ] Businesses: company names
  - [ ] Locations: city/country references
- [ ] Generate slugs for entities
- [ ] Link to existing contacts/projects if match found
- [ ] Create new entities if novel

### Section 6: Embedding Generation
- [ ] Generate embedding for memory content
- [ ] Call Ollama embedding service
- [ ] Store as BLOB in memories table
- [ ] Handle embedding failures gracefully

### Section 7: Deduplication
- [ ] Before storing, check for similar memories
  - [ ] Compute embedding similarity
  - [ ] If similarity > 0.9, consider duplicate
- [ ] Merge duplicate memories:
  - [ ] Keep higher confidence version
  - [ ] Increment times_observed
  - [ ] Update last_observed_at
  - [ ] Combine evidence

### Section 8: Scheduled Extraction
- [ ] Set up 15-minute cron job in Electron main process
- [ ] Track extraction state:
  - [ ] Last processed file/position
  - [ ] Extraction in progress flag
- [ ] Prevent overlapping extractions
- [ ] Log extraction runs

### Section 9: Manual Trigger
- [ ] Expose IPC handler for manual extraction
- [ ] Allow extraction of specific session file
- [ ] Show extraction progress in UI

### Section 10: Storage
- [ ] Insert extracted memories to database
- [ ] Store related entities
- [ ] Link memories to entities
- [ ] Update statistics

## Technical Details

### Files to Create
- `src/services/SessionParser.js` - JSONL parsing
- `src/services/MemoryCatcher.js` - Main extraction logic
- `src/services/EntityResolver.js` - Entity extraction/linking
- `src/constants/memoryTypes.js` - Type definitions

### Files to Modify
- `electron/main.cjs` - Add cron job, IPC handlers

### Database Tables Used
```sql
INSERT INTO memories (
    id, type, category, title, content, source_chunk,
    embedding, related_entities, confidence_score,
    reasoning, evidence, times_observed
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

INSERT INTO entities (
    id, type, canonical_name, slug, aliases,
    linked_contact_id, linked_project_id, metadata
) VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- Track extraction state
CREATE TABLE extraction_state (
    file_path TEXT PRIMARY KEY,
    last_position INTEGER,
    last_extracted_at DATETIME
);
```

### IPC Channels
- `memory:extract-all` - Run extraction on all sessions
- `memory:extract-file` - Extract specific file
- `memory:get-extraction-status` - Check if running
- `memory:get-last-run` - Last extraction timestamp

## Extraction Output Format

```json
{
  "type": "correction",
  "category": "coding-style",
  "title": "User prefers const over let",
  "content": "User corrected agent to use const for variables that aren't reassigned. This is a coding style preference.",
  "source_chunk": "Assistant: let result = ...\nUser: Please use const instead of let for that",
  "related_entities": [
    { "type": "project", "raw": "ai-command-center", "slug": "ai-command-center" }
  ],
  "confidence_score": 85,
  "reasoning": "Direct correction with clear preference statement"
}
```

## Implementation Hints

- Use Claude Haiku for extraction (speed/cost)
- Chunk size of 10-15 messages works well
- Process newest sessions first
- Log extraction metrics (memories/session, avg confidence)
- Consider rate limiting API calls
- Store raw response for debugging
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] JSONL parser handles all message types
- [ ] Extraction identifies memories in sample conversations
- [ ] Confidence scores are reasonable
- [ ] Entity resolution links existing contacts
- [ ] Deduplication merges similar memories
- [ ] Cron job runs on schedule
- [ ] Manual extraction works via IPC
- [ ] Error handling prevents crashes
- [ ] Large sessions don't cause memory issues

---
**Notes**: This is the heart of the Memory Lane system. Quality extraction determines how useful the AI's memory will be. Focus on high-confidence extractions initially - it's better to miss some memories than to pollute the database with noise.
