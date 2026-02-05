/**
 * Google Auth IPC Handlers
 * Channels: google-auth:authenticate, google-auth:refresh-tokens,
 *           google-auth:revoke-access, google-auth:list-accounts,
 *           google-auth:encryption-status
 */

function register(ipcMain, context) {
  ipcMain.handle('google-auth:authenticate', async (event, scopes) => {
    try {
      const result = await context.authenticateGoogle(scopes);

      // After successful authentication, add account to database
      if (result.email) {
        const db = context.getDatabase();
        try {
          // Check if account already exists
          const existing = db.prepare('SELECT id FROM connected_accounts WHERE email = ? AND provider = ?').get(result.email, 'google');

          if (!existing) {
            // Add new account - OAuth2 client already has credentials set after auth
            const oauth2Client = context.getOAuth2Client();
            const accountId = await context.GoogleAccountService.addAccount(db, result.email, oauth2Client);
            console.log(`[Main] Added Google account to database: ${result.email} (${accountId})`);
            return { success: true, ...result, accountId };
          } else {
            console.log(`[Main] Google account already exists: ${result.email}`);
            return { success: true, ...result, accountId: existing.id };
          }
        } catch (dbError) {
          console.error('[Main] Error adding account to database:', dbError.message);
          // Auth succeeded but DB failed - still return success with email
          return { success: true, ...result };
        }
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('[Main] Google authentication error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google-auth:refresh-tokens', async (event, email) => {
    try {
      const tokens = await context.refreshTokens(email);
      return { success: true, tokens };
    } catch (error) {
      console.error('[Main] Token refresh error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google-auth:revoke-access', async (event, email) => {
    try {
      await context.revokeAccess(email);
      return { success: true };
    } catch (error) {
      console.error('[Main] Revoke access error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google-auth:list-accounts', async () => {
    try {
      const accounts = await context.listStoredAccounts('google');
      return { success: true, accounts };
    } catch (error) {
      console.error('[Main] List accounts error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google-auth:encryption-status', async () => {
    try {
      const status = context.getEncryptionStatus();
      return { success: true, ...status };
    } catch (error) {
      console.error('[Main] Encryption status error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
