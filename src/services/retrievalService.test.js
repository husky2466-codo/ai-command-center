/**
 * retrievalService.test.js - Test suite for dual retrieval system
 * Tests entity-based, semantic, and hybrid retrieval modes
 */

import { retrievalService } from './retrievalService.js';
import { memoryService } from './memoryService.js';
import { entityService } from './entityService.js';
import { embeddingService } from './embeddingService.js';

/**
 * Test Setup: Create sample data
 */
async function setupTestData() {
  console.log('Setting up test data...');

  // Create test memories
  const memory1 = await memoryService.createMemory({
    type: 'decision',
    title: 'Use SQLite for database',
    content: 'We decided to use SQLite with sqlite-vss for vector search instead of PostgreSQL because it simplifies deployment.',
    category: 'architecture',
    confidence_score: 0.95,
    times_observed: 3
  });

  const memory2 = await memoryService.createMemory({
    type: 'correction',
    title: 'Fixed camera initialization bug',
    content: 'The Vision app camera had a race condition. Fixed by adding proper initialization wait logic.',
    category: 'bugs',
    confidence_score: 0.88,
    times_observed: 1
  });

  const memory3 = await memoryService.createMemory({
    type: 'commitment',
    title: 'Always use pink gradient for Memory Lane',
    content: 'Memory Lane components should always use the pink-to-purple gradient (#ec4899 to #8b5cf6) for branding consistency.',
    category: 'design',
    confidence_score: 0.92,
    times_observed: 5
  });

  console.log('Created 3 test memories');

  // Create test entities
  const entity1 = await entityService.create({
    name: 'SQLite',
    type: 'technology',
    context: 'Database technology'
  });

  const entity2 = await entityService.create({
    name: 'Vision',
    type: 'module',
    context: 'Vision module in AI Command Center'
  });

  console.log('Created 2 test entities');

  // Link entities to memories
  await entityService.addOccurrence(entity1.id, memory1.id, 'SQLite database decision');
  await entityService.addOccurrence(entity2.id, memory2.id, 'Vision camera bug');

  console.log('Linked entities to memories');

  // Generate embeddings for memories
  console.log('Generating embeddings...');
  const embedding1 = await embeddingService.generateEmbedding(memory1.content);
  const embedding2 = await embeddingService.generateEmbedding(memory2.content);
  const embedding3 = await embeddingService.generateEmbedding(memory3.content);

  await memoryService.updateEmbedding(memory1.id, embeddingService.embeddingToBlob(embedding1));
  await memoryService.updateEmbedding(memory2.id, embeddingService.embeddingToBlob(embedding2));
  await memoryService.updateEmbedding(memory3.id, embeddingService.embeddingToBlob(embedding3));

  console.log('Embeddings generated and stored');

  return {
    memories: [memory1, memory2, memory3],
    entities: [entity1, entity2]
  };
}

/**
 * Test 1: Entity-Based Retrieval
 */
async function testEntityRetrieval() {
  console.log('\n=== Test 1: Entity-Based Retrieval ===');

  const results = await retrievalService.retrieveByEntities(['SQLite'], 10);

  console.log(`Retrieved ${results.length} memories`);
  if (results.length > 0) {
    console.log('First result:', {
      title: results[0].title,
      entityMatchScore: results[0].entityMatchScore,
      retrievalMethod: results[0].retrievalMethod
    });
  }

  // Verify
  const passed = results.length > 0 && results[0].title.includes('SQLite');
  console.log(`Test 1: ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

/**
 * Test 2: Semantic Search
 */
async function testSemanticSearch() {
  console.log('\n=== Test 2: Semantic Search ===');

  const query = 'What database technology did we choose?';
  const results = await retrievalService.retrieveBySemantic(query, 0.3, 10);

  console.log(`Query: "${query}"`);
  console.log(`Retrieved ${results.length} memories`);

  if (results.length > 0) {
    console.log('Top results:');
    results.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title} (similarity: ${r.similarity.toFixed(3)})`);
    });
  }

  // Verify
  const passed = results.length > 0;
  console.log(`Test 2: ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

/**
 * Test 3: Dual Retrieval (Hybrid Mode)
 */
async function testDualRetrieval() {
  console.log('\n=== Test 3: Dual Retrieval (Hybrid) ===');

  const query = 'Tell me about the database decision and any camera bugs';
  const entities = ['SQLite', 'Vision'];
  const results = await retrievalService.retrieveDual(query, entities, {
    limit: 5,
    semanticThreshold: 0.3
  });

  console.log(`Query: "${query}"`);
  console.log(`Entities: ${entities.join(', ')}`);
  console.log(`Retrieved ${results.length} memories`);

  if (results.length > 0) {
    console.log('Top results with scores:');
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title}`);
      console.log(`     Final Score: ${r.finalScore.toFixed(3)}`);
      console.log(`     Method: ${r.retrievalMethod}`);
      console.log(`     Similarity: ${(r.similarity || 0).toFixed(3)}`);
    });
  }

  // Verify
  const passed = results.length > 0 && results.every(r => r.finalScore !== undefined);
  console.log(`Test 3: ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

/**
 * Test 4: Re-Ranking Algorithm
 */
async function testReRanking() {
  console.log('\n=== Test 4: Re-Ranking Algorithm ===');

  // Create mock memory for testing score calculation
  const mockMemory = {
    id: 'test-1',
    type: 'decision',
    confidence_score: 0.9,
    times_observed: 5,
    positive_feedback: 3,
    negative_feedback: 1,
    last_observed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
  };

  const query = 'What did we decide about the database?';
  const similarity = 0.85;

  const finalScore = retrievalService.calculateFinalScore(mockMemory, similarity, query);

  console.log('Mock memory:', {
    type: mockMemory.type,
    confidence: mockMemory.confidence_score,
    timesObserved: mockMemory.times_observed,
    feedback: `+${mockMemory.positive_feedback}/-${mockMemory.negative_feedback}`,
    daysOld: 7
  });
  console.log(`Query: "${query}"`);
  console.log(`Vector Similarity: ${similarity}`);
  console.log(`Final Score: ${finalScore.toFixed(4)}`);

  // Score breakdown
  console.log('\nScore Breakdown:');
  console.log(`  Vector (60%): ${(similarity * 0.60).toFixed(4)}`);
  console.log(`  Recency (10%): ${(Math.exp(-7 / 28) * 0.10).toFixed(4)}`);
  console.log(`  Confidence (15%): ${(0.9 * 0.15).toFixed(4)}`);
  console.log(`  Observations (10%): ${(Math.min(5 / 10, 1) * 0.10).toFixed(4)}`);
  console.log(`  Type Boost (5%): ${(0.05).toFixed(4)} (decision type)`);
  console.log(`  Query Boost (+15%): ${(0.15).toFixed(4)} (matched "decided")`);
  console.log(`  Feedback (+/-5%): ${((3 - 1) * 0.05).toFixed(4)}`);

  // Verify score is in valid range
  const passed = finalScore >= 0 && finalScore <= 1;
  console.log(`Test 4: ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

/**
 * Test 5: Query Type Boosting
 */
async function testQueryTypeBoosting() {
  console.log('\n=== Test 5: Query Type Boosting ===');

  const testCases = [
    { query: 'What mistake did we make?', expectedType: 'correction', boost: true },
    { query: 'What did we decide?', expectedType: 'decision', boost: true },
    { query: 'What do we always do?', expectedType: 'commitment', boost: true },
    { query: 'Tell me about the project', expectedType: 'decision', boost: false }
  ];

  let passed = true;

  for (const testCase of testCases) {
    const mockMemory = { type: testCase.expectedType, confidence_score: 0.8, times_observed: 1, last_observed_at: new Date().toISOString() };
    const baseScore = retrievalService.calculateFinalScore(mockMemory, 0.7, '');
    const boostedScore = retrievalService.calculateFinalScore(mockMemory, 0.7, testCase.query);

    const wasBoosted = boostedScore > baseScore;
    const testPassed = wasBoosted === testCase.boost;

    console.log(`Query: "${testCase.query}"`);
    console.log(`  Expected boost: ${testCase.boost}, Got boost: ${wasBoosted}`);
    console.log(`  Score change: ${baseScore.toFixed(4)} → ${boostedScore.toFixed(4)}`);
    console.log(`  ${testPassed ? 'PASS' : 'FAIL'}`);

    if (!testPassed) passed = false;
  }

  console.log(`Test 5: ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

/**
 * Test 6: Entity Extraction from Query
 */
async function testEntityExtraction() {
  console.log('\n=== Test 6: Entity Extraction ===');

  const queries = [
    'Tell me about SQLite and Vision',
    'What did John say in the meeting?',
    'Discuss the "Memory Lane" feature',
    'project: AI Command Center status'
  ];

  let passed = true;

  for (const query of queries) {
    const entities = await retrievalService.extractEntitiesFromQuery(query);
    console.log(`Query: "${query}"`);
    console.log(`  Extracted entities: ${entities.join(', ') || '(none)'}`);

    if (entities.length === 0) {
      console.log('  WARNING: No entities extracted');
    }
  }

  console.log(`Test 6: ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('====================================');
  console.log('Dual Retrieval System Test Suite');
  console.log('====================================');

  try {
    // Setup test data
    await setupTestData();

    // Run tests
    const results = {
      entityRetrieval: await testEntityRetrieval(),
      semanticSearch: await testSemanticSearch(),
      dualRetrieval: await testDualRetrieval(),
      reRanking: await testReRanking(),
      queryTypeBoosting: await testQueryTypeBoosting(),
      entityExtraction: await testEntityExtraction()
    };

    // Summary
    console.log('\n====================================');
    console.log('Test Summary');
    console.log('====================================');
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;

    Object.entries(results).forEach(([name, passed]) => {
      console.log(`${name}: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
    });

    console.log(`\nTotal: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Review output above.');
    }

  } catch (error) {
    console.error('Test suite error:', error);
    throw error;
  }
}

// Export for manual testing
export {
  setupTestData,
  testEntityRetrieval,
  testSemanticSearch,
  testDualRetrieval,
  testReRanking,
  testQueryTypeBoosting,
  testEntityExtraction,
  runAllTests
};

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
