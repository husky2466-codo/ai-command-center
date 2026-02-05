import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Zap, X } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import './SparkInput.css';

/**
 * SparkInput Component
 * Quick capture modal for instant idea/thought recording
 */
function SparkInput({ onSave, onCancel }) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;

    try {
      setIsSaving(true);
      await onSave(content);
      setContent('');
    } catch (error) {
      console.error('Failed to save spark:', error);
      alert('Failed to save spark: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={
        <div className="spark-modal-title">
          <Zap size={20} className="spark-icon" />
          Quick Spark
        </div>
      }
      size="medium"
      footer={
        <div className="spark-modal-footer">
          <span className="spark-hint">Press Ctrl+Enter to save</span>
          <div className="spark-actions">
            <Button
              variant="secondary"
              onClick={onCancel}
              icon={<X size={16} />}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={isSaving}
              disabled={!content.trim()}
              icon={<Zap size={16} />}
            >
              Capture Spark
            </Button>
          </div>
        </div>
      }
    >
      <div className="spark-input-content">
        <p className="spark-description">
          Capture a quick thought, idea, or note. You can expand it into a full article later.
        </p>
        <textarea
          className="spark-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="What's on your mind? Type your idea here..."
          autoFocus
          rows={6}
        />
      </div>
    </Modal>
  );
}

SparkInput.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default SparkInput;
