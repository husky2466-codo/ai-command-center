/**
 * chatService.js - Service for chat functionality
 * Handles Claude API integration, message streaming, and session persistence
 */

import { dataService } from './DataService.js';
import { sessionService } from './sessionService.js';
import { retrievalService } from './retrievalService.js';
import { adminService } from './adminService.js';

/**
 * Service for managing chat interactions with Claude
 */
class ChatService {
  constructor() {
    this.currentSessionId = null;
    this.apiKey = null;
    this.model = 'claude-sonnet-4-20250514';
    this.maxTokens = 4096;
  }

  /**
   * Initialize chat service with API key
   * @param {string} apiKey - Anthropic API key
   */
  initialize(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Set the current model
   * @param {string} model - Model identifier
   */
  setModel(model) {
    this.model = model;
  }

  /**
   * Create a new chat session
   * @param {string} title - Session title (optional)
   * @returns {Promise<string>} Session ID
   */
  async createSession(title = null) {
    const session = await sessionService.createSession({
      title: title || `Chat ${new Date().toLocaleString()}`,
      importance: 'medium',
      work_type: 'chat'
    });

    this.currentSessionId = session.id;
    return session.id;
  }

  /**
   * Load an existing session
   * @param {string} sessionId - Session ID to load
   * @returns {Promise<Array>} Messages from the session
   */
  async loadSession(sessionId) {
    this.currentSessionId = sessionId;
    return this.getMessages(sessionId);
  }

  /**
   * Get messages for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Array of messages
   */
  async getMessages(sessionId) {
    const messages = await dataService.query(
      `SELECT * FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return messages;
  }

  /**
   * Save a message to the database
   * @param {string} sessionId - Session ID
   * @param {string} role - Message role (user/assistant)
   * @param {string} content - Message content
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Saved message
   */
  async saveMessage(sessionId, role, content, metadata = {}) {
    const result = await dataService.run(
      `INSERT INTO chat_messages (session_id, role, content, metadata, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [sessionId, role, content, JSON.stringify(metadata)]
    );

    // Update session message count
    await sessionService.incrementMessageCount(sessionId);

    // Update last message
    if (role === 'user') {
      await sessionService.updateLastMessage(sessionId, content);
    }

    return {
      id: result.lastInsertRowid,
      session_id: sessionId,
      role,
      content,
      metadata,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Send a message to Claude with streaming response
   * @param {string} message - User message
   * @param {Array} conversationHistory - Previous messages
   * @param {Array} relevantMemories - Retrieved memories for context
   * @param {Function} onChunk - Callback for streaming chunks
   * @param {Function} onComplete - Callback when complete
   * @param {Function} onError - Callback for errors
   * @returns {Promise<Object>} Response object with full text and metadata
   */
  async sendMessage(message, conversationHistory = [], relevantMemories = [], onChunk, onComplete, onError) {
    if (!this.apiKey) {
      throw new Error('API key not initialized. Call initialize() first.');
    }

    try {
      // Build system prompt with memory context
      const systemPrompt = this._buildSystemPrompt(relevantMemories);

      // Build messages array
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      // Call Claude API with streaming
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: messages,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              // Handle different event types
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text || '';
                fullText += text;
                if (onChunk) {
                  onChunk(text);
                }
              } else if (parsed.type === 'message_delta') {
                // Capture token usage from message_delta events
                if (parsed.usage) {
                  outputTokens = parsed.usage.output_tokens || outputTokens;
                }
              } else if (parsed.type === 'message_start') {
                // Capture input token count
                if (parsed.message?.usage) {
                  inputTokens = parsed.message.usage.input_tokens || 0;
                }
              } else if (parsed.type === 'message_stop') {
                if (onComplete) {
                  onComplete(fullText);
                }
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error?.message || 'Streaming error');
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data, e);
            }
          }
        }
      }

      // Track token usage
      if (inputTokens > 0 || outputTokens > 0) {
        try {
          await adminService.trackTokenUsage('anthropic', this.model, inputTokens, outputTokens, this.currentSessionId);
        } catch (err) {
          console.warn('Failed to track token usage:', err);
        }
      }

      return {
        content: fullText,
        model: this.model,
        role: 'assistant',
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens
        }
      };

    } catch (error) {
      console.error('Chat API error:', error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  /**
   * Build system prompt with memory context
   * @param {Array} memories - Relevant memories
   * @returns {string} System prompt
   * @private
   */
  _buildSystemPrompt(memories) {
    let prompt = `You are Claude, a helpful AI assistant integrated with the AI Command Center application. You have access to the user's memory system which recalls relevant context from past interactions.`;

    if (memories && memories.length > 0) {
      prompt += `\n\n## Relevant Memories\n\nThe following memories have been retrieved that may be relevant to this conversation:\n\n`;

      memories.forEach((memory, index) => {
        prompt += `### Memory ${index + 1} (${memory.type}, confidence: ${Math.round(memory.confidence_score * 100)}%)\n`;
        prompt += `${memory.content}\n\n`;

        if (memory.related_entities) {
          const entities = typeof memory.related_entities === 'string'
            ? JSON.parse(memory.related_entities)
            : memory.related_entities;
          if (entities.length > 0) {
            prompt += `Related: ${entities.join(', ')}\n\n`;
          }
        }
      });

      prompt += `\nUse these memories to inform your responses, but don't explicitly mention "I found this in my memories" unless it's particularly relevant to acknowledge.`;
    }

    return prompt;
  }

  /**
   * Estimate token count for text
   * Rough estimation: ~4 characters per token
   * @param {string} text - Text to count
   * @returns {number} Estimated token count
   */
  countTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Get recent sessions
   * @param {number} limit - Number of sessions to retrieve
   * @returns {Promise<Array>} Array of sessions
   */
  async getRecentSessions(limit = 20) {
    return sessionService.getRecent(30, limit);
  }

  /**
   * Search sessions
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching sessions
   */
  async searchSessions(searchTerm) {
    return sessionService.search(searchTerm);
  }

  /**
   * Delete a session and its messages
   * @param {string} sessionId - Session ID to delete
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    // Delete messages first
    await dataService.run(
      'DELETE FROM chat_messages WHERE session_id = ?',
      [sessionId]
    );

    // Delete session
    await sessionService.delete(sessionId);

    // Clear current session if it was deleted
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * Clear current conversation (without deleting from DB)
   * @returns {void}
   */
  clearConversation() {
    this.currentSessionId = null;
  }

  /**
   * Log memory recall for analytics
   * @param {string} sessionId - Session ID
   * @param {string} memoryId - Memory ID
   * @param {string} queryText - Query that triggered retrieval
   * @param {number} relevanceScore - Relevance score
   * @returns {Promise<void>}
   */
  async logMemoryRecall(sessionId, memoryId, queryText, relevanceScore) {
    try {
      await dataService.run(
        `INSERT INTO session_recalls (session_id, memory_id, query_text, relevance_score, recalled_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [sessionId, memoryId, queryText, relevanceScore]
      );
    } catch (error) {
      console.error('Failed to log memory recall:', error);
    }
  }

  /**
   * Export conversation to markdown
   * @param {string} sessionId - Session ID
   * @returns {Promise<string>} Markdown formatted conversation
   */
  async exportToMarkdown(sessionId) {
    const session = await sessionService.getById(sessionId);
    const messages = await this.getMessages(sessionId);

    let markdown = `# ${session.title}\n\n`;
    markdown += `**Date:** ${new Date(session.created_at).toLocaleString()}\n`;
    markdown += `**Messages:** ${session.message_count}\n\n`;
    markdown += `---\n\n`;

    for (const message of messages) {
      const time = new Date(message.created_at).toLocaleTimeString();
      markdown += `## ${message.role === 'user' ? 'You' : 'Assistant'} (${time})\n\n`;
      markdown += `${message.content}\n\n`;
      markdown += `---\n\n`;
    }

    return markdown;
  }

  /**
   * Get statistics for current session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Statistics
   */
  async getSessionStats(sessionId) {
    const messages = await this.getMessages(sessionId);
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const totalTokens = messages.reduce((sum, msg) => {
      return sum + this.countTokens(msg.content);
    }, 0);

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      estimatedTokens: totalTokens
    };
  }
}

// Export singleton instance
export const chatService = new ChatService();
