# Contact Import Scripts

This directory contains scripts to import contacts from a Google Contacts CSV export into AI Command Center.

## Overview

Three import methods are available:

1. **API-based import** (RECOMMENDED) - Works while app is running
2. **Direct database import** - Requires app to be closed and better-sqlite3 rebuild
3. **PowerShell automation** - Handles closing app and rebuilding automatically

## Method 1: API-Based Import (RECOMMENDED)

### Prerequisites
- AI Command Center must be running
- API server must be enabled (starts automatically with app)

### Usage

```bash
node electron/scripts/import-contacts-via-api.js "C:\Users\myers\Documents\Downloads\contacts.csv"
```

### How It Works
- Connects to the local API server at `http://localhost:3939`
- Creates contacts via POST `/api/contacts` endpoint
- Handles duplicates gracefully (slug auto-incremented)
- Rate-limited to avoid overwhelming the server
- Safe - no direct database access needed

### Output
```
📥 Starting contact import via API...

🔌 Checking API server...
✅ API server is running

📋 Found 44 columns in CSV
📄 Processing 338 rows...

✅ Imported 25 contacts...
✅ Imported 50 contacts...
...

✨ Import complete!

📊 Summary:
   ✅ Imported: 285
   ⏭️  Skipped (no data): 45
   ❌ Errors: 8
   📄 Total rows processed: 338
```

## Method 2: Direct Database Import

### Prerequisites
- AI Command Center must be **CLOSED**
- better-sqlite3 must be rebuilt for current Node.js version

### Steps

1. Close AI Command Center (if running)

2. Rebuild better-sqlite3:
   ```bash
   npm rebuild better-sqlite3
   ```

3. Run import:
   ```bash
   node electron/scripts/import-contacts.js "C:\Users\myers\Documents\Downloads\contacts.csv"
   ```

### How It Works
- Direct SQLite database access via better-sqlite3
- Faster than API method for large imports
- Checks for duplicate slugs and adds numeric suffix
- Requires exclusive database access (app must be closed)

## Method 3: PowerShell Automation

### Prerequisites
- None! Script handles everything automatically

### Usage

```powershell
powershell -ExecutionPolicy Bypass -File electron/scripts/import-contacts.ps1 -CsvPath "C:\Users\myers\Documents\Downloads\contacts.csv"
```

### How It Works
1. Checks if AI Command Center is running
2. Closes the app if needed
3. Rebuilds better-sqlite3
4. Runs the direct database import
5. Reports success

## CSV Format

The scripts expect a Google Contacts CSV export with these columns:

### Required Columns (at least one must have data):
- `First Name`, `Middle Name`, `Last Name` - Combined into full name
- `E-mail 1 - Value` through `E-mail 4 - Value` - First email used
- `Phone 1 - Value` through `Phone 4 - Value` - All phones combined

### Optional Columns:
- `Organization Name` → `company`
- `Organization Title` → `title`
- `Address 1 - Formatted` → `location`
- `Address 1 - Street`, `City`, `Region`, `Postal Code`, `Country` → `location` (if formatted not available)
- `Notes` → `notes`
- `Birthday` → Added to notes as "Birthday: YYYY-MM-DD"

## Data Processing

### Name Handling
- Full name built from: `First Name` + `Middle Name` + `Last Name`
- Empty parts are skipped
- If no name, uses first email or phone as identifier

### Phone Number Cleaning
- Removes formatting: spaces, parentheses, dashes, dots
- Handles ":::" separators (takes first number only)
- Preserves leading "+" for international numbers
- Example: `+1-317-627-5544 ::: 1-317-627-5544` → `+13176275544`

### Email Handling
- Multiple emails supported in CSV
- Only first email is imported to database
- Example: Uses `E-mail 1 - Value`, ignores Email 2-4

### Duplicate Handling

**API Method:**
- Duplicate slugs get numeric suffix automatically
- Example: `john-doe` → `john-doe-1` → `john-doe-2`

**Direct Method:**
- Checks database before insert
- Increments suffix until unique slug found

### Skip Conditions
Rows are skipped if ALL of the following are empty:
- Name (first, middle, last)
- Email
- Phone

## Database Schema

Contacts are inserted into the `contacts` table with:

```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,           -- UUID generated
  slug TEXT UNIQUE NOT NULL,     -- lowercase-name-with-dashes
  name TEXT NOT NULL,            -- Full name or "Unknown"
  email TEXT,                    -- First email from CSV
  company TEXT,                  -- Organization Name
  title TEXT,                    -- Organization Title
  location TEXT,                 -- Address (formatted or built)
  priority TEXT DEFAULT 'medium',
  notes TEXT,                    -- Notes + Birthday + Phone(s)
  social_links TEXT,             -- NULL (not in CSV)
  last_contact_at DATETIME,      -- NULL initially
  created_at DATETIME,
  updated_at DATETIME
)
```

## Troubleshooting

### API Method

**Error: "API server not available"**
- Solution: Start AI Command Center app
- Check: Navigate to `http://localhost:3939/api/health` in browser

**Error: "UNIQUE constraint failed: contacts.slug"**
- This is handled automatically - contact gets incremented slug
- If you see this as an error, report it as a bug

### Direct Database Method

**Error: "NODE_MODULE_VERSION mismatch"**
```
The module 'better_sqlite3.node' was compiled against a different Node.js version
```
- Solution: Rebuild better-sqlite3
  ```bash
  npm rebuild better-sqlite3
  ```

**Error: "Database is locked"**
```
EBUSY: resource busy or locked
```
- Solution: Close AI Command Center app completely
- Check: Task Manager for any lingering processes

**Error: "The build tools for ClangCL cannot be found"**
- Solution 1: Use API method instead (doesn't require rebuild)
- Solution 2: Install Visual Studio C++ Build Tools
- Solution 3: Let the PowerShell script handle it

## Performance

### API Method
- ~10 contacts/second (rate-limited)
- Safe for use while app is running
- Suitable for 1-1000 contacts

### Direct Database Method
- ~500 contacts/second (no rate limit)
- Requires exclusive access
- Suitable for 1000+ contacts

## Example Output

### Successful Import
```
✨ Import complete!

📊 Summary:
   ✅ Imported: 285
   ⏭️  Skipped (no data): 45
   ❌ Errors: 8
   📄 Total rows processed: 338
```

### What Gets Skipped
- Rows with no name, email, OR phone (empty placeholders)
- Example: Row 2 in sample has only phone `303-548-9758` - **imported**
- Example: Row 40 "Boss Ass Bitch's Location" with only URL - **skipped**

## Files Created

- `import-contacts.js` - Direct database import (Node.js)
- `import-contacts-via-api.js` - API-based import (Node.js)
- `import-contacts.ps1` - Automated PowerShell script
- `README-IMPORT-CONTACTS.md` - This file

## Support

For issues or questions:
1. Check this README first
2. Review error messages carefully
3. Try the API method if direct method fails
4. Check the app logs at: `%APPDATA%\ai-command-center\logs\`
