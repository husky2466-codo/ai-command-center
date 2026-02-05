/**
 * IPC Handler Registry
 * Registers all modular IPC handlers with the shared context.
 */

const filesystem = require('./filesystem.cjs');
const config = require('./config.cjs');
const logging = require('./logging.cjs');
const dialogs = require('./dialogs.cjs');
const memory = require('./memory.cjs');
const screenCapture = require('./screen-capture.cjs');
const googleAuth = require('./google-auth.cjs');
const googleAccounts = require('./google-accounts.cjs');
const googleSync = require('./google-sync.cjs');
const googleEmails = require('./google-emails.cjs');
const googleAttachments = require('./google-attachments.cjs');
const googleSearch = require('./google-search.cjs');
const googleCalendar = require('./google-calendar.cjs');
const googleContacts = require('./google-contacts.cjs');
const googleLabels = require('./google-labels.cjs');
const emailTemplates = require('./email-templates.cjs');
const emailSignatures = require('./email-signatures.cjs');
const terminal = require('./terminal.cjs');
const apiServer = require('./api-server.cjs');
const dgx = require('./dgx.cjs');
const dgxExports = require('./dgx-exports.cjs');
const claudeCli = require('./claude-cli.cjs');
const projects = require('./projects.cjs');

const modules = [
  filesystem,
  config,
  logging,
  dialogs,
  memory,
  screenCapture,
  googleAuth,
  googleAccounts,
  googleSync,
  googleEmails,
  googleAttachments,
  googleSearch,
  googleCalendar,
  googleContacts,
  googleLabels,
  emailTemplates,
  emailSignatures,
  terminal,
  apiServer,
  dgx,
  dgxExports,
  claudeCli,
  projects,
];

/**
 * Register all IPC handlers
 * @param {Electron.IpcMain} ipcMain
 * @param {object} context - Shared application context
 */
function registerAllHandlers(ipcMain, context) {
  for (const mod of modules) {
    mod.register(ipcMain, context);
  }
  console.log(`[IPC] Registered ${modules.length} handler modules`);
}

module.exports = { registerAllHandlers };
