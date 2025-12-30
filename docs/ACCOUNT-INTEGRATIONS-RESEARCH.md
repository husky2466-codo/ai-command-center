# Account Integrations Research
**Research Date:** 2025-12-29
**Project:** AI Command Center
**Purpose:** Integration of Google, Microsoft/Outlook, and Exchange Server accounts for email, calendar, and contacts

---

## Executive Summary

This research covers OAuth2 integration patterns for Electron desktop applications connecting to Google (Gmail, Calendar, Contacts, Drive) and Microsoft (Outlook, Calendar, Contacts via Graph API) services, as well as legacy Exchange Server via EWS. Key findings:

- **Google Services**: Use official `googleapis` package with OAuth2 PKCE flow, custom protocol redirect URIs recommended for security
- **Microsoft Services**: Use `@microsoft/microsoft-graph-client` with MSAL Node for authentication, system browser flow preferred
- **Exchange Server**: Use `ews-javascript-api` for legacy on-premises Exchange (EWS in sustaining mode, Graph API doesn't support on-prem)
- **Token Storage**: Electron's `safeStorage` API or `keytar` for OS-level encrypted token storage
- **Offline Sync**: IndexedDB for async data storage with change queue pattern for offline-first architecture

---

## Table of Contents

1. [Google Services Integration](#1-google-services-integration)
2. [Microsoft/Outlook Integration](#2-microsoftoutlook-integration)
3. [Exchange Server Integration](#3-exchange-server-integration)
4. [OAuth2 Security & Token Storage](#4-oauth2-security--token-storage)
5. [Rate Limits & Quotas](#5-rate-limits--quotas)
6. [Real-Time Sync & Webhooks](#6-real-time-sync--webhooks)
7. [Offline Sync Strategy](#7-offline-sync-strategy)
8. [Recommended Architecture](#8-recommended-architecture)
9. [Implementation Priority](#9-implementation-priority)

---

## 1. Google Services Integration

### 1.1 Authentication Method

**OAuth2 Authorization Code Flow with PKCE (Proof Key for Code Exchange)**

- **Flow Type**: Authorization Code with PKCE for desktop apps (RFC 8252)
- **Redirect URI**: Custom protocol recommended (e.g., `myapp://callback`) or `http://localhost` for development
- **Authorization Endpoint**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token Endpoint**: `https://oauth2.googleapis.com/token`
- **Refresh Tokens**: Request `offline_access` scope for long-lived refresh tokens

**Key Security Feature**: PKCE prevents authorization code interception attacks by using a code verifier and challenge.

### 1.2 Available APIs & npm Packages

#### Gmail API
- **Official Package**: `@googleapis/gmail` or `googleapis` (full suite)
- **Installation**: `npm install googleapis`
- **Quota Units**: 1,000,000,000 per day, 250 per user per second
- **Key Capabilities**:
  - Read/send emails
  - Labels and filtering
  - Batch operations (max 50 requests per batch)
  - Push notifications via Cloud Pub/Sub or webhooks

**Quota Costs (examples)**:
- `labels.list`: 1 unit
- `messages.get`: 5 units
- `messages.list`: 5 units
- `drafts.send`: 100 units

#### Google Calendar API
- **Official Package**: `@googleapis/calendar` or `googleapis`
- **Quota**: 1,000,000 queries per day
- **Rate Limiting**: Per-minute basis (changed from daily in May 2021)
- **Key Capabilities**:
  - Create/read/update/delete events
  - Event attendees and reminders
  - Multiple calendar support
  - Push notifications for real-time updates

#### Google Contacts API (People API v1)
- **Official Package**: `googleapis` (includes People API)
- **Modern API**: People API v1 replaced legacy Contacts API v3
- **Scopes**:
  - `https://www.googleapis.com/auth/contacts.readonly` (read)
  - `https://www.googleapis.com/auth/contacts` (read/write)
- **Key Capabilities**:
  - List connections
  - Contact groups
  - Custom fields
  - Batch operations

#### Google Drive API
- **Official Package**: `googleapis`
- **Key Capabilities**:
  - File upload/download
  - Folder management
  - Sharing and permissions
  - Real-time changes API

### 1.3 Recommended npm Packages

| Package | Purpose | Pros | Cons |
|---------|---------|------|------|
| `googleapis` | Official Google APIs client | Complete API coverage, OAuth2 built-in, actively maintained | Large package size (~12MB) |
| `@googleapis/gmail` | Gmail-specific | Smaller footprint, focused | Need separate packages for each API |
| `@getstation/electron-google-oauth2` | Electron OAuth helper | Simplifies OAuth flow in Electron | Additional dependency, less flexible |
| `@google-cloud/local-auth` | Local dev auth | Quick setup for development | Not suitable for production |

**Recommendation**: Use `googleapis` for comprehensive access to all Google services with built-in OAuth2 support.

### 1.4 Permissions/Scopes Needed

**Gmail**:
- `https://www.googleapis.com/auth/gmail.readonly` - Read all mail
- `https://www.googleapis.com/auth/gmail.send` - Send mail
- `https://www.googleapis.com/auth/gmail.modify` - Read, compose, send, permanently delete

**Calendar**:
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendars
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.events` - Manage events only

**Contacts (People API)**:
- `https://www.googleapis.com/auth/contacts.readonly`
- `https://www.googleapis.com/auth/contacts`

**Drive**:
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.file` - Access files created by app
- `https://www.googleapis.com/auth/drive` - Full access

**Best Practice**: Request minimum scopes needed, use incremental authorization to request additional scopes only when needed.

### 1.5 Electron-Specific Setup

**App Registration Steps**:
1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable APIs: Gmail, Calendar, People, Drive
3. Configure OAuth consent screen
4. Create OAuth 2.0 Client ID (Desktop app type)
5. Add authorized redirect URIs

**Redirect URI Options**:
- **Custom Protocol** (recommended): `myapp{clientid}://callback`
- **Localhost**: `http://localhost:{port}/callback`

**Custom Protocol Registration** (in `electron/main.cjs`):
```javascript
app.setAsDefaultProtocolClient('myapp123456'); // Replace with your scheme
```

**Security Considerations**:
- Never hardcode `client_secret` in renderer process
- Use IPC to handle OAuth flow in main process
- Store tokens with `safeStorage` or `keytar`
- Disable `nodeIntegration` in OAuth windows

### 1.6 Code Example

```javascript
// In main process (electron/main.cjs)
const { google } = require('googleapis');
const { BrowserWindow } = require('electron');

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3000/callback'
);

async function authenticateGoogle() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    prompt: 'consent'
  });

  const authWindow = new BrowserWindow({
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  authWindow.loadURL(authUrl);

  // Intercept redirect
  authWindow.webContents.on('will-redirect', async (event, url) => {
    if (url.startsWith('http://localhost:3000/callback')) {
      const urlParams = new URL(url).searchParams;
      const code = urlParams.get('code');

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Store tokens securely
      await storeTokens('google', tokens);

      authWindow.close();
    }
  });
}

// Using the API
async function listGmailMessages() {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 10
  });
  return response.data.messages;
}
```

---

## 2. Microsoft/Outlook Integration

### 2.1 Authentication Method

**OAuth2 Authorization Code Flow with PKCE via MSAL Node**

- **Library**: MSAL (Microsoft Authentication Library) for Node.js
- **Flow Type**: Authorization Code with PKCE
- **Redirect URI**: Custom file protocol (e.g., `msal{clientId}://auth`) or system browser with `http://localhost`
- **Authority**: `https://login.microsoftonline.com/{tenant}/` or `common` for multi-tenant
- **API Endpoint**: Microsoft Graph API (`https://graph.microsoft.com/v1.0`)

**Critical Note**: MSAL-browser is NOT supported in Electron. Use MSAL-node only.

**Modern Approach**: Use system browser for authentication (more secure, supports SSO).

### 2.2 Available APIs & npm Packages

#### Microsoft Graph API
- **Official Package**: `@microsoft/microsoft-graph-client`
- **MSAL Package**: `@azure/msal-node`
- **TypeScript Definitions**: `@microsoft/microsoft-graph-types`
- **Installation**: `npm install @azure/msal-node @microsoft/microsoft-graph-client isomorphic-fetch`

**Important Deprecation**: Outlook REST APIs are fully decommissioned (March 2024). Use Microsoft Graph only.

#### Key Capabilities
- **Mail**: Read, send, organize emails
- **Calendar**: Events, attendees, recurrence, free/busy
- **Contacts**: Personal and organizational directory
- **Files**: OneDrive and SharePoint access
- **Teams**: Chat, meetings, channels (bonus capability)

### 2.3 Recommended npm Packages

| Package | Purpose | Version | Notes |
|---------|---------|---------|-------|
| `@azure/msal-node` | Authentication | ^2.x | Required for OAuth2 |
| `@microsoft/microsoft-graph-client` | Graph API client | ^3.x | Main SDK |
| `@microsoft/microsoft-graph-types` | TypeScript types | Latest | IntelliSense support |
| `isomorphic-fetch` | Fetch polyfill | Latest | Required for Graph client |

**No Third-Party Alternatives Recommended**: Microsoft's official SDK is comprehensive and well-maintained.

### 2.4 Permissions/Scopes Needed

**Delegated Permissions** (user context):

**Mail**:
- `Mail.Read` - Read user mail
- `Mail.ReadWrite` - Read and write user mail
- `Mail.Send` - Send mail as user
- `Mail.ReadWrite.Shared` - Access shared mailboxes

**Calendar**:
- `Calendars.Read` - Read user calendars
- `Calendars.ReadWrite` - Read and write user calendars
- `Calendars.ReadWrite.Shared` - Access shared calendars

**Contacts**:
- `Contacts.Read` - Read user contacts
- `Contacts.ReadWrite` - Read and write user contacts

**Common Scopes**:
- `openid` - Sign in
- `profile` - Basic profile
- `offline_access` - Refresh tokens
- `User.Read` - Read user profile

**Best Practice**: Apply principle of least privilege. Only request scopes you need.

### 2.5 Electron-Specific Setup

**App Registration Steps** (Azure Portal):
1. Navigate to [Azure Portal](https://portal.azure.com) → Azure Active Directory
2. App registrations → New registration
3. Set redirect URI: `msal{clientId}://auth` (custom protocol) or `http://localhost:{port}`
4. API permissions → Add Microsoft Graph delegated permissions
5. Enable "Allow public client flows" for desktop apps

**MSAL Configuration**:
```javascript
const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/common',
  },
  cache: {
    cacheLocation: 'filesystem', // or implement custom cache plugin
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: 'Info',
    },
  },
};
```

### 2.6 Code Example

```javascript
// AuthProvider.js - Main process
const msal = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');

class MicrosoftAuthProvider {
  constructor(msalConfig) {
    this.msalClient = new msal.PublicClientApplication(msalConfig);
    this.account = null;
  }

  async login() {
    const authCodeUrlParameters = {
      scopes: ['user.read', 'mail.read', 'calendars.read'],
      redirectUri: 'http://localhost:3000',
    };

    const authCodeUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);

    // Open system browser or BrowserWindow
    const authCode = await this.getAuthCode(authCodeUrl); // Implement redirect handling

    const tokenRequest = {
      code: authCode,
      scopes: authCodeUrlParameters.scopes,
      redirectUri: authCodeUrlParameters.redirectUri,
    };

    const response = await this.msalClient.acquireTokenByCode(tokenRequest);
    this.account = response.account;

    return response.accessToken;
  }

  async getAccessToken() {
    if (!this.account) throw new Error('No account logged in');

    const silentRequest = {
      account: this.account,
      scopes: ['user.read', 'mail.read', 'calendars.read'],
    };

    try {
      const response = await this.msalClient.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      if (error instanceof msal.InteractionRequiredAuthError) {
        // Re-authenticate
        return await this.login();
      }
      throw error;
    }
  }

  async listEmails() {
    const accessToken = await this.getAccessToken();

    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    const messages = await client
      .api('/me/messages')
      .top(10)
      .select('subject,from,receivedDateTime')
      .get();

    return messages.value;
  }

  async listCalendarEvents() {
    const accessToken = await this.getAccessToken();

    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const events = await client
      .api('/me/calendar/events')
      .top(10)
      .orderby('start/dateTime')
      .get();

    return events.value;
  }
}

module.exports = MicrosoftAuthProvider;
```

---

## 3. Exchange Server Integration

### 3.1 Overview

**Use Case**: On-premises Exchange Server (2007-2016) or Exchange Online when Graph API features are insufficient.

**Important Notes**:
- Microsoft Graph API **does not support** on-premises Exchange Server
- EWS (Exchange Web Services) is in **sustaining mode** (security updates only, no new features)
- For Exchange Online, prefer Microsoft Graph API when possible

### 3.2 Available APIs & npm Packages

#### ews-javascript-api
- **GitHub**: [gautamsi/ews-javascript-api](https://github.com/gautamsi/ews-javascript-api)
- **Installation**: `npm install ews-javascript-api`
- **Platform Support**: Node.js, Cordova, Meteor, Ionic, Electron, Outlook Add-ins
- **Exchange Versions**: Office 365, Exchange Online, Exchange 2007-2016

**Key Features**:
- TypeScript/JavaScript port of OfficeDev/ews-managed-api
- Supports OAuth2 for Exchange Online (RBAC with Apps)
- Client Credential Flow and user delegation tokens
- Comprehensive EWS operations (mail, calendar, contacts, tasks)

#### Alternative: ews-js-api-browser
- **GitHub**: [gautamsi/ews-js-api-browser](https://github.com/gautamsi/ews-js-api-browser)
- **Purpose**: Browser/Electron-specific build
- **Dependencies**: base64-js, moment-timezone, uuid

### 3.3 Authentication Methods

**For Exchange Online**:
- OAuth2 via Azure AD (recommended)
- Use MSAL Node to get access token
- Pass token to EWS API

**For On-Premises Exchange**:
- Basic Auth (deprecated, avoid if possible)
- NTLM/Kerberos
- Modern Auth if Exchange Server supports it

### 3.4 Code Example

```javascript
const { ExchangeService, WebCredentials, Uri, ExchangeVersion } = require('ews-javascript-api');

// For on-premises Exchange with credentials
const service = new ExchangeService(ExchangeVersion.Exchange2013);
service.Credentials = new WebCredentials('username', 'password', 'domain');
service.Url = new Uri('https://exchange.yourcompany.com/EWS/Exchange.asmx');

// For Exchange Online with OAuth2
const { ExchangeService, OAuthCredentials } = require('ews-javascript-api');

async function setupExchangeOnline(accessToken) {
  const service = new ExchangeService(ExchangeVersion.Exchange2013_SP1);
  service.Credentials = new OAuthCredentials(accessToken);
  service.Url = new Uri('https://outlook.office365.com/EWS/Exchange.asmx');

  return service;
}

// Fetch emails
async function getEmails(service) {
  const { Folder, WellKnownFolderName, ItemView } = require('ews-javascript-api');

  const inbox = await Folder.Bind(service, WellKnownFolderName.Inbox);
  const items = await service.FindItems(WellKnownFolderName.Inbox, new ItemView(10));

  return items.Items;
}
```

### 3.5 Limitations

- EWS is legacy, no new features being added
- Performance may be slower than Graph API
- Less modern developer experience
- Limited documentation compared to Graph API

**Recommendation**: Use EWS only for on-premises Exchange. Migrate to Microsoft Graph for Exchange Online/Office 365.

---

## 4. OAuth2 Security & Token Storage

### 4.1 OAuth2 Best Practices for Electron

#### 1. Never Store Secrets in Renderer Process
- Client secrets should only be in main process (if needed at all)
- For desktop apps, use Public Client flow (no client secret)
- Use PKCE to secure authorization code exchange

#### 2. Use Custom Protocol or Localhost Redirect
- **Custom Protocol** (most secure): `myapp{clientId}://auth`
  - Register in main process: `app.setAsDefaultProtocolClient('myapp123456')`
  - Prevents port conflicts
  - Better user experience
- **Localhost**: `http://localhost:{randomPort}/callback`
  - Easier for development
  - May conflict with firewalls

#### 3. Disable Node Integration in OAuth Windows
```javascript
const authWindow = new BrowserWindow({
  width: 600,
  height: 800,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true
  }
});
```

#### 4. Handle OAuth in Main Process Only
- Use IPC to communicate between renderer and main
- Keep all auth logic server-side (main process)
- Never expose tokens to renderer unless necessary

### 4.2 Secure Token Storage

#### Option 1: Electron safeStorage API (Recommended)
**Built-in since Electron 13+**

```javascript
const { safeStorage } = require('electron');

// Encrypt and store refresh token
function storeToken(provider, tokens) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error('Encryption not available on this system');
    return;
  }

  const encrypted = safeStorage.encryptString(JSON.stringify(tokens));
  // Store encrypted buffer to filesystem
  fs.writeFileSync(
    path.join(app.getPath('userData'), `${provider}-tokens.dat`),
    encrypted
  );
}

// Retrieve and decrypt token
function getToken(provider) {
  const filePath = path.join(app.getPath('userData'), `${provider}-tokens.dat`);
  if (!fs.existsSync(filePath)) return null;

  const encrypted = fs.readFileSync(filePath);
  const decrypted = safeStorage.decryptString(encrypted);
  return JSON.parse(decrypted);
}
```

**Platform Encryption**:
- **macOS**: Keychain Access
- **Windows**: DPAPI (Data Protection API)
- **Linux**: Secret Service API / kwallet / gnome-keyring

**Important**: On Linux without a secret store, safeStorage falls back to plaintext. Check `safeStorage.getSelectedStorageBackend()` - if it returns `'basic_text'`, warn the user.

#### Option 2: keytar (node-keytar)
**Cross-platform native keychain**

```javascript
const keytar = require('keytar');

// Store token
await keytar.setPassword('ai-command-center', 'google-refresh-token', refreshToken);

// Retrieve token
const token = await keytar.getPassword('ai-command-center', 'google-refresh-token');

// Delete token
await keytar.deletePassword('ai-command-center', 'google-refresh-token');
```

**Pros**:
- Mature, battle-tested library
- Direct OS keychain integration
- Simple API

**Cons**:
- Native module (requires compilation)
- Larger dependency
- Must call from main process only (macOS permission dialogs)

**Recommendation**: Use `safeStorage` for modern Electron apps, `keytar` if you need compatibility with older Electron or specific keychain features.

### 4.3 Token Refresh Strategy

```javascript
class TokenManager {
  constructor(provider, oauth2Client) {
    this.provider = provider;
    this.oauth2Client = oauth2Client;
    this.refreshTimer = null;
  }

  async loadTokens() {
    const tokens = await getToken(this.provider);
    if (!tokens) return null;

    this.oauth2Client.setCredentials(tokens);
    this.scheduleRefresh(tokens);
    return tokens;
  }

  async refreshAccessToken() {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    await storeToken(this.provider, credentials);
    this.scheduleRefresh(credentials);
    return credentials.access_token;
  }

  scheduleRefresh(tokens) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    // Refresh 5 minutes before expiry
    const expiryTime = tokens.expiry_date;
    const now = Date.now();
    const refreshIn = expiryTime - now - (5 * 60 * 1000);

    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, refreshIn);
    }
  }
}
```

---

## 5. Rate Limits & Quotas

### 5.1 Google API Rate Limits

#### Gmail API
- **Per Project**: 1,000,000,000 quota units/day
- **Per User**: 250 quota units/second
- **Concurrent Requests**: Limit enforced per user (no specific number published)
- **Batch Limit**: 50 requests per batch (larger batches trigger rate limiting)

**Handling Rate Limits**:
```javascript
async function handleGmailRequest(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    if (error.code === 429 || error.code === 403) {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 32000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return handleGmailRequest(apiCall);
    }
    throw error;
  }
}
```

#### Google Calendar API
- **Per Project**: 1,000,000 queries/day
- **Per Minute Per Project**: Quota enforced (specific number varies)
- **Per Minute Per User**: Quota enforced (specific number varies)
- **Error Codes**: 403 or 429 for `rateLimitExceeded`

**Best Practices**:
- Use push notifications instead of polling
- Randomize polling times to avoid spikes (never poll at midnight!)
- Implement exponential backoff
- Spread sync operations throughout the day

### 5.2 Microsoft Graph API Rate Limits

#### General Throttling
- **Mailbox**: 4 requests/second per app per mailbox (burst: 10,000 requests/10 min)
- **User Context**: Variable based on operation
- **Tenant**: Shared across all apps
- **Error Code**: 429 (Too Many Requests)
- **Headers**: `Retry-After`, `x-ms-throttle-information`

#### Calendar-Specific
- **GET /users/{id}/events**: 4 requests/second per app per mailbox
- **Burst Capacity**: 10,000 requests in 10-minute window

#### Subscription Limits
- **Active Subscriptions**: 1,000 per mailbox for Outlook resources (all apps combined)

**Handling Throttling**:
```javascript
async function callGraphAPI(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    if (error.statusCode === 429) {
      const retryAfter = error.headers['retry-after'] || 5;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return callGraphAPI(apiCall);
    }
    throw error;
  }
}
```

**Best Practices**:
- Implement exponential backoff with jitter
- Honor `Retry-After` header
- Consider Microsoft Graph Data Connect for bulk operations (not subject to same limits)
- Cache frequently accessed data locally

### 5.3 Rate Limit Comparison

| Feature | Google APIs | Microsoft Graph |
|---------|-------------|-----------------|
| Daily Limit | 1B quota units | No published daily limit |
| Per-Second Limit | 250 units/user | 4 req/sec/mailbox (Outlook) |
| Burst Handling | Sliding window | 10k req/10min burst |
| Error Codes | 403, 429 | 429 |
| Retry Header | No | `Retry-After` |
| Batch Size | 50 recommended | 20 recommended |

---

## 6. Real-Time Sync & Webhooks

### 6.1 Google API Push Notifications

#### Gmail Push Notifications
**Method**: Cloud Pub/Sub or webhook push

**Setup Steps**:
1. Create Cloud Pub/Sub topic in Google Cloud Console
2. Grant publish privileges to `gmail-api-push@system.gserviceaccount.com`
3. Call `watch` method on user's mailbox

**Watch API Call**:
```javascript
const response = await gmail.users.watch({
  userId: 'me',
  requestBody: {
    topicName: 'projects/myproject/topics/gmail-notifications',
    labelIds: ['INBOX']
  }
});
// Watch expires in 7 days, must renew
```

**Limitations**:
- Maximum 1 notification/second per user (excess dropped)
- Watch expires after 7 days (renew daily recommended)
- Minimal notification payload (just tells you something changed)
- Must call `history.list` API to determine what changed

**Fallback Strategy**: Implement periodic polling as backup in case notifications fail.

#### Google Calendar Push Notifications
**Method**: Webhook callback via HTTPS

**Setup**:
1. Set up HTTPS webhook endpoint with valid SSL certificate
2. Call `watch` method on calendar resource

**Watch API Call**:
```javascript
const response = await calendar.events.watch({
  calendarId: 'primary',
  requestBody: {
    id: 'unique-channel-id',
    type: 'web_hook',
    address: 'https://yourdomain.com/webhook/calendar'
  }
});
// Watch expires based on returned expiration value
```

**Webhook Payload**:
- Minimal: Only resource ID in request body
- Headers: `X-Goog-Resource-ID`, `X-Goog-Resource-State` (e.g., 'sync', 'exists', 'not_exists')
- Must call Calendar API to get actual changes

**Limitations**:
- No automatic renewal (must manually recreate channels before expiration)
- SSL certificate required (HTTPS only)
- Doesn't include change details

### 6.2 Microsoft Graph Webhooks

#### Change Notifications
**Method**: Webhooks, Event Hubs, or Event Grid

**Supported Resources**:
- Messages: `/me/messages`, `/users/{id}/messages`
- Events: `/me/events`, `/users/{id}/events`
- Contacts: `/me/contacts`, `/users/{id}/contacts`
- And many more (Teams, OneDrive, etc.)

**Creating a Subscription**:
```javascript
const subscription = {
  changeType: 'created,updated,deleted',
  notificationUrl: 'https://yourdomain.com/webhook/graph',
  resource: '/me/messages',
  expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour
  clientState: 'secret-state-value'
};

const response = await client.api('/subscriptions').post(subscription);
```

**Subscription Lifecycle**:
- **Maximum Duration**: Varies by resource (typically 4230 minutes for mail/calendar)
- **Renewal**: Must renew before expiration or create new subscription
- **Limit**: 1,000 active subscriptions per mailbox (all apps)

**Webhook Validation**:
Microsoft Graph validates your endpoint before creating subscription:
1. Sends POST with `validationToken` query parameter
2. Your endpoint must respond with 200 and the token in plain text

**Notification Handling**:
```javascript
app.post('/webhook/graph', (req, res) => {
  const notifications = req.body.value;

  // Respond quickly (within 3 seconds)
  res.status(202).send(); // Accepted

  // Process notifications asynchronously
  processNotifications(notifications);
});
```

**Response Requirements**:
- Respond within 3 seconds with 200/202
- If processing takes >10 seconds, queue notification and respond 202
- Return 5xx to trigger retry (up to 4 hours)

**Rich Notifications** (include resource data):
```javascript
const subscription = {
  changeType: 'created,updated',
  notificationUrl: 'https://yourdomain.com/webhook/graph',
  resource: '/me/messages',
  includeResourceData: true,
  encryptionCertificate: 'BASE64_ENCODED_CERT',
  encryptionCertificateId: 'cert-id'
};
```

**Lifecycle Notifications**:
- Sent to `lifecycleNotificationUrl` if specified
- Alerts for: subscription reauthorization required, subscription missed
- Helps minimize missed notifications

### 6.3 Push Notifications Strategy for Electron

**Challenge**: Electron apps may not be always running to receive webhooks.

**Solution 1: Background Service**
- Run lightweight Node.js server to receive webhooks
- Notify Electron app via IPC or database watch
- Pros: Real-time updates even when app closed
- Cons: Extra complexity, resource usage

**Solution 2: Hybrid (Push + Polling)**
- Use push notifications when app is running
- Fall back to polling on app startup and periodically
- Pros: Simpler, reliable
- Cons: Slightly delayed updates when app closed

**Recommended Hybrid Approach**:
```javascript
class EmailSyncService {
  constructor() {
    this.subscriptionId = null;
    this.lastSyncTime = null;
  }

  async start() {
    // Initial sync via polling
    await this.performFullSync();

    // Set up push notifications
    await this.setupWebhook();

    // Fallback polling every 15 minutes
    setInterval(() => this.performIncrementalSync(), 15 * 60 * 1000);
  }

  async setupWebhook() {
    // For Graph API (local development)
    // Use ngrok or similar for public HTTPS endpoint
    const subscription = await createGraphSubscription({
      resource: '/me/messages',
      notificationUrl: 'https://your-temp-url.ngrok.io/webhook'
    });
    this.subscriptionId = subscription.id;
  }

  async performIncrementalSync() {
    // Fetch changes since lastSyncTime
    // Update local database
    this.lastSyncTime = Date.now();
  }
}
```

---

## 7. Offline Sync Strategy

### 7.1 Local Storage Options

#### IndexedDB (Recommended)
**Pros**:
- Async (non-blocking)
- Large storage capacity (no hard limit)
- Transactional
- Structured data with indexes
- Native browser support

**Cons**:
- Complex API (use wrapper library)
- Slower than in-memory (but faster than LocalStorage)

**Recommended Libraries**:
- **Dexie.js**: Simple wrapper for IndexedDB
- **PouchDB**: Replication-capable, CouchDB sync
- **RxDB**: Reactive, multi-tab support, encryption

#### SQLite (Alternative for Electron)
**Pros**:
- Relational database
- SQL queries
- Better performance for large datasets
- Works in main process

**Cons**:
- Requires native module (`better-sqlite3` or `sqlite3`)
- Not available in renderer (unless using IPC)

**Recommended for AI Command Center**: SQLite (you're already planning to use it per CLAUDE.md).

### 7.2 Offline-First Architecture

#### Change Queue Pattern

**Concept**: Track all local changes in a queue, sync to server when online.

```javascript
// Schema for Change Queue
const changeSchema = {
  id: 'string', // UUID
  entityType: 'string', // 'email', 'event', 'contact'
  entityId: 'string',
  changeType: 'string', // 'create', 'update', 'delete'
  timestamp: 'number',
  payload: 'object',
  synced: 'boolean'
};

// Add change to queue
async function queueChange(entityType, changeType, entityId, payload) {
  await db.changes.add({
    id: uuidv4(),
    entityType,
    entityId,
    changeType,
    timestamp: Date.now(),
    payload,
    synced: false
  });
}

// Sync queue
async function syncChanges() {
  const pendingChanges = await db.changes.where('synced').equals(false).toArray();

  for (const change of pendingChanges) {
    try {
      await applyChangeToServer(change);
      await db.changes.update(change.id, { synced: true });
    } catch (error) {
      console.error(`Failed to sync change ${change.id}:`, error);
      // Retry later
    }
  }
}
```

#### Conflict Resolution

**Strategies**:
1. **Last-Write Wins**: Simplest, accept most recent timestamp
2. **Server Wins**: Always prefer server state
3. **Client Wins**: Prefer local changes
4. **CRDT (Conflict-free Replicated Data Types)**: Automatic merge (complex)
5. **Manual Resolution**: Prompt user to choose

**Recommended for Email/Calendar**: Last-Write Wins with server authority for read-only items.

```javascript
async function resolveConflict(localItem, serverItem) {
  if (localItem.updatedAt > serverItem.updatedAt) {
    // Push local changes to server
    await updateServerItem(localItem);
    return localItem;
  } else {
    // Update local with server data
    await updateLocalItem(serverItem);
    return serverItem;
  }
}
```

### 7.3 Sync Strategy

#### Initial Sync
1. Fetch all data from server (paginated)
2. Store in local database with metadata
3. Record sync timestamp

#### Incremental Sync
1. Use `lastSyncTime` to fetch changes since last sync
2. For Google: Use `history.list` API with `startHistoryId`
3. For Microsoft: Use Delta Query (`/delta` endpoint)
4. Merge changes into local database
5. Update `lastSyncTime`

#### Delta Query (Microsoft Graph)
```javascript
// Initial request
let deltaLink = '/me/messages/delta';
let messages = [];

while (deltaLink) {
  const response = await client.api(deltaLink).get();
  messages = messages.concat(response.value);
  deltaLink = response['@odata.nextLink'] || response['@odata.deltaLink'];
}

// Store deltaLink for next sync
await db.metadata.put({ key: 'messages-delta-link', value: deltaLink });

// Next sync
const storedDeltaLink = await db.metadata.get('messages-delta-link');
const deltaResponse = await client.api(storedDeltaLink).get();
// Process only changes
```

### 7.4 Offline Detection

**Problem**: Electron's `navigator.onLine` is unreliable (doesn't detect wifi without internet).

**Solution**: Active ping to reliable servers
```javascript
const dns = require('dns');

async function checkOnlineStatus() {
  return new Promise((resolve) => {
    dns.resolve('www.google.com', (err) => {
      resolve(!err);
    });
  });
}

// Check on request failure
async function makeRequest(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.message.includes('network')) {
      const isOnline = await checkOnlineStatus();
      if (!isOnline) {
        // Queue for later
        return queueRequest(apiCall);
      }
    }
    throw error;
  }
}
```

### 7.5 Multi-Window Synchronization

**Problem**: Multiple app windows accessing same local database causes conflicts.

**Solution**: Leader election + broadcast channel
```javascript
// Use BroadcastChannel for cross-window communication
const channel = new BroadcastChannel('db-sync');

let isLeader = false;

channel.addEventListener('message', (event) => {
  if (event.data.type === 'leader-election') {
    // Respond with own ID if leader
    if (isLeader) {
      channel.postMessage({ type: 'leader-response', leaderId: windowId });
    }
  } else if (event.data.type === 'data-changed') {
    // Reload local cache
    refreshData();
  }
});

// Only leader performs sync
if (isLeader) {
  setInterval(() => syncChanges(), 60000);
}
```

**For Electron**: Use IPC between renderer and main process instead of BroadcastChannel.

---

## 8. Recommended Architecture

### 8.1 Service Layer Pattern

**Structure**:
```
src/
  services/
    accounts/
      AccountManager.js         # Manages multiple accounts
      GoogleAccountService.js   # Google-specific logic
      MicrosoftAccountService.js # Microsoft-specific logic
      ExchangeAccountService.js  # Exchange-specific logic
    auth/
      GoogleAuthProvider.js
      MicrosoftAuthProvider.js
      TokenManager.js
    sync/
      EmailSyncService.js
      CalendarSyncService.js
      ContactsSyncService.js
      SyncQueue.js
    storage/
      DatabaseService.js        # SQLite/IndexedDB wrapper
      CacheManager.js
```

### 8.2 AccountManager Architecture

```javascript
// services/accounts/AccountManager.js
class AccountManager {
  constructor() {
    this.accounts = new Map(); // accountId -> AccountService
    this.db = new DatabaseService();
  }

  async addAccount(provider, credentials) {
    const accountId = uuidv4();

    let service;
    switch (provider) {
      case 'google':
        service = new GoogleAccountService(credentials);
        break;
      case 'microsoft':
        service = new MicrosoftAccountService(credentials);
        break;
      case 'exchange':
        service = new ExchangeAccountService(credentials);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    await service.initialize();
    this.accounts.set(accountId, service);

    await this.db.accounts.add({
      id: accountId,
      provider,
      email: await service.getEmail(),
      addedAt: Date.now()
    });

    return accountId;
  }

  async removeAccount(accountId) {
    const service = this.accounts.get(accountId);
    if (service) {
      await service.disconnect();
      this.accounts.delete(accountId);
      await this.db.accounts.delete(accountId);
    }
  }

  async syncAccount(accountId) {
    const service = this.accounts.get(accountId);
    if (!service) throw new Error('Account not found');

    await Promise.all([
      service.syncEmails(),
      service.syncCalendar(),
      service.syncContacts()
    ]);
  }

  async syncAll() {
    const promises = Array.from(this.accounts.keys()).map(id => this.syncAccount(id));
    await Promise.all(promises);
  }

  getAccount(accountId) {
    return this.accounts.get(accountId);
  }

  getAllAccounts() {
    return Array.from(this.accounts.entries()).map(([id, service]) => ({
      id,
      provider: service.provider,
      email: service.email
    }));
  }
}
```

### 8.3 Base Account Service

```javascript
// services/accounts/BaseAccountService.js
class BaseAccountService {
  constructor(provider) {
    this.provider = provider;
    this.email = null;
    this.authProvider = null;
  }

  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  async disconnect() {
    // Revoke tokens, clean up
  }

  async getEmail() {
    if (!this.email) {
      this.email = await this.fetchUserEmail();
    }
    return this.email;
  }

  async syncEmails() {
    throw new Error('syncEmails() must be implemented by subclass');
  }

  async syncCalendar() {
    throw new Error('syncCalendar() must be implemented by subclass');
  }

  async syncContacts() {
    throw new Error('syncContacts() must be implemented by subclass');
  }

  async sendEmail(message) {
    throw new Error('sendEmail() must be implemented by subclass');
  }

  async createCalendarEvent(event) {
    throw new Error('createCalendarEvent() must be implemented by subclass');
  }
}

module.exports = BaseAccountService;
```

### 8.4 Google Account Service Implementation

```javascript
// services/accounts/GoogleAccountService.js
const { google } = require('googleapis');
const BaseAccountService = require('./BaseAccountService');

class GoogleAccountService extends BaseAccountService {
  constructor(oauth2Client) {
    super('google');
    this.oauth2Client = oauth2Client;
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    this.people = google.people({ version: 'v1', auth: oauth2Client });
  }

  async initialize() {
    // Verify token validity
    const tokenInfo = await this.oauth2Client.getTokenInfo(
      this.oauth2Client.credentials.access_token
    );
    this.email = tokenInfo.email;
  }

  async fetchUserEmail() {
    const profile = await this.gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress;
  }

  async syncEmails() {
    // Implement incremental sync using history API
    const lastHistoryId = await db.getMetadata('google-last-history-id');

    if (!lastHistoryId) {
      return this.fullEmailSync();
    }

    const response = await this.gmail.users.history.list({
      userId: 'me',
      startHistoryId: lastHistoryId
    });

    const history = response.data.history || [];

    for (const record of history) {
      if (record.messagesAdded) {
        await this.processNewMessages(record.messagesAdded);
      }
      if (record.messagesDeleted) {
        await this.processDeletedMessages(record.messagesDeleted);
      }
    }

    await db.setMetadata('google-last-history-id', response.data.historyId);
  }

  async syncCalendar() {
    const events = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    await db.calendarEvents.bulkPut(events.data.items.map(event => ({
      id: event.id,
      accountId: this.accountId,
      provider: 'google',
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      raw: event
    })));
  }

  async syncContacts() {
    const connections = await this.people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,phoneNumbers'
    });

    await db.contacts.bulkPut(connections.data.connections.map(contact => ({
      id: contact.resourceName,
      accountId: this.accountId,
      provider: 'google',
      name: contact.names?.[0]?.displayName,
      email: contact.emailAddresses?.[0]?.value,
      phone: contact.phoneNumbers?.[0]?.value,
      raw: contact
    })));
  }

  async sendEmail(message) {
    const raw = this.createMimeMessage(message);
    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
    return response.data;
  }

  createMimeMessage({ to, subject, body }) {
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ];
    const message = messageParts.join('\n');
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }
}

module.exports = GoogleAccountService;
```

### 8.5 Database Schema

```sql
-- accounts table
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- 'google', 'microsoft', 'exchange'
  email TEXT NOT NULL,
  display_name TEXT,
  added_at INTEGER NOT NULL,
  last_sync_at INTEGER,
  enabled BOOLEAN DEFAULT 1
);

-- emails table
CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  to_addresses TEXT, -- JSON array
  cc_addresses TEXT, -- JSON array
  date INTEGER,
  body_text TEXT,
  body_html TEXT,
  has_attachments BOOLEAN,
  labels TEXT, -- JSON array
  folder TEXT,
  is_read BOOLEAN,
  is_starred BOOLEAN,
  raw_data TEXT, -- JSON
  synced_at INTEGER,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- calendar_events table
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  calendar_id TEXT,
  summary TEXT,
  description TEXT,
  location TEXT,
  start_time INTEGER,
  end_time INTEGER,
  all_day BOOLEAN,
  recurrence TEXT, -- JSON
  attendees TEXT, -- JSON array
  organizer TEXT,
  status TEXT, -- 'confirmed', 'tentative', 'cancelled'
  raw_data TEXT, -- JSON
  synced_at INTEGER,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- contacts table
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  address TEXT,
  notes TEXT,
  raw_data TEXT, -- JSON
  synced_at INTEGER,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- sync_metadata table
CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);

-- sync_queue table (for offline changes)
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'email', 'event', 'contact'
  entity_id TEXT,
  change_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  payload TEXT, -- JSON
  created_at INTEGER NOT NULL,
  synced BOOLEAN DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Indexes for performance
CREATE INDEX idx_emails_account ON emails(account_id);
CREATE INDEX idx_emails_date ON emails(date DESC);
CREATE INDEX idx_events_account ON calendar_events(account_id);
CREATE INDEX idx_events_start ON calendar_events(start_time);
CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_sync_queue_pending ON sync_queue(synced, created_at);
```

### 8.6 IPC Communication (Electron)

```javascript
// electron/main.cjs
const { ipcMain } = require('electron');
const AccountManager = require('./services/accounts/AccountManager');

const accountManager = new AccountManager();

// Initialize on app ready
app.whenReady().then(async () => {
  await accountManager.initialize();
});

// IPC Handlers
ipcMain.handle('accounts:add', async (event, provider) => {
  // Trigger OAuth flow
  const credentials = await performOAuthFlow(provider);
  const accountId = await accountManager.addAccount(provider, credentials);
  return accountId;
});

ipcMain.handle('accounts:remove', async (event, accountId) => {
  await accountManager.removeAccount(accountId);
});

ipcMain.handle('accounts:list', async () => {
  return accountManager.getAllAccounts();
});

ipcMain.handle('accounts:sync', async (event, accountId) => {
  await accountManager.syncAccount(accountId);
});

ipcMain.handle('emails:list', async (event, { accountId, limit, offset }) => {
  const db = accountManager.db;
  const emails = await db.emails
    .where('account_id').equals(accountId)
    .orderBy('date').reverse()
    .offset(offset).limit(limit)
    .toArray();
  return emails;
});

ipcMain.handle('emails:send', async (event, { accountId, message }) => {
  const service = accountManager.getAccount(accountId);
  return await service.sendEmail(message);
});

// ... more handlers for calendar, contacts, etc.
```

```javascript
// src/services/ElectronAPI.js (renderer process)
class ElectronAPI {
  async addAccount(provider) {
    return window.electronAPI.invoke('accounts:add', provider);
  }

  async removeAccount(accountId) {
    return window.electronAPI.invoke('accounts:remove', accountId);
  }

  async listAccounts() {
    return window.electronAPI.invoke('accounts:list');
  }

  async syncAccount(accountId) {
    return window.electronAPI.invoke('accounts:sync', accountId);
  }

  async listEmails(accountId, limit = 50, offset = 0) {
    return window.electronAPI.invoke('emails:list', { accountId, limit, offset });
  }

  async sendEmail(accountId, message) {
    return window.electronAPI.invoke('emails:send', { accountId, message });
  }
}

export default new ElectronAPI();
```

---

## 9. Implementation Priority

### Phase 1: Foundation (Week 1-2)
**Priority: Critical**

1. **Set up OAuth2 infrastructure**
   - Implement Google OAuth2 with PKCE
   - Implement Microsoft OAuth2 with MSAL Node
   - Create TokenManager with safeStorage
   - Custom protocol registration

2. **Database setup**
   - Create SQLite schema
   - Implement DatabaseService wrapper
   - Add migration system

3. **Account management**
   - Build AccountManager
   - Implement BaseAccountService
   - Create IPC handlers

**Deliverables**:
- Users can add Google/Microsoft accounts
- Tokens securely stored and auto-refreshed
- Database ready for sync data

---

### Phase 2: Core Sync - Email (Week 3-4)
**Priority: High**

1. **Google Gmail sync**
   - Implement GoogleAccountService
   - Full sync on first run
   - Incremental sync with history API
   - Store emails in database

2. **Microsoft Outlook sync**
   - Implement MicrosoftAccountService
   - Delta query for incremental sync
   - Store emails in database

3. **Email UI components**
   - Account list view
   - Email list view
   - Email detail view
   - Compose/send email

**Deliverables**:
- Users can view emails from multiple accounts
- Emails sync automatically
- Send emails through any account

---

### Phase 3: Calendar & Contacts (Week 5-6)
**Priority: High**

1. **Calendar integration**
   - Google Calendar sync
   - Microsoft Calendar sync
   - Create/edit/delete events
   - Calendar UI component

2. **Contacts integration**
   - Google People API sync
   - Microsoft Graph contacts sync
   - Contacts UI component
   - Search and autocomplete

**Deliverables**:
- Unified calendar view across accounts
- Contact management and search
- Create events from any account

---

### Phase 4: Real-Time & Offline (Week 7-8)
**Priority: Medium

1. **Push notifications**
   - Gmail push setup (Cloud Pub/Sub)
   - Microsoft Graph webhooks
   - Webhook endpoint (ngrok for dev)
   - Notification processing

2. **Offline support**
   - Sync queue implementation
   - Conflict resolution
   - Offline detection
   - Background sync on reconnect

**Deliverables**:
- Real-time updates when online
- Graceful offline mode
- Automatic sync on reconnection

---

### Phase 5: Exchange & Polish (Week 9-10)
**Priority: Low

1. **Exchange Server support**
   - EWS integration for on-prem Exchange
   - ExchangeAccountService implementation
   - OAuth2 for Exchange Online

2. **Performance optimization**
   - Database indexing
   - Lazy loading
   - Virtual scrolling for large lists
   - Caching strategy

3. **Error handling & UX**
   - Retry logic with exponential backoff
   - User-friendly error messages
   - Sync status indicators
   - Account connection health

**Deliverables**:
- Exchange Server support (if needed)
- Optimized performance
- Polished user experience

---

### Phase 6: Advanced Features (Future)
**Priority: Optional**

1. **Advanced search**
   - Full-text search across emails
   - Filter by sender, date, attachments
   - Saved searches

2. **Email templates**
   - Pre-written responses
   - Variable substitution

3. **Calendar features**
   - Meeting scheduler
   - Free/busy lookup
   - Recurring event editor

4. **Integration with other modules**
   - Link emails to project context
   - Extract meeting notes
   - Contact-based reminders

---

## Security Considerations Summary

### Critical Security Rules

1. **Never Store Secrets in Code**
   - No hardcoded client secrets in renderer
   - Use environment variables or secure config
   - Client secrets only in main process (if needed)

2. **Token Security**
   - Always use `safeStorage` or `keytar`
   - Never store tokens in plaintext
   - Check encryption availability on Linux

3. **OAuth Flow Security**
   - Use PKCE for all flows
   - Custom protocol > localhost for production
   - Disable node integration in OAuth windows
   - Validate redirect URIs server-side

4. **Scope Minimization**
   - Request minimum scopes needed
   - Use incremental authorization
   - Explain scope purposes to users

5. **Network Security**
   - All API calls over HTTPS
   - Validate SSL certificates
   - Implement certificate pinning (optional)

6. **Data Protection**
   - Encrypt sensitive fields in database
   - Sanitize email bodies (XSS protection)
   - Isolate account data

7. **Error Handling**
   - Never expose tokens in error logs
   - Redact sensitive data in debug output
   - Implement rate limit backoff

---

## Key Takeaways

### Google Integration
- Use `googleapis` package for comprehensive API access
- OAuth2 with PKCE and custom protocol
- 1B quota units/day for Gmail, 1M queries/day for Calendar
- Push notifications require Cloud Pub/Sub setup
- Incremental sync via history API (Gmail) or sync tokens (Calendar)

### Microsoft Integration
- Use `@microsoft/microsoft-graph-client` with MSAL Node
- MSAL-browser NOT supported in Electron
- System browser flow recommended
- Delta queries for efficient incremental sync
- Webhooks for real-time updates (4230 min max subscription)
- 4 req/sec per mailbox rate limit

### Exchange Integration
- Use `ews-javascript-api` for on-premises only
- EWS in sustaining mode (no new features)
- Prefer Microsoft Graph for Exchange Online
- OAuth2 supported for Exchange Online via Azure AD

### Architecture
- Service layer pattern with AccountManager
- Separate services per provider
- SQLite for local storage
- IPC for renderer-main communication
- Change queue for offline sync

### Implementation Order
1. OAuth2 + Token Storage (Week 1-2)
2. Email Sync (Week 3-4)
3. Calendar + Contacts (Week 5-6)
4. Real-time + Offline (Week 7-8)
5. Exchange + Polish (Week 9-10)

---

## Sources

### Google APIs
- [GitHub - getstation/electron-google-oauth2](https://github.com/getstation/electron-google-oauth2)
- [@getstation/electron-google-oauth2 - npm](https://www.npmjs.com/package/@getstation/electron-google-oauth2)
- [OAuth 2.0 for iOS & Desktop Apps | Google for Developers](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Node.js quickstart | Gmail API](https://developers.google.com/gmail/api/quickstart/nodejs)
- [@googleapis/gmail - npm](https://www.npmjs.com/package/@googleapis/gmail)
- [GitHub - googleapis/google-api-nodejs-client](https://github.com/googleapis/google-api-nodejs-client)
- [Node.js quickstart | Google Calendar](https://developers.google.com/workspace/calendar/api/quickstart/nodejs)
- [@googleapis/calendar - npm](https://www.npmjs.com/package/@googleapis/calendar)
- [Node.js quickstart | People API](https://developers.google.com/people/quickstart/nodejs)
- [Usage limits | Gmail API](https://developers.google.com/workspace/gmail/api/reference/quota)
- [Manage quotas | Google Calendar](https://developers.google.com/workspace/calendar/api/guides/quota)
- [Push notifications | Gmail API](https://developers.google.com/workspace/gmail/api/guides/push)
- [Push notifications | Google Calendar](https://developers.google.com/workspace/calendar/api/guides/push)

### Microsoft APIs
- [Tutorial: Sign in users and call Microsoft Graph API in Electron](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-v2-nodejs-desktop)
- [GitHub - Azure-Samples/ms-identity-javascript-nodejs-desktop](https://github.com/Azure-Samples/ms-identity-javascript-nodejs-desktop)
- [@microsoft/microsoft-graph-client - npm](https://www.npmjs.com/package/@microsoft/microsoft-graph-client)
- [Overview of Microsoft Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-overview)
- [Microsoft Graph service-specific throttling limits](https://learn.microsoft.com/en-us/graph/throttling-limits)
- [Receive change notifications through webhooks](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)
- [Set up notifications for changes in resource data](https://learn.microsoft.com/en-us/graph/change-notifications-overview)

### Exchange Server
- [GitHub - gautamsi/ews-javascript-api](https://github.com/gautamsi/ews-javascript-api)
- [GitHub - gautamsi/ews-js-api-browser](https://github.com/gautamsi/ews-js-api-browser)

### OAuth2 & Security
- [electron-oauth2 - npm](https://www.npmjs.com/package/electron-oauth2)
- [Build and Secure an Electron App - Auth0](https://auth0.com/blog/securing-electron-applications-with-openid-connect-and-oauth-2/)
- [How to securely store sensitive information in Electron with node-keytar](https://cameronnokes.com/blog/how-to-securely-store-sensitive-information-in-electron-with-node-keytar/)
- [safeStorage | Electron](https://www.electronjs.org/docs/latest/api/safe-storage)
- [@itwin/electron-authorization - npm](https://www.npmjs.com/package/@itwin/electron-authorization)
- [Electron redirect URI scheme best practices - GitHub](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/6798)

### Offline Sync
- [Electron Database - RxDB](https://rxdb.info/electron-database.html)
- [The Offline-First Sync - acreom blog](https://acreom.com/blog/the-offline-first-sync)
- [Cool frontend arts of local-first - Evil Martians](https://evilmartians.com/chronicles/cool-front-end-arts-of-local-first-storage-sync-and-conflicts)

### Multi-Provider Architecture
- [GitHub - APratham/electron-oauth-app](https://github.com/APratham/electron-oauth-app)
- [GitHub - mironal/electron-oauth-helper](https://github.com/mironal/electron-oauth-helper)
- [GitHub - jmjuanes/electron-auth](https://github.com/jmjuanes/electron-auth)

---

**End of Research Document**

*This research provides a comprehensive foundation for implementing Google, Microsoft, and Exchange account integrations in the AI Command Center Electron application. Follow the implementation priority to build features incrementally with a focus on security and user experience.*
