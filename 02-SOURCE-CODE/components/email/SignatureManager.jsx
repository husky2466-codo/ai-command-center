import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  PenSquare,
  Plus,
  Trash2,
  Star,
  Check,
  Mail,
  Reply,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import RichTextEditor from '../shared/RichTextEditor';
import './SignatureManager.css';

/**
 * SignatureManager Component
 *
 * Modal for managing email signatures with rich text editing.
 * Supports multiple signatures per account with default selection.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal should close
 * @param {string} props.accountId - Current account ID
 * @param {Function} props.onSignatureChange - Callback when signatures are modified
 */
function SignatureManager({
  isOpen,
  onClose,
  accountId,
  onSignatureChange
}) {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingSignature, setEditingSignature] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  // Editor form state
  const [signatureName, setSignatureName] = useState('');
  const [signatureContent, setSignatureContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [useForNew, setUseForNew] = useState(true);
  const [useForReply, setUseForReply] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load signatures when modal opens
  const loadSignatures = useCallback(async () => {
    if (!accountId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.emailGetSignatures(accountId);
      if (result.success) {
        setSignatures(result.data || []);
      } else {
        setError(result.error || 'Failed to load signatures');
      }
    } catch (err) {
      console.error('[SignatureManager] Error loading signatures:', err);
      setError(err.message || 'Failed to load signatures');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (isOpen && accountId) {
      loadSignatures();
    }
  }, [isOpen, accountId, loadSignatures]);

  // Reset form when closing editor
  const resetForm = () => {
    setSignatureName('');
    setSignatureContent('');
    setIsDefault(false);
    setUseForNew(true);
    setUseForReply(true);
    setEditingSignature(null);
    setShowEditor(false);
  };

  // Open editor for new signature
  const handleAddNew = () => {
    resetForm();
    setShowEditor(true);
  };

  // Open editor for editing existing signature
  const handleEdit = (signature) => {
    setEditingSignature(signature);
    setSignatureName(signature.name);
    setSignatureContent(signature.content);
    setIsDefault(signature.is_default === 1);
    setUseForNew(signature.use_for_new === 1);
    setUseForReply(signature.use_for_reply === 1);
    setShowEditor(true);
  };

  // Save signature (create or update)
  const handleSave = async () => {
    if (!signatureName.trim()) {
      setError('Please enter a signature name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        name: signatureName.trim(),
        content: signatureContent,
        is_default: isDefault,
        use_for_new: useForNew,
        use_for_reply: useForReply
      };

      let result;
      if (editingSignature) {
        result = await window.electronAPI.emailUpdateSignature(editingSignature.id, data);
      } else {
        result = await window.electronAPI.emailCreateSignature(accountId, data);
      }

      if (result.success) {
        await loadSignatures();
        resetForm();
        onSignatureChange?.();
      } else {
        setError(result.error || 'Failed to save signature');
      }
    } catch (err) {
      console.error('[SignatureManager] Error saving signature:', err);
      setError(err.message || 'Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  // Delete signature
  const handleDelete = async (signatureId) => {
    if (!window.confirm('Are you sure you want to delete this signature?')) {
      return;
    }

    setError(null);

    try {
      const result = await window.electronAPI.emailDeleteSignature(signatureId);
      if (result.success) {
        await loadSignatures();
        onSignatureChange?.();
      } else {
        setError(result.error || 'Failed to delete signature');
      }
    } catch (err) {
      console.error('[SignatureManager] Error deleting signature:', err);
      setError(err.message || 'Failed to delete signature');
    }
  };

  // Set as default signature
  const handleSetDefault = async (signatureId) => {
    setError(null);

    try {
      const result = await window.electronAPI.emailSetDefaultSignature(accountId, signatureId);
      if (result.success) {
        await loadSignatures();
        onSignatureChange?.();
      } else {
        setError(result.error || 'Failed to set default signature');
      }
    } catch (err) {
      console.error('[SignatureManager] Error setting default:', err);
      setError(err.message || 'Failed to set default signature');
    }
  };

  // Strip HTML tags for preview
  const getPlainTextPreview = (html) => {
    if (!html) return 'No content';
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Signature list view
  const renderSignatureList = () => {
    if (loading) {
      return (
        <div className="signature-loading">
          <Loader2 size={24} className="loading-spinner" />
          <span>Loading signatures...</span>
        </div>
      );
    }

    if (signatures.length === 0) {
      return (
        <div className="signature-empty">
          <PenSquare size={48} className="empty-icon" />
          <h3>No Signatures</h3>
          <p>Create your first email signature to personalize your emails.</p>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={handleAddNew}
          >
            Create Signature
          </Button>
        </div>
      );
    }

    return (
      <div className="signature-list">
        {signatures.map((sig) => (
          <div
            key={sig.id}
            className={`signature-item ${sig.is_default ? 'signature-default' : ''}`}
          >
            <div className="signature-item-header">
              <div className="signature-item-name">
                <span className="signature-name">{sig.name}</span>
                {sig.is_default === 1 && (
                  <span className="signature-badge signature-badge-default">
                    <Star size={12} /> Default
                  </span>
                )}
              </div>
              <div className="signature-item-tags">
                {sig.use_for_new === 1 && (
                  <span className="signature-tag" title="Used for new emails">
                    <Mail size={12} /> New
                  </span>
                )}
                {sig.use_for_reply === 1 && (
                  <span className="signature-tag" title="Used for replies">
                    <Reply size={12} /> Reply
                  </span>
                )}
              </div>
            </div>
            <div className="signature-item-preview">
              {getPlainTextPreview(sig.content)}
            </div>
            <div className="signature-item-actions">
              {sig.is_default !== 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Star size={14} />}
                  onClick={() => handleSetDefault(sig.id)}
                  title="Set as default"
                >
                  Set Default
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<PenSquare size={14} />}
                onClick={() => handleEdit(sig)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(sig.id)}
                className="signature-delete-btn"
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Signature editor view
  const renderEditor = () => {
    return (
      <div className="signature-editor">
        <Input
          label="Signature Name"
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          placeholder="e.g., Work, Personal, Casual"
          required
        />

        <div className="signature-editor-content">
          <label className="signature-editor-label">Signature Content</label>
          <RichTextEditor
            content={signatureContent}
            onChange={setSignatureContent}
            placeholder="Enter your signature content..."
            minHeight="150px"
            maxHeight="300px"
          />
        </div>

        <div className="signature-editor-options">
          <label className="signature-checkbox">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>Set as default signature</span>
          </label>

          <div className="signature-auto-insert">
            <span className="signature-auto-insert-label">Auto-insert for:</span>
            <label className="signature-checkbox">
              <input
                type="checkbox"
                checked={useForNew}
                onChange={(e) => setUseForNew(e.target.checked)}
              />
              <span>
                <Mail size={14} /> New emails
              </span>
            </label>
            <label className="signature-checkbox">
              <input
                type="checkbox"
                checked={useForReply}
                onChange={(e) => setUseForReply(e.target.checked)}
              />
              <span>
                <Reply size={14} /> Replies & forwards
              </span>
            </label>
          </div>
        </div>

        <div className="signature-preview-section">
          <label className="signature-editor-label">Preview</label>
          <div className="signature-preview">
            <div className="signature-separator">--</div>
            <div
              className="signature-preview-content"
              dangerouslySetInnerHTML={{ __html: signatureContent || '<em>Your signature will appear here...</em>' }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Modal footer
  const renderFooter = () => {
    if (showEditor) {
      return (
        <>
          <Button
            variant="ghost"
            onClick={resetForm}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Check size={16} />}
            onClick={handleSave}
            loading={saving}
          >
            {editingSignature ? 'Save Changes' : 'Create Signature'}
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          variant="ghost"
          onClick={handleClose}
        >
          Close
        </Button>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={handleAddNew}
        >
          Add Signature
        </Button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={showEditor
        ? (editingSignature ? 'Edit Signature' : 'New Signature')
        : 'Manage Signatures'
      }
      size="large"
      footer={renderFooter()}
      className="signature-manager-modal"
    >
      {error && (
        <div className="signature-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {showEditor ? renderEditor() : renderSignatureList()}
    </Modal>
  );
}

SignatureManager.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  accountId: PropTypes.string,
  onSignatureChange: PropTypes.func
};

export default SignatureManager;
