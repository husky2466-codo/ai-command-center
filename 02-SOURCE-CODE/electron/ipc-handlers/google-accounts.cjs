/**
 * Google Accounts IPC Handlers
 * Channels: google:add-account, google:remove-account, google:list-accounts,
 *           google:get-account, google:toggle-sync
 */

function register(ipcMain, context) {
  ipcMain.handle('google:add-account', async (event, email) => {
    try {
      const db = context.getDatabase();
      const oauth2Client = context.getOAuth2Client();

      const accountId = await context.GoogleAccountService.addAccount(db, email, oauth2Client);
      return { success: true, data: { accountId } };
    } catch (error) {
      console.error('[Main] google:add-account error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:remove-account', async (event, accountId) => {
    try {
      const db = context.getDatabase();
      await context.GoogleAccountService.removeAccount(db, accountId);
      return { success: true, data: {} };
    } catch (error) {
      console.error('[Main] google:remove-account error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:list-accounts', async () => {
    try {
      const db = context.getDatabase();
      const accounts = await context.GoogleAccountService.listAccounts(db);

      // Enrich accounts with counts and sync status
      const enrichedAccounts = accounts.map(account => {
        // Get email count
        const emailCountStmt = db.prepare('SELECT COUNT(*) as count FROM account_emails WHERE account_id = ?');
        const emailCount = emailCountStmt.get(account.id)?.count || 0;

        // Get event count
        const eventCountStmt = db.prepare('SELECT COUNT(*) as count FROM account_calendar_events WHERE account_id = ?');
        const eventCount = eventCountStmt.get(account.id)?.count || 0;

        // Get contact count
        const contactCountStmt = db.prepare('SELECT COUNT(*) as count FROM account_contacts WHERE account_id = ?');
        const contactCount = contactCountStmt.get(account.id)?.count || 0;

        // Determine sync status
        let syncStatus = 'never';
        if (account.last_sync_at) {
          const now = Date.now();
          const lastSync = account.last_sync_at;
          const diffMinutes = (now - lastSync) / (1000 * 60);

          // Check if currently syncing (check sync_state table)
          const syncStateStmt = db.prepare('SELECT last_sync_at FROM account_sync_state WHERE account_id = ? ORDER BY last_sync_at DESC LIMIT 1');
          const syncState = syncStateStmt.get(account.id);

          // If synced in last 5 minutes, consider it synced
          if (diffMinutes < 5) {
            syncStatus = 'synced';
          } else {
            syncStatus = 'synced'; // Default to synced if we have a last_sync_at
          }
        }

        return {
          ...account,
          emailCount,
          eventCount,
          contactCount,
          syncStatus
        };
      });

      return { success: true, data: enrichedAccounts };
    } catch (error) {
      console.error('[Main] google:list-accounts error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-account', async (event, accountId) => {
    try {
      const db = context.getDatabase();
      const account = await context.GoogleAccountService.getAccount(db, accountId);
      return { success: true, data: account };
    } catch (error) {
      console.error('[Main] google:get-account error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:toggle-sync', async (event, accountId, enabled) => {
    try {
      const db = context.getDatabase();
      const stmt = db.prepare('UPDATE connected_accounts SET sync_enabled = ? WHERE id = ?');
      stmt.run(enabled ? 1 : 0, accountId);
      return { success: true, data: { accountId, enabled } };
    } catch (error) {
      console.error('[Main] google:toggle-sync error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
