# Email Module Enhancements - Implementation Plan

**Created:** 2025-12-29
**Status:** Planning
**Priority:** Phase 2 Enhancement (Post-MVP)

---

## Executive Summary

This plan outlines enhancements to transform the AI Command Center Email module from a functional Gmail client into a flexible, AI-integrated email tool. The focus is on **LEAN implementation** - delivering maximum value with minimum complexity, especially for programmatic/API access.

```
+------------------------------------------------------------------+
|                    EMAIL ENHANCEMENTS OVERVIEW                    |
+------------------------------------------------------------------+
|                                                                   |
|  CURRENT STATE (Working)          PLANNED ENHANCEMENTS            |
|  ----------------------          ---------------------            |
|  - List/view/search emails       - Rich text composer             |
|  - Star, read, trash, delete     - Signatures management          |
|  - Reply, forward, compose       - Attachment handling            |
|  - Multi-account support         - Labels/folders management      |
|  - Gmail API sync (full+incr)    - Templates system               |
|  - Sandboxed HTML viewer         - Bulk operations                |
|  - 3-panel layout                - Advanced search                |
|                                  - Terminal API integration       |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|         PRIORITY: API/Terminal Integration > UI Features          |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Current Implementation Analysis

### What Exists (Working)

**Frontend (`src/components/email/Email.jsx`):**
- 3-panel layout (sidebar, list, detail)
- Account selector with multi-account support
- Folder navigation (Inbox, Sent, Starred, Trash)
- Email list with pagination, filtering (All/Unread/Starred)
- Client-side search across subject, sender, snippet
- Email detail view with sandboxed iframe for HTML
- Star toggle, mark read/unread, trash
- Reply, Forward, Compose modals (plain text only)
- Loading states and error handling

**Backend (`electron/services/googleAccountService.cjs`):**
- OAuth2 authentication with token refresh
- Full and incremental sync via Gmail History API
- CRUD operations: send, trash, delete, markAsRead, toggleStar
- Reply and Forward with proper threading (In-Reply-To headers)
- Calendar and Contacts sync (bonus features)
- Exponential backoff for rate limiting
- Local SQLite caching of emails

**Database Schema (existing tables):**
- `account_emails` - stores synced emails
- `account_sync_state` - tracks historyId for incremental sync
- `connected_accounts` - multi-account management

### What's Missing

| Feature | Impact | Complexity | Priority |
|---------|--------|------------|----------|
| Rich Text Composer | High | Medium | P1 |
| Attachments (download/upload) | High | High | P1 |
| Signatures | Medium | Low | P2 |
| Labels Management | Medium | Medium | P2 |
| Templates | Medium | Low | P2 |
| Bulk Operations | High | Low | P1 |
| Advanced Search (Gmail operators) | Medium | Low | P2 |
| Settings Panel | Low | Low | P3 |
| Terminal API Enhancements | High | Medium | P1 |

---

## Priority Analysis: Essential vs Nice-to-Have

### Essential (P1) - Minimized but Flexible

These features make the email client **genuinely useful** for both UI and programmatic access:

1. **Rich Text Composer** - HTML emails are expected; plain text is limiting
2. **Attachments** - Cannot properly use email without attachments
3. **Bulk Operations** - Mark multiple as read, delete multiple, apply labels
4. **Terminal API** - AI Command Center's differentiator; enable AI workflows

### Important (P2) - Enhanced Productivity

These features improve daily usability but aren't blockers:

5. **Signatures** - One per account minimum; HTML support
6. **Labels/Folders** - Create, rename, apply (Gmail labels)
7. **Templates** - Save/reuse common emails
8. **Advanced Search** - Gmail search operators via API

### Nice-to-Have (P3) - Polish

9. **Settings Panel** - Reading pane position, notifications
10. **Scheduled Send** - Queue emails for later (Gmail doesn't support via API directly)

---

## Phase Breakdown

```
+============================================================================+
|                          IMPLEMENTATION PHASES                              |
+============================================================================+
|                                                                             |
|  PHASE 1: Core Enhancements (1-2 weeks)                                     |
|  --------------------------------------                                     |
|  [x] Rich text composer (TipTap or Quill)                                   |
|  [x] Attachment download                                                    |
|  [x] Attachment upload (compose)                                            |
|  [x] Bulk select + batch operations                                         |
|  [x] Terminal API: send, search, bulk ops                                   |
|                                                                             |
|  PHASE 2: Productivity Features (1 week)                                    |
|  ---------------------------------------                                    |
|  [ ] Signatures (CRUD + auto-insert)                                        |
|  [ ] Labels management UI                                                   |
|  [ ] Templates (save/load/apply)                                            |
|  [ ] Advanced search with Gmail operators                                   |
|                                                                             |
|  PHASE 3: Polish & Settings (3-5 days)                                      |
|  -------------------------------------                                      |
|  [ ] Settings panel (reading pane, defaults)                                |
|  [ ] Keyboard shortcuts                                                     |
|  [ ] Performance: virtual scrolling for 1000+ emails                        |
|                                                                             |
+============================================================================+
```

---

## Phase 1: Core Enhancements

### 1.1 Rich Text Composer

**Goal:** Replace plain textarea with proper HTML editor

**Library Choice:** TipTap (preferred) or Quill
- TipTap: Headless, highly customizable, React-native
- Quill: Mature, more batteries-included

**Features to Implement:**
- [ ] Basic formatting: Bold, Italic, Underline, Strikethrough
- [ ] Lists: Bullet, Numbered
- [ ] Links: Insert/edit hyperlinks
- [ ] Font size (small, normal, large)
- [ ] Text color (limited palette)
- [ ] Inline images (drag-drop or paste)
- [ ] HTML output for Gmail API

**Implementation:**

```jsx
// src/components/email/RichTextEditor.jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="rich-text-editor">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

**Database Changes:** None required (HTML already supported in body_html field)

**API Changes:** Update `sendEmail` to properly construct multipart/alternative MIME (text + HTML)

### 1.2 Attachments

**Goal:** Full attachment lifecycle - download existing, upload new

#### 1.2.1 Download Attachments

**Current State:** Attachment metadata shown but not downloadable

**Implementation:**

```javascript
// electron/services/googleAccountService.cjs - ADD METHOD
async downloadAttachment(accountId, messageId, attachmentId, filename) {
  await this.ensureValidToken();

  const response = await this.gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId
  });

  // Decode base64url data
  const data = Buffer.from(
    response.data.data.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );

  // Save to downloads or return for UI
  const savePath = path.join(app.getPath('downloads'), filename);
  fs.writeFileSync(savePath, data);

  return { success: true, path: savePath };
}
```

**IPC Handler:**
```javascript
// electron/main.cjs
ipcMain.handle('google-download-attachment', async (event, accountId, messageId, attachmentId, filename) => {
  const service = await getGoogleService(accountId);
  return service.downloadAttachment(accountId, messageId, attachmentId, filename);
});
```

**UI Changes:**
- Add download button to attachment items
- Show download progress indicator
- Open file location after download

#### 1.2.2 Upload Attachments (Compose)

**Implementation:**

```javascript
// electron/services/googleAccountService.cjs - MODIFY sendEmail
async sendEmail(accountId, message) {
  const { to, cc, bcc, subject, body, html, attachments = [] } = message;

  // Build multipart MIME message
  const boundary = `----=_Part_${Date.now()}`;

  let mimeMessage = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    bcc ? `Bcc: ${bcc}` : '',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: multipart/alternative; boundary="alt_boundary"',
    '',
    '--alt_boundary',
    'Content-Type: text/plain; charset=utf-8',
    '',
    stripHtml(body || html),
    '',
    '--alt_boundary',
    'Content-Type: text/html; charset=utf-8',
    '',
    html || body,
    '--alt_boundary--',
  ].filter(Boolean).join('\r\n');

  // Add attachments
  for (const attachment of attachments) {
    const content = fs.readFileSync(attachment.path);
    const base64Content = content.toString('base64');

    mimeMessage += [
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      base64Content,
    ].join('\r\n');
  }

  mimeMessage += `\r\n--${boundary}--`;

  // Encode and send
  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return await this.gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });
}
```

**UI Changes:**
- Add file picker button in compose modal
- Show attached files list with remove option
- Display file size, validate < 25MB total
- Drag-drop support on compose area

### 1.3 Bulk Operations

**Goal:** Select multiple emails, perform batch actions

**UI Implementation:**

```jsx
// Add to Email.jsx state
const [selectedIds, setSelectedIds] = useState(new Set());
const [selectMode, setSelectMode] = useState(false);

// Checkbox in email list items
<input
  type="checkbox"
  checked={selectedIds.has(email.id)}
  onChange={() => toggleSelect(email.id)}
/>

// Bulk action toolbar (shows when selection > 0)
{selectedIds.size > 0 && (
  <div className="bulk-actions-bar">
    <span>{selectedIds.size} selected</span>
    <Button onClick={() => bulkMarkRead(true)}>Mark Read</Button>
    <Button onClick={() => bulkMarkRead(false)}>Mark Unread</Button>
    <Button onClick={() => bulkTrash()}>Delete</Button>
    <Button onClick={() => bulkApplyLabel()}>Apply Label</Button>
  </div>
)}
```

**Backend - Batch Modify:**

```javascript
// electron/services/googleAccountService.cjs - ADD METHOD
async batchModify(accountId, messageIds, addLabelIds = [], removeLabelIds = []) {
  await this.ensureValidToken();

  await this.gmail.users.messages.batchModify({
    userId: 'me',
    requestBody: {
      ids: messageIds,
      addLabelIds,
      removeLabelIds
    }
  });

  // Update local DB
  for (const id of messageIds) {
    // Update labels in local cache
  }

  return { success: true, modified: messageIds.length };
}

async batchTrash(accountId, messageIds) {
  // Note: Gmail API doesn't have batch trash, must loop
  for (const id of messageIds) {
    await this.trashEmail(accountId, id);
  }
  return { success: true, trashed: messageIds.length };
}
```

### 1.4 Terminal API Enhancements

**Goal:** Enable AI agents to fully interact with email via local API

**New Endpoints for `apiServer.cjs`:**

```javascript
// POST /api/emails/send - Send email (supports attachments)
router.post('/emails/send', async (req, res) => {
  const { accountId, to, cc, bcc, subject, body, html, attachments } = req.body;

  if (!accountId || !to || !subject) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const service = await getGoogleService(accountId);
  const result = await service.sendEmail(accountId, {
    to, cc, bcc, subject, body, html, attachments
  });

  res.json({ success: true, data: result });
});

// POST /api/emails/search - Search with Gmail operators
router.post('/emails/search', async (req, res) => {
  const { accountId, query, maxResults = 50 } = req.body;

  const service = await getGoogleService(accountId);
  const results = await service.searchEmails(accountId, query, maxResults);

  res.json({ success: true, data: results });
});

// POST /api/emails/batch - Batch operations
router.post('/emails/batch', async (req, res) => {
  const { accountId, action, messageIds, labelIds } = req.body;

  const service = await getGoogleService(accountId);

  switch (action) {
    case 'markRead':
      await service.batchModify(accountId, messageIds, [], ['UNREAD']);
      break;
    case 'markUnread':
      await service.batchModify(accountId, messageIds, ['UNREAD'], []);
      break;
    case 'trash':
      await service.batchTrash(accountId, messageIds);
      break;
    case 'addLabels':
      await service.batchModify(accountId, messageIds, labelIds, []);
      break;
    case 'removeLabels':
      await service.batchModify(accountId, messageIds, [], labelIds);
      break;
  }

  res.json({ success: true });
});

// GET /api/emails/:accountId/:messageId/attachments/:attachmentId
router.get('/emails/:accountId/:messageId/attachments/:attachmentId', async (req, res) => {
  // Returns base64 encoded attachment data
});
```

**Updated API Reference for CLAUDE.md:**

```markdown
### Email Operations (New)

#### Send Email
```bash
curl -X POST http://localhost:3939/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACCOUNT_UUID",
    "to": "recipient@example.com",
    "cc": "cc@example.com",
    "subject": "Subject line",
    "html": "<p>HTML body</p>",
    "body": "Plain text fallback"
  }'
```

#### Search Emails (Gmail Operators)
```bash
curl -X POST http://localhost:3939/api/emails/search \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACCOUNT_UUID",
    "query": "from:boss@company.com is:unread has:attachment newer_than:7d",
    "maxResults": 20
  }'
```

#### Batch Operations
```bash
# Mark multiple as read
curl -X POST http://localhost:3939/api/emails/batch \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACCOUNT_UUID",
    "action": "markRead",
    "messageIds": ["msg1", "msg2", "msg3"]
  }'
```
```

---

## Phase 2: Productivity Features

### 2.1 Signatures

**Database Schema:**

```sql
-- Migration: 006_email_signatures.sql
CREATE TABLE IF NOT EXISTS email_signatures (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  html_content TEXT,
  plain_text_content TEXT,
  is_default_new INTEGER DEFAULT 0,
  is_default_reply INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_signatures_account ON email_signatures(account_id);
```

**Features:**
- [ ] CRUD for signatures (name, HTML content, plain text fallback)
- [ ] Per-account default for new emails
- [ ] Per-account default for replies
- [ ] Insert signature in compose editor
- [ ] Signature preview in settings

**UI Components:**
- `SignatureEditor.jsx` - Create/edit signature with rich text
- `SignatureManager.jsx` - List, select defaults, delete
- Integration in compose modal (auto-insert + manual switch)

### 2.2 Labels Management

**Current:** Labels stored as comma-separated string, display only

**Enhancements:**

```javascript
// electron/services/googleAccountService.cjs - ADD METHODS
async getLabels(accountId) {
  await this.ensureValidToken();

  const response = await this.gmail.users.labels.list({ userId: 'me' });
  return response.data.labels;
}

async createLabel(accountId, name, color) {
  await this.ensureValidToken();

  const response = await this.gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
      color: color ? {
        backgroundColor: color.bg,
        textColor: color.text
      } : undefined
    }
  });

  return response.data;
}

async deleteLabel(accountId, labelId) {
  await this.ensureValidToken();
  await this.gmail.users.labels.delete({ userId: 'me', id: labelId });
}

async applyLabel(accountId, messageId, labelId) {
  await this.batchModify(accountId, [messageId], [labelId], []);
}
```

**UI Components:**
- Labels sidebar section (below folders)
- Label color picker (Gmail's predefined palette)
- Apply label dropdown in email detail
- Label filter in search

### 2.3 Templates

**Database Schema:**

```sql
-- Migration: 007_email_templates.sql
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  account_id TEXT,  -- NULL = global template
  name TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_templates_account ON email_templates(account_id);
```

**Features:**
- [ ] Save current compose as template
- [ ] Load template into compose
- [ ] Template library UI (list, preview, edit, delete)
- [ ] Global vs per-account templates

**API Endpoints:**

```javascript
// GET /api/email-templates
// POST /api/email-templates
// PUT /api/email-templates/:id
// DELETE /api/email-templates/:id
```

### 2.4 Advanced Search

**Goal:** Expose Gmail's full search syntax

**Implementation:**

```javascript
// electron/services/googleAccountService.cjs - ADD METHOD
async searchEmails(accountId, query, maxResults = 50) {
  await this.ensureValidToken();

  // Search via Gmail API (not local DB)
  const response = await this.gmail.users.messages.list({
    userId: 'me',
    q: query,  // Gmail search syntax
    maxResults
  });

  const messages = response.data.messages || [];

  // Fetch full details for results
  const results = [];
  for (const msg of messages) {
    const full = await this.gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Date']
    });
    results.push(parseGmailMessage(full.data));
  }

  return results;
}
```

**UI Enhancements:**
- Search bar with syntax hints dropdown
- Common operators: `from:`, `to:`, `subject:`, `has:attachment`, `is:unread`
- Date filters: `after:`, `before:`, `newer_than:`
- Save search as "Smart Folder" (local only)

---

## Phase 3: Polish & Settings

### 3.1 Settings Panel

**New Component:** `EmailSettings.jsx`

**Settings to Include:**
- [ ] Reading pane position (right/bottom/hidden)
- [ ] Mark as read delay (0s, 3s, 5s)
- [ ] Default compose format (HTML/Plain)
- [ ] Conversation view toggle
- [ ] Sync frequency (manual, 5min, 15min)
- [ ] Notification preferences

**Storage:** `localStorage` or new `user_preferences` table

### 3.2 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Compose new | `C` |
| Reply | `R` |
| Reply all | `Shift+R` |
| Forward | `F` |
| Archive/Delete | `E` / `#` |
| Mark read/unread | `Shift+I` / `Shift+U` |
| Star | `S` |
| Search focus | `/` |
| Next/Prev email | `J` / `K` |
| Select | `X` |

**Implementation:** Use `useEffect` with keyboard event listener

### 3.3 Virtual Scrolling

**Goal:** Handle 1000+ emails without performance degradation

**Library:** `react-window` or `react-virtualized`

```jsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={emails.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <EmailListItem
      email={emails[index]}
      style={style}
      onClick={() => handleEmailClick(emails[index])}
    />
  )}
</FixedSizeList>
```

---

## Database Schema Changes Summary

```sql
-- New Tables --

-- Signatures
CREATE TABLE email_signatures (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  html_content TEXT,
  plain_text_content TEXT,
  is_default_new INTEGER DEFAULT 0,
  is_default_reply INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
);

-- Templates
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  name TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Cached Labels (for offline access)
CREATE TABLE email_labels (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'user',  -- 'system' or 'user'
  background_color TEXT,
  text_color TEXT,
  synced_at INTEGER,
  FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_signatures_account ON email_signatures(account_id);
CREATE INDEX idx_templates_account ON email_templates(account_id);
CREATE INDEX idx_labels_account ON email_labels(account_id);
```

---

## New IPC Handlers Required

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `google-download-attachment` | invoke | Download attachment to disk |
| `google-search-emails` | invoke | Search with Gmail operators |
| `google-batch-modify` | invoke | Bulk label operations |
| `google-batch-trash` | invoke | Bulk delete |
| `google-get-labels` | invoke | List Gmail labels |
| `google-create-label` | invoke | Create new label |
| `google-delete-label` | invoke | Delete label |
| `email-signatures-list` | invoke | Get signatures for account |
| `email-signatures-save` | invoke | Create/update signature |
| `email-signatures-delete` | invoke | Delete signature |
| `email-templates-list` | invoke | Get templates |
| `email-templates-save` | invoke | Create/update template |
| `email-templates-delete` | invoke | Delete template |

---

## New UI Components

```
src/components/email/
  Email.jsx                    # Main component (update)
  Email.css                    # Styles (update)
  RichTextEditor.jsx           # TipTap editor wrapper [NEW]
  RichTextEditor.css           # Editor styles [NEW]
  EditorToolbar.jsx            # Formatting buttons [NEW]
  AttachmentUploader.jsx       # File picker + drag-drop [NEW]
  AttachmentItem.jsx           # Single attachment display [NEW]
  BulkActionsBar.jsx           # Selection toolbar [NEW]
  SignatureManager.jsx         # Signature CRUD [NEW]
  SignatureEditor.jsx          # Signature editor [NEW]
  LabelManager.jsx             # Label CRUD [NEW]
  LabelPicker.jsx              # Apply label dropdown [NEW]
  TemplateManager.jsx          # Template CRUD [NEW]
  AdvancedSearchBar.jsx        # Search with operator hints [NEW]
  EmailSettings.jsx            # Settings panel [NEW]
```

---

## API Server Integration

### New Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/emails/send` | Send email with attachments |
| POST | `/api/emails/search` | Gmail operator search |
| POST | `/api/emails/batch` | Bulk operations |
| GET | `/api/emails/:accountId/:msgId/attachments/:attId` | Download attachment |
| GET | `/api/email-labels/:accountId` | List labels |
| POST | `/api/email-labels/:accountId` | Create label |
| DELETE | `/api/email-labels/:accountId/:labelId` | Delete label |
| GET | `/api/email-signatures/:accountId` | List signatures |
| POST | `/api/email-signatures` | Create signature |
| PUT | `/api/email-signatures/:id` | Update signature |
| DELETE | `/api/email-signatures/:id` | Delete signature |
| GET | `/api/email-templates` | List templates |
| POST | `/api/email-templates` | Create template |
| PUT | `/api/email-templates/:id` | Update template |
| DELETE | `/api/email-templates/:id` | Delete template |

---

## Complexity Estimates

| Feature | Frontend | Backend | Total |
|---------|----------|---------|-------|
| Rich Text Composer | High | Low | High |
| Attachment Download | Low | Medium | Medium |
| Attachment Upload | Medium | High | High |
| Bulk Operations | Medium | Low | Medium |
| Terminal API | Low | Medium | Medium |
| Signatures | Medium | Low | Medium |
| Labels Management | Medium | Medium | Medium |
| Templates | Low | Low | Low |
| Advanced Search | Low | Low | Low |
| Settings Panel | Low | Low | Low |
| Keyboard Shortcuts | Low | None | Low |
| Virtual Scrolling | Medium | None | Medium |

---

## Dependencies to Add

```json
// package.json additions
{
  "dependencies": {
    "@tiptap/react": "^2.x",
    "@tiptap/starter-kit": "^2.x",
    "@tiptap/extension-link": "^2.x",
    "@tiptap/extension-image": "^2.x",
    "react-window": "^1.8.x"
  }
}
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Gmail API rate limits during batch ops | Use exponential backoff (already implemented) |
| Large attachment uploads timeout | Use resumable upload for > 5MB |
| Rich text editor bundle size | Lazy load TipTap only in compose modal |
| HTML email security | Continue using sandboxed iframe |
| Offline functionality | Local SQLite cache handles reads; queue writes |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Can compose and send HTML emails with formatting
- [ ] Can download and upload attachments
- [ ] Can select multiple emails and perform bulk actions
- [ ] Terminal API supports send, search, and batch operations
- [ ] All existing functionality still works

### Phase 2 Complete When:
- [ ] Can create and use multiple signatures
- [ ] Can create, apply, and manage labels
- [ ] Can save and reuse email templates
- [ ] Search supports Gmail operators

### Phase 3 Complete When:
- [ ] Settings panel allows configuration
- [ ] Keyboard shortcuts work
- [ ] Email list handles 1000+ items smoothly

---

## Implementation Order (Suggested)

```
Week 1:
  Day 1-2: Rich Text Composer (TipTap setup + toolbar)
  Day 3:   Attachment Download
  Day 4-5: Attachment Upload

Week 2:
  Day 1-2: Bulk Operations UI + Backend
  Day 3-4: Terminal API Enhancements
  Day 5:   Testing & Bug Fixes

Week 3:
  Day 1:   Signatures
  Day 2:   Labels Management
  Day 3:   Templates
  Day 4:   Advanced Search
  Day 5:   Polish & Settings

Week 4:
  Day 1-2: Keyboard Shortcuts
  Day 3-4: Virtual Scrolling
  Day 5:   Final Testing & Documentation
```

---

## Terminal Integration Examples

### AI Workflow: Daily Email Summary

```bash
# 1. Get unread emails from last 24 hours
curl -X POST http://localhost:3939/api/emails/search \
  -H "Content-Type: application/json" \
  -d '{"accountId": "acc-123", "query": "is:unread newer_than:1d", "maxResults": 50}'

# 2. Process with AI (external)
# ...

# 3. Mark as read
curl -X POST http://localhost:3939/api/emails/batch \
  -d '{"accountId": "acc-123", "action": "markRead", "messageIds": ["msg1", "msg2"]}'
```

### AI Workflow: Auto-Reply Detection

```bash
# 1. Search for emails needing response
curl -X POST http://localhost:3939/api/emails/search \
  -d '{"accountId": "acc-123", "query": "is:unread from:client@important.com"}'

# 2. Get full email content
curl http://localhost:3939/api/emails/acc-123/msg-456

# 3. Send AI-drafted reply
curl -X POST http://localhost:3939/api/emails/send \
  -d '{
    "accountId": "acc-123",
    "to": "client@important.com",
    "subject": "Re: Your inquiry",
    "html": "<p>AI-generated response...</p>"
  }'
```

---

## References

- Gmail API Research: `D:\Reference\gmail-api-research\2025-12-29-gmail-api-capabilities.md`
- Outlook Features: `D:\Projects\ai-command-center\docs\research\outlook-features.md`
- Current Email Component: `src/components/email/Email.jsx`
- Google Account Service: `electron/services/googleAccountService.cjs`
- API Server: `electron/services/apiServer.cjs`

---

**End of Plan**
