/**
 * testMemoryExtraction.js - Test utility for memory extraction
 *
 * Run this from the browser console to test memory extraction on a real session file
 */

import { memoryExtractionService } from '../services/memoryExtractionService.js';
import { embeddingService } from '../services/embeddingService.js';

/**
 * Test the complete memory extraction pipeline
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<Object>} Test results
 */
export async function testMemoryExtraction(apiKey) {
  console.log('=== Memory Extraction Test ===\n');

  try {
    // Step 1: Check Ollama status
    console.log('Step 1: Checking Ollama status...');
    const ollamaStatus = await embeddingService.checkOllamaStatus();
    console.log('Ollama status:', ollamaStatus);

    if (!ollamaStatus.available) {
      console.warn('Ollama not available - will use mock embeddings');
      console.warn('To use real embeddings, install Ollama and run: ollama pull mxbai-embed-large');
    }

    // Step 2: Find Claude Code sessions
    console.log('\nStep 2: Finding Claude Code sessions...');
    const sessionsResult = await window.electronAPI.memoryFindClaudeSessions();

    if (!sessionsResult.success) {
      throw new Error(`Failed to find sessions: ${sessionsResult.error}`);
    }

    console.log(`Found ${sessionsResult.sessions.length} session files`);

    if (sessionsResult.sessions.length === 0) {
      console.log('No sessions found. Make sure you have used Claude Code before.');
      return { success: false, message: 'No sessions found' };
    }

    // Display first 10 sessions
    console.log('\nMost recent sessions:');
    sessionsResult.sessions.slice(0, 10).forEach((session, i) => {
      console.log(`${i + 1}. ${session.project}/${session.filename}`);
      console.log(`   Modified: ${new Date(session.modified).toLocaleString()}`);
      console.log(`   Size: ${(session.size / 1024).toFixed(2)} KB`);
    });

    // Step 3: Select a session to test (use the most recent one)
    const testSession = sessionsResult.sessions[0];
    console.log(`\nStep 3: Testing extraction on: ${testSession.filename}`);

    // Step 4: Read session content
    console.log('\nStep 4: Reading session file...');
    const sessionContent = await window.electronAPI.memoryExtractFromSession(
      testSession.path,
      apiKey
    );

    if (!sessionContent.success) {
      throw new Error(`Failed to read session: ${sessionContent.error}`);
    }

    console.log(`Read ${sessionContent.content.length} bytes`);

    // Step 5: Create a temporary wrapper for parsing
    // (memoryExtractionService expects to read via IPC or fs)
    console.log('\nStep 5: Parsing session...');

    // Parse manually for testing
    const lines = sessionContent.content.split('\n').filter(line => line.trim());
    const messages = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

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
        // Skip malformed lines
      }
    }

    console.log(`Parsed ${messages.length} messages from session`);

    if (messages.length === 0) {
      console.log('Session has no messages to extract from');
      return { success: false, message: 'No messages in session' };
    }

    // Step 6: Chunk the conversation
    console.log('\nStep 6: Chunking conversation...');
    const chunks = memoryExtractionService.chunkConversation(messages, 15);
    console.log(`Created ${chunks.length} chunks`);

    // Step 7: Extract from first chunk only (for testing)
    console.log('\nStep 7: Extracting memories from first chunk...');
    const firstChunk = memoryExtractionService.formatChunk(chunks[0]);
    console.log('Chunk preview (first 500 chars):');
    console.log(firstChunk.substring(0, 500) + '...\n');

    const memories = await memoryExtractionService.extractMemoriesFromChunk(
      firstChunk,
      apiKey
    );

    console.log(`Extracted ${memories.length} raw memories`);

    if (memories.length === 0) {
      console.log('No memories found in this chunk - try a different session or chunk');
      return {
        success: true,
        message: 'Extraction completed but no memories found',
        sessionPath: testSession.path,
        messagesInSession: messages.length,
        chunksCreated: chunks.length
      };
    }

    // Step 8: Process extracted memories
    console.log('\nStep 8: Processing extracted memories...');

    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      console.log(`\n--- Memory ${i + 1} ---`);
      console.log(`Type: ${memory.type}`);
      console.log(`Title: ${memory.title}`);
      console.log(`Category: ${memory.category}`);
      console.log(`Confidence: ${memory.confidence_score}/100`);
      console.log(`Content: ${memory.content.substring(0, 150)}${memory.content.length > 150 ? '...' : ''}`);
      console.log(`Reasoning: ${memory.reasoning}`);

      // Adjust confidence
      const adjustedConfidence = memoryExtractionService.adjustConfidence(memory);
      console.log(`Adjusted Confidence: ${(adjustedConfidence * 100).toFixed(1)}%`);

      // Generate embedding
      console.log('Generating embedding...');
      const embedding = await embeddingService.generateEmbedding(memory.content);
      console.log(`Embedding generated: ${embedding.length} dimensions`);
      console.log(`Embedding mode: ${embeddingService.getConfig().mode}`);

      // Check for duplicates (won't find any on first run)
      const duplicate = await memoryExtractionService.checkDuplicates(embedding, 0.9);
      console.log(`Duplicate check: ${duplicate ? 'Found duplicate' : 'No duplicates'}`);
    }

    console.log('\n=== Test Complete ===');
    console.log('Memory extraction pipeline is working correctly!');

    return {
      success: true,
      sessionPath: testSession.path,
      messagesInSession: messages.length,
      chunksCreated: chunks.length,
      memoriesExtracted: memories.length,
      memories: memories.map(m => ({
        type: m.type,
        title: m.title,
        confidence: memoryExtractionService.adjustConfidence(m)
      })),
      ollamaMode: embeddingService.getConfig().mode
    };

  } catch (error) {
    console.error('Test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Quick test - just check if services are working
 */
export async function quickTest() {
  console.log('=== Quick Service Test ===\n');

  // Test embedding service
  console.log('Testing embedding service...');
  const status = await embeddingService.checkOllamaStatus();
  console.log('Ollama status:', status);

  const testEmbedding = await embeddingService.generateEmbedding('This is a test');
  console.log(`Generated ${testEmbedding.length}-dim embedding`);
  console.log('Mode:', embeddingService.getConfig().mode);

  // Test session finding
  console.log('\nTesting session discovery...');
  const sessions = await window.electronAPI.memoryFindClaudeSessions();
  console.log(`Found ${sessions.success ? sessions.sessions.length : 0} sessions`);

  console.log('\n=== Quick Test Complete ===');
}

// Export for console use
if (typeof window !== 'undefined') {
  window.testMemoryExtraction = testMemoryExtraction;
  window.quickTest = quickTest;
}
