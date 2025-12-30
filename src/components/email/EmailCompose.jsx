import React from 'react';
import { Send, FileText, PenSquare, Plus, X, FileIcon } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import TemplateSelector from './TemplateSelector';
import { formatFileSize } from './utils/emailConstants';

/**
 * EmailCompose - Compose/Reply/Forward modals with rich editor
 */
export function ComposeModal({
  isOpen,
  onClose,
  composeData,
  onComposeDataChange,
  composeAttachments,
  onAddAttachment,
  onRemoveAttachment,
  sending,
  onSend,
  selectedAccountId,
  showTemplateSelector,
  onToggleTemplateSelector,
  onShowTemplateManager,
  signatures,
  selectedSignatureId,
  onInsertSignature
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
      title="Compose Email"
      size="large"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Send size={18} />}
            onClick={onSend}
            loading={sending}
            disabled={sending || !composeData.to || !composeData.subject}
          >
            Send{composeAttachments.length > 0 ? ` (${composeAttachments.length} attachment${composeAttachments.length > 1 ? 's' : ''})` : ''}
          </Button>
        </>
      }
    >
      <div className="compose-form">
        <Input
          label="To"
          type="email"
          placeholder="recipient@example.com"
          value={composeData.to}
          onChange={(e) => onComposeDataChange({ ...composeData, to: e.target.value })}
          fullWidth
          required
        />
        <Input
          label="Subject"
          type="text"
          placeholder="Email subject"
          value={composeData.subject}
          onChange={(e) => onComposeDataChange({ ...composeData, subject: e.target.value })}
          fullWidth
          required
        />
        <div className="compose-body-field">
          <div className="compose-body-header">
            <label className="compose-body-label">Message</label>
            <div className="compose-toolbar">
              <div className="template-btn-wrapper">
                <Button
                  variant="ghost"
                  size="small"
                  icon={<FileText size={16} />}
                  onClick={onToggleTemplateSelector}
                  title="Insert template"
                >
                  Templates
                </Button>
                <TemplateSelector
                  isOpen={showTemplateSelector}
                  onClose={() => onToggleTemplateSelector(false)}
                  accountId={selectedAccountId}
                  onSelect={(template) => {
                    // Insert template - replace or append based on current content
                    const hasContent = composeData.subject || composeData.body;
                    if (hasContent) {
                      const replaceContent = confirm(
                        'Replace current subject and body with template?\n\n' +
                        'Click OK to replace, or Cancel to append template body only.'
                      );
                      if (replaceContent) {
                        onComposeDataChange({
                          ...composeData,
                          subject: template.subject || composeData.subject,
                          body: template.body || ''
                        });
                      } else {
                        onComposeDataChange({
                          ...composeData,
                          body: composeData.body + '\n\n' + (template.body || '')
                        });
                      }
                    } else {
                      onComposeDataChange({
                        ...composeData,
                        subject: template.subject || '',
                        body: template.body || ''
                      });
                    }
                  }}
                  onManageTemplates={onShowTemplateManager}
                />
              </div>
              {/* Signature Selector */}
              {signatures.length > 0 && (
                <div className="signature-selector-wrapper">
                  <select
                    className="signature-selector"
                    value={selectedSignatureId || ''}
                    onChange={(e) => {
                      const sigId = e.target.value;
                      if (sigId) {
                        onInsertSignature(sigId);
                      }
                    }}
                    title="Select signature"
                  >
                    <option value="">Select signature...</option>
                    {signatures.map(sig => (
                      <option key={sig.id} value={sig.id}>
                        {sig.name} {sig.is_default === 1 ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                variant="ghost"
                size="small"
                icon={<PenSquare size={16} />}
                onClick={onShowTemplateManager}
                title="Manage signatures"
              >
                Signatures
              </Button>
            </div>
          </div>
          <textarea
            className="compose-body-textarea"
            placeholder="Type your message here..."
            value={composeData.body}
            onChange={(e) => onComposeDataChange({ ...composeData, body: e.target.value })}
            rows={10}
          />
        </div>

        {/* Attachments Section */}
        <div className="compose-attachments">
          <div className="compose-attachments-header">
            <label className="compose-attachments-label">Attachments</label>
            <Button
              variant="ghost"
              size="small"
              icon={<Plus size={16} />}
              onClick={onAddAttachment}
            >
              Add File
            </Button>
          </div>
          {composeAttachments.length > 0 && (
            <div className="compose-attachments-list">
              {composeAttachments.map((file, idx) => (
                <div key={idx} className="compose-attachment-item">
                  <FileIcon size={14} className="attachment-file-icon" />
                  <span className="attachment-name">{file.name}</span>
                  <span className="attachment-size">{formatFileSize(file.size)}</span>
                  <button
                    className="attachment-remove-btn"
                    onClick={() => onRemoveAttachment(idx)}
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * ReplyModal - Reply to an email
 */
export function ReplyModal({
  isOpen,
  onClose,
  replyData,
  onReplyDataChange,
  sendingReply,
  onSendReply
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
      title="Reply to Email"
      size="large"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Send size={18} />}
            onClick={onSendReply}
            loading={sendingReply}
            disabled={sendingReply || !replyData.to || !replyData.subject}
          >
            Send Reply
          </Button>
        </>
      }
    >
      <div className="compose-form">
        <Input
          label="To"
          type="email"
          placeholder="recipient@example.com"
          value={replyData.to}
          onChange={(e) => onReplyDataChange({ ...replyData, to: e.target.value })}
          fullWidth
          required
        />
        <Input
          label="Subject"
          type="text"
          placeholder="Email subject"
          value={replyData.subject}
          onChange={(e) => onReplyDataChange({ ...replyData, subject: e.target.value })}
          fullWidth
          required
        />
        <div className="compose-body-field">
          <label className="compose-body-label">Message</label>
          <textarea
            className="compose-body-textarea"
            placeholder="Type your reply here..."
            value={replyData.body}
            onChange={(e) => onReplyDataChange({ ...replyData, body: e.target.value })}
            rows={12}
          />
        </div>
      </div>
    </Modal>
  );
}

/**
 * ForwardModal - Forward an email
 */
export function ForwardModal({
  isOpen,
  onClose,
  forwardData,
  onForwardDataChange,
  sendingReply,
  onSendForward
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
      title="Forward Email"
      size="large"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Send size={18} />}
            onClick={onSendForward}
            loading={sendingReply}
            disabled={sendingReply || !forwardData.to || !forwardData.subject}
          >
            Send Forward
          </Button>
        </>
      }
    >
      <div className="compose-form">
        <Input
          label="To"
          type="email"
          placeholder="recipient@example.com"
          value={forwardData.to}
          onChange={(e) => onForwardDataChange({ ...forwardData, to: e.target.value })}
          fullWidth
          required
        />
        <Input
          label="Subject"
          type="text"
          placeholder="Email subject"
          value={forwardData.subject}
          onChange={(e) => onForwardDataChange({ ...forwardData, subject: e.target.value })}
          fullWidth
          required
        />
        <div className="compose-body-field">
          <label className="compose-body-label">Message</label>
          <textarea
            className="compose-body-textarea"
            placeholder="Add a message (optional)..."
            value={forwardData.body}
            onChange={(e) => onForwardDataChange({ ...forwardData, body: e.target.value })}
            rows={12}
          />
        </div>
      </div>
    </Modal>
  );
}
