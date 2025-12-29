/**
 * Vector search migration - Creates sqlite-vss virtual tables
 * Only runs if sqlite-vss extension is available
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 002] Setting up vector search tables...');

    // Check if sqlite-vss is available by trying to create a test table
    try {
      // Create vector search table for memories
      // Using 1024 dimensions for mxbai-embed-large embeddings
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memories_vss USING vss0(
          embedding(1024)
        )
      `);
      console.log('[Migration 002] Created memories_vss virtual table');

      // Create vector search table for knowledge articles
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_vss USING vss0(
          embedding(1024)
        )
      `);
      console.log('[Migration 002] Created knowledge_vss virtual table');

      console.log('[Migration 002] Vector search tables created successfully');
    } catch (err) {
      console.warn('[Migration 002] sqlite-vss not available, skipping vector tables:', err.message);
      console.warn('[Migration 002] Vector search features will be disabled');
    }
  }
};
