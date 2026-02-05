/**
 * Freshness Utility
 *
 * Andy's Freshness System for relationship tracking.
 * Calculates freshness level based on days since last contact.
 *
 * Levels:
 * - Hot (< 7 days) - Recently contacted, active relationship
 * - Warm (7-30 days) - Good standing
 * - Cool (30-90 days) - Needs attention
 * - Cold (> 90 days) - Risk of losing connection
 */

/**
 * Calculate freshness level from last contact date
 * @param {Date|string|number} lastContactDate - Last contact date (Date object, ISO string, or days since)
 * @returns {Object} Freshness object with label, color, icon
 */
export function calculateFreshness(lastContactDate) {
  let daysSince;

  if (typeof lastContactDate === 'number') {
    // Already calculated days
    daysSince = lastContactDate;
  } else if (!lastContactDate) {
    // No contact yet
    daysSince = 999999;
  } else {
    // Calculate from date
    const date = new Date(lastContactDate);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (daysSince <= 7) {
    return {
      label: 'Hot',
      level: 'hot',
      color: '#ef4444', // Red
      icon: 'flame',
      emoji: '🔥',
      description: 'Recently contacted, active relationship',
      daysRange: '0-7 days'
    };
  } else if (daysSince <= 30) {
    return {
      label: 'Warm',
      level: 'warm',
      color: '#f59e0b', // Orange
      icon: 'sun',
      emoji: '☀️',
      description: 'Good standing',
      daysRange: '8-30 days'
    };
  } else if (daysSince <= 90) {
    return {
      label: 'Cool',
      level: 'cool',
      color: '#3b82f6', // Blue
      icon: 'cloud',
      emoji: '☁️',
      description: 'Needs attention',
      daysRange: '31-90 days'
    };
  } else {
    return {
      label: 'Cold',
      level: 'cold',
      color: '#6b7280', // Gray
      icon: 'snowflake',
      emoji: '❄️',
      description: 'Risk of losing connection',
      daysRange: '90+ days'
    };
  }
}

/**
 * Get freshness color for CSS
 * @param {string} level - Freshness level (hot, warm, cool, cold)
 * @returns {string} Hex color
 */
export function getFreshnessColor(level) {
  const colors = {
    hot: '#ef4444',
    warm: '#f59e0b',
    cool: '#3b82f6',
    cold: '#6b7280'
  };
  return colors[level] || '#6b7280';
}

/**
 * Get freshness icon name
 * @param {string} level - Freshness level
 * @returns {string} Icon name (for lucide-react)
 */
export function getFreshnessIcon(level) {
  const icons = {
    hot: 'Flame',
    warm: 'Sun',
    cool: 'Cloud',
    cold: 'Snowflake'
  };
  return icons[level] || 'Snowflake';
}

/**
 * Get freshness emoji
 * @param {string} level - Freshness level
 * @returns {string} Emoji
 */
export function getFreshnessEmoji(level) {
  const emojis = {
    hot: '🔥',
    warm: '☀️',
    cool: '☁️',
    cold: '❄️'
  };
  return emojis[level] || '❄️';
}

/**
 * Format days since last contact
 * @param {number} days - Days since contact
 * @returns {string} Formatted string
 */
export function formatDaysSince(days) {
  if (!days || days >= 999999) {
    return 'Never';
  } else if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

/**
 * Get all freshness levels
 * @returns {Array} Array of freshness level objects
 */
export function getAllFreshnessLevels() {
  return [
    {
      label: 'Hot',
      level: 'hot',
      color: '#ef4444',
      icon: 'Flame',
      emoji: '🔥',
      description: 'Recently contacted, active relationship',
      daysRange: '0-7 days'
    },
    {
      label: 'Warm',
      level: 'warm',
      color: '#f59e0b',
      icon: 'Sun',
      emoji: '☀️',
      description: 'Good standing',
      daysRange: '8-30 days'
    },
    {
      label: 'Cool',
      level: 'cool',
      color: '#3b82f6',
      icon: 'Cloud',
      emoji: '☁️',
      description: 'Needs attention',
      daysRange: '31-90 days'
    },
    {
      label: 'Cold',
      level: 'cold',
      color: '#6b7280',
      icon: 'Snowflake',
      emoji: '❄️',
      description: 'Risk of losing connection',
      daysRange: '90+ days'
    }
  ];
}
