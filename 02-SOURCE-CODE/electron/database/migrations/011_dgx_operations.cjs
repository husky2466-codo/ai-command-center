/**
 * Migration 011: DGX Operations Table
 * Creates dgx_operations table for tracking ComfyUI, services, and other DGX operations
 */

module.exports = {
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS dgx_operations (
        id TEXT PRIMARY KEY,
        connection_id TEXT,
        project_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        status TEXT DEFAULT 'pending',
        pid INTEGER,
        command TEXT,
        progress INTEGER DEFAULT -1,
        progress_current INTEGER,
        progress_total INTEGER,
        progress_message TEXT,
        port INTEGER,
        url TEXT,
        websocket_url TEXT,
        metrics TEXT,
        log_file TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_dgx_operations_connection ON dgx_operations(connection_id);
      CREATE INDEX IF NOT EXISTS idx_dgx_operations_status ON dgx_operations(status);
      CREATE INDEX IF NOT EXISTS idx_dgx_operations_type ON dgx_operations(type);
    `);
  },

  down: (db) => {
    db.exec('DROP TABLE IF EXISTS dgx_operations');
  }
};
