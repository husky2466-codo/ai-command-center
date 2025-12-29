---
description: Use Google APIs (Drive, Sheets, Search)
argument-hint: <service> <action>
---

Access Google services using the API key from ~/.env (GOOGLE_API_KEY).

Command: $ARGUMENTS

Services available:
- search <query>: Search the web using Google Custom Search
- drive list: List files in Google Drive
- sheets <spreadsheet_id>: Read data from a Google Sheet

Parse the command and execute the appropriate Google API call.
