# Gmail Quick Start Guide

## Getting Started with Email in AI Command Center

The Gmail integration is already built and ready to use. Follow these simple steps to connect your Gmail account and start managing emails.

## 1. Connect Your Google Account

### First Time Setup

1. **Launch AI Command Center**
2. **Click the "Email" tab** in the sidebar
3. **Click "Add Account" or "Connect Google Account"** button
4. **Sign in to Google** in the browser window that opens:
   - Choose your Google account
   - Click "Allow" when asked for Gmail permissions
   - The app will automatically redirect back
5. **Wait for initial sync** (typically 10-30 seconds for first 100 emails)
6. **Start using email!**

### What Permissions Are Needed?

The app requests these Gmail API scopes:
- **gmail.readonly** - Read your emails
- **gmail.send** - Send emails on your behalf
- **gmail.modify** - Mark as read, star, apply labels
- **gmail.labels** - Manage labels/folders

Your credentials are stored securely on your local machine and never sent to any third party.

## 2. Reading Emails

### Basic Navigation

- **Folders:** Click Inbox, Sent, Starred, Drafts, Trash in the left sidebar
- **Select Email:** Click any email in the list to read full content
- **Next/Previous:** Use `J` and `K` keyboard shortcuts (Gmail-style)
- **Mark as Read:** Email is automatically marked as read after 2 seconds (configurable in Settings)

### Viewing Email Details

When you click an email, you'll see:
- Full email body (HTML or plain text)
- Sender information with avatar
- Recipient list (To, Cc)
- Date and time
- Labels/tags
- Attachments (if any)

## 3. Composing Emails

### Write a New Email

1. **Click "Compose" button** (or press `C`)
2. **Fill in the form:**
   - To: Recipient email address
   - Subject: Email subject line
   - Body: Your message
3. **Optional: Add attachments** (click paperclip icon)
4. **Optional: Apply signature** (select from dropdown)
5. **Click "Send"** (or press `Ctrl+Enter`)

### Reply to Email

1. **Open the email** you want to reply to
2. **Click "Reply" button** (or press `R`)
3. **Type your response**
4. **Click "Send"**

The reply will automatically:
- Include the original sender as recipient
- Add "Re:" to the subject
- Preserve the email thread

### Forward Email

1. **Open the email** you want to forward
2. **Click "Forward" button** (or press `F`)
3. **Enter recipient email**
4. **Optional: Add your message** above the quoted content
5. **Click "Send"**

## 4. Organizing Emails

### Star Important Emails

- **Click the star icon** next to any email
- **Or press `S`** when email is selected
- **View all starred:** Click "Starred" folder in sidebar

### Apply Labels (Tags)

1. **Right-click an email**
2. **Select "Apply Label"**
3. **Choose from existing labels** or create new one
4. **Label appears as colored tag** on the email

### Move to Trash

- **Click trash icon** next to email
- **Or press `#` (Delete key)** when email is selected
- **Restore from trash:** Go to Trash folder, click "Restore"

### Permanently Delete

1. **Go to Trash folder**
2. **Select email(s)**
3. **Click "Delete Forever"**
4. ⚠️ **This cannot be undone**

## 5. Searching Emails

### Simple Search

- **Click the search bar** at top of email list
- **Type keywords** (searches subject, sender, body)
- **Press Enter**

### Advanced Search (Gmail Syntax)

Click "Advanced Search" button to use Gmail's powerful query syntax:

**Examples:**
- `from:john@example.com` - Emails from John
- `subject:meeting` - Subject contains "meeting"
- `has:attachment` - Emails with attachments
- `is:unread` - Unread emails only
- `after:2024/12/01` - Sent after Dec 1
- `from:john subject:report` - Combine filters

**Operators:**
- `OR` - Match either condition
- `-` - Exclude (e.g., `-from:spam@example.com`)
- `" "` - Exact phrase match

### Save Searches

1. **Create an advanced search**
2. **Click "Save Search"**
3. **Name your search** (e.g., "Unread from Boss")
4. **Access later** from "Saved Searches" dropdown

## 6. Email Templates

### Use a Template

1. **Click "Compose"**
2. **Click "Templates" button**
3. **Select a template** from the list
4. **Template content loads** into compose form
5. **Edit as needed** and send

### Create a Template

1. **Click "Templates" in Email settings**
2. **Click "New Template"**
3. **Fill in:**
   - Name (e.g., "Meeting Request")
   - Category (optional)
   - Subject line
   - Body content
4. **Click "Save"**

**Pro Tip:** Use placeholders like `{name}` in templates, then replace manually when composing.

## 7. Email Signatures

### Set Up Signature

1. **Click Settings (gear icon)** in Email tab
2. **Go to "Signatures"**
3. **Click "New Signature"**
4. **Fill in:**
   - Name (e.g., "Work Signature")
   - Content (your signature text)
5. **Check "Set as default"** if you want it auto-inserted
6. **Click "Save"**

### Use Multiple Signatures

- Create different signatures for different contexts (work, personal, etc.)
- Select signature from dropdown when composing
- Set different defaults for new emails vs. replies

## 8. Keyboard Shortcuts

**Navigation:**
- `J` - Next email
- `K` - Previous email
- `/` - Focus search bar
- `Escape` - Close email viewer

**Actions:**
- `C` - Compose new email
- `R` - Reply to selected email
- `F` - Forward selected email
- `S` - Star/unstar
- `#` - Move to trash
- `!` - Mark as spam

**Composition:**
- `Ctrl+Enter` - Send email
- `Escape` - Close compose modal
- `Tab` - Next field

**Selection:**
- `Shift+Click` - Select range
- `Ctrl+Click` - Toggle individual email
- `Ctrl+A` - Select all visible

**View Shortcuts:**
- Press `?` to show full shortcuts help

## 9. Syncing Emails

### Manual Sync

- **Click "Sync" button** at top of email list
- **Wait for completion** (progress indicator appears)
- **New emails appear** at top of list

### Automatic Sync

The app uses **incremental sync** to stay up-to-date efficiently:
- Only fetches changes since last sync (not entire inbox)
- Much faster than full sync after first time
- Preserves Gmail history ID for accuracy

### Sync Settings

In Email Settings, configure:
- **Sync frequency** (on demand, every 5/15/30 mins, hourly)
- **Max emails to fetch** (default: 100)
- **Auto-sync on app start** (on/off)

## 10. Settings

Access settings by clicking the **gear icon** in Email tab.

### Available Settings

**Reading Pane:**
- Position: Right, Bottom, Off
- Mark as read delay: 0-10 seconds

**Compose:**
- Default format: Plain text or HTML
- Default signature
- Always Cc/Bcc yourself

**Sync:**
- Frequency: Manual, 5 min, 15 min, 30 min, hourly
- Max results per sync

**Keyboard Shortcuts:**
- Enable/disable shortcuts
- Customize key bindings (future)

## 11. Multi-Select & Batch Operations

### Select Multiple Emails

1. **Click checkbox** on first email
2. **Hold Shift + Click** on last email to select range
3. **Or Ctrl+Click** individual emails

### Batch Actions

When multiple emails are selected:
- **Mark All Read** - Mark all selected as read
- **Mark All Unread** - Mark all as unread
- **Star All** - Star all selected
- **Trash All** - Move all to trash
- **Apply Label** - Apply label to all

## 12. Troubleshooting

### Emails Not Syncing

1. **Check internet connection**
2. **Verify account is connected** (go to Settings → Accounts)
3. **Try manual sync** (click Sync button)
4. **Check Google account permissions** (may need to re-authorize)

### "Account Not Found" Error

- The selected account was removed or disconnected
- **Solution:** Re-add the Google account

### Attachments Not Downloading

1. **Check file permissions** (downloads folder)
2. **Verify attachment exists** (may have been removed from original email)
3. **Try downloading again** (click download icon)

### Slow Performance

1. **Limit sync results** (Settings → Max emails to fetch → 50)
2. **Archive old emails** (in Gmail web, not the app)
3. **Clear app cache** (Settings → Advanced → Clear Cache)

## 13. Privacy & Security

### Where Is Data Stored?

- **Emails:** Local SQLite database on your computer
  - Location: `%APPDATA%\ai-command-center\database.db`
  - Not synchronized to cloud
  - Only accessible by this app

- **Credentials:** OAuth tokens stored locally
  - Location: `~/.config/ai-command-center/google-credentials.json`
  - Encrypted at rest
  - Auto-refresh before expiry

### What Data Is Sent?

- **To Google:** Only API requests for sync, send, delete operations
- **To Third Parties:** Nothing. All data stays local.

### How to Revoke Access

1. **In the app:**
   - Settings → Accounts → Click account → "Remove Account"

2. **In Google:**
   - Visit https://myaccount.google.com/permissions
   - Find "AI Command Center"
   - Click "Remove Access"

## 14. Tips & Best Practices

### Speed Up Workflows

- **Learn keyboard shortcuts** (`?` for help)
- **Use templates** for common emails
- **Save frequently-used searches**
- **Set up labels** for organization

### Stay Organized

- **Star important emails** for quick access
- **Use labels** instead of folders (emails can have multiple labels)
- **Archive, don't delete** (keeps emails searchable)
- **Create smart searches** (e.g., "Unread from team@company.com")

### Compose Better Emails

- **Use templates** for consistency
- **Add signatures** for professionalism
- **Preview before sending** (especially HTML emails)
- **Double-check recipients** (no undo send yet!)

### Manage Large Inboxes

- **Sync incrementally** (don't fetch entire history)
- **Use advanced search** to find specific emails
- **Archive read emails** to keep inbox clean
- **Unsubscribe from newsletters** (do this in Gmail web)

## 15. Keyboard Shortcuts Reference Card

### Navigation
| Key | Action |
|-----|--------|
| `J` | Next email |
| `K` | Previous email |
| `G + I` | Go to Inbox |
| `G + S` | Go to Starred |
| `G + D` | Go to Drafts |
| `/` | Search |
| `Escape` | Close viewer |

### Actions
| Key | Action |
|-----|--------|
| `C` | Compose |
| `R` | Reply |
| `A` | Reply all |
| `F` | Forward |
| `S` | Star/unstar |
| `#` | Trash |
| `!` | Mark spam |
| `E` | Archive |

### Selection
| Key | Action |
|-----|--------|
| `X` | Select email |
| `Shift+Click` | Select range |
| `Ctrl+A` | Select all |
| `*+A` | Select all |
| `*+N` | Deselect all |

### Composition
| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Send |
| `Ctrl+Shift+C` | Add Cc |
| `Ctrl+Shift+B` | Add Bcc |
| `Escape` | Discard |

## Need More Help?

- **View logs:** `%APPDATA%\ai-command-center\logs\combined-YYYY-MM-DD.log`
- **Report bugs:** GitHub Issues
- **Feature requests:** GitHub Discussions

---

**Happy Emailing!** 📧
