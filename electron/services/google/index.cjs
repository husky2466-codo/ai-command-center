/**
 * Google Services - Organized exports
 *
 * This module organizes the Google Account services into focused modules:
 * - googleBaseService.cjs: OAuth, token management, account CRUD
 * - gmailService.cjs: Email operations (partial - in progress)
 * - googleCalendarService.cjs: Calendar event operations
 * - googleContactsService.cjs: Contact management
 *
 * For now, this re-exports the original unified service for backward compatibility.
 * Future work will complete the modular split.
 *
 * USAGE:
 * ```js
 * const GoogleAccountService = require('./services/google');
 * // or
 * const { GoogleBaseService, GoogleCalendarService, GoogleContactsService } = require('./services/google');
 * ```
 */

// Export base service and specialized services
const { GoogleBaseService } = require('./googleBaseService.cjs');
const GoogleCalendarService = require('./googleCalendarService.cjs');
const GoogleContactsService = require('./googleContactsService.cjs');

// For now, re-export the original unified service for backward compatibility
// This is a 2823-line file that mixes Gmail, Calendar, and Contacts
// TODO: Complete gmailService.cjs and create a proper unified wrapper
const GoogleAccountService = require('../googleAccountService.cjs');

// Default export: original unified service
module.exports = GoogleAccountService;

// Named exports: specialized services (for gradual migration)
module.exports.GoogleAccountService = GoogleAccountService;
module.exports.GoogleBaseService = GoogleBaseService;
module.exports.GoogleCalendarService = GoogleCalendarService;
module.exports.GoogleContactsService = GoogleContactsService;
