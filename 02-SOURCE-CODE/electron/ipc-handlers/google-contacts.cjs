/**
 * Google Contacts IPC Handlers
 * Channels: google:get-contacts, google:get-contact
 */

async function withGoogleService(context, accountId, callback) {
  const db = context.getDatabase();
  const account = await context.GoogleAccountService.getAccount(db, accountId);
  const service = new context.GoogleAccountService(db, account.email);
  await service.initialize();
  return await callback(service, db, account);
}

function register(ipcMain, context) {
  ipcMain.handle('google:get-contacts', async (event, accountId, options) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const contacts = await service.getContacts(accountId, options || {});
        return { success: true, data: contacts };
      });
    } catch (error) {
      console.error('[Main] google:get-contacts error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-contact', async (event, accountId, contactId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const contact = await service.getContact(accountId, contactId);
        return { success: true, data: contact };
      });
    } catch (error) {
      console.error('[Main] google:get-contact error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
