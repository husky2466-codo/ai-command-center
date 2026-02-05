/**
 * Google Labels IPC Handlers
 * Channels: google:get-labels, google:get-label, google:create-label,
 *           google:update-label, google:delete-label, google:apply-label,
 *           google:remove-label
 */

async function withGoogleService(context, accountId, callback) {
  const db = context.getDatabase();
  const account = await context.GoogleAccountService.getAccount(db, accountId);
  const service = new context.GoogleAccountService(db, account.email);
  await service.initialize();
  return await callback(service, db, account);
}

function register(ipcMain, context) {
  ipcMain.handle('google:get-labels', async (event, accountId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const labels = await service.getLabels(accountId);
        return { success: true, data: labels };
      });
    } catch (error) {
      console.error('[Main] google:get-labels error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-label', async (event, accountId, labelId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const label = await service.getLabel(accountId, labelId);
        return { success: true, data: label };
      });
    } catch (error) {
      console.error('[Main] google:get-label error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:create-label', async (event, accountId, name, options) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const label = await service.createLabel(accountId, name, options || {});
        return { success: true, data: label };
      });
    } catch (error) {
      console.error('[Main] google:create-label error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:update-label', async (event, accountId, labelId, updates) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const label = await service.updateLabel(accountId, labelId, updates);
        return { success: true, data: label };
      });
    } catch (error) {
      console.error('[Main] google:update-label error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:delete-label', async (event, accountId, labelId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.deleteLabel(accountId, labelId);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:delete-label error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:apply-label', async (event, accountId, emailId, labelId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.applyLabel(accountId, emailId, labelId);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:apply-label error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:remove-label', async (event, accountId, emailId, labelId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.removeLabel(accountId, emailId, labelId);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:remove-label error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
