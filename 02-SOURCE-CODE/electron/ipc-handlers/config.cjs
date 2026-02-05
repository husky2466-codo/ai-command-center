/**
 * Config IPC Handlers
 * Handles: get-env-keys
 * Also exports: loadEnvKeys (used by main.cjs during OAuth init)
 */
const fs = require('fs');
const path = require('path');

/**
 * Parse a .env file and populate keys object (mutates keys in place).
 * Only fills keys that exist in the keys object and are currently empty.
 */
function parseEnvFile(envPath, keys) {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (keys.hasOwnProperty(key) && !keys[key]) {
            keys[key] = value;
          }
        }
      });
      return true;
    }
  } catch (error) {
    console.error(`Error reading ${envPath}:`, error.message);
  }
  return false;
}

/**
 * Load env keys from OneDrive vault and ~/.env fallback.
 * Standalone function that can be called from main.cjs during app init.
 * @param {string} homePath - Path to user home directory (app.getPath('home'))
 * @returns {Promise<object>} Keys object
 */
async function loadEnvKeys(homePath) {
  const keys = {
    ANTHROPIC_API_KEY: '',
    OPENAI_API_KEY: '',
    HF_TOKEN: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
  };

  // Primary: OneDrive vault
  const oneDriveVaultPath = 'D:\\OneDrive\\Claude Config (Windows)\\.env';
  parseEnvFile(oneDriveVaultPath, keys);

  // Fallback: ~/.env
  const homeEnvPath = path.join(homePath, '.env');
  parseEnvFile(homeEnvPath, keys);

  return keys;
}

function register(ipcMain, context) {
  const { app } = context;

  // Load API keys from OneDrive vault (with ~/.env fallback)
  ipcMain.handle('get-env-keys', async () => {
    const keys = {
      ANTHROPIC_API_KEY: '',
      OPENAI_API_KEY: '',
      HF_TOKEN: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
    };

    // Helper to parse .env file content
    const parseEnv = (envPath) => {
      try {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
              const key = match[1].trim();
              const value = match[2].trim().replace(/^["']|["']$/g, '');
              if (keys.hasOwnProperty(key) && !keys[key]) {
                keys[key] = value;
              }
            }
          });
          return true;
        }
      } catch (error) {
        console.error(`Error reading ${envPath}:`, error.message);
      }
      return false;
    };

    // Primary: OneDrive vault
    const oneDriveVaultPath = 'D:\\OneDrive\\Claude Config (Windows)\\.env';
    if (parseEnv(oneDriveVaultPath)) {
      if (keys.ANTHROPIC_API_KEY && keys.OPENAI_API_KEY && keys.HF_TOKEN) {
        console.log('API keys loaded from OneDrive vault');
        return keys;
      }
      console.log('Some keys loaded from OneDrive vault, checking fallback for missing keys');
    }

    // Fallback: ~/.env for any missing keys
    const homeEnvPath = path.join(app.getPath('home'), '.env');
    if (parseEnv(homeEnvPath)) {
      console.log('Loaded missing keys from ~/.env');
    }

    return keys;
  });
}

module.exports = { register, loadEnvKeys };
