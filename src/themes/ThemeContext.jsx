/**
 * AI Command Center - Theme Context Provider
 *
 * Manages theme state and persistence across the application
 * Stores theme preference in localStorage and applies CSS variables
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getTheme, defaultTheme, applyTheme } from './themes';

const ThemeContext = createContext();

const STORAGE_KEY = 'ai-command-center-theme';

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load saved theme from localStorage on init
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || defaultTheme;
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error);
      return defaultTheme;
    }
  });

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(currentTheme);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, currentTheme);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [currentTheme]);

  // Apply initial theme on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  const setTheme = (themeName) => {
    setCurrentTheme(themeName);
  };

  const value = {
    currentTheme,
    setTheme,
    theme: getTheme(currentTheme)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * @returns {object} { currentTheme, setTheme, theme }
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
