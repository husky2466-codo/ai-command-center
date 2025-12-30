/**
 * AI Command Center - Theme System
 *
 * Defines 6 visual themes with complete CSS variable mappings
 * Each theme follows the design system's dark aesthetic with unique accent colors
 */

export const themes = {
  default: {
    name: 'Default',
    description: 'Navy & Gold - Classic AI Command Center',
    colors: {
      '--bg-primary': '#1a1a2e',
      '--bg-secondary': '#16213e',
      '--bg-tertiary': '#0f1419',
      '--accent-primary': '#ffd700',
      '--accent-secondary': '#6366f1',
      '--text-primary': '#ffffff',
      '--text-secondary': '#a0a0a0',
      '--text-accent': '#ffd700',
      '--border-primary': '#2a2a3e',
      '--border-accent': '#ffd700',
      '--sidebar-bg': '#0f0f1e',
      '--sidebar-hover': '#1f1f2e',
      '--sidebar-active': '#2a2a3e',
      '--card-bg': '#16213e',
      '--card-hover': '#1a2642',
      '--input-bg': '#0f1419',
      '--input-border': '#2a2a3e',
      '--input-focus': '#ffd700',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#3b82f6',
      '--gradient-start': '#ec4899',
      '--gradient-mid': '#8b5cf6',
      '--gradient-end': '#3b82f6'
    }
  },

  cipher: {
    name: 'Cipher',
    description: 'Matrix Green - Hacker aesthetic',
    colors: {
      '--bg-primary': '#0a0a0a',
      '--bg-secondary': '#0d0d0d',
      '--bg-tertiary': '#050505',
      '--accent-primary': '#00ff41',
      '--accent-secondary': '#003b00',
      '--text-primary': '#00ff41',
      '--text-secondary': '#008f11',
      '--text-accent': '#00ff41',
      '--border-primary': '#1a1a1a',
      '--border-accent': '#00ff41',
      '--sidebar-bg': '#000000',
      '--sidebar-hover': '#0f0f0f',
      '--sidebar-active': '#1a1a1a',
      '--card-bg': '#0d0d0d',
      '--card-hover': '#121212',
      '--input-bg': '#050505',
      '--input-border': '#1a1a1a',
      '--input-focus': '#00ff41',
      '--success': '#00ff41',
      '--warning': '#ffff00',
      '--error': '#ff0000',
      '--info': '#00ffff',
      '--gradient-start': '#00ff41',
      '--gradient-mid': '#00aa2b',
      '--gradient-end': '#005515'
    }
  },

  voltage: {
    name: 'Voltage',
    description: 'Electric Yellow - High energy',
    colors: {
      '--bg-primary': '#1c1c1c',
      '--bg-secondary': '#252525',
      '--bg-tertiary': '#141414',
      '--accent-primary': '#fbbf24',
      '--accent-secondary': '#f59e0b',
      '--text-primary': '#ffffff',
      '--text-secondary': '#d4d4d4',
      '--text-accent': '#fbbf24',
      '--border-primary': '#333333',
      '--border-accent': '#fbbf24',
      '--sidebar-bg': '#0f0f0f',
      '--sidebar-hover': '#1f1f1f',
      '--sidebar-active': '#2a2a2a',
      '--card-bg': '#252525',
      '--card-hover': '#2d2d2d',
      '--input-bg': '#141414',
      '--input-border': '#333333',
      '--input-focus': '#fbbf24',
      '--success': '#22c55e',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#3b82f6',
      '--gradient-start': '#fbbf24',
      '--gradient-mid': '#f59e0b',
      '--gradient-end': '#ea580c'
    }
  },

  evergreen: {
    name: 'Evergreen',
    description: 'Forest Green - Natural & calming',
    colors: {
      '--bg-primary': '#0d1f0d',
      '--bg-secondary': '#112911',
      '--bg-tertiary': '#081508',
      '--accent-primary': '#10b981',
      '--accent-secondary': '#22c55e',
      '--text-primary': '#e8f5e8',
      '--text-secondary': '#94d294',
      '--text-accent': '#10b981',
      '--border-primary': '#1a331a',
      '--border-accent': '#10b981',
      '--sidebar-bg': '#071007',
      '--sidebar-hover': '#0f1a0f',
      '--sidebar-active': '#152415',
      '--card-bg': '#112911',
      '--card-hover': '#153315',
      '--input-bg': '#081508',
      '--input-border': '#1a331a',
      '--input-focus': '#10b981',
      '--success': '#22c55e',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#06b6d4',
      '--gradient-start': '#10b981',
      '--gradient-mid': '#059669',
      '--gradient-end': '#047857'
    }
  },

  depths: {
    name: 'Depths',
    description: 'Ocean Blue - Deep & mysterious',
    colors: {
      '--bg-primary': '#0c1929',
      '--bg-secondary': '#0f1f33',
      '--bg-tertiary': '#08121f',
      '--accent-primary': '#06b6d4',
      '--accent-secondary': '#14b8a6',
      '--text-primary': '#e0f2fe',
      '--text-secondary': '#7dd3fc',
      '--text-accent': '#06b6d4',
      '--border-primary': '#1e3a52',
      '--border-accent': '#06b6d4',
      '--sidebar-bg': '#040e1a',
      '--sidebar-hover': '#0a1823',
      '--sidebar-active': '#10222d',
      '--card-bg': '#0f1f33',
      '--card-hover': '#13253d',
      '--input-bg': '#08121f',
      '--input-border': '#1e3a52',
      '--input-focus': '#06b6d4',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#06b6d4',
      '--gradient-start': '#06b6d4',
      '--gradient-mid': '#0891b2',
      '--gradient-end': '#0e7490'
    }
  },

  magma: {
    name: 'Magma',
    description: 'Volcanic Orange - Fierce & bold',
    colors: {
      '--bg-primary': '#1a1110',
      '--bg-secondary': '#241816',
      '--bg-tertiary': '#120d0c',
      '--accent-primary': '#f97316',
      '--accent-secondary': '#ef4444',
      '--text-primary': '#fef2f2',
      '--text-secondary': '#fca5a5',
      '--text-accent': '#f97316',
      '--border-primary': '#3d2420',
      '--border-accent': '#f97316',
      '--sidebar-bg': '#0f0908',
      '--sidebar-hover': '#1a1110',
      '--sidebar-active': '#251918',
      '--card-bg': '#241816',
      '--card-hover': '#2d1f1c',
      '--input-bg': '#120d0c',
      '--input-border': '#3d2420',
      '--input-focus': '#f97316',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--error': '#ef4444',
      '--info': '#3b82f6',
      '--gradient-start': '#f97316',
      '--gradient-mid': '#dc2626',
      '--gradient-end': '#991b1b'
    }
  }
};

export const defaultTheme = 'default';

/**
 * Get theme by name
 * @param {string} themeName - Name of theme to retrieve
 * @returns {object} Theme configuration object
 */
export function getTheme(themeName) {
  return themes[themeName] || themes[defaultTheme];
}

/**
 * Get all theme names
 * @returns {string[]} Array of theme names
 */
export function getThemeNames() {
  return Object.keys(themes);
}

/**
 * Apply theme to document root
 * @param {string} themeName - Name of theme to apply
 */
export function applyTheme(themeName) {
  const theme = getTheme(themeName);
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([variable, value]) => {
    root.style.setProperty(variable, value);
  });
}
