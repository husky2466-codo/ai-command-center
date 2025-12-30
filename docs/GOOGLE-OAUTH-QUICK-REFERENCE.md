# Google OAuth Quick Reference

**One-page quick lookup for Google OAuth implementation in Electron**

---

## Essential Code Snippets

### 1. PKCE Generation

```javascript
const crypto = require('crypto');

function generatePKCE() {
  const verifier = base64URLEncode(crypto.randomBytes(32));
  const challenge = base64URLEncode(
    crypto.createHash('sha256').update(verifier).digest()
  );
  return { verifier, challenge };
}

function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### 2. OAuth Client Setup

```javascript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://127.0.0.1:8123/callback'  // Use 127.0.0.1, NOT localhost
);

// Generate auth URL
const { verifier, challenge } = generatePKCE();
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
  code_challenge: challenge,
  code_challenge_method: 'S256'
});
```

### 3. Token Storage (safeStorage + electron-store)

```javascript
const { safeStorage } = require('electron');
const Store = require('electron-store');
const store = new Store();

function saveToken(email, tokens) {
  const encrypted = safeStorage.encryptString(JSON.stringify(tokens));
  store.set(`google_tokens_${email}`, encrypted.toString('base64'));
}

function getToken(email) {
  const encryptedBase64 = store.get(`google_tokens_${email}`);
  if (!encryptedBase64) return null;

  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const decrypted = safeStorage.decryptString(encrypted);
  return JSON.parse(decrypted);
}
```

### 4. Auto-Refresh Setup

```javascript
const tokens = getToken(email);
oauth2Client.setCredentials(tokens);

// CRITICAL: Listen for token refresh
oauth2Client.on('tokens', (newTokens) => {
  const updated = { ...tokens, ...newTokens };
  saveToken(email, updated);
});
```

### 5. Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if ((error.code === 429 || error.code === 403) && i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 32000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Required Scopes

```javascript
const SCOPES = [
  // Profile
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',

  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',

  // Calendar
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',

  // Contacts
  'https://www.googleapis.com/auth/contacts.readonly'
];
```

---

## Common API Calls

### User Profile

```javascript
const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
const { data } = await oauth2.userinfo.get();
// data: { id, email, name, picture, verified_email }
```

### Gmail - List Messages

```javascript
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
const response = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 10,
  q: 'is:unread'  // Search query
});
```

### Gmail - Get Message

```javascript
const message = await gmail.users.messages.get({
  userId: 'me',
  id: messageId,
  format: 'full'  // 'full' | 'metadata' | 'minimal' | 'raw'
});
```

### Gmail - Send Email

```javascript
const raw = Buffer.from(
  `To: ${to}\r\n` +
  `Subject: ${subject}\r\n` +
  `\r\n` +
  `${body}`
).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw }
});
```

### Calendar - List Events

```javascript
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const events = await calendar.events.list({
  calendarId: 'primary',
  timeMin: new Date().toISOString(),
  maxResults: 10,
  singleEvents: true,
  orderBy: 'startTime'
});
```

### Calendar - Create Event

```javascript
await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: 'Meeting',
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() }
  }
});
```

### Contacts - List All

```javascript
const people = google.people({ version: 'v1', auth: oauth2Client });
const connections = await people.people.connections.list({
  resourceName: 'people/me',
  pageSize: 100,
  personFields: 'names,emailAddresses,phoneNumbers,photos'
});
```

---

## Error Handling

### Invalid Grant (Refresh Token Expired)

```javascript
try {
  const tokens = await refreshTokens(email);
} catch (error) {
  if (error.message.includes('invalid_grant')) {
    // Delete old tokens and re-authenticate
    deleteToken(email);
    return await authenticate();
  }
  throw error;
}
```

### Rate Limit (429 or 403)

```javascript
await retryWithBackoff(() =>
  gmail.users.messages.list({ userId: 'me' })
);
```

---

## Rate Limits

| API | Per User | Per Project |
|-----|----------|-------------|
| Gmail | 250 units/sec | 1B units/day |
| Calendar | Variable | 1M queries/day |
| People | Standard | Standard |

**Quota Costs (Gmail):**
- Read message: ~5 units
- Send message: ~100 units
- List messages: ~5 units

---

## Security Checklist

- ✅ Use PKCE (code_challenge + code_verifier)
- ✅ Use 127.0.0.1, NOT localhost
- ✅ Store tokens with safeStorage
- ✅ Listen for 'tokens' event
- ✅ Request offline access (access_type: 'offline')
- ✅ Use minimum necessary scopes
- ✅ Never log tokens to console
- ✅ Add .env to .gitignore

---

## Platform-Specific Notes

### macOS
- Uses Keychain Access
- May prompt for keychain access on first use
- Most secure

### Windows
- Uses DPAPI
- No user prompts
- Protected from other users, NOT other apps

### Linux
- Requires gnome-keyring or kwallet
- Warns if no secret store available
- Fallback to plaintext if no keychain

**Install keyring on Linux:**
```bash
# Ubuntu/Debian
sudo apt install gnome-keyring

# Fedora
sudo dnf install gnome-keyring

# Arch
sudo pacman -S gnome-keyring
```

---

## Useful Links

- [OAuth Setup Guide](./GOOGLE-OAUTH-SETUP.md)
- [Full Research Document](./GOOGLE-OAUTH-BEST-PRACTICES-RESEARCH.md)
- [Google Cloud Console](https://console.cloud.google.com)
- [API Quotas](https://console.cloud.google.com/apis/dashboard)
