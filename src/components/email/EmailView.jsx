import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Reply,
  Forward,
  Trash2,
  MailOpen,
  Loader,
  Tag,
  X,
  Check,
  Calendar,
  Paperclip,
  Download,
  FileIcon
} from 'lucide-react';
import Button from '../shared/Button';
import { getInitials, formatFileSize } from './utils/emailConstants';

/**
 * EmailBodyIframe - Renders email HTML with inline image support
 * Handles CID (Content-ID) embedded images by fetching them from Gmail API
 * and converting to data URIs
 */
function EmailBodyIframe({ body, emailId, accountId }) {
  const [processedBody, setProcessedBody] = useState(body);
  const [isLoading, setIsLoading] = useState(false);

  // Process email body to replace CID images with data URIs
  const processInlineImages = useCallback(async () => {
    if (!body || !emailId || !accountId) {
      setProcessedBody(body);
      return;
    }

    // Check if body contains CID references
    const cidPattern = /src=["']cid:([^"']+)["']/gi;
    const cidMatches = [...body.matchAll(cidPattern)];

    if (cidMatches.length === 0) {
      // No CID images, use body as-is
      setProcessedBody(body);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch inline images from the email
      let newBody = body;

      if (window.electronAPI?.googleGetInlineImages) {
        const result = await window.electronAPI.googleGetInlineImages(accountId, emailId);

        if (result.success && result.data) {
          const inlineImages = result.data;

          // Replace each CID reference with the corresponding data URI
          for (const match of cidMatches) {
            const fullMatch = match[0];
            const contentId = match[1];

            // Find the matching inline image (Gmail uses Content-ID without angle brackets in cid: URLs)
            const inlineImage = inlineImages.find(img => {
              const imgCid = img.contentId?.replace(/^<|>$/g, '') || '';
              return imgCid === contentId || imgCid.startsWith(contentId);
            });

            if (inlineImage && inlineImage.data) {
              // Convert URL-safe base64 to standard base64
              const standardBase64 = inlineImage.data
                .replace(/-/g, '+')
                .replace(/_/g, '/');

              const dataUri = `data:${inlineImage.mimeType || 'image/png'};base64,${standardBase64}`;
              newBody = newBody.replace(fullMatch, `src="${dataUri}"`);
            }
          }
        }
      }

      setProcessedBody(newBody);
    } catch (error) {
      console.error('Failed to process inline images:', error);
      setProcessedBody(body);
    } finally {
      setIsLoading(false);
    }
  }, [body, emailId, accountId]);

  useEffect(() => {
    processInlineImages();
  }, [processInlineImages]);

  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; img-src * data: blob:; style-src 'self' 'unsafe-inline';">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #e0e0e0;
            background: transparent;
          }
          a { color: #ea4335; text-decoration: none; }
          a:hover { text-decoration: underline; }
          img { max-width: 100%; height: auto; }
          table { max-width: 100%; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>${processedBody || ''}</body>
    </html>
  `;

  if (isLoading) {
    return (
      <div className="email-body-loading">
        <Loader size={24} className="loading-spinner" />
        <span>Loading images...</span>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={iframeSrcDoc}
      sandbox="allow-same-origin allow-popups"
      className="email-iframe-body"
      title="Email content"
    />
  );
}

/**
 * EmailView - Email detail panel showing selected email
 */
export default function EmailView({
  selectedEmail,
  loadingEmailDetail,
  selectedAccountId,
  emailAttachments,
  downloadingAttachment,
  userLabels,
  labels,
  applyingLabel,
  showLabelsDropdown,
  onToggleLabelsDropdown,
  onReply,
  onForward,
  onMarkAsRead,
  onTrashEmail,
  onApplyLabel,
  onRemoveLabel,
  onDownloadAttachment
}) {
  // Get label display name and color
  const getLabelInfo = (labelId) => {
    const label = labels.find(l => l.id === labelId);
    if (label) {
      return {
        name: label.name,
        color: label.color?.backgroundColor || '#999999',
        textColor: label.color?.textColor || '#ffffff'
      };
    }
    return { name: labelId, color: '#999999', textColor: '#ffffff' };
  };

  if (loadingEmailDetail) {
    return (
      <div className="email-detail-panel">
        <div className="email-detail-loading">
          <Loader size={48} className="loading-spinner" />
          <p>Loading email...</p>
        </div>
      </div>
    );
  }

  if (!selectedEmail) {
    return (
      <div className="email-detail-panel">
        <div className="email-detail-empty">
          <Mail size={48} className="empty-icon" />
          <p>Select an email to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-detail-panel">
      <div className="email-detail-header">
        <div className="email-detail-actions">
          <Button
            variant="ghost"
            icon={<Reply size={18} />}
            title="Reply"
            onClick={onReply}
          >
            Reply
          </Button>
          <Button
            variant="ghost"
            icon={<Forward size={18} />}
            title="Forward"
            onClick={onForward}
          >
            Forward
          </Button>
          <Button
            variant="ghost"
            icon={<MailOpen size={18} />}
            title={selectedEmail.unread ? "Mark as read" : "Mark as unread"}
            onClick={() => onMarkAsRead(selectedEmail.id, !selectedEmail.unread)}
          />
          <Button
            variant="ghost"
            icon={<Trash2 size={18} />}
            title="Move to trash"
            onClick={() => onTrashEmail(selectedEmail.id)}
          />
          {/* Labels Dropdown */}
          <div className="email-labels-dropdown">
            <button
              className="email-labels-trigger"
              onClick={onToggleLabelsDropdown}
              title="Manage labels"
            >
              <Tag size={16} />
              Labels
            </button>
            {showLabelsDropdown && (
              <div className="email-labels-menu">
                <div className="email-labels-menu-header">
                  <span className="email-labels-menu-title">Labels</span>
                  <button
                    className="email-labels-menu-close"
                    onClick={onToggleLabelsDropdown}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="email-labels-menu-list">
                  {userLabels.length === 0 ? (
                    <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      No labels yet
                    </div>
                  ) : (
                    userLabels.map(label => {
                      const isApplied = selectedEmail.labels?.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          className={`email-labels-menu-item ${isApplied ? 'applied' : ''}`}
                          onClick={() => {
                            if (isApplied) {
                              onRemoveLabel(selectedEmail.id, label.id);
                            } else {
                              onApplyLabel(selectedEmail.id, label.id);
                            }
                          }}
                          disabled={applyingLabel === label.id}
                        >
                          <span className="label-checkbox">
                            {isApplied && <Check size={12} />}
                          </span>
                          <span className="label-info">
                            <span
                              className="label-color-indicator"
                              style={{ backgroundColor: label.color?.backgroundColor || '#999999' }}
                            />
                            <span className="label-name">{label.name}</span>
                          </span>
                          {applyingLabel === label.id && (
                            <Loader size={14} className="loading-spinner" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="email-labels-menu-footer">
                  <button
                    className="email-labels-manage-btn"
                    onClick={onToggleLabelsDropdown}
                  >
                    Manage labels
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <h2 className="email-detail-subject">{selectedEmail.subject || '(No subject)'}</h2>
      </div>

      {/* Display current email labels */}
      {selectedEmail.labels?.filter(l => userLabels.some(ul => ul.id === l)).length > 0 && (
        <div className="email-detail-labels">
          {selectedEmail.labels
            .filter(labelId => userLabels.some(ul => ul.id === labelId))
            .map(labelId => {
              const info = getLabelInfo(labelId);
              return (
                <span
                  key={labelId}
                  className="email-label-badge"
                  style={{
                    backgroundColor: info.color,
                    color: info.textColor
                  }}
                >
                  {info.name}
                  <button
                    className="remove-label-btn"
                    onClick={() => onRemoveLabel(selectedEmail.id, labelId)}
                    title="Remove label"
                    disabled={applyingLabel === labelId}
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
        </div>
      )}

      <div className="email-detail-meta">
        <div className="email-sender">
          <div className="email-sender-avatar">
            {getInitials(selectedEmail.from)}
          </div>
          <div className="email-sender-info">
            <div className="email-sender-name">{selectedEmail.from || 'Unknown'}</div>
            <div className="email-sender-email">to: {selectedEmail.to || 'me'}</div>
          </div>
        </div>
        <div className="email-detail-date">
          <Calendar size={14} />
          {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : ''}
        </div>
      </div>

      {emailAttachments.length > 0 && (
        <div className="email-attachments">
          <div className="attachments-header">
            <Paperclip size={16} />
            <span>{emailAttachments.length} attachment(s)</span>
          </div>
          <div className="attachments-list">
            {emailAttachments.map((attachment, idx) => (
              <div key={idx} className="attachment-item attachment-downloadable">
                <FileIcon size={14} className="attachment-file-icon" />
                <span className="attachment-name">{attachment.filename}</span>
                <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                <button
                  className="attachment-download-btn"
                  onClick={() => onDownloadAttachment(attachment)}
                  disabled={downloadingAttachment === attachment.id}
                  title="Download attachment"
                >
                  {downloadingAttachment === attachment.id ? (
                    <Loader size={14} className="loading-spinner" />
                  ) : (
                    <Download size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="email-detail-body">
        {selectedEmail.body ? (
          <EmailBodyIframe
            body={selectedEmail.body}
            emailId={selectedEmail.id}
            accountId={selectedAccountId}
          />
        ) : (
          <div className="email-text-body">{selectedEmail.snippet}</div>
        )}
      </div>
    </div>
  );
}
