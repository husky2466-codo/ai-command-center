/**
 * Email Templates IPC Handlers
 * Channels: email:get-templates, email:get-template, email:create-template,
 *           email:update-template, email:delete-template, email:increment-template-usage,
 *           email:toggle-template-favorite, email:get-template-categories
 *
 * Note: These use direct DB queries via GoogleAccountService static methods,
 *       NOT instance methods requiring initialization.
 */

function register(ipcMain, context) {
  ipcMain.handle('email:get-templates', async (event, accountId) => {
    try {
      const db = context.getDatabase();
      const templates = context.GoogleAccountService.getTemplates(db, accountId);
      return { success: true, data: templates };
    } catch (error) {
      console.error('[Main] email:get-templates error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:get-template', async (event, templateId) => {
    try {
      const db = context.getDatabase();
      const template = context.GoogleAccountService.getTemplate(db, templateId);
      return { success: true, data: template };
    } catch (error) {
      console.error('[Main] email:get-template error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:create-template', async (event, data) => {
    try {
      const db = context.getDatabase();
      const template = context.GoogleAccountService.createTemplate(db, data);
      return { success: true, data: template };
    } catch (error) {
      console.error('[Main] email:create-template error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:update-template', async (event, templateId, updates) => {
    try {
      const db = context.getDatabase();
      const template = context.GoogleAccountService.updateTemplate(db, templateId, updates);
      return { success: true, data: template };
    } catch (error) {
      console.error('[Main] email:update-template error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:delete-template', async (event, templateId) => {
    try {
      const db = context.getDatabase();
      const result = context.GoogleAccountService.deleteTemplate(db, templateId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[Main] email:delete-template error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:increment-template-usage', async (event, templateId) => {
    try {
      const db = context.getDatabase();
      const template = context.GoogleAccountService.incrementTemplateUsage(db, templateId);
      return { success: true, data: template };
    } catch (error) {
      console.error('[Main] email:increment-template-usage error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:toggle-template-favorite', async (event, templateId) => {
    try {
      const db = context.getDatabase();
      const template = context.GoogleAccountService.toggleTemplateFavorite(db, templateId);
      return { success: true, data: template };
    } catch (error) {
      console.error('[Main] email:toggle-template-favorite error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('email:get-template-categories', async (event, accountId) => {
    try {
      const db = context.getDatabase();
      const categories = context.GoogleAccountService.getTemplateCategories(db, accountId);
      return { success: true, data: categories };
    } catch (error) {
      console.error('[Main] email:get-template-categories error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
