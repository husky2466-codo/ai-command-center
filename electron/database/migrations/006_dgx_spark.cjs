/**
 * DGX Spark migration - Creates tables for DGX connection management,
 * remote project tracking, training jobs, and GPU metrics
 */

module.exports = {
  up: (db) => {
    console.log('[Migration 006] Creating DGX Spark tables...');

    // =========================================================================
    // DGX CONNECTIONS (Support multiple DGX units)
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS dgx_connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        hostname TEXT NOT NULL,
        username TEXT NOT NULL,
        ssh_key_path TEXT,
        port INTEGER DEFAULT 22,
        is_active INTEGER DEFAULT 0,
        last_connected_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migration 006] Created dgx_connections table');

    // =========================================================================
    // DGX PROJECTS (Separate from regular projects)
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS dgx_projects (
        id TEXT PRIMARY KEY,
        connection_id TEXT REFERENCES dgx_connections(id),
        name TEXT NOT NULL,
        description TEXT,
        project_type TEXT,
        remote_path TEXT,
        status TEXT DEFAULT 'active',
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migration 006] Created dgx_projects table');

    // =========================================================================
    // TRAINING JOBS
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS dgx_training_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES dgx_projects(id),
        name TEXT NOT NULL,
        model_name TEXT,
        status TEXT DEFAULT 'pending',
        config TEXT,
        metrics TEXT,
        container_id TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migration 006] Created dgx_training_jobs table');

    // =========================================================================
    // GPU METRICS HISTORY (For charts)
    // =========================================================================

    db.exec(`
      CREATE TABLE IF NOT EXISTS dgx_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id TEXT REFERENCES dgx_connections(id),
        gpu_utilization REAL,
        memory_used_mb INTEGER,
        memory_total_mb INTEGER,
        temperature_c INTEGER,
        power_watts REAL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migration 006] Created dgx_metrics table');

    console.log('[Migration 006] DGX Spark tables created successfully');
  }
};
