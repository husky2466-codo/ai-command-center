/**
 * Google Emails IPC Handlers
 * Channels: google:get-emails, google:get-email, google:send-email,
 *           google:trash-email, google:delete-email, google:mark-email-read,
 *           google:toggle-email-star, google:reply-email, google:forward-email,
 *           google:batch-modify-emails, google:batch-trash-emails, google:batch-delete-emails
 */

async function withGoogleService(context, accountId, callback) {
  const db = context.getDatabase();
  const account = await context.GoogleAccountService.getAccount(db, accountId);
  const service = new context.GoogleAccountService(db, account.email);
  await service.initialize();
  return await callback(service, db, account);
}

function register(ipcMain, context) {
  ipcMain.handle('google:get-emails', async (event, accountId, options) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const emails = await service.getEmails(accountId, options || {});
        return { success: true, data: emails };
      });
    } catch (error) {
      console.error('[Main] google:get-emails error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-email', async (event, accountId, emailId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const email = await service.getEmail(accountId, emailId);
        return { success: true, data: email };
      });
    } catch (error) {
      console.error('[Main] google:get-email error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:send-email', async (event, accountId, message) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.sendEmail(accountId, message);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:send-email error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:trash-email', async (event, accountId, emailId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.trashEmail(accountId, emailId);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:trash-email error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:delete-email', async (event, accountId, emailId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.deleteEmail(accountId, emailId);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:delete-email error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:mark-email-read', async (event, accountId, emailId, isRead) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.markAsRead(accountId, emailId, isRead);
        return { success: true, data: result };
      });
    } catch (error) {
      // Don't spam logs for scope errors
      if (!error.message?.includes('insufficient authentication scopes')) console.error('[Main] google:mark-email-read error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:toggle-email-star', async (event, accountId, emailId, isStarred) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.toggleStar(accountId, emailId, isStarred);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:toggle-email-star error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:reply-email', async (event, accountId, emailId, message) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.replyToEmail(accountId, emailId, message);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:reply-email error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:forward-email', async (event, accountId, emailId, message) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.forwardEmail(accountId, emailId, message);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:forward-email error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Batch Email Operations
  ipcMain.handle('google:batch-modify-emails', async (event, accountId, emailIds, modifications) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.batchModifyEmails(accountId, emailIds, modifications);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:batch-modify-emails error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:batch-trash-emails', async (event, accountId, emailIds) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.batchTrashEmails(accountId, emailIds);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:batch-trash-emails error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:batch-delete-emails', async (event, accountId, emailIds) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.batchDeleteEmails(accountId, emailIds);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:batch-delete-emails error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
