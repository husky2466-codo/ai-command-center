/**
 * Google Calendar IPC Handlers
 * Channels: google:list-calendars, google:get-calendars, google:toggle-calendar-sync,
 *           google:get-events, google:create-event, google:update-event, google:delete-event
 */

async function withGoogleService(context, accountId, callback) {
  const db = context.getDatabase();
  const account = await context.GoogleAccountService.getAccount(db, accountId);
  const service = new context.GoogleAccountService(db, account.email);
  await service.initialize();
  return await callback(service, db, account);
}

function register(ipcMain, context) {
  ipcMain.handle('google:list-calendars', async (event, accountId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const calendars = await service.listCalendars(accountId);
        return { success: true, data: calendars };
      });
    } catch (error) {
      console.error('[Main] google:list-calendars error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-calendars', async (event, accountId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const calendars = service.getCalendarsFromDB(accountId);
        return { success: true, data: calendars };
      });
    } catch (error) {
      console.error('[Main] google:get-calendars error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:toggle-calendar-sync', async (event, accountId, calendarId, isSelected) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        service.toggleCalendarSync(accountId, calendarId, isSelected);
        return { success: true };
      });
    } catch (error) {
      console.error('[Main] google:toggle-calendar-sync error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:get-events', async (event, accountId, options) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const events = await service.getEvents(accountId, options || {});
        return { success: true, data: events };
      });
    } catch (error) {
      console.error('[Main] google:get-events error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:create-event', async (event, accountId, eventData) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.createEvent(accountId, eventData);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:create-event error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:update-event', async (event, accountId, eventId, updates) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        const result = await service.updateEvent(accountId, eventId, updates);
        return { success: true, data: result };
      });
    } catch (error) {
      console.error('[Main] google:update-event error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google:delete-event', async (event, accountId, eventId) => {
    try {
      return await withGoogleService(context, accountId, async (service) => {
        await service.deleteEvent(accountId, eventId);
        return { success: true, data: {} };
      });
    } catch (error) {
      console.error('[Main] google:delete-event error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
