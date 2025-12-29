/**
 * Database test utility
 * Run this in the browser console to verify database is working
 */

export async function testDatabase() {
  console.log('=== Testing Database ===');

  try {
    // Test 1: Health check
    console.log('\n1. Health Check...');
    const health = await window.electronAPI.dbHealth();
    console.log('Health:', health);

    // Test 2: List tables
    console.log('\n2. List Tables...');
    const tables = await window.electronAPI.dbTables();
    console.log('Tables:', tables);

    // Test 3: Get schema for memories table
    console.log('\n3. Get Memories Schema...');
    const schema = await window.electronAPI.dbSchema('memories');
    console.log('Memories schema:', schema);

    // Test 4: Insert a test memory
    console.log('\n4. Insert Test Memory...');
    const testMemory = {
      type: 'learning',
      category: 'test',
      title: 'Database Test Memory',
      content: 'This is a test memory to verify database operations are working correctly.',
      confidence_score: 0.95
    };

    const insertResult = await window.electronAPI.dbRun(
      `INSERT INTO memories (id, type, category, title, content, confidence_score) VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), testMemory.type, testMemory.category, testMemory.title, testMemory.content, testMemory.confidence_score]
    );
    console.log('Insert result:', insertResult);

    // Test 5: Query all memories
    console.log('\n5. Query All Memories...');
    const memories = await window.electronAPI.dbQuery('SELECT * FROM memories');
    console.log('Memories found:', memories);

    // Test 6: Test BaseService
    console.log('\n6. Test BaseService...');
    const { BaseService } = await import('../services/BaseService.js');
    const memoryService = new BaseService('memories');

    const allMemories = await memoryService.getAll();
    console.log('BaseService getAll():', allMemories);

    // Test 7: Test DataService
    console.log('\n7. Test DataService...');
    const { dataService } = await import('../services/DataService.js');

    const serviceHealth = await dataService.checkHealth();
    console.log('DataService health:', serviceHealth);

    const tablelist = await dataService.getTables();
    console.log('DataService tables:', tablelist);

    console.log('\n=== All Tests Passed! ===');
    return { success: true, message: 'Database is working correctly!' };
  } catch (err) {
    console.error('Test failed:', err);
    return { success: false, error: err.message };
  }
}

// Make it available globally for easy testing
window.testDatabase = testDatabase;
