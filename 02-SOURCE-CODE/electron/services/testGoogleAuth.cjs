/**
 * Test utility for Google OAuth2 authentication
 *
 * This script can be used to test the OAuth flow independently
 * Run with: node electron/services/testGoogleAuth.cjs
 *
 * NOTE: This requires setting up the Electron app context first.
 * Better to test via the actual app using the IPC handlers.
 * This file is provided as a reference for understanding the flow.
 */

const { google } = require('googleapis');
const readline = require('readline');

// Mock credentials (replace with actual values for testing)
const CREDENTIALS = {
  clientId: process.env.GOOGLE_CLIENT_ID || 'your-client-id.apps.googleusercontent.com',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
  redirectUri: 'http://localhost:8123/callback'
};

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/contacts.readonly'
];

/**
 * Manual test flow (without Electron BrowserWindow)
 * In production, the BrowserWindow handles this automatically
 */
async function testOAuthFlow() {
  console.log('=== Google OAuth2 Test ===\n');

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    CREDENTIALS.clientId,
    CREDENTIALS.clientSecret,
    CREDENTIALS.redirectUri
  );

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('1. Authorization URL generated:');
  console.log(authUrl);
  console.log('\n2. Open this URL in your browser');
  console.log('3. Sign in and authorize the app');
  console.log('4. You will be redirected to:', CREDENTIALS.redirectUri);
  console.log('5. Copy the "code" parameter from the URL\n');

  // Get auth code from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const authCode = await new Promise((resolve) => {
    rl.question('Enter the authorization code: ', (code) => {
      rl.close();
      resolve(code);
    });
  });

  // Exchange code for tokens
  console.log('\nExchanging code for tokens...');
  const { tokens } = await oauth2Client.getToken(authCode);
  oauth2Client.setCredentials(tokens);

  console.log('\n✓ Tokens received!');
  console.log('Access Token:', tokens.access_token.substring(0, 20) + '...');
  console.log('Refresh Token:', tokens.refresh_token ? 'Present' : 'Missing');
  console.log('Expiry:', new Date(tokens.expiry_date).toLocaleString());

  // Get user info
  console.log('\nFetching user info...');
  const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
  console.log('Email:', tokenInfo.email);
  console.log('Scopes:', tokenInfo.scopes.join(', '));

  // Test Gmail API
  console.log('\n=== Testing Gmail API ===');
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log('Email Address:', profile.data.emailAddress);
    console.log('Messages Total:', profile.data.messagesTotal);
    console.log('Threads Total:', profile.data.threadsTotal);

    // List recent messages
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5
    });
    console.log('\nRecent Messages:');
    console.log('Found', messages.data.messages?.length || 0, 'messages');
  } catch (error) {
    console.error('Gmail API Error:', error.message);
  }

  // Test Calendar API
  console.log('\n=== Testing Calendar API ===');
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const calendars = await calendar.calendarList.list();
    console.log('Calendars:');
    calendars.data.items.forEach((cal) => {
      console.log(`- ${cal.summary} (${cal.id})`);
    });

    // List upcoming events
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime'
    });
    console.log('\nUpcoming Events:');
    if (events.data.items.length === 0) {
      console.log('No upcoming events');
    } else {
      events.data.items.forEach((event) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`- ${event.summary} (${start})`);
      });
    }
  } catch (error) {
    console.error('Calendar API Error:', error.message);
  }

  // Test People API (Contacts)
  console.log('\n=== Testing People API (Contacts) ===');
  const people = google.people({ version: 'v1', auth: oauth2Client });

  try {
    const connections = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 5,
      personFields: 'names,emailAddresses'
    });
    console.log('Contacts:');
    if (!connections.data.connections || connections.data.connections.length === 0) {
      console.log('No contacts found');
    } else {
      connections.data.connections.forEach((contact) => {
        const name = contact.names?.[0]?.displayName || 'No name';
        const email = contact.emailAddresses?.[0]?.value || 'No email';
        console.log(`- ${name} <${email}>`);
      });
    }
  } catch (error) {
    console.error('People API Error:', error.message);
  }

  console.log('\n=== Test Complete ===');
  console.log('\nIn the actual app, these tokens would be:');
  console.log('1. Encrypted using safeStorage');
  console.log('2. Saved to: %APPDATA%\\ai-command-center\\tokens\\google-{email}.dat');
  console.log('3. Automatically refreshed when expired');
}

// Only run if executed directly
if (require.main === module) {
  testOAuthFlow().catch(console.error);
}

module.exports = { testOAuthFlow };
