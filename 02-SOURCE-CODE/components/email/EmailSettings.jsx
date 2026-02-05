import React, { useState, useEffect } from 'react';
import {
  Settings,
  Monitor,
  Clock,
  FileText,
  MessageSquare,
  Bell,
  PenSquare,
  Image,
  Database,
  RotateCcw
} from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import './EmailSettings.css';

const DEFAULT_SETTINGS = {
  readingPanePosition: 'right',
  markAsReadDelay: 3,
  defaultCompose: 'html',
  conversationView: true,
  syncFrequency: 15,
  notifications: true,
  defaultSignatureId: null,
  imageLoading: 'ask',
  cacheRetentionDays: 30
};

/**
 * EmailSettings - Comprehensive settings panel for Email module
 * Manages reading pane, sync, notifications, and display preferences
 */
export default function EmailSettings({ isOpen, onClose, currentSettings, onSave }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Initialize from current settings or localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('email_settings');
        const savedSettings = stored ? JSON.parse(stored) : {};
        setSettings({
          ...DEFAULT_SETTINGS,
          ...savedSettings,
          ...currentSettings
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings({ ...DEFAULT_SETTINGS, ...currentSettings });
      }
    }
  }, [isOpen, currentSettings]);

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    try {
      // Save to localStorage
      localStorage.setItem('email_settings', JSON.stringify(settings));

      // Call parent callback
      if (onSave) {
        onSave(settings);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings: ' + error.message);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all email settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Email Settings"
      size="large"
      footer={
        <>
          <Button variant="ghost" onClick={handleReset} icon={<RotateCcw size={16} />}>
            Reset to Defaults
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </>
      }
    >
      <div className="email-settings-container">
        {/* Display Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Monitor size={20} />
            <h3>Display</h3>
          </div>
          <div className="settings-section-content">
            <div className="settings-field">
              <label className="settings-label">Reading Pane Position</label>
              <div className="settings-radio-group">
                <label className="settings-radio-option">
                  <input
                    type="radio"
                    name="readingPane"
                    value="right"
                    checked={settings.readingPanePosition === 'right'}
                    onChange={(e) => handleChange('readingPanePosition', e.target.value)}
                  />
                  <span>Right</span>
                </label>
                <label className="settings-radio-option">
                  <input
                    type="radio"
                    name="readingPane"
                    value="bottom"
                    checked={settings.readingPanePosition === 'bottom'}
                    onChange={(e) => handleChange('readingPanePosition', e.target.value)}
                  />
                  <span>Bottom</span>
                </label>
                <label className="settings-radio-option">
                  <input
                    type="radio"
                    name="readingPane"
                    value="hidden"
                    checked={settings.readingPanePosition === 'hidden'}
                    onChange={(e) => handleChange('readingPanePosition', e.target.value)}
                  />
                  <span>Hidden</span>
                </label>
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">
                <MessageSquare size={16} />
                Conversation View
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.conversationView}
                  onChange={(e) => handleChange('conversationView', e.target.checked)}
                />
                <span className="settings-toggle-slider" />
                <span className="settings-toggle-label">
                  {settings.conversationView ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              <p className="settings-description">
                Group emails by conversation thread
              </p>
            </div>
          </div>
        </section>

        {/* Reading & Interaction Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Clock size={20} />
            <h3>Reading & Interaction</h3>
          </div>
          <div className="settings-section-content">
            <div className="settings-field">
              <label className="settings-label">Mark as Read Delay</label>
              <select
                className="settings-select"
                value={settings.markAsReadDelay}
                onChange={(e) => handleChange('markAsReadDelay', parseInt(e.target.value))}
              >
                <option value={0}>Immediately</option>
                <option value={3}>After 3 seconds</option>
                <option value={5}>After 5 seconds</option>
                <option value={10}>After 10 seconds</option>
              </select>
              <p className="settings-description">
                Delay before marking emails as read when opened
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label">Image Loading Policy</label>
              <select
                className="settings-select"
                value={settings.imageLoading}
                onChange={(e) => handleChange('imageLoading', e.target.value)}
              >
                <option value="always">Always load images</option>
                <option value="ask">Ask before loading</option>
                <option value="never">Never load images</option>
              </select>
              <p className="settings-description">
                Control automatic loading of external images in emails
              </p>
            </div>
          </div>
        </section>

        {/* Compose Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <FileText size={20} />
            <h3>Compose</h3>
          </div>
          <div className="settings-section-content">
            <div className="settings-field">
              <label className="settings-label">Default Compose Format</label>
              <div className="settings-radio-group">
                <label className="settings-radio-option">
                  <input
                    type="radio"
                    name="composeFormat"
                    value="html"
                    checked={settings.defaultCompose === 'html'}
                    onChange={(e) => handleChange('defaultCompose', e.target.value)}
                  />
                  <span>HTML (Rich Text)</span>
                </label>
                <label className="settings-radio-option">
                  <input
                    type="radio"
                    name="composeFormat"
                    value="plain"
                    checked={settings.defaultCompose === 'plain'}
                    onChange={(e) => handleChange('defaultCompose', e.target.value)}
                  />
                  <span>Plain Text</span>
                </label>
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-label">
                <PenSquare size={16} />
                Default Signature
              </label>
              <select
                className="settings-select"
                value={settings.defaultSignatureId || ''}
                onChange={(e) => handleChange('defaultSignatureId', e.target.value || null)}
              >
                <option value="">None</option>
                {/* Note: Signature options will be populated from parent component */}
              </select>
              <p className="settings-description">
                Automatically insert this signature in new emails
              </p>
            </div>
          </div>
        </section>

        {/* Sync & Notifications Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Bell size={20} />
            <h3>Sync & Notifications</h3>
          </div>
          <div className="settings-section-content">
            <div className="settings-field">
              <label className="settings-label">Sync Frequency</label>
              <select
                className="settings-select"
                value={settings.syncFrequency}
                onChange={(e) => handleChange('syncFrequency', parseInt(e.target.value))}
              >
                <option value={0}>Manual only</option>
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
              <p className="settings-description">
                How often to check for new emails automatically
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label">
                <Bell size={16} />
                Desktop Notifications
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleChange('notifications', e.target.checked)}
                />
                <span className="settings-toggle-slider" />
                <span className="settings-toggle-label">
                  {settings.notifications ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              <p className="settings-description">
                Show desktop notifications for new emails
              </p>
            </div>
          </div>
        </section>

        {/* Storage Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Database size={20} />
            <h3>Storage & Cache</h3>
          </div>
          <div className="settings-section-content">
            <div className="settings-field">
              <label className="settings-label">Cache Retention</label>
              <div className="settings-slider-wrapper">
                <input
                  type="range"
                  min="7"
                  max="90"
                  step="1"
                  value={settings.cacheRetentionDays}
                  onChange={(e) => handleChange('cacheRetentionDays', parseInt(e.target.value))}
                  className="settings-slider"
                />
                <div className="settings-slider-labels">
                  <span>7 days</span>
                  <span className="settings-slider-value">{settings.cacheRetentionDays} days</span>
                  <span>90 days</span>
                </div>
              </div>
              <p className="settings-description">
                How long to keep cached email data locally
              </p>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
