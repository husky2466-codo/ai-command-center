# Google OAuth Integration in Electron - Best Practices Research

**Research Date:** 2025-12-29
**Project:** AI Command Center
**Purpose:** Comprehensive guide for implementing Google OAuth2 in Electron desktop applications

---

## Executive Summary

This research document compiles best practices, common solutions, and security patterns for integrating Google OAuth2 authentication in Electron desktop applications. Based on industry standards (RFC 8252, RFC 7636), official Google documentation, and real-world implementations, this guide covers the complete OAuth flow from authentication to token storage, API integration, and error handling.

**Key Findings:**
- **PKCE is mandatory** for Electron apps (prevents authorization code interception)
- **Use loopback IP (127.0.0.1)** instead of localhost for redirect URIs
- **Electron's safeStorage API** is the recommended solution for token storage (replaces deprecated keytar)
- **Client secrets should NOT be embedded** in Electron apps (they cannot be kept secret)
- **AppAuth-JS library** is the industry standard for OAuth in JavaScript/Electron
- **Token refresh is automatic** with google-auth-library when configured properly
- **March 2025 deadline**: Google is disabling basic authentication for Gmail, Calendar, and Contacts

---

## 1. Google OAuth2 in Electron

### 1.1 OAuth Flow for Native/Desktop Apps

According to **RFC 8252** (OAuth 2.0 for Native Apps), desktop applications should use the **Authorization Code Flow with PKCE**. This is Google's official recommendation for Electron apps.

**Flow Overview:**

1. **Generate PKCE pair** (code_verifier + code_challenge)
2. **Open system browser or BrowserWindow** with authorization URL
3. **User authenticates** and grants permissions
4. **Authorization code returned** to loopback redirect URI
5. **Exchange code for tokens** using code_verifier (proves authenticity)
6. **Store tokens securely** using OS-level encryption
7. **Refresh tokens automatically** when access token expires

### 1.2 Why PKCE is Required

PKCE (Proof Key for Code Exchange, pronounced "pixy") prevents authorization code interception attacks. In Electron apps:

- Apps run on user devices where malicious software could intercept codes
- Client secrets cannot be kept confidential (they're embedded in the app)
- PKCE adds cryptographic proof that only your app can exchange the code for tokens

**Implementation Pattern:**

```javascript
const crypto = require('crypto');

// Generate PKCE pair
function generatePKCEChallenge() {
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

// In authorization request
const { verifier, challenge } = generatePKCEChallenge();
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  code_challenge: challenge,
  code_challenge_method: 'S256'
});

// Store verifier temporarily
// Later, when exchanging code for tokens:
const { tokens } = await oauth2Client.getToken({
  code: authorizationCode,
  code_verifier: verifier
});
```

### 1.3 Redirect URI Best Practices

**Use Loopback IP Address (127.0.0.1), NOT localhost:**

- **Recommended:** `http://127.0.0.1:8123/callback`
- **Avoid:** `http://localhost:8123/callback`

**Why?**
- Avoids inadvertently listening on network interfaces other than loopback
- Less susceptible to client-side firewalls
- Not affected by misconfigured hostname resolution
- Google's official recommendation per RFC 8252

**Implementation:**

```javascript
const http = require('http');
const url = require('url');

// Create local server to listen for OAuth callback
function createCallbackServer(onAuthCode) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const queryParams = url.parse(req.url, true).query;

      if (queryParams.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>');

        server.close();
        resolve(queryParams.code);
      } else if (queryParams.error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h1>Authentication failed</h1><p>${queryParams.error}</p></body></html>`);

        server.close();
        reject(new Error(queryParams.error));
      }
    });

    // Listen on loopback only
    server.listen(8123, '127.0.0.1', () => {
      console.log('Callback server listening on http://127.0.0.1:8123');
    });
  });
}
```

### 1.4 Client Secret Considerations

**CRITICAL:** In Electron apps, client secrets **cannot be kept secret**. Any secret embedded in your app can be extracted by users or attackers.

**Best Practice:**
- Use OAuth 2.0 for Desktop Apps configuration (not Web Application)
- Google allows desktop apps to use client secrets for API compatibility, but **they provide no security**
- Rely on PKCE for security, not client secrets
- Never use client secrets to authenticate your app to backend services

**From Google's Documentation:**
"Including a client ID and secret in your Electron app makes it trivial for other developers/hackers to impersonate your app."

---

## 2. Security Considerations

### 2.1 Token Storage Options (2025 Recommendation)

| Solution | Status | Security | Platform Support | Recommendation |
|----------|--------|----------|------------------|----------------|
| **Electron safeStorage** | ✅ Active (built-in since v15) | ⭐⭐⭐⭐⭐ OS-level encryption | All platforms | **RECOMMENDED** |
| **keytar (node-keytar)** | ❌ Archived (Dec 2022) | ⭐⭐⭐⭐⭐ OS-level encryption | All platforms | Deprecated |
| **electron-store (encryption)** | ✅ Active | ⭐⭐ Obfuscation only | All platforms | NOT for secrets |
| **Plain JSON files** | ❌ Never | ⭐ None | All platforms | **NEVER USE** |

### 2.2 Using Electron's safeStorage API

**Recommended Pattern: safeStorage + electron-store**

```javascript
const { safeStorage } = require('electron');
const Store = require('electron-store');

const store = new Store();

// Check if encryption is available
function isEncryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

// Store encrypted token
function saveToken(email, tokens) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('⚠️ Token encryption not available on this system. Tokens will be stored in plaintext.');
  }

  const encrypted = safeStorage.encryptString(JSON.stringify(tokens));
  store.set(`google_tokens_${email}`, encrypted.toString('base64'));
}

// Retrieve and decrypt token
function getToken(email) {
  const encryptedBase64 = store.get(`google_tokens_${email}`);
  if (!encryptedBase64) return null;

  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const decrypted = safeStorage.decryptString(encrypted);
  return JSON.parse(decrypted);
}

// Delete token
function deleteToken(email) {
  store.delete(`google_tokens_${email}`);
}
```

**Platform-Specific Behavior:**

- **macOS:** Uses Keychain Access (most secure)
  - Encryption keys stored in system keychain
  - Protected from other apps and users
  - May prompt user for keychain access on first use

- **Windows:** Uses DPAPI (Data Protection API)
  - Encrypted per user account
  - Protected from other users, but **not from other apps running as same user**
  - No user prompts

- **Linux:** Uses secret store (varies by desktop environment)
  - Supported: `gnome-libsecret`, `kwallet`, `kwallet5`, `kwallet6`
  - **WARNING:** If no secret store is available, tokens stored in **plaintext** with hardcoded password
  - Users should install `gnome-keyring` or `kwallet`

**Migration from keytar:**

Projects like VS Code, Ray, and many others have migrated from keytar to safeStorage:

```javascript
// Old (keytar)
const keytar = require('keytar');
await keytar.setPassword('ai-command-center', email, JSON.stringify(tokens));
const tokensJson = await keytar.getPassword('ai-command-center', email);

// New (safeStorage)
const { safeStorage } = require('electron');
const encrypted = safeStorage.encryptString(JSON.stringify(tokens));
// Store encrypted buffer in electron-store or filesystem
```

### 2.3 Protecting Client Credentials

**Best Practices:**

1. **Load from .env files** (never commit to git)
2. **Use OneDrive vault** or home directory (`.env` in `~/.env` or OneDrive sync folder)
3. **Add to .gitignore:**
   ```
   .env
   .env.local
   .env.*.local
   credentials.json
   client_secret*.json
   ```

4. **Validate at startup:**
   ```javascript
   if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
     console.error('❌ Google OAuth credentials not found in .env file');
     process.exit(1);
   }
   ```

---

## 3. Common Issues & Solutions

### 3.1 "Invalid Grant" Error

**Causes:**
- Expired or revoked refresh token
- Authorization code already used
- Refresh token used on wrong device (device-bound tokens)
- Exceeded refresh token limit (max 25 per user)
- Wrong grant_type (using `refresh_token` instead of `authorization_code`)

**Solutions:**

```javascript
// Automatic retry with re-authentication
async function getValidTokens(email) {
  try {
    // Try to refresh existing tokens
    const tokens = await refreshTokens(email);
    return tokens;
  } catch (error) {
    if (error.message.includes('invalid_grant')) {
      console.log('Refresh token invalid. Re-authenticating...');

      // Delete old tokens
      deleteToken(email);

      // Trigger new OAuth flow
      const newTokens = await authenticate();
      return newTokens;
    }
    throw error;
  }
}

// Monitor token refresh in google-auth-library
oauth2Client.on('tokens', (tokens) => {
  console.log('New tokens received');

  // IMPORTANT: Store refresh token if present
  if (tokens.refresh_token) {
    console.log('⚠️ New refresh token received - save it!');
    saveToken(email, tokens);
  } else {
    // Only access token refreshed, merge with existing
    const existing = getToken(email);
    saveToken(email, { ...existing, ...tokens });
  }
});
```

**Prevention:**
- Always store refresh tokens on first authorization
- Listen to `tokens` event to catch new refresh tokens
- Use `access_type: 'offline'` to ensure refresh token is issued
- Don't exceed 25 refresh tokens per user per app

### 3.2 Token Refresh Problems

**Issue:** Tokens not refreshing automatically

**Solution:**

```javascript
const { google } = require('googleapis');

// Initialize OAuth2 client with token refresh support
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://127.0.0.1:8123/callback'
);

// Load existing tokens
const tokens = getToken(email);
oauth2Client.setCredentials(tokens);

// CRITICAL: Listen for token refresh events
oauth2Client.on('tokens', (newTokens) => {
  console.log('Tokens refreshed automatically');

  // Merge with existing tokens (preserve refresh_token if not in response)
  const updated = { ...tokens, ...newTokens };
  saveToken(email, updated);
});

// The library will now automatically refresh tokens when needed
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
const messages = await gmail.users.messages.list({ userId: 'me' });
// If access token expired, library refreshes it automatically before this call
```

### 3.3 Scope Issues

**Issue:** "Insufficient permissions" or "Access not granted"

**Common Scopes for AI Command Center:**

```javascript
const SCOPES = [
  // User profile
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',

  // Gmail (read + send)
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',

  // Calendar (read + write)
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',

  // Contacts (read)
  'https://www.googleapis.com/auth/contacts.readonly'
];
```

**Best Practices:**
- Request **minimum necessary scopes** (principle of least privilege)
- Users more readily grant narrow, clearly described scopes
- Sensitive scopes require Google verification for public apps
- Use `.readonly` scopes when write access not needed

**Scope Changes:**

If you need to add scopes later, you must re-authenticate:

```javascript
async function ensureScope(email, requiredScope) {
  const tokens = getToken(email);

  if (!tokens.scope || !tokens.scope.includes(requiredScope)) {
    console.log(`Scope ${requiredScope} not granted. Re-authenticating...`);

    // Re-authenticate with new scope
    const newTokens = await authenticate([...SCOPES, requiredScope]);
    return newTokens;
  }

  return tokens;
}
```

### 3.4 CORS Problems in Electron

**Issue:** CORS errors when calling Google APIs from renderer process

**Solution 1: Use Main Process (Recommended)**

```javascript
// main.js
const { ipcMain } = require('electron');
const { google } = require('googleapis');

ipcMain.handle('gmail:list-messages', async (event, email) => {
  const oauth2Client = getOAuth2Client(email);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 10
  });

  return response.data;
});

// renderer.js
const messages = await window.electronAPI.gmailListMessages(email);
```

**Solution 2: Use BrowserWindow with nodeIntegration (NOT recommended for security)**

```javascript
// Only for development/testing
const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
});
```

**Solution 3: Configure CSP to allow Google APIs**

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               connect-src 'self'
                 https://www.googleapis.com
                 https://gmail.googleapis.com
                 https://people.googleapis.com
                 https://oauth2.googleapis.com
                 https://accounts.google.com;">
```

---

## 4. Google APIs Integration Patterns

### 4.1 Gmail API

**Rate Limits:**
- **Per User:** 250 quota units/second
- **Per Project:** 1,000,000,000 quota units/day

**Quota Costs:**
- Reading a message: ~5 units
- Sending a message: ~100 units
- Listing messages: ~5 units
- Batch operations: Sum of individual costs

**Best Practices:**

```javascript
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// 1. Use batch requests for multiple operations
const batch = gmail.newBatch();
messageIds.forEach(id => {
  batch.add(gmail.users.messages.get({
    userId: 'me',
    id: id
  }));
});
await batch;

// 2. Use partial responses to reduce bandwidth
const message = await gmail.users.messages.get({
  userId: 'me',
  id: messageId,
  format: 'metadata',  // Only headers, not full body
  metadataHeaders: ['From', 'Subject', 'Date']
});

// 3. Implement exponential backoff for rate limits
async function retryWithBackoff(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s, 8s, 16s
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// 4. Use push notifications instead of polling
await gmail.users.watch({
  userId: 'me',
  requestBody: {
    topicName: 'projects/YOUR_PROJECT/topics/gmail',
    labelIds: ['INBOX']
  }
});
// Set up Cloud Pub/Sub subscription to receive webhooks
```

### 4.2 Google Calendar API

**Rate Limits:**
- **Per Project:** 1,000,000 queries/day
- Per-minute rate limiting (varies)

**Integration Pattern:**

```javascript
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// List upcoming events
async function getUpcomingEvents(maxResults = 10) {
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: maxResults,
    singleEvents: true,
    orderBy: 'startTime'
  });

  return response.data.items;
}

// Create event
async function createEvent(summary, start, end, description) {
  const event = {
    summary: summary,
    description: description,
    start: {
      dateTime: start.toISOString(),
      timeZone: 'America/Los_Angeles'
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'America/Los_Angeles'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  return await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event
  });
}

// Use push notifications for changes
async function watchCalendar() {
  const channel = {
    id: crypto.randomUUID(),
    type: 'web_hook',
    address: 'https://your-webhook-url.com/calendar'
  };

  return await calendar.events.watch({
    calendarId: 'primary',
    requestBody: channel
  });
}
```

### 4.3 Google People API (Contacts)

**Required Scopes:**
- `https://www.googleapis.com/auth/contacts.readonly` (read-only)
- `https://www.googleapis.com/auth/contacts` (read/write)

**Integration Pattern:**

```javascript
const people = google.people({ version: 'v1', auth: oauth2Client });

// List all contacts
async function getAllContacts() {
  const connections = [];
  let pageToken = null;

  do {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 100,
      pageToken: pageToken,
      personFields: 'names,emailAddresses,phoneNumbers,photos,organizations'
    });

    if (response.data.connections) {
      connections.push(...response.data.connections);
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return connections;
}

// Get user profile (name, email, picture)
async function getUserProfile() {
  const response = await people.people.get({
    resourceName: 'people/me',
    personFields: 'names,emailAddresses,photos'
  });

  const profile = response.data;

  return {
    name: profile.names?.[0]?.displayName,
    email: profile.emailAddresses?.[0]?.value,
    picture: profile.photos?.[0]?.url
  };
}

// Create contact
async function createContact(name, email, phone) {
  const contact = {
    names: [{ givenName: name }],
    emailAddresses: [{ value: email }],
    phoneNumbers: [{ value: phone }]
  };

  return await people.people.createContact({
    requestBody: contact
  });
}
```

### 4.4 Rate Limiting Best Practices

**1. Implement Exponential Backoff:**

```javascript
class GoogleAPIClient {
  constructor(oauth2Client) {
    this.auth = oauth2Client;
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async callWithBackoff(apiCall, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        // Rate limit errors: 429 (user-rate) or 403 (quota exceeded)
        if ((error.code === 429 || error.code === 403) && attempt < maxRetries - 1) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 32000);
          console.log(`Rate limited. Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          throw error;
        }
      }
    }
  }
}

// Usage
const client = new GoogleAPIClient(oauth2Client);
const messages = await client.callWithBackoff(() =>
  client.gmail.users.messages.list({ userId: 'me', maxResults: 10 })
);
```

**2. Monitor Quota Usage:**

Track quota consumption in Google Cloud Console:
- Navigate to **APIs & Services** → **Quotas**
- Sort by "7 Day Peak Usage" to see limits at risk
- Request quota increases if needed (no guarantee of approval)

**3. Use Batch Requests:**

```javascript
// Instead of N separate API calls
const messages = await Promise.all(
  messageIds.map(id => gmail.users.messages.get({ userId: 'me', id }))
);

// Use batch (1 API call)
const batch = gmail.newBatch();
messageIds.forEach(id => {
  batch.add(gmail.users.messages.get({ userId: 'me', id }));
});
const results = await batch;
```

**4. Implement Caching:**

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getMessagesWithCache() {
  const cached = cache.get('messages');
  if (cached) return cached;

  const messages = await gmail.users.messages.list({ userId: 'me' });
  cache.set('messages', messages.data);
  return messages.data;
}
```

---

## 5. Libraries & Tools

### 5.1 google-auth-library (Official)

**Installation:**
```bash
npm install google-auth-library googleapis
```

**Best Practices:**

```javascript
const { google } = require('googleapis');

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://127.0.0.1:8123/callback'
);

// Request offline access to get refresh token
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',  // CRITICAL: Needed for refresh token
  scope: SCOPES,
  prompt: 'consent'  // Forces consent screen to ensure refresh token
});

// Exchange code for tokens
const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);

// IMPORTANT: Listen for token refresh
oauth2Client.on('tokens', (newTokens) => {
  if (newTokens.refresh_token) {
    // Store refresh token (only returned on first auth)
    console.log('⚠️ Save this refresh token:', newTokens.refresh_token);
  }
  // Update access token
  updateStoredTokens(email, newTokens);
});

// Library handles refresh automatically
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
```

### 5.2 @getstation/electron-google-oauth2

**Installation:**
```bash
npm install @getstation/electron-google-oauth2
```

**Usage:**

```javascript
const { BrowserWindow } = require('electron');
const ElectronGoogleOAuth2 = require('@getstation/electron-google-oauth2');

const googleAuth = new ElectronGoogleOAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  ['https://www.googleapis.com/auth/gmail.readonly']
);

// Get access token (handles BrowserWindow automatically)
async function authenticate() {
  try {
    const token = await googleAuth.getAccessToken(mainWindow);
    console.log('Access token:', token);
    return token;
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

**Features:**
- Handles BrowserWindow creation/management
- Automatic token refresh
- Secure token storage option

### 5.3 AppAuth-JS (Industry Standard)

**Installation:**
```bash
npm install @openid/appauth
```

**Why AppAuth-JS:**
- Implements RFC 8252 (OAuth 2.0 for Native Apps)
- Built-in PKCE support
- Used by major projects (Okta, OneLogin examples)
- Cross-platform (iOS, Android, Electron)

**Basic Implementation:**

```javascript
const {
  AuthorizationRequest,
  AuthorizationNotifier,
  AuthorizationServiceConfiguration,
  BaseTokenRequestHandler,
  TokenRequest,
  GRANT_TYPE_AUTHORIZATION_CODE
} = require('@openid/appauth');

// Discover Google's OAuth endpoints
const configuration = await AuthorizationServiceConfiguration.fetchFromIssuer(
  'https://accounts.google.com'
);

// Create authorization request with PKCE
const request = new AuthorizationRequest({
  client_id: process.env.GOOGLE_CLIENT_ID,
  redirect_uri: 'http://127.0.0.1:8123/callback',
  scope: 'openid email profile',
  response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
  extras: { prompt: 'consent', access_type: 'offline' }
}, crypto, true); // true = use PKCE

// Make authorization request
const authUrl = configuration.buildAuthorizationRequestUrl(request);
// Open authUrl in BrowserWindow

// After receiving code, exchange for tokens
const tokenHandler = new BaseTokenRequestHandler();
const tokenRequest = new TokenRequest({
  client_id: process.env.GOOGLE_CLIENT_ID,
  redirect_uri: 'http://127.0.0.1:8123/callback',
  grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
  code: authorizationCode,
  extras: { code_verifier: request.internal.code_verifier }
});

const tokenResponse = await tokenHandler.performTokenRequest(
  configuration,
  tokenRequest
);
```

### 5.4 electron-store (For Non-Secret Data)

**DO NOT use for OAuth tokens** (use safeStorage instead)

```bash
npm install electron-store
```

**Good for:**
- User preferences
- App settings
- UI state
- Non-sensitive cached data

**Example:**

```javascript
const Store = require('electron-store');

const store = new Store({
  // WRONG: Do not use for secrets
  // encryptionKey: 'hardcoded-key', // Provides no real security

  defaults: {
    windowBounds: { width: 800, height: 600 },
    theme: 'dark'
  }
});

// Good uses
store.set('lastSyncTime', Date.now());
store.set('selectedAccount', 'user@example.com');
const theme = store.get('theme');
```

---

## 6. User Profile Data

### 6.1 Required Scopes for Profile Information

```javascript
const PROFILE_SCOPES = [
  'openid',  // OpenID Connect
  'https://www.googleapis.com/auth/userinfo.email',    // Email address
  'https://www.googleapis.com/auth/userinfo.profile'   // Name, picture
];
```

### 6.2 Fetching User Profile

**Method 1: Using google-auth-library (Recommended)**

```javascript
const { google } = require('googleapis');

async function getUserInfo(oauth2Client) {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    id: data.id,              // Google Account ID (use this, not email)
    email: data.email,
    name: data.name,
    picture: data.picture,    // URL to profile picture
    verified_email: data.verified_email
  };
}

// Usage
const oauth2Client = new google.auth.OAuth2(...);
oauth2Client.setCredentials(tokens);
const profile = await getUserInfo(oauth2Client);
console.log(`Signed in as: ${profile.name} (${profile.email})`);
```

**Method 2: Using People API (More Details)**

```javascript
const people = google.people({ version: 'v1', auth: oauth2Client });

async function getDetailedProfile() {
  const { data } = await people.people.get({
    resourceName: 'people/me',
    personFields: 'names,emailAddresses,photos,organizations,phoneNumbers'
  });

  return {
    name: data.names?.[0]?.displayName,
    givenName: data.names?.[0]?.givenName,
    familyName: data.names?.[0]?.familyName,
    email: data.emailAddresses?.[0]?.value,
    picture: data.photos?.[0]?.url,
    organization: data.organizations?.[0]?.name,
    jobTitle: data.organizations?.[0]?.title
  };
}
```

### 6.3 Caching User Profile

```javascript
const Store = require('electron-store');
const store = new Store();

async function getCachedProfile(email, oauth2Client) {
  // Check cache (valid for 24 hours)
  const cached = store.get(`profile_${email}`);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.profile;
  }

  // Fetch fresh profile
  const profile = await getUserInfo(oauth2Client);

  // Update cache
  store.set(`profile_${email}`, {
    profile: profile,
    timestamp: Date.now()
  });

  return profile;
}
```

### 6.4 Profile Picture Best Practices

```javascript
// Google profile pictures have URL parameters for sizing
function getProfilePicture(pictureUrl, size = 200) {
  if (!pictureUrl) return null;

  // Google photo URLs support ?sz parameter
  const url = new URL(pictureUrl);
  url.searchParams.set('sz', size); // 200x200 pixels
  return url.toString();
}

// Example usage
const profile = await getUserInfo(oauth2Client);
const avatar = getProfilePicture(profile.picture, 128); // 128x128

// In React component
<img
  src={avatar}
  alt={profile.name}
  style={{ borderRadius: '50%', width: 128, height: 128 }}
/>
```

---

## 7. Important Dates & Changes

### 7.1 March 14, 2025 - Basic Authentication Disabled

**What's changing:**
- Google is disabling "Less Secure Apps" (basic authentication with username/password)
- Affects: Gmail, Google Calendar, Google Contacts
- **MUST use OAuth 2.0** after this date

**Action Required:**
- All integrations must use OAuth 2.0
- Exception: App-specific passwords (manually generated by users)

### 7.2 Refresh Token Expiry (Testing Apps)

**For apps in "Testing" mode:**
- Refresh tokens expire after **7 days**
- **UNLESS** scopes are limited to: `openid`, `userinfo.email`, `userinfo.profile`

**Solution:**
- Publish app (requires verification for sensitive scopes)
- OR keep in testing mode and users re-authenticate weekly
- OR use only non-sensitive scopes (profile/email only)

---

## 8. Implementation Checklist

### Initial Setup
- [ ] Create Google Cloud project
- [ ] Enable Gmail, Calendar, People APIs
- [ ] Configure OAuth consent screen
- [ ] Create Desktop app OAuth credentials
- [ ] Download client configuration JSON
- [ ] Add credentials to .env file (OneDrive vault)
- [ ] Add .env to .gitignore

### Code Implementation
- [ ] Install dependencies: `googleapis`, `google-auth-library`
- [ ] Implement PKCE code generation
- [ ] Create loopback callback server (127.0.0.1)
- [ ] Implement OAuth flow in main process
- [ ] Add token refresh event listener
- [ ] Implement safeStorage token encryption
- [ ] Create IPC handlers for renderer
- [ ] Add error handling for rate limits
- [ ] Implement exponential backoff
- [ ] Add user profile fetching

### Security
- [ ] Verify safeStorage encryption is available
- [ ] Test token storage/retrieval
- [ ] Implement token refresh logic
- [ ] Add Linux keychain warning
- [ ] Test PKCE flow
- [ ] Verify tokens never logged to console

### Testing
- [ ] Test OAuth flow end-to-end
- [ ] Test token refresh after expiry
- [ ] Test with multiple Google accounts
- [ ] Test rate limit handling
- [ ] Test offline mode (cached tokens)
- [ ] Test re-authentication after token revocation

### Production
- [ ] Remove debug logging
- [ ] Add user-friendly error messages
- [ ] Implement proper loading states
- [ ] Add account switching UI
- [ ] Document user-facing setup steps
- [ ] Plan for Google app verification (if needed)

---

## 9. Key Takeaways

1. **Security First**
   - Use PKCE for all OAuth flows
   - Store tokens with safeStorage (OS-level encryption)
   - Never embed secrets in code
   - Use loopback IP (127.0.0.1), not localhost

2. **Token Management**
   - Listen for `tokens` event to catch refresh tokens
   - Store refresh tokens immediately (only issued once)
   - Let google-auth-library handle automatic refresh
   - Re-authenticate on invalid_grant errors

3. **API Best Practices**
   - Request minimum necessary scopes
   - Implement exponential backoff for rate limits
   - Use batch requests for multiple operations
   - Cache responses when appropriate
   - Monitor quota usage in Cloud Console

4. **User Experience**
   - Fetch and display user profile (name, email, picture)
   - Support multiple account switching
   - Handle offline mode gracefully
   - Provide clear error messages
   - Warn Linux users about keychain requirements

5. **Electron-Specific**
   - Run OAuth logic in main process
   - Use IPC for renderer communication
   - Leverage safeStorage instead of keytar
   - Handle BrowserWindow lifecycle properly
   - Configure CSP for Google API domains

---

## 10. Sources

### Google Official Documentation
- [OAuth 2.0 for Native Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Gmail API Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail API Quota](https://developers.google.com/workspace/gmail/api/reference/quota)
- [Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/overview)
- [People API Overview](https://developers.google.com/people)
- [People API - Read Profiles](https://developers.google.com/people/v1/profiles)
- [Node.js Quickstart](https://developers.google.com/calendar/api/quickstart/nodejs)

### Standards & RFCs
- [RFC 8252 - OAuth 2.0 for Native Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://tools.ietf.org/html/rfc7636)

### Electron & Security
- [Auth0 - Securing Electron with OAuth](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/)
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Replacing Keytar with safeStorage](https://freek.dev/2103-replacing-keytar-with-electrons-safestorage-in-ray)
- [Cameron Nokes - node-keytar Tutorial](https://cameronnokes.com/blog/how-to-securely-store-sensitive-information-in-electron-with-node-keytar/)

### Libraries & Tools
- [@getstation/electron-google-oauth2](https://www.npmjs.com/package/@getstation/electron-google-oauth2)
- [googleapis npm](https://www.npmjs.com/package/googleapis)
- [google-auth-library](https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest)
- [AppAuth-JS](https://github.com/openid/AppAuth-JS)

### Implementation Examples
- [OneLogin - AppAuth PKCE Guide](https://developers.onelogin.com/api-authorization/using-the-appauth-pkce-to-authenticate-to-your-electron-application)
- [Okta - Electron Authentication](https://developer.okta.com/blog/2018/09/17/desktop-app-electron-authentication)
- [Google Contacts Integration Guide](https://rollout.com/integration-guides/google-contacts/sdk/step-by-step-guide-to-building-a-google-contacts-api-integration-in-js)

### Error Handling & Troubleshooting
- [Gmail API Error Resolution](https://developers.google.com/workspace/gmail/api/guides/handle-errors)
- [Okta - Invalid Grant Errors](https://devforum.okta.com/t/invalid-grant-and-the-refresh-token-is-invalid-or-expired/29454)
- [OAuth 2.0 Token Errors](https://docs.kinde.com/build/tokens/token-validation-errors/)

### Community Resources
- [GitHub - electron-google-oauth2](https://github.com/getstation/electron-google-oauth2)
- [Medium - Google Auth in Electron](https://arunpasupathi.medium.com/how-to-implement-google-authentication-in-your-electron-app-aec168af7410)
- [Google Contacts CRUD Example](https://github.com/imzeeshan-dev/google-people-api-crud)

---

**End of Research Document**

*For implementation guide specific to AI Command Center, see [GOOGLE-OAUTH-SETUP.md](./GOOGLE-OAUTH-SETUP.md)*
