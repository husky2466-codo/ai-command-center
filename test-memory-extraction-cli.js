/**
 * Test script for Memory Extraction Service CLI migration
 *
 * This demonstrates the CLI-first approach with API fallback.
 *
 * Usage:
 *   node test-memory-extraction-cli.js
 */

// Mock window.electronAPI for testing
global.window = {
  electronAPI: {
    claudeCli: {
      async check() {
        // Simulate CLI availability
        // Set to false to test API fallback
        return { available: true };
      },

      async checkOAuth() {
        // Simulate OAuth authentication
        // Set authenticated: false to test API fallback
        return { authenticated: true };
      },

      async query(prompt, options) {
        // Simulate CLI query response
        console.log('📡 CLI Query Called');
        console.log('  Model:', options.model);
        console.log('  Max Tokens:', options.maxTokens);

        // Simulate successful extraction with mock data
        const mockMemories = [
          {
            type: 'decision',
            category: 'architecture',
            title: 'Chose React for frontend',
            content: 'User decided to use React because team has more experience',
            source_chunk: 'User: Let\'s use React\nAssistant: Good choice!',
            related_entities: [],
            confidence_score: 85,
            reasoning: 'Clear user preference expressed'
          }
        ];

        return {
          success: true,
          content: JSON.stringify(mockMemories, null, 2)
        };
      }
    }
  }
};

// Import the service
import { memoryExtractionService } from './src/services/memoryExtractionService.js';

/**
 * Test CLI extraction path
 */
async function testCliPath() {
  console.log('\n=== Test 1: CLI Path (Authenticated) ===\n');

  const conversationChunk = `User: I want to use React for this project
Assistant: That's a great choice! React has a large ecosystem and your team is already familiar with it.
User: Yes, exactly. Let's go with that.`;

  try {
    const memories = await memoryExtractionService.extractMemoriesFromChunk(
      conversationChunk,
      null // No API key needed
    );

    console.log('\n✅ Success!');
    console.log('Memories extracted:', memories.length);
    console.log('Memory details:', JSON.stringify(memories, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test API fallback path
 */
async function testApiFallback() {
  console.log('\n=== Test 2: API Fallback (CLI Unavailable) ===\n');

  // Temporarily disable CLI
  const originalCheck = window.electronAPI.claudeCli.check;
  window.electronAPI.claudeCli.check = async () => ({ available: false });

  const conversationChunk = `User: Fix the authentication bug
Assistant: I'll update the token validation logic as we discussed earlier.`;

  try {
    const memories = await memoryExtractionService.extractMemoriesFromChunk(
      conversationChunk,
      'mock-api-key-for-testing'
    );

    console.log('\n✅ Success!');
    console.log('Memories extracted:', memories.length);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Restore CLI
  window.electronAPI.claudeCli.check = originalCheck;
}

/**
 * Test CLI failure with API fallback
 */
async function testCliFailure() {
  console.log('\n=== Test 3: CLI Failure → API Fallback ===\n');

  // Make CLI fail
  const originalQuery = window.electronAPI.claudeCli.query;
  window.electronAPI.claudeCli.query = async () => ({
    success: false,
    error: 'Connection timeout'
  });

  const conversationChunk = `User: Add dark mode support
Assistant: I'll implement a theme toggle in the settings panel.`;

  try {
    const memories = await memoryExtractionService.extractMemoriesFromChunk(
      conversationChunk,
      'mock-api-key-for-testing'
    );

    console.log('\n✅ Success!');
    console.log('Memories extracted:', memories.length);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Restore CLI
  window.electronAPI.claudeCli.query = originalQuery;
}

/**
 * Test CLI availability check
 */
async function testCliAvailability() {
  console.log('\n=== Test 4: CLI Availability Check ===\n');

  const status = await memoryExtractionService.checkCliAvailability();

  console.log('CLI Status:', JSON.stringify(status, null, 2));

  if (status.authenticated) {
    console.log('✅ CLI is available and authenticated');
  } else if (status.available) {
    console.log('⚠️  CLI is available but not authenticated');
  } else {
    console.log('❌ CLI is not available');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Memory Extraction Service - CLI Migration   ║');
  console.log('║              Test Suite                       ║');
  console.log('╚═══════════════════════════════════════════════╝');

  try {
    await testCliAvailability();
    await testCliPath();
    await testApiFallback();
    await testCliFailure();

    console.log('\n✨ All tests completed!\n');
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
  }
}

// Run tests
runTests();
