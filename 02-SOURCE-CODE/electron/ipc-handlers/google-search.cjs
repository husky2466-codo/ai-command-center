/**
 * Google Search IPC Handlers
 * Channels: google:search-emails, google:save-search, google:get-saved-searches,
 *           google:update-saved-search, google:delete-saved-search,
 *           google:record-search-usage, google:get-recent-searches
 */

async function withGoogleService(context, accountId, callback) {
  const db = context.getDatabase();
  const account = await context.GoogleAccountService.getAccount(db, accountId);
  const service = new context.GoogleAccountService(db, account.email);
  await service.initialize();
  return await callback(service, db, account);
}

function register(ipcMain, context) {
  ipcMain.handle('google:search-emails', async (event, accountId, query, options) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const results = await service.searchEmails(accountId, query, options || {});
        return { success: true, data: results };
      });
    } catch (error) {
      console.error('[Main] google:search-emails error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:save-search', async (event, accountId, name, query, isFavorite) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const savedSearch = await service.saveSearch(accountId, name, query, isFavorite);
        return { success: true, data: savedSearch };
      });
    } catch (error) {
      console.error('[Main] google:save-search error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-saved-searches', async (event, accountId, options) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const searches = await service.getSavedSearches(accountId, options || {});
        return { success: true, data: searches };
      });
    } catch (error) {
      console.error('[Main] google:get-saved-searches error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:update-saved-search', async (event, searchId, updates) => {
    try {
      const db = context.getDatabase();
      // For saved searches, we don't need to initialize the service
      const stmt = db.prepare('SELECT account_id FROM saved_searches WHERE id = ?');
      const search = stmt.get(searchId);

      if (!search) {
        return { success: false, error: 'Saved search not found' };
      }

      const account = await context.GoogleAccountService.getAccount(db, search.account_id);
      const service = new context.GoogleAccountService(db, account.email);
      await service.initialize();

      const updatedSearch = await service.updateSavedSearch(searchId, updates);
      return { success: true, data: updatedSearch };
    } catch (error) {
      console.error('[Main] google:update-saved-search error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:delete-saved-search', async (event, searchId) => {
    try {
      const db = context.getDatabase();
      // For saved searches, we don't need to initialize the service
      const stmt = db.prepare('SELECT account_id FROM saved_searches WHERE id = ?');
      const search = stmt.get(searchId);

      if (!search) {
        return { success: false, error: 'Saved search not found' };
      }

      const account = await context.GoogleAccountService.getAccount(db, search.account_id);
      const service = new context.GoogleAccountService(db, account.email);
      await service.initialize();

      const deleted = await service.deleteSavedSearch(searchId);
      return { success: true, data: { deleted } };
    } catch (error) {
      console.error('[Main] google:delete-saved-search error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:record-search-usage', async (event, searchId) => {
    try {
      const db = context.getDatabase();
      const stmt = db.prepare('SELECT account_id FROM saved_searches WHERE id = ?');
      const search = stmt.get(searchId);

      if (!search) {
        return { success: false, error: 'Saved search not found' };
      }

      const account = await context.GoogleAccountService.getAccount(db, search.account_id);
      const service = new context.GoogleAccountService(db, account.email);
      await service.initialize();

      await service.recordSearchUsage(searchId);
      return { success: true };
    } catch (error) {
      console.error('[Main] google:record-search-usage error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-recent-searches', async (event, accountId, limit) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const searches = await service.getRecentSearches(accountId, limit || 10);
        return { success: true, data: searches };
      });
    } catch (error) {
      console.error('[Main] google:get-recent-searches error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
