/**
 * IPC handlers for database operations
 * Exposes database functionality to the renderer process
 */

const { ipcMain } = require('electron');
const { getDatabase } = require('./db.cjs');

/**
 * Register all database IPC handlers
 */
function registerDatabaseHandlers() {
  console.log('[Database IPC] Registering handlers...');

  // Generic query handler (SELECT)
  ipcMain.handle('db:query', async (event, sql, params = []) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      const result = stmt.all(...params);
      return { success: true, data: result };
    } catch (err) {
      console.error('[Database IPC] Query error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Generic run handler (INSERT/UPDATE/DELETE)
  ipcMain.handle('db:run', async (event, sql, params = []) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return { success: true, changes: info.changes, lastInsertRowid: info.lastInsertRowid };
    } catch (err) {
      console.error('[Database IPC] Run error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Generic get handler (SELECT single row)
  ipcMain.handle('db:get', async (event, sql, params = []) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      const result = stmt.get(...params);
      return { success: true, data: result };
    } catch (err) {
      console.error('[Database IPC] Get error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Transaction handler - executes multiple operations atomically
  ipcMain.handle('db:transaction', async (event, operations) => {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      const results = [];
      for (const op of operations) {
        const stmt = db.prepare(op.sql);
        const result = op.type === 'run' ? stmt.run(...(op.params || [])) : stmt.all(...(op.params || []));
        results.push(result);
      }
      return results;
    });

    try {
      const results = transaction();
      return { success: true, data: results };
    } catch (err) {
      console.error('[Database IPC] Transaction error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Health check handler
  ipcMain.handle('db:health', async () => {
    try {
      const db = getDatabase();
      // Try a simple query
      db.prepare('SELECT 1').get();

      // Check if vector search is available
      let vectorSearchAvailable = false;
      try {
        db.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="memories_vss"').get();
        vectorSearchAvailable = true;
      } catch (err) {
        vectorSearchAvailable = false;
      }

      return {
        success: true,
        healthy: true,
        vectorSearchAvailable
      };
    } catch (err) {
      console.error('[Database IPC] Health check error:', err.message);
      return {
        success: false,
        healthy: false,
        error: err.message
      };
    }
  });

  // Get table list
  ipcMain.handle('db:tables', async () => {
    try {
      const db = getDatabase();
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      ).all();
      return { success: true, data: tables.map(t => t.name) };
    } catch (err) {
      console.error('[Database IPC] Tables error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get table schema
  ipcMain.handle('db:schema', async (event, tableName) => {
    try {
      const db = getDatabase();
      const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
      return { success: true, data: schema };
    } catch (err) {
      console.error('[Database IPC] Schema error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Vector search handler (if available)
  ipcMain.handle('db:vector-search', async (event, { table, embedding, limit = 10 }) => {
    try {
      const db = getDatabase();

      // Check if vector search is available
      const vssTable = `${table}_vss`;
      const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(vssTable);

      if (!tableExists) {
        return { success: false, error: 'Vector search not available for this table' };
      }

      // Perform vector similarity search
      // The embedding should be a Float32Array or similar
      const results = db.prepare(`
        SELECT rowid, distance
        FROM ${vssTable}
        WHERE vss_search(embedding, ?)
        LIMIT ?
      `).all(Buffer.from(embedding.buffer), limit);

      return { success: true, data: results };
    } catch (err) {
      console.error('[Database IPC] Vector search error:', err.message);
      return { success: false, error: err.message };
    }
  });

  console.log('[Database IPC] All handlers registered successfully');
}

module.exports = { registerDatabaseHandlers };
