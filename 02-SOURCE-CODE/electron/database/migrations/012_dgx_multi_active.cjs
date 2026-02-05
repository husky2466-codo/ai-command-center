/**
 * Migration 012: DGX Multi-Active Support
 * Adds GPU hardware info columns and seeds both Spark01 and Spark02 connections
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 012] Adding DGX multi-active support...');

    // =========================================================================
    // Add GPU hardware columns to dgx_connections
    // =========================================================================

    db.exec(`
      -- Add GPU count (detected on first connect)
      ALTER TABLE dgx_connections ADD COLUMN gpu_count INTEGER DEFAULT NULL;

      -- Add GPU model (e.g., "NVIDIA GB10")
      ALTER TABLE dgx_connections ADD COLUMN gpu_model TEXT DEFAULT NULL;
    `);
    console.log('[Migration 012] Added gpu_count and gpu_model columns');

    // =========================================================================
    // Create index for active connections (performance optimization)
    // =========================================================================

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dgx_active
      ON dgx_connections(is_active) WHERE is_active = 1;
    `);
    console.log('[Migration 012] Created index on is_active column');

    // =========================================================================
    // Seed both DGX Spark servers
    // =========================================================================

    db.exec(`
      -- Spark01 (Ross's original server)
      INSERT OR IGNORE INTO dgx_connections
        (id, name, hostname, username, ssh_key_path, port, is_active, created_at)
      VALUES
        (
          'dgx-20',
          'Spark01',
          '192.168.3.20',
          'myers',
          'C:/Users/myers/.ssh/dgx_spark_ross',
          22,
          1,
          datetime('now')
        );

      -- Spark02 (Second DGX server)
      INSERT OR IGNORE INTO dgx_connections
        (id, name, hostname, username, ssh_key_path, port, is_active, created_at)
      VALUES
        (
          'dgx-21',
          'Spark02',
          '192.168.3.21',
          'myers',
          'C:/Users/myers/.ssh/dgx_spark02',
          22,
          1,
          datetime('now')
        );
    `);
    console.log('[Migration 012] Seeded Spark01 and Spark02 connections');

    console.log('[Migration 012] DGX multi-active support added successfully');
  },

  down: (db) => {
    console.log('[Migration 012] Rolling back DGX multi-active support...');

    // Remove seeded connections
    db.exec(`
      DELETE FROM dgx_connections WHERE id IN ('dgx-20', 'dgx-21');
    `);
    console.log('[Migration 012] Removed seeded connections');

    // Drop index
    db.exec(`
      DROP INDEX IF EXISTS idx_dgx_active;
    `);
    console.log('[Migration 012] Dropped index');

    // Note: SQLite doesn't support DROP COLUMN, so we can't remove gpu_count/gpu_model
    // In production, you'd need to recreate the table without these columns
    console.log('[Migration 012] WARNING: Cannot drop gpu_count and gpu_model columns (SQLite limitation)');
    console.log('[Migration 012] Rollback completed (partial - columns remain)');
  }
};
