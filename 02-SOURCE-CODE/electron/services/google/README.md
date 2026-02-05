# Google Services - Modular Architecture

This directory contains the refactored Google Account Service, split from a 3,100-line monolith into 8 focused modules using a facade pattern.

## Architecture

```
google/
  index.cjs           - GoogleAccountService facade (64 delegating methods)
  base.cjs             - GoogleBaseService + shared helpers (~260 lines)
  gmail.cjs            - GmailService (29 methods) - email CRUD, sync, batch, labels, attachments
  gmailSearch.cjs      - Search mixin (11 methods) - Gmail query parsing, saved searches
  calendar.cjs         - GoogleCalendarService (12 methods) - calendar sync, event CRUD
  contacts.cjs         - GoogleContactsService (4 methods) - contact sync and CRUD
  templates.cjs        - EmailTemplateService (8 static methods) - email templates
  signatures.cjs       - EmailSignatureService (7 methods) - email signatures
  package.json         - Module entry point (main: index.cjs)
```

## Usage

```javascript
// All existing code continues to work unchanged:
const GoogleAccountService = require('./services/google');
const service = new GoogleAccountService(db, email);
await service.initialize();

// The redirect in services/googleAccountService.cjs also works:
const GoogleAccountService = require('./services/googleAccountService');
```

The facade in `index.cjs` composes all sub-services and delegates every method call, so consumers see a single unified class with all 64+ methods and all static methods.

## Sub-Service Details

| Module | Class | Methods | Purpose |
|--------|-------|---------|---------|
| base.cjs | GoogleBaseService | ~15 | OAuth, tokens, account CRUD, sync state, shared helpers |
| gmail.cjs | GmailService | 29 | Email sync, send, reply, forward, trash, batch ops, labels, attachments |
| gmailSearch.cjs | (mixin) | 11 | Gmail-style query parsing, search execution, saved searches |
| calendar.cjs | GoogleCalendarService | 12 | Calendar sync, event CRUD, recurrence, reminders |
| contacts.cjs | GoogleContactsService | 4 | Contact sync, search, CRUD |
| templates.cjs | EmailTemplateService | 8 | Email template CRUD (static, DB-only) |
| signatures.cjs | EmailSignatureService | 7 | Email signature CRUD (DB-only) |
| index.cjs | GoogleAccountService | 64 | Facade that delegates to all sub-services |

## Backward Compatibility

- `electron/services/googleAccountService.cjs` is a one-line redirect to `./google/index.cjs`
- All IPC handlers continue to use the same API with zero changes
- Static methods (addAccount, removeAccount, etc.) are available on the facade class

## Testing

```bash
# Verify facade loads
node -e "const G = require('./electron/services/google/index.cjs'); console.log('OK');"

# Verify redirect works
node -e "const G1 = require('./electron/services/google/index.cjs'); const G2 = require('./electron/services/googleAccountService.cjs'); console.log('Same:', G1 === G2);"
```

---

**Last Updated**: 2026-02-05
**Status**: Complete
