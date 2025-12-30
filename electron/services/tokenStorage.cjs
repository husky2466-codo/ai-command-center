const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Secure token storage using Electron's safeStorage API
 * Tokens are encrypted using OS-level encryption:
 * - macOS: Keychain Access
 * - Windows: DPAPI (Data Protection API)
 * - Linux: Secret Service API / kwallet / gnome-keyring
 */

/**
 * Get the tokens directory path
 * @returns {string} Path to tokens directory
 */
function getTokensDirectory() {
  const userDataPath = app.getPath('userData');
  const tokensDir = path.join(userDataPath, 'tokens');

  // Ensure directory exists
  if (!fs.existsSync(tokensDir)) {
    fs.mkdirSync(tokensDir, { recursive: true });
  }

  return tokensDir;
}

/**
 * Get the file path for storing tokens
 * @param {string} provider - Provider name (e.g., 'google', 'microsoft')
 * @param {string} email - User email address
 * @returns {string} Full file path
 */
function getTokenFilePath(provider, email) {
  // Sanitize email for filename (replace @ and . with _)
  const sanitizedEmail = email.replace(/@/g, '_at_').replace(/\./g, '_');
  const filename = `${provider}-${sanitizedEmail}.dat`;
  return path.join(getTokensDirectory(), filename);
}

/**
 * Save tokens securely to filesystem
 * @param {string} provider - Provider name (e.g., 'google', 'microsoft')
 * @param {string} email - User email address
 * @param {Object} tokens - Token object to store
 * @returns {Promise<void>}
 */
async function saveTokens(provider, email, tokens) {
  try {
    // Check if encryption is available
    if (!safeStorage.isEncryptionAvailable()) {
      // getSelectedStorageBackend may not exist in older Electron versions
      const backend = typeof safeStorage.getSelectedStorageBackend === 'function'
        ? safeStorage.getSelectedStorageBackend()
        : 'unknown';
      console.warn(`[TokenStorage] WARNING: Encryption not available. Using backend: ${backend}`);

      if (backend === 'basic_text') {
        console.warn('[TokenStorage] SECURITY WARNING: Tokens will be stored in plaintext!');
        console.warn('[TokenStorage] Please set up a password store (gnome-keyring, kwallet, etc.) for secure storage.');
      }
    }

    // Convert tokens to JSON string
    const tokensJson = JSON.stringify(tokens);

    // Encrypt tokens
    const encrypted = safeStorage.encryptString(tokensJson);

    // Write encrypted buffer to file
    const filePath = getTokenFilePath(provider, email);
    fs.writeFileSync(filePath, encrypted);

    console.log(`[TokenStorage] Tokens saved for ${provider}:${email}`);
  } catch (error) {
    console.error('[TokenStorage] Error saving tokens:', error.message);
    throw new Error(`Failed to save tokens: ${error.message}`);
  }
}

/**
 * Load tokens from filesystem and decrypt
 * @param {string} provider - Provider name (e.g., 'google', 'microsoft')
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} Decrypted token object or null if not found
 */
async function loadTokens(provider, email) {
  try {
    const filePath = getTokenFilePath(provider, email);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`[TokenStorage] No stored tokens found for ${provider}:${email}`);
      return null;
    }

    // Read encrypted buffer from file
    const encrypted = fs.readFileSync(filePath);

    // Decrypt tokens
    const tokensJson = safeStorage.decryptString(encrypted);

    // Parse JSON
    const tokens = JSON.parse(tokensJson);

    console.log(`[TokenStorage] Tokens loaded for ${provider}:${email}`);
    return tokens;
  } catch (error) {
    console.error('[TokenStorage] Error loading tokens:', error.message);
    return null;
  }
}

/**
 * Delete stored tokens
 * @param {string} provider - Provider name (e.g., 'google', 'microsoft')
 * @param {string} email - User email address
 * @returns {Promise<void>}
 */
async function deleteTokens(provider, email) {
  try {
    const filePath = getTokenFilePath(provider, email);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[TokenStorage] Tokens deleted for ${provider}:${email}`);
    }
  } catch (error) {
    console.error('[TokenStorage] Error deleting tokens:', error.message);
    throw new Error(`Failed to delete tokens: ${error.message}`);
  }
}

/**
 * List all stored accounts for a provider
 * @param {string} provider - Provider name (e.g., 'google', 'microsoft')
 * @returns {Promise<string[]>} Array of email addresses
 */
async function listStoredAccounts(provider) {
  try {
    const tokensDir = getTokensDirectory();
    const files = fs.readdirSync(tokensDir);

    // Filter files by provider prefix and extract emails
    const accounts = files
      .filter(file => file.startsWith(`${provider}-`) && file.endsWith('.dat'))
      .map(file => {
        // Remove provider prefix and .dat extension
        const emailPart = file.slice(provider.length + 1, -4);
        // Restore email format
        return emailPart.replace(/_at_/g, '@').replace(/_/g, '.');
      });

    console.log(`[TokenStorage] Found ${accounts.length} stored accounts for ${provider}`);
    return accounts;
  } catch (error) {
    console.error('[TokenStorage] Error listing accounts:', error.message);
    return [];
  }
}

/**
 * Check if encryption is available and warn if not
 * @returns {Object} Encryption status and backend info
 */
function getEncryptionStatus() {
  const isAvailable = safeStorage.isEncryptionAvailable();
  // getSelectedStorageBackend may not exist in older Electron versions
  const backend = typeof safeStorage.getSelectedStorageBackend === 'function'
    ? safeStorage.getSelectedStorageBackend()
    : 'dpapi'; // Default to DPAPI on Windows

  return {
    available: isAvailable,
    backend: backend,
    secure: backend !== 'basic_text',
    warning: backend === 'basic_text'
      ? 'Tokens are stored in plaintext. Please set up a password store for secure storage.'
      : null
  };
}

module.exports = {
  saveTokens,
  loadTokens,
  deleteTokens,
  listStoredAccounts,
  getEncryptionStatus
};
