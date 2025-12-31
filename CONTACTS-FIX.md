# Contacts Component Fix - 2025-12-30

## Problem
The 328 contacts imported via the API were not appearing in the Contacts UI tab in the Electron app.

## Root Cause
There were TWO separate contact components with different data sources:

1. **Relationships** (`src/components/relationships/Relationships.jsx`) - Uses `relationshipService` to query contacts from the SQLite database via IPC
2. **Contacts** (`src/components/contacts/Contacts.jsx`) - Was configured to use Google Contacts API (`window.electronAPI.googleGetContacts`)

The contacts were correctly imported into the SQLite database (verified with `curl http://localhost:3939/api/contacts`), but the Contacts tab was trying to fetch from Google API instead of the database.

## Solution
Modified `src/components/contacts/Contacts.jsx` to use the database as the data source:

### Changes Made:

1. **Import relationshipService** instead of using Google API
   ```javascript
   import relationshipService from '../../services/relationshipService.js';
   ```

2. **Simplified state** - Removed Google account-related state variables
   - Removed: `accounts`, `selectedAccountId`, `accountsDropdownOpen`, `syncing`
   - Kept: `contacts`, `selectedContact`, `searchQuery`, `loading`, `error`

3. **Updated loadContacts()** to use database
   ```javascript
   const loadContacts = async () => {
     const contactsList = await relationshipService.getAllContacts();
     setContacts(contactsList);
   };
   ```

4. **Fixed data mapping** for database contact format
   - Google format: `contact.names?.[0]?.displayName`, `contact.emailAddresses?.[0]?.value`
   - Database format: `contact.name`, `contact.email`, `contact.phone`, `contact.company`, `contact.title`

5. **Updated UI**
   - Removed account selector dropdown
   - Simplified header with refresh button
   - Updated stats to show total/filtered counts
   - Changed contact detail panel to display database fields

## Database Schema Reference
```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  notes TEXT,
  last_contact_at TEXT,
  priority TEXT DEFAULT 'medium',
  -- ... other fields
);
```

## Testing
1. Build verified: `npm run build` - Success
2. Test with API:
   ```bash
   curl http://localhost:3939/api/contacts
   # Should return 328 contacts
   ```
3. The Contacts tab should now display all 328 contacts from the database

## Future Considerations
- The app now has TWO ways to manage contacts:
  - **Contacts** tab: Simple directory view (read-only from database)
  - **Relationships** tab: Full CRM with interactions, groups, freshness tracking
- Consider merging these or clarifying their different purposes
- If Google Contacts sync is needed, implement it as a sync-to-database feature rather than a separate view

## Files Modified
- `src/components/contacts/Contacts.jsx` - Complete rewrite to use database instead of Google API
