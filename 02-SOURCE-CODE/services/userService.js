/**
 * UserService - Manages user settings and preferences
 * Fetches user name from connected Google account or user settings
 */

class UserService {
  constructor() {
    this.cache = {
      userName: null,
      timestamp: null,
      ttl: 60 * 60 * 1000, // 1 hour cache
    };
  }

  /**
   * Get the user's display name
   * Priority:
   * 1. Primary Google account display_name
   * 2. Primary Google account email (before @)
   * 3. Default to "User"
   *
   * @returns {Promise<string>} User's display name
   */
  async getUserName() {
    // Check cache first
    if (this.cache.userName && this.cache.timestamp) {
      const age = Date.now() - this.cache.timestamp;
      if (age < this.cache.ttl) {
        return this.cache.userName;
      }
    }

    try {
      // Try to get from connected Google accounts
      if (window.electronAPI?.googleListAccounts) {
        const result = await window.electronAPI.googleListAccounts();

        if (result.success && result.data && result.data.length > 0) {
          // Get the first (primary) account
          const primaryAccount = result.data[0];

          // Use display_name if available
          if (primaryAccount.display_name) {
            const firstName = this.extractFirstName(primaryAccount.display_name);
            this.cache.userName = firstName;
            this.cache.timestamp = Date.now();
            return firstName;
          }

          // Fallback to email username
          if (primaryAccount.email) {
            const emailUsername = primaryAccount.email.split('@')[0];
            const formattedName = this.formatEmailUsername(emailUsername);
            this.cache.userName = formattedName;
            this.cache.timestamp = Date.now();
            return formattedName;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch user name from Google account:', error);
    }

    // Final fallback
    const defaultName = 'User';
    this.cache.userName = defaultName;
    this.cache.timestamp = Date.now();
    return defaultName;
  }

  /**
   * Extract first name from full name
   * @param {string} fullName - Full name like "John Doe"
   * @returns {string} First name
   */
  extractFirstName(fullName) {
    if (!fullName) return 'User';

    const parts = fullName.trim().split(/\s+/);
    return parts[0] || 'User';
  }

  /**
   * Format email username for display
   * Converts "john.doe" or "john_doe" to "John"
   * @param {string} username - Email username
   * @returns {string} Formatted name
   */
  formatEmailUsername(username) {
    if (!username) return 'User';

    // Split on dots, underscores, or hyphens
    const parts = username.split(/[._-]/);
    const firstName = parts[0] || 'User';

    // Capitalize first letter
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }

  /**
   * Clear the cache (useful when account changes)
   */
  clearCache() {
    this.cache.userName = null;
    this.cache.timestamp = null;
  }

  /**
   * Set custom user name (for future settings UI)
   * @param {string} name - Custom display name
   */
  async setUserName(name) {
    // For now, just update cache
    // In the future, this could save to a user_settings table
    this.cache.userName = name;
    this.cache.timestamp = Date.now();

    // TODO: Save to database user_settings table when implemented
    return { success: true };
  }
}

// Export singleton instance
export const userService = new UserService();
