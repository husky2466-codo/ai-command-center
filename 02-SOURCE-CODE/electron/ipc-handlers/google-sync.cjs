/**
 * Google Sync IPC Handlers
 * Channels: google:sync-all, google:sync-emails, google:sync-calendar,
 *           google:sync-contacts, google:get-sync-status
 */

async function withGoogleService(context, accountId, callback) {
  const db = context.getDatabase();
  const account = await context.GoogleAccountService.getAccount(db, accountId);
  const service = new context.GoogleAccountService(db, account.email);
  await service.initialize();
  return await callback(service, db, account);
}

function register(ipcMain, context) {
  ipcMain.handle('google:sync-all', async (event, accountId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const results = await service.syncAll(accountId);
        return { success: true, data: results };
      });
    } catch (error) {
      console.error('[Main] google:sync-all error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:sync-emails', async (event, accountId, options) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const results = await service.syncEmails(accountId, options || {});
        return { success: true, data: results };
      });
    } catch (error) {
      console.error('[Main] google:sync-emails error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:sync-calendar', async (event, accountId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        // Use syncAllCalendars to sync all selected calendars
        const results = await service.syncAllCalendars(accountId);
        return { success: true, data: results };
      });
    } catch (error) {
      console.error('[Main] google:sync-calendar error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:sync-contacts', async (event, accountId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const results = await service.syncContacts(accountId);
        return { success: true, data: results };
      });
    } catch (error) {
      console.error('[Main] google:sync-contacts error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-sync-status', async (event, accountId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const status = await service.getSyncStatus(accountId);
        return { success: true, data: status };
      });
    } catch (error) {
      console.error('[Main] google:get-sync-status error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
