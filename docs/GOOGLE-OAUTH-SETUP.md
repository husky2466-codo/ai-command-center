# Google OAuth2 Setup Guide

This guide walks you through setting up Google OAuth2 authentication for the AI Command Center.

## Overview

The AI Command Center uses Google OAuth2 to access:
- **Gmail API** - Read and send emails
- **Google Calendar API** - View and manage calendar events
- **Google People API (Contacts)** - Access contact information

## Prerequisites

- Google account
- Access to [Google Cloud Console](https://console.cloud.google.com)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter project name: `AI Command Center`
4. Click "Create"

## Step 2: Enable APIs

1. Navigate to **APIs & Services** → **Library**
2. Search for and enable these APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **Google People API**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click "Create"

### Configure consent screen:

**App information:**
- App name: `AI Command Center`
- User support email: Your email
- Developer contact email: Your email

**App domain (optional):**
- Leave blank for development

**Scopes:**
Click "Add or Remove Scopes" and add:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/contacts.readonly`

**Test users (for External apps):**
- Add your Google account email

Click "Save and Continue"

## Step 4: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Desktop app**
4. Name: `AI Command Center Desktop`
5. Click "Create"

### Add Redirect URI:

1. Click on your newly created OAuth client
2. Under "Authorized redirect URIs", click "Add URI"
3. Add: `http://localhost:8123/callback`
4. Click "Save"

### Download Credentials:

1. Click the download button (⬇) next to your OAuth client
2. You'll get a JSON file with your credentials

## Step 5: Add Credentials to .env File

### Option 1: OneDrive Vault (Primary)

1. Open or create: `D:\OneDrive\Claude Config (Windows)\.env`
2. Add the credentials from the JSON file:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Option 2: Home Directory (Fallback)

1. Open or create: `~/.env` (e.g., `C:\Users\YourName\.env`)
2. Add the same credentials

## Step 6: Test Authentication

1. Start the app: `npm run dev:electron`
2. In the renderer process, call:

```javascript
const result = await window.electronAPI.googleAuthAuthenticate();
if (result.success) {
  console.log('Authenticated as:', result.email);
  console.log('Tokens:', result.tokens);
} else {
  console.error('Authentication failed:', result.error);
}
```

3. A popup window will open for Google sign-in
4. Sign in and grant permissions
5. The window will close and tokens will be stored securely

## Security Notes

### Token Storage

Tokens are encrypted using Electron's `safeStorage` API:
- **Windows**: DPAPI (Data Protection API)
- **macOS**: Keychain Access
- **Linux**: Secret Service API / kwallet / gnome-keyring

**Linux users:** If you don't have a password store installed, you'll see a warning. Tokens will be stored in plaintext. Install `gnome-keyring` or `kwallet` for secure storage.

### File Locations

- Encrypted tokens: `%APPDATA%\ai-command-center\tokens\google-{email}.dat`
- Never commit `.env` files to version control

### PKCE Flow

The implementation uses Proof Key for Code Exchange (PKCE) for enhanced security:
- Prevents authorization code interception attacks
- No client secret in authorization request
- Code verifier never leaves the client

## API Usage Examples

### Gmail API

```javascript
const { google } = require('googleapis');
const oauth2Client = window.electronAPI.getOAuth2Client(); // From main process

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// List messages
const response = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 10
});

// Send email
await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: base64EncodedEmail
  }
});
```

### Calendar API

```javascript
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// List events
const events = await calendar.events.list({
  calendarId: 'primary',
  timeMin: new Date().toISOString(),
  maxResults: 10,
  singleEvents: true,
  orderBy: 'startTime'
});
```

### People API (Contacts)

```javascript
const people = google.people({ version: 'v1', auth: oauth2Client });

// List contacts
const connections = await people.people.connections.list({
  resourceName: 'people/me',
  pageSize: 100,
  personFields: 'names,emailAddresses,phoneNumbers'
});
```

## IPC Methods Available

From the renderer process via `window.electronAPI`:

### Authenticate
```javascript
const result = await window.electronAPI.googleAuthAuthenticate(scopes?);
// Returns: { success: true, email: string, tokens: object } | { success: false, error: string }
```

### Refresh Tokens
```javascript
const result = await window.electronAPI.googleAuthRefreshTokens(email);
// Returns: { success: true, tokens: object } | { success: false, error: string }
```

### Revoke Access
```javascript
const result = await window.electronAPI.googleAuthRevokeAccess(email);
// Returns: { success: true } | { success: false, error: string }
```

### List Accounts
```javascript
const result = await window.electronAPI.googleAuthListAccounts();
// Returns: { success: true, accounts: string[] } | { success: false, error: string }
```

### Check Encryption Status
```javascript
const result = await window.electronAPI.googleAuthEncryptionStatus();
// Returns: { success: true, available: boolean, backend: string, secure: boolean, warning: string? }
```

## Rate Limits

### Gmail API
- Per Project: 1,000,000,000 quota units/day
- Per User: 250 quota units/second

### Google Calendar API
- Per Project: 1,000,000 queries/day
- Rate limiting on per-minute basis

### Google People API
- Standard quotas apply (check Cloud Console)

## Troubleshooting

### "OAuth2 client not initialized"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are in your `.env` file
- Restart the app after adding credentials

### "Authentication window closed by user"
- User closed the popup before completing sign-in
- Try authenticating again

### "Token refresh failed"
- Refresh token may have expired or been revoked
- Re-authenticate to get new tokens

### Linux: "Tokens are stored in plaintext"
- Install a password store:
  ```bash
  # Ubuntu/Debian
  sudo apt install gnome-keyring

  # Fedora
  sudo dnf install gnome-keyring

  # Arch
  sudo pacman -S gnome-keyring
  ```

### "Redirect URI mismatch"
- Ensure `http://localhost:8123/callback` is added to authorized redirect URIs in Google Cloud Console
- Check for typos in the URI

## References

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Quickstart](https://developers.google.com/gmail/api/quickstart/nodejs)
- [Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/overview)
- [Google People API](https://developers.google.com/people)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Account Integrations Research](./ACCOUNT-INTEGRATIONS-RESEARCH.md)
