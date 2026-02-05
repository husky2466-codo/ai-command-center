const { google } = require('googleapis');
const { BrowserWindow } = require('electron');
const crypto = require('crypto');
const url = require('url');
const path = require('path');
const { saveTokens, loadTokens } = require('./tokenStorage.cjs');

// OAuth2 client instance (will be initialized with credentials)
let oauth2Client = null;

// PKCE helpers
function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64URLEncode(sha256(verifier));
}

/**
 * Initialize OAuth2 client with credentials from environment
 * @param {Object} credentials - Google OAuth2 credentials
 * @param {string} credentials.clientId - Google client ID
 * @param {string} credentials.clientSecret - Google client secret
 */
function initializeOAuth2Client(credentials) {
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error('Google OAuth2 credentials missing. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  }

  oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    'http://localhost:8123/callback' // Redirect URI
  );

  console.log('[GoogleAuth] OAuth2 client initialized');
}

/**
 * Get the initialized OAuth2 client
 * @returns {OAuth2Client} The Google OAuth2 client
 */
function getOAuth2Client() {
  if (!oauth2Client) {
    throw new Error('OAuth2 client not initialized. Call initializeOAuth2Client first.');
  }
  return oauth2Client;
}

/**
 * Authenticate with Google using OAuth2 flow
 * Opens a BrowserWindow popup for user to sign in
 * @param {string[]} scopes - Array of OAuth scopes to request
 * @returns {Promise<{email: string, tokens: Object}>} User email and tokens
 */
async function authenticateGoogle(scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',  // Required for mark as read, star, trash
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/contacts.readonly'
]) {
  if (!oauth2Client) {
    throw new Error('OAuth2 client not initialized');
  }

  return new Promise((resolve, reject) => {
    // Generate PKCE challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Generate authorization URL with PKCE
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    console.log('[GoogleAuth] Opening authorization window...');

    // Create auth window
    const authWindow = new BrowserWindow({
      width: 600,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      },
      title: 'Sign in with Google',
      autoHideMenuBar: true
    });

    authWindow.loadURL(authUrl);

    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    // Intercept navigation to redirect URI
    authWindow.webContents.on('will-redirect', async (event, redirectUrl) => {
      await handleCallback(redirectUrl, codeVerifier, authWindow, resolve, reject);
    });

    // Also check for navigation (some flows use navigation instead of redirect)
    authWindow.webContents.on('did-navigate', async (event, navigatedUrl) => {
      await handleCallback(navigatedUrl, codeVerifier, authWindow, resolve, reject);
    });

    // Handle window close
    authWindow.on('closed', () => {
      reject(new Error('Authentication window closed by user'));
    });
  });
}

/**
 * Handle OAuth callback URL
 * @private
 */
async function handleCallback(callbackUrl, codeVerifier, authWindow, resolve, reject) {
  try {
    if (callbackUrl.startsWith('http://localhost:8123/callback')) {
      console.log('[GoogleAuth] Callback received, processing...');

      const urlParams = new url.URL(callbackUrl).searchParams;
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        authWindow.close();
        return reject(new Error(`OAuth error: ${error}`));
      }

      if (!code) {
        return; // Not the callback we're looking for
      }

      // Exchange code for tokens using PKCE verifier
      const { tokens } = await oauth2Client.getToken({
        code: code,
        codeVerifier: codeVerifier
      });

      oauth2Client.setCredentials(tokens);
      console.log('[GoogleAuth] Tokens received successfully');

      // Get user email using userinfo endpoint
      let email;
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        email = userInfo.data.email;
      } catch (err) {
        console.warn('[GoogleAuth] Failed to get userinfo, trying tokenInfo:', err.message);
        // Fallback to tokenInfo
        const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
        email = tokenInfo.email;
      }

      if (!email) {
        throw new Error('Could not retrieve user email from Google');
      }

      console.log(`[GoogleAuth] Authenticated as: ${email}`);

      // Save tokens securely
      await saveTokens('google', email, tokens);
      console.log('[GoogleAuth] Tokens saved securely');

      authWindow.close();
      resolve({ email, tokens });
    }
  } catch (err) {
    console.error('[GoogleAuth] Error in callback handler:', err.message);
    authWindow.close();
    reject(err);
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} email - User email (to load stored tokens)
 * @returns {Promise<Object>} New tokens
 */
async function refreshTokens(email) {
  if (!oauth2Client) {
    throw new Error('OAuth2 client not initialized');
  }

  try {
    console.log(`[GoogleAuth] Refreshing tokens for ${email}...`);

    // Load stored tokens
    const storedTokens = await loadTokens('google', email);
    if (!storedTokens) {
      throw new Error('No stored tokens found. Please re-authenticate.');
    }

    oauth2Client.setCredentials(storedTokens);

    // Refresh access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    console.log('[GoogleAuth] Tokens refreshed successfully');

    // Save new tokens
    await saveTokens('google', email, credentials);

    return credentials;
  } catch (error) {
    console.error('[GoogleAuth] Token refresh failed:', error.message);
    throw new Error('Token refresh failed. User may need to re-authenticate.');
  }
}

/**
 * Revoke access and delete stored tokens
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
async function revokeAccess(email) {
  if (!oauth2Client) {
    throw new Error('OAuth2 client not initialized');
  }

  try {
    console.log(`[GoogleAuth] Revoking access for ${email}...`);

    // Load stored tokens
    const storedTokens = await loadTokens('google', email);
    if (storedTokens && storedTokens.access_token) {
      oauth2Client.setCredentials(storedTokens);

      // Revoke token
      await oauth2Client.revokeCredentials();
      console.log('[GoogleAuth] Access revoked successfully');
    }

    // Delete stored tokens
    const { deleteTokens } = require('./tokenStorage.cjs');
    await deleteTokens('google', email);

  } catch (error) {
    console.error('[GoogleAuth] Error revoking access:', error.message);
    // Continue to delete tokens even if revocation fails
    const { deleteTokens } = require('./tokenStorage.cjs');
    await deleteTokens('google', email);
  }
}

/**
 * Load stored tokens and set on OAuth2 client
 * @param {string} email - User email
 * @returns {Promise<boolean>} True if tokens loaded successfully
 */
async function loadStoredTokens(email) {
  if (!oauth2Client) {
    throw new Error('OAuth2 client not initialized');
  }

  try {
    const tokens = await loadTokens('google', email);
    if (tokens) {
      oauth2Client.setCredentials(tokens);
      console.log(`[GoogleAuth] Loaded stored tokens for ${email}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[GoogleAuth] Error loading stored tokens:', error.message);
    return false;
  }
}

module.exports = {
  initializeOAuth2Client,
  getOAuth2Client,
  authenticateGoogle,
  refreshTokens,
  revokeAccess,
  loadStoredTokens
};
