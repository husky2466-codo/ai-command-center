/**
 * Claude Code CLI Service
 *
 * Wraps the Claude Code CLI to enable using Claude Pro/Max subscriptions
 * instead of API keys for AI queries.
 *
 * Features:
 * - OAuth token management
 * - Process pool (max 3 concurrent)
 * - Streaming support
 * - Image analysis (base64 → temp file)
 * - Request cancellation
 * - Timeout handling (120s default)
 * - EventEmitter for lifecycle events
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class ClaudeCliService extends EventEmitter {
  constructor() {
    super();

    // Configuration
    this.maxConcurrent = parseInt(process.env.CLAUDE_CLI_MAX_CONCURRENT) || 3;
    this.defaultTimeout = parseInt(process.env.CLAUDE_CLI_TIMEOUT) || 120000; // 2 minutes

    // State
    this.isAvailable = false;
    this.cliVersion = null;
    this.oauthStatus = null;
    this.activeProcesses = new Map(); // requestId → { process, cleanup }
    this.requestQueue = [];
    this.tempFiles = new Set(); // Track temp files for cleanup

    // Initialize
    this._init();
  }

  /**
   * Initialize the service - check if CLI is available
   */
  async _init() {
    try {
      await this.checkAvailability();
      if (this.isAvailable) {
        await this.checkOAuthStatus();
        this.emit('ready');
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Check if Claude CLI is installed and accessible
   * @returns {Promise<{available: boolean, version: string|null, error: string|null}>}
   */
  async checkAvailability() {
    try {
      const { stdout } = await exec('claude --version', { timeout: 5000 });
      const version = stdout.trim();

      this.isAvailable = true;
      this.cliVersion = version;

      return {
        available: true,
        version,
        error: null
      };
    } catch (error) {
      this.isAvailable = false;
      this.cliVersion = null;

      return {
        available: false,
        version: null,
        error: error.code === 'ENOENT'
          ? 'Claude CLI not found. Please install from claude.ai/download'
          : error.message
      };
    }
  }

  /**
   * Check OAuth token status
   * @returns {Promise<{authenticated: boolean, email: string|null, error: string|null}>}
   */
  async checkOAuthStatus() {
    if (!this.isAvailable) {
      return { authenticated: false, email: null, error: 'CLI not available' };
    }

    try {
      const { stdout, stderr } = await exec('claude auth status', { timeout: 5000 });
      const output = stdout + stderr;

      // Parse output to determine authentication status
      // Expected output format: "Authenticated as: user@example.com" or "Not authenticated"
      const authenticatedMatch = output.match(/Authenticated as:\s*(.+)/i);

      if (authenticatedMatch) {
        const email = authenticatedMatch[1].trim();
        this.oauthStatus = { authenticated: true, email };
        return { authenticated: true, email, error: null };
      } else {
        this.oauthStatus = { authenticated: false, email: null };
        return { authenticated: false, email: null, error: 'Not authenticated' };
      }
    } catch (error) {
      this.oauthStatus = { authenticated: false, email: null };
      return { authenticated: false, email: null, error: error.message };
    }
  }

  /**
   * Send a text prompt and get response
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Query options
   * @param {number} options.maxTokens - Max tokens in response
   * @param {number} options.timeout - Request timeout in ms
   * @param {string} options.model - Model to use (if CLI supports it)
   * @returns {Promise<{success: boolean, content: string, error: string|null}>}
   */
  async query(prompt, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Claude CLI not available');
    }

    const requestId = crypto.randomUUID();
    const timeout = options.timeout || this.defaultTimeout;

    // Wait if we're at max concurrent requests
    await this._waitForSlot();

    try {
      // Build CLI command
      const args = ['-p', prompt, '--output-format', 'json'];

      if (options.maxTokens) {
        args.push('--max-tokens', options.maxTokens.toString());
      }

      // Spawn process
      const result = await this._spawnClaudeProcess(requestId, args, timeout);

      return {
        success: true,
        content: result,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        content: null,
        error: error.message
      };
    } finally {
      this._releaseSlot(requestId);
    }
  }

  /**
   * Send a prompt with an image (for Vision)
   * @param {string} prompt - The prompt to send
   * @param {string} imageBase64 - Base64-encoded image
   * @param {Object} options - Query options
   * @returns {Promise<{success: boolean, content: string, error: string|null}>}
   */
  async queryWithImage(prompt, imageBase64, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Claude CLI not available');
    }

    const requestId = crypto.randomUUID();
    const timeout = options.timeout || this.defaultTimeout;
    let tempImagePath = null;

    // Wait if we're at max concurrent requests
    await this._waitForSlot();

    try {
      // Save base64 image to temp file
      tempImagePath = await this._saveBase64ToTempFile(imageBase64);

      // Build CLI command
      const args = ['-p', prompt, '--image', tempImagePath, '--output-format', 'json'];

      if (options.maxTokens) {
        args.push('--max-tokens', options.maxTokens.toString());
      }

      // Spawn process
      const result = await this._spawnClaudeProcess(requestId, args, timeout);

      return {
        success: true,
        content: result,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        content: null,
        error: error.message
      };
    } finally {
      // Cleanup
      this._releaseSlot(requestId);
      if (tempImagePath) {
        await this._deleteTempFile(tempImagePath);
      }
    }
  }

  /**
   * Stream a query response (for chat)
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Query options
   * @param {Function} onChunk - Callback for each chunk: (chunk: string) => void
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async streamQuery(prompt, options = {}, onChunk) {
    if (!this.isAvailable) {
      throw new Error('Claude CLI not available');
    }

    if (typeof onChunk !== 'function') {
      throw new Error('onChunk callback is required for streaming');
    }

    const requestId = crypto.randomUUID();
    const timeout = options.timeout || this.defaultTimeout;

    // Wait if we're at max concurrent requests
    await this._waitForSlot();

    try {
      // Build CLI command
      const args = ['-p', prompt, '--stream'];

      if (options.maxTokens) {
        args.push('--max-tokens', options.maxTokens.toString());
      }

      // Spawn process with streaming
      await this._spawnClaudeProcessStreaming(requestId, args, timeout, onChunk);

      return {
        success: true,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    } finally {
      this._releaseSlot(requestId);
    }
  }

  /**
   * Cancel an active request
   * @param {string} requestId - The request ID to cancel
   * @returns {boolean} - True if request was found and cancelled
   */
  cancel(requestId) {
    const activeRequest = this.activeProcesses.get(requestId);

    if (activeRequest) {
      const { process, cleanup } = activeRequest;

      // Kill the process
      process.kill('SIGTERM');

      // Run cleanup
      if (cleanup) cleanup();

      // Remove from active processes
      this.activeProcesses.delete(requestId);

      this.emit('request-cancelled', requestId);
      return true;
    }

    return false;
  }

  /**
   * Spawn a Claude CLI process and wait for completion
   * @private
   */
  async _spawnClaudeProcess(requestId, args, timeout) {
    return new Promise((resolve, reject) => {
      const process = spawn('claude', args, {
        shell: true,
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';
      let timeoutHandle;

      // Track active process
      this.activeProcesses.set(requestId, {
        process,
        cleanup: () => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
      });

      // Collect stdout
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      process.on('close', (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.activeProcesses.delete(requestId);

        if (code === 0) {
          try {
            // Parse JSON response
            const parsed = JSON.parse(stdout);
            // Extract content (adjust based on actual CLI output format)
            const content = parsed.content || parsed.message || stdout;
            resolve(content);
          } catch (error) {
            // If not JSON, return raw output
            resolve(stdout.trim());
          }
        } else {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr || 'Unknown error'}`));
        }
      });

      // Handle errors
      process.on('error', (error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.activeProcesses.delete(requestId);
        reject(error);
      });

      // Set timeout
      timeoutHandle = setTimeout(() => {
        process.kill('SIGTERM');
        this.activeProcesses.delete(requestId);
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Spawn a Claude CLI process with streaming support
   * @private
   */
  async _spawnClaudeProcessStreaming(requestId, args, timeout, onChunk) {
    return new Promise((resolve, reject) => {
      const process = spawn('claude', args, {
        shell: true,
        windowsHide: true
      });

      let stderr = '';
      let timeoutHandle;

      // Track active process
      this.activeProcesses.set(requestId, {
        process,
        cleanup: () => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
      });

      // Stream stdout chunks
      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        onChunk(chunk);
      });

      // Collect stderr
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      process.on('close', (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.activeProcesses.delete(requestId);

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr || 'Unknown error'}`));
        }
      });

      // Handle errors
      process.on('error', (error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.activeProcesses.delete(requestId);
        reject(error);
      });

      // Set timeout
      timeoutHandle = setTimeout(() => {
        process.kill('SIGTERM');
        this.activeProcesses.delete(requestId);
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Save base64 image to temporary file
   * @private
   */
  async _saveBase64ToTempFile(imageBase64) {
    const tempDir = os.tmpdir();
    const fileName = `claude-image-${crypto.randomUUID()}.png`;
    const filePath = path.join(tempDir, fileName);

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    await fs.writeFile(filePath, buffer);
    this.tempFiles.add(filePath);

    return filePath;
  }

  /**
   * Delete temporary file
   * @private
   */
  async _deleteTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      this.tempFiles.delete(filePath);
    } catch (error) {
      // Ignore errors - temp files will be cleaned up by OS eventually
    }
  }

  /**
   * Wait for an available slot in the process pool
   * @private
   */
  async _waitForSlot() {
    while (this.activeProcesses.size >= this.maxConcurrent) {
      // Wait 100ms and check again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Release a slot in the process pool
   * @private
   */
  _releaseSlot(requestId) {
    this.activeProcesses.delete(requestId);
    this.emit('slot-released', { requestId, active: this.activeProcesses.size });
  }

  /**
   * Get current status of the service
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      available: this.isAvailable,
      version: this.cliVersion,
      authenticated: this.oauthStatus?.authenticated || false,
      email: this.oauthStatus?.email || null,
      activeRequests: this.activeProcesses.size,
      maxConcurrent: this.maxConcurrent,
      queuedRequests: this.requestQueue.length
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    // Cancel all active requests
    for (const [requestId] of this.activeProcesses) {
      this.cancel(requestId);
    }

    // Delete all temp files
    const deletePromises = Array.from(this.tempFiles).map(
      filePath => this._deleteTempFile(filePath)
    );
    await Promise.allSettled(deletePromises);

    this.emit('cleanup-complete');
  }
}

// Export singleton instance
module.exports = new ClaudeCliService();
