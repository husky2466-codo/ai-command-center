/**
 * Email Signatures IPC Handlers
 * Channels: email:get-signatures, email:get-signature, email:create-signature,
 *           email:update-signature, email:delete-signature,
 *           email:get-default-signature, email:set-default-signature
 *
 * Note: These use GoogleAccountService instance methods (not static),
 *       but do NOT require initialize() for most operations.
 */

function register(ipcMain, context) {
  ipcMain.handle('email:get-signatures', async (event, accountId) => {
    try {
      const db = context.getDatabase();
      const account = await context.GoogleAccountService.getAccount(db, accountId);

      const service = new context.GoogleAccountService(db, account.email);
      const signatures = service.getSignatures(accountId);
      return { success: true, data: signatures };
    } catch (error) {
      console.error('[Main] email:get-signatures error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:get-signature', async (event, signatureId) => {
    try {
      const db = context.getDatabase();
      // We need to get account from the signature first, so use a simple query
      const stmt = db.prepare('SELECT * FROM email_signatures WHERE id = ?');
      const signature = stmt.get(signatureId);

      if (!signature) {
        return { success: false, error: 'Signature not found' };
      }

      return { success: true, data: signature };
    } catch (error) {
      console.error('[Main] email:get-signature error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:create-signature', async (event, accountId, data) => {
    try {
      const db = context.getDatabase();
      const account = await context.GoogleAccountService.getAccount(db, accountId);

      const service = new context.GoogleAccountService(db, account.email);
      const signature = service.createSignature(accountId, data);
      return { success: true, data: signature };
    } catch (error) {
      console.error('[Main] email:create-signature error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:update-signature', async (event, signatureId, data) => {
    try {
      const db = context.getDatabase();
      // Get the signature to find its account
      const stmt = db.prepare('SELECT account_id FROM email_signatures WHERE id = ?');
      const sigRow = stmt.get(signatureId);

      if (!sigRow) {
        return { success: false, error: 'Signature not found' };
      }

      const account = await context.GoogleAccountService.getAccount(db, sigRow.account_id);
      const service = new context.GoogleAccountService(db, account.email);
      const signature = service.updateSignature(signatureId, data);
      return { success: true, data: signature };
    } catch (error) {
      console.error('[Main] email:update-signature error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:delete-signature', async (event, signatureId) => {
    try {
      const db = context.getDatabase();
      // Get the signature to find its account
      const stmt = db.prepare('SELECT account_id FROM email_signatures WHERE id = ?');
      const sigRow = stmt.get(signatureId);

      if (!sigRow) {
        return { success: false, error: 'Signature not found' };
      }

      const account = await context.GoogleAccountService.getAccount(db, sigRow.account_id);
      const service = new context.GoogleAccountService(db, account.email);
      service.deleteSignature(signatureId);
      return { success: true, data: {} };
    } catch (error) {
      console.error('[Main] email:delete-signature error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:get-default-signature', async (event, accountId, type) => {
    try {
      const db = context.getDatabase();
      const account = await context.GoogleAccountService.getAccount(db, accountId);

      const service = new context.GoogleAccountService(db, account.email);
      const signature = service.getDefaultSignature(accountId, type || 'new');
      return { success: true, data: signature };
    } catch (error) {
      console.error('[Main] email:get-default-signature error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:set-default-signature', async (event, accountId, signatureId) => {
    try {
      const db = context.getDatabase();
      const account = await context.GoogleAccountService.getAccount(db, accountId);

      const service = new context.GoogleAccountService(db, account.email);
      const signature = service.setDefaultSignature(accountId, signatureId);
      return { success: true, data: signature };
    } catch (error) {
      console.error('[Main] email:set-default-signature error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
