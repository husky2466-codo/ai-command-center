/**
 * memoryExtractionService.js - Extract meaningful memories from Claude Code sessions
 *
 * Parses JSONL session files, identifies consequential moments, and stores them
 * with embeddings for future semantic retrieval.
 */

import { memoryService } from './memoryService.js';
import { embeddingService } from './embeddingService.js';
import { sessionService } from './sessionService.js';
import { entityService } from './entityService.js';

/**
 * Memory types with priorities
 */
export const MEMORY_TYPES = {
  // HIGH PRIORITY - Always extract
  correction: {
    priority: 'high',
    description: 'User corrected agent behavior',
    boost: 15
  },
  decision: {
    priority: 'high',
    description: 'Explicit choice with reasoning',
    boost: 15
  },
  commitment: {
    priority: 'high',
    description: 'User preference expressed',
    boost: 15
  },

  // MEDIUM PRIORITY - Extract if clear
  insight: {
    priority: 'medium',
    description: 'Non-obvious discovery',
    boost: 10
  },
  learning: {
    priority: 'medium',
    description: 'New knowledge gained',
    boost: 10
  },
  confidence: {
    priority: 'medium',
    description: 'Strong confidence in approach',
    boost: 10
  },

  // LOWER PRIORITY - Context dependent
  pattern_seed: {
    priority: 'low',
    description: 'Repeated behavior to formalize',
    boost: 5
  },
  cross_agent: {
    priority: 'low',
    description: 'Info relevant to other agents',
    boost: 5
  },
  workflow_note: {
    priority: 'low',
    description: 'Process observation',
    boost: 5
  },
  gap: {
    priority: 'low',
    description: 'Missing capability or limitation',
    boost: 5
  }
};

/**
 * Extraction triggers to watch for
 */
const EXTRACTION_TRIGGERS = [
  'Recovery patterns: error -> workaround -> success',
  'User corrections: "I want it this other way"',
  'Enthusiasm: "that\'s exactly what I wanted!"',
  'Negative reactions: "never do that"',
  'Repeated requests: same workflow multiple times',
  'Strong sentiment: "always", "never", "must", "critical"',
  'Explicit preferences: "I prefer", "I like", "I want"'
];

/**
 * System prompt for memory extraction
 */
function buildExtractionPrompt() {
  const typesList = Object.entries(MEMORY_TYPES)
    .map(([type, info]) => `  - ${type}: ${info.description} (${info.priority} priority)`)
    .join('\n');

  return `You are analyzing a conversation between a user and an AI assistant to extract memorable moments.

Your task is to identify consequential decisions, corrections, insights, and patterns that should be remembered for future sessions.

MEMORY TYPES (extract only clear examples):

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
  - cross_agent: Info relevant to other agents
  - workflow_note: Process observation
  - gap: Missing capability or limitation

TRIGGERS TO WATCH:
${EXTRACTION_TRIGGERS.map(t => `- ${t}`).join('\n')}

For each memory found, return:
{
  "type": "memory_type",
  "category": "specific-category-slug",
  "title": "Brief title (5-10 words)",
  "content": "Detailed description of what happened and why it matters",
  "source_chunk": "Exact relevant excerpt from conversation",
  "related_entities": [
    {"type": "person|project|business", "raw": "Name as mentioned", "slug": "normalized-name"}
  ],
  "confidence_score": 0-100,
  "reasoning": "Why this is worth remembering"
}

IMPORTANT:
- Only extract clear, unambiguous memories
- Provide concrete evidence in source_chunk
- Be conservative - better to miss some than create noise
- Return empty array if no strong memories found
- Return valid JSON array only, no other text`;
}

/**
 * Memory Extraction Service
 */
class MemoryExtractionService {
  constructor() {
    this.extractionCache = new Map(); // Cache parsed sessions
  }

  /**
   * Parse JSONL session file
   * @param {string} sessionPath - Path to .jsonl file
   * @returns {Promise<Object>} Parsed session data
   */
  async parseSessionFile(sessionPath) {
    // Check cache
    if (this.extractionCache.has(sessionPath)) {
      return this.extractionCache.get(sessionPath);
    }

    // Read file via IPC
    let content;
    if (window.electronAPI) {
      const result = await window.electronAPI.memoryExtractFromSession(sessionPath, null);
      if (!result.success) {
        throw new Error(`Failed to read session file: ${result.error}`);
      }
      content = result.content;
    } else {
      // Fallback for Node.js context (not used in production)
      const fs = require('fs');
      content = fs.readFileSync(sessionPath, 'utf-8');
    }

    const lines = content.split('\n').filter(line => line.trim());
    const messages = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Extract message pairs
        if (entry.type === 'input') {
          messages.push({
            role: 'user',
            content: entry.content || '',
            timestamp: entry.timestamp
          });
        } else if (entry.type === 'output') {
          messages.push({
            role: 'assistant',
            content: entry.content || '',
            timestamp: entry.timestamp
          });
        }
      } catch (e) {
        console.warn('Failed to parse JSONL line:', e.message);
        // Skip malformed lines
      }
    }

    const parsed = {
      path: sessionPath,
      messages,
      totalMessages: messages.length
    };

    // Cache for future use
    this.extractionCache.set(sessionPath, parsed);

    return parsed;
  }

  /**
   * Chunk conversation into manageable pieces
   * @param {Array} messages - Array of message objects
   * @param {number} chunkSize - Messages per chunk
   * @returns {Array<Array>} Array of message chunks
   */
  chunkConversation(messages, chunkSize = 15) {
    const chunks = [];

    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * Format conversation chunk for extraction
   * @param {Array} messages - Message chunk
   * @returns {string} Formatted conversation
   */
  formatChunk(messages) {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n\n');
  }

  /**
   * Extract memories from a conversation chunk using AI
   * @param {string} conversationChunk - Formatted conversation
   * @param {string} apiKey - Anthropic API key
   * @returns {Promise<Array>} Extracted memories
   */
  async extractMemoriesFromChunk(conversationChunk, apiKey) {
    const systemPrompt = buildExtractionPrompt();

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-20250514', // Fast and cost-effective
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Analyze this conversation and extract memories:\n\n${conversationChunk}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content[0].text;

      // Parse JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in response');
        return [];
      }

      const memories = JSON.parse(jsonMatch[0]);
      return Array.isArray(memories) ? memories : [];

    } catch (error) {
      console.error('Memory extraction failed:', error);
      return [];
    }
  }

  /**
   * Apply confidence adjustments based on memory type and signals
   * @param {Object} memory - Raw memory object
   * @returns {number} Adjusted confidence (0-1 scale)
   */
  adjustConfidence(memory) {
    let confidence = memory.confidence_score / 100; // Convert to 0-1

    // Apply type-specific boosts
    const typeInfo = MEMORY_TYPES[memory.type];
    if (typeInfo) {
      confidence += (typeInfo.boost / 100);
    }

    // Boost for strong signals in content
    const strongSignals = [
      'always', 'never', 'must', 'critical', 'important',
      'exactly', 'perfect', 'wrong', 'incorrect'
    ];

    const contentLower = (memory.content || '').toLowerCase();
    const hasStrongSignal = strongSignals.some(signal => contentLower.includes(signal));

    if (hasStrongSignal) {
      confidence += 0.1;
    }

    // Reduce for ambiguous context
    const ambiguousSignals = ['maybe', 'perhaps', 'might', 'could', 'unsure'];
    const hasAmbiguity = ambiguousSignals.some(signal => contentLower.includes(signal));

    if (hasAmbiguity) {
      confidence -= 0.1;
    }

    // Clamp to 0-1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Extract and resolve entities from memory
   * @param {Object} memory - Memory object with related_entities
   * @returns {Promise<Array>} Array of entity IDs
   */
  async extractEntities(memory) {
    const entities = memory.related_entities || [];
    const entityIds = [];

    for (const entity of entities) {
      // Generate slug
      const slug = entity.slug || this.generateSlug(entity.raw);

      // Check if entity exists
      const existing = await entityService.getBySlug(slug);

      if (existing) {
        entityIds.push(existing.id);
      } else {
        // Create new entity
        const newEntity = await entityService.create({
          type: entity.type,
          canonical_name: entity.raw,
          slug,
          aliases: JSON.stringify([entity.raw]),
          metadata: JSON.stringify({
            discovered_in: memory.title,
            first_seen: new Date().toISOString()
          })
        });

        entityIds.push(newEntity.id);
      }
    }

    return entityIds;
  }

  /**
   * Generate slug from entity name
   * @param {string} name - Entity name
   * @returns {string} Slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Check for duplicate memories using embeddings
   * @param {Float32Array} embedding - Memory embedding
   * @param {number} threshold - Similarity threshold
   * @returns {Promise<Object|null>} Duplicate memory if found
   */
  async checkDuplicates(embedding, threshold = 0.9) {
    // Get all memories with embeddings
    const allMemories = await memoryService.getAll();

    // Find similar memories
    const similar = embeddingService.findSimilar(
      embedding,
      allMemories,
      threshold,
      1
    );

    return similar.length > 0 ? similar[0] : null;
  }

  /**
   * Extract memories from a session file
   * @param {string} sessionPath - Path to session JSONL file
   * @param {string} apiKey - Anthropic API key
   * @param {Function} onProgress - Progress callback (current, total)
   * @returns {Promise<Object>} Extraction results
   */
  async extractFromSession(sessionPath, apiKey, onProgress = null) {
    console.log('Starting extraction from:', sessionPath);

    // Parse session file
    const session = await this.parseSessionFile(sessionPath);
    console.log(`Parsed ${session.totalMessages} messages`);

    // Store session in database
    const sessionRecord = await sessionService.create({
      session_id: sessionPath.split(/[/\\]/).pop().replace('.jsonl', ''),
      file_path: sessionPath,
      total_messages: session.totalMessages,
      started_at: session.messages[0]?.timestamp || new Date().toISOString(),
      ended_at: session.messages[session.totalMessages - 1]?.timestamp || new Date().toISOString()
    });

    // Chunk conversation
    const chunks = this.chunkConversation(session.messages);
    console.log(`Created ${chunks.length} chunks`);

    const allMemories = [];
    let processed = 0;

    // Process each chunk
    for (const chunk of chunks) {
      const formatted = this.formatChunk(chunk);
      const memories = await this.extractMemoriesFromChunk(formatted, apiKey);

      for (const memory of memories) {
        // Adjust confidence
        const confidence = this.adjustConfidence(memory);

        // Generate embedding
        const embeddingVec = await embeddingService.generateEmbedding(memory.content);
        const embedding = embeddingService.embeddingToBlob(embeddingVec);

        // Check for duplicates
        const duplicate = await this.checkDuplicates(embeddingVec);

        if (duplicate) {
          // Merge with existing
          await memoryService.update(duplicate.id, {
            times_observed: duplicate.times_observed + 1,
            last_observed_at: new Date().toISOString(),
            confidence_score: Math.max(confidence, duplicate.confidence_score),
            evidence: JSON.stringify([
              ...JSON.parse(duplicate.evidence || '[]'),
              memory.source_chunk
            ])
          });

          console.log(`Merged duplicate memory: ${memory.title}`);
        } else {
          // Extract entities
          const entityIds = await this.extractEntities(memory);

          // Store new memory
          const stored = await memoryService.create({
            type: memory.type,
            category: memory.category,
            title: memory.title,
            content: memory.content,
            source_chunk: memory.source_chunk,
            embedding,
            related_entities: JSON.stringify(entityIds),
            confidence_score: confidence,
            reasoning: memory.reasoning,
            evidence: JSON.stringify([memory.source_chunk]),
            times_observed: 1,
            session_id: sessionRecord.id
          });

          allMemories.push(stored);
          console.log(`Stored memory: ${memory.title} (confidence: ${confidence.toFixed(2)})`);
        }
      }

      processed++;
      if (onProgress) {
        onProgress(processed, chunks.length);
      }
    }

    console.log(`Extraction complete: ${allMemories.length} new memories`);

    return {
      sessionId: sessionRecord.id,
      totalChunks: chunks.length,
      memoriesExtracted: allMemories.length,
      memories: allMemories
    };
  }

  /**
   * Clear extraction cache
   */
  clearCache() {
    this.extractionCache.clear();
  }
}

// Export singleton
export const memoryExtractionService = new MemoryExtractionService();
