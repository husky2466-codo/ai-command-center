/**
 * Google Attachments IPC Handlers
 * Channels: google:download-attachment, google:get-attachments, google:get-inline-images
 */

const fs = require('fs');
const path = require('path');

async function withGoogleService(context, accountId, callback) {
  const db = context.getDatabase();
  const account = await context.GoogleAccountService.getAccount(db, accountId);
  const service = new context.GoogleAccountService(db, account.email);
  await service.initialize();
  return await callback(service, db, account);
}

function register(ipcMain, context) {
  ipcMain.handle('google:download-attachment', async (event, accountId, messageId, attachmentId, filename) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.downloadAttachment(accountId, messageId, attachmentId, filename);

        // Save to user's downloads folder
        const downloadsPath = context.app.getPath('downloads');
        const filePath = path.join(downloadsPath, filename);

        // Convert URL-safe base64 to standard base64
        const standardBase64 = result.data
          .replace(/-/g, '+')
          .replace(/_/g, '/');

        // Write file
        const buffer = Buffer.from(standardBase64, 'base64');
        fs.writeFileSync(filePath, buffer);

        console.log(`[Main] Attachment saved: ${filePath}`);

        return {
          success: true,
          data: {
            filePath,
            size: buffer.length,
            filename
          }
        };
      });
    } catch (error) {
      console.error('[Main] google:download-attachment error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-attachments', async (event, accountId, messageId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const attachments = await service.getAttachments(accountId, messageId);
        return { success: true, data: attachments };
      });
    } catch (error) {
      console.error('[Main] google:get-attachments error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-inline-images', async (event, accountId, messageId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const inlineImages = await service.getInlineImages(accountId, messageId);
        return { success: true, data: inlineImages };
      });
    } catch (error) {
      console.error('[Main] google:get-inline-images error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
