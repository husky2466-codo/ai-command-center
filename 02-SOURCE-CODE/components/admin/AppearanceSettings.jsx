/**
 * AI Command Center - Appearance Settings
 *
 * Visual theme selector with preview swatches
 * Allows users to switch between 6 available themes
 */

import React from 'react';
import { useTheme } from '../../themes/ThemeContext';
import { themes } from '../../themes/themes';
import './AppearanceSettings.css';

export default function AppearanceSettings() {
  const { currentTheme, setTheme } = useTheme();

  const handleThemeSelect = (themeName) => {
    setTheme(themeName);
  };

  return (
    <div className="appearance-settings">
      <div className="appearance-header">
        <h2>Appearance</h2>
        <p className="appearance-subtitle">
          Choose your visual theme. Changes apply instantly.
        </p>
      </div>

      <div className="theme-grid">
        {Object.entries(themes).map(([themeKey, themeData]) => {
          const isActive = currentTheme === themeKey;

          return (
            <div
              key={themeKey}
              className={`theme-card ${isActive ? 'active' : ''}`}
              onClick={() => handleThemeSelect(themeKey)}
            >
              <div className="theme-preview">
                <div
                  className="preview-bar"
                  style={{ backgroundColor: themeData.colors['--bg-primary'] }}
                >
                  <div
                    className="preview-accent"
                    style={{ backgroundColor: themeData.colors['--accent-primary'] }}
                  />
                </div>
                <div className="preview-colors">
                  <div
                    className="preview-swatch"
                    style={{ backgroundColor: themeData.colors['--bg-primary'] }}
                    title="Background"
                  />
                  <div
                    className="preview-swatch"
                    style={{ backgroundColor: themeData.colors['--accent-primary'] }}
                    title="Primary Accent"
                  />
                  <div
                    className="preview-swatch"
                    style={{ backgroundColor: themeData.colors['--accent-secondary'] }}
                    title="Secondary Accent"
                  />
                </div>
              </div>

              <div className="theme-info">
                <h3 className="theme-name">{themeData.name}</h3>
                <p className="theme-description">{themeData.description}</p>
              </div>

              {isActive && (
                <div className="active-indicator">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="appearance-info">
        <p>
          <strong>Currently using:</strong> {themes[currentTheme].name}
        </p>
        <p className="info-note">
          Theme preference is saved automatically and persists across sessions.
        </p>
      </div>
    </div>
  );
}
