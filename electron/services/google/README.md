# Google Services Refactor

This directory contains the refactored Google Account Service, organized into focused, manageable modules.

## Overview

The original `googleAccountService.cjs` was 2,823 lines mixing Gmail, Calendar, and Contacts operations. This refactor splits it into:

- **googleBaseService.cjs** (256 lines) - OAuth, token management, account CRUD
- **gmailService.cjs** (900+ lines) - Email sync, operations, labels, attachments (PARTIAL - IN PROGRESS)
- **googleCalendarService.cjs** (220 lines) - Calendar event operations
- **googleContactsService.cjs** (180 lines) - Contact management
- **index.cjs** - Exports with backward compatibility
- **package.json** - Module entry point configuration

## Current Status

### Completed
- Base service with OAuth and shared utilities
- Calendar service (complete)
- Contacts service (complete)
- Gmail service (partial - core email operations)
- Backward compatibility layer

### In Progress
- Gmail service still needs:
  - Batch operations (batchModifyEmails, batchTrashEmails, batchDeleteEmails)
  - Label management (getLabels, createLabel, updateLabel, deleteLabel, applyLabel, removeLabel)
  - Attachments (downloadAttachment, getAttachments, getInlineImages)
  - Templates (getTemplates, createTemplate, updateTemplate, deleteTemplate)
  - Signatures (getSignatures, createSignature, updateSignature, deleteSignature)
  - Advanced search (searchEmails with Gmail query parser)
  - Saved searches (saveSearch, getSavedSearches, updateSavedSearch)
  - Sync status utilities (getSyncStatus, syncAll)

## Usage

### Option 1: Original Unified Service (Backward Compatible)

```javascript
const GoogleAccountService = require('./services/google');

const service = new GoogleAccountService(db, email);
await service.initialize();

// All original methods still work
await service.syncEmails(accountId);
await service.syncCalendar(accountId);
await service.syncContacts(accountId);
```

### Option 2: Individual Services (Recommended for New Code)

```javascript
const { GoogleCalendarService, GoogleContactsService } = require('./services/google');

// Use only what you need
const calendarService = new GoogleCalendarService(db, email);
await calendarService.initialize();

const events = await calendarService.getEvents(accountId, {
  startTime: Date.now(),
  limit: 50
});
```

### Option 3: Base Service Only (for account management)

```javascript
const { GoogleBaseService } = require('./services/google');

// Static methods for account management
const accountId = await GoogleBaseService.addAccount(db, email, oauth2Client);
const accounts = await GoogleBaseService.listAccounts(db);
```

## File Breakdown

### googleBaseService.cjs
**Shared base class for all Google services**

- OAuth2 client initialization
- Token validation and refresh
- Sync state management
- Static account management methods:
  - `addAccount(db, email, oauth2Client)`
  - `removeAccount(db, accountId)`
  - `getAccount(db, accountId)`
  - `listAccounts(db)`
- Utility functions:
  - `withExponentialBackoff()` - API retry logic
  - `isoToTimestamp()` - Date conversion
  - `sleep()` - Rate limiting helper

### gmailService.cjs (PARTIAL)
**Email operations**

Currently implemented:
- Email sync (full and incremental via History API)
- Email retrieval (getEmails, getEmail, searchEmails)
- Email sending (sendEmail, replyToEmail, forwardEmail)
- Email management (trashEmail, deleteEmail, markAsRead, toggleStar)
- Database operations (_upsertEmail, _updateEmailLabels, _deleteEmail)

Still needed (from original service):
- Batch operations (~200 lines)
- Label management (~300 lines)
- Attachments and inline images (~200 lines)
- Templates CRUD (~300 lines)
- Signatures CRUD (~180 lines)
- Advanced search with query parser (~350 lines)
- Saved searches (~120 lines)

**Total: ~900 lines implemented, ~1,650 lines remaining**

### googleCalendarService.cjs (COMPLETE)
**Calendar event operations**

- syncCalendar() - Fetch upcoming events
- getEvents() - Query local database
- createEvent() - Add new calendar event
- updateEvent() - Modify existing event
- deleteEvent() - Remove event
- _upsertCalendarEvent() - Database sync

### googleContactsService.cjs (COMPLETE)
**Contact management via People API**

- syncContacts() - Paginated contact sync
- getContacts() - Query with search and pagination
- getContact() - Single contact details
- _upsertContact() - Database sync

### index.cjs
**Module exports and backward compatibility**

For now, this re-exports the original `googleAccountService.cjs` for full backward compatibility. Once Gmail service is complete, this will switch to a unified wrapper that delegates to individual services.

## Migration Path

### Phase 1 (Current): Directory structure + partial split
- Created modular directory structure
- Implemented base, calendar, and contacts services
- Partial Gmail service with core operations
- Backward compatibility maintained via index.cjs

### Phase 2 (Future): Complete Gmail service
- Move remaining ~1,650 lines from original service to gmailService.cjs
- Implement batch operations, labels, attachments, templates, signatures
- Implement advanced search and saved searches
- Update index.cjs to use completed modular services

### Phase 3 (Future): Full migration
- Update all IPC handlers to use individual services where beneficial
- Remove original googleAccountService.cjs
- Update documentation and examples

## Benefits of Refactor

1. **Focused Modules**: Each service <600 lines (original was 2,823)
2. **Clear Responsibilities**: Gmail/Calendar/Contacts separated
3. **Easier Testing**: Test individual services in isolation
4. **Better Code Navigation**: Find methods quickly by service type
5. **Gradual Migration**: Backward compatibility allows safe transition
6. **Reusability**: Use only the services you need

## Testing

All services can be imported and initialized:

```bash
cd D:\Projects\ai-command-center
node -e "const GoogleAccountService = require('./electron/services/google'); console.log('✓ Import successful');"
```

## Next Steps

1. Complete gmailService.cjs with remaining methods
2. Update index.cjs to use UnifiedGoogleAccountService wrapper
3. Add JSDoc documentation to all public methods
4. Create unit tests for each service
5. Update API handlers to use modular services

## Files Created

- `electron/services/google/googleBaseService.cjs` - 256 lines
- `electron/services/google/gmailService.cjs` - 900 lines (partial)
- `electron/services/google/googleCalendarService.cjs` - 220 lines
- `electron/services/google/googleContactsService.cjs` - 180 lines
- `electron/services/google/index.cjs` - 39 lines
- `electron/services/google/package.json` - 5 lines
- `electron/services/google/README.md` - This file

## Files Modified

- `electron/main.cjs` - Updated import to `require('./services/google')`

## Original File Preserved

- `electron/services/googleAccountService.cjs` - 2,823 lines (unchanged, still in use via index.cjs)

---

**Last Updated**: 2025-12-30
**Status**: Phase 1 Complete, Phase 2 In Progress
