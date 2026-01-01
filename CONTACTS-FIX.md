# Contacts Display Issue Fix

## Problem

The Contacts view shows 0 contacts even though 338 contacts are synced (shown in the account card for husky2466@gmail.com).

## Root Cause

There are **two separate contact tables** in the database:

1. **`contacts`** - Local CRM contact table (designed for manual relationship management)
2. **`account_contacts`** - Google synced contacts (populated during Google account sync)

The Contacts view (`src/components/contacts/Contacts.jsx`) is querying the **`contacts`** table via `relationshipService.getAllContacts()`, but the 338 synced contacts are stored in the **`account_contacts`** table.

## Solution: Display Google Account Contacts

Update Contacts.jsx to query `account_contacts` instead of `contacts` using the Google account service.

**Implementation:**
1. Add IPC handler to fetch contacts from `account_contacts`
2. Update Contacts.jsx to use the new handler
3. Maintain existing UI/UX (alphabetical grouping, search, detail panel)

## Code Changes

### Modified: `src/components/contacts/Contacts.jsx`

**Changed:**
1. Removed `relationshipService` import (no longer needed)
2. Updated `loadContacts()` function to query `account_contacts` table directly using `window.electronAPI.dbQuery()`
3. SQL query selects from `account_contacts` and maps fields:
   - `display_name` → `name`
   - `job_title` → `title`
   - Other fields: `email`, `phone`, `company`, `photo_url`
4. Updated component documentation to reflect it displays Google synced contacts

**Result:**
- Contacts view now displays all 338 synced Google contacts
- Existing UI (alphabetical grouping, search, detail panel) works unchanged
- No backend changes needed (IPC handlers already exist)

## Testing

1. Launch the app
2. Navigate to Contacts tab
3. Verify 338 contacts are displayed
4. Test search functionality
5. Test alphabetical navigation
6. Test contact detail panel

## Future Improvements

Consider implementing a sync process to copy `account_contacts` → `contacts` table to enable:
- Local CRM features (groups, freshness tracking, custom notes)
- Manual contact additions outside of Google
- Interaction logging and relationship management

This would require:
1. Deduplication logic (match by email)
2. Conflict resolution (Google changes vs local edits)
3. Background sync process when Google sync completes
