# Chat Interface

**Status**: Not Started
**Priority**: P0 (Critical)
**Estimated Effort**: 8 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup
- `specs/features/MEMORY-EXTRACTION.md` - Memory Lane integration
- `specs/features/DUAL-RETRIEVAL.md` - Memory retrieval
- `specs/features/SHARED-COMPONENTS.md` - MarkdownEditor
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Gold `--module-chat` (#ffd700)
- **Visual Theme**: Conversational, memory-aware, quick actions

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-chat` | #ffd700 |
| User messages | `--bg-card` | #2d2d4a |
| Assistant messages | `--bg-secondary` | #252540 |
| Memory Lane bar | Gradient cyan-purple | #06b6d4 -> #8b5cf6 |
| Send button | `--accent-gold` | #ffd700 |

### Message Styling
```css
/* User message - right aligned, card background */
.user-message {
  background: var(--bg-card);
  border-radius: 12px 12px 4px 12px;
  margin-left: auto;
}

/* Assistant message - left aligned, secondary background */
.assistant-message {
  background: var(--bg-secondary);
  border-radius: 12px 12px 12px 4px;
}
```

### Icon Style
- Line art, 2px stroke weight
- Chat icons: message-circle, send, sparkles, bookmark
- Memory icons: brain, zap, search

### Layout Pattern
```
+--------------------------------------------------+
| MEMORY LANE BAR (collapsed)                      |
| [Entity: 3] [Semantic: 5]  [Expand]              |
+--------------------------------------------------+
|                                                   |
| [User message bubble]                             |
|                                                   |
|         [Assistant message bubble]                |
|                                                   |
| [User message bubble]                             |
|                                                   |
+--------------------------------------------------+
| [Spark] [Remind] [Attach]      [Input...] [Send] |
+--------------------------------------------------+
```

### Component Specifics
- **Memory Lane Bar**: Gradient background, badge counts
- **Memory Cards**: Type badge, confidence, expandable
- **Messages**: Rounded corners, markdown support
- **Code Blocks**: Syntax highlighted, copy button
- **Token Counter**: Subtle, warning at limit

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Gold accent for send button
- [ ] Memory Lane bar is non-intrusive
- [ ] Messages have clear visual distinction
- [ ] Code blocks syntax highlighted
- [ ] Input auto-resizes

---

## Overview

The Chat interface is the primary interaction point with Claude. It wraps Claude Code (or direct Claude API) with enhanced features: Memory Lane bar showing retrieved memories, slash command autocomplete, tool call visibility, session management, and quick actions (Quick Spark, Remind Me). Every conversation benefits from the memory system.

## Acceptance Criteria

- [ ] Chat messages display with proper formatting (markdown, code blocks)
- [ ] Memory Lane bar shows relevant memories for current context
- [ ] Memory cards expandable with feedback buttons (thumbs up/down)
- [ ] Slash command autocomplete (/, then show available commands)
- [ ] Tool call display with expand/collapse
- [ ] Session management (new, history, resume)
- [ ] Token counter in input area
- [ ] Quick actions: Quick Spark, Remind Me, Attach Image
- [ ] Model selector (claude-sonnet-4, claude-opus, etc.)
- [ ] Auto-save conversation history

## Tasks

### Section 1: Component Structure
- [ ] Create `src/components/chat/` directory
  - [ ] Create `ChatApp.jsx` - Main container
  - [ ] Create `ChatApp.css` - Chat-specific styles
- [ ] Implement vertical layout: Memory Lane bar > Messages > Input

### Section 2: Memory Lane Bar
- [ ] Create `MemoryLaneBar.jsx`
  - [ ] Display memory count badges (entity, semantic)
  - [ ] Expandable on click
  - [ ] Compact mode showing counts only
- [ ] Create `MemoryCard.jsx`
  - [ ] Memory type badge (correction, decision, etc.)
  - [ ] Confidence percentage
  - [ ] Title and preview
  - [ ] Expand to show full content + source
  - [ ] Feedback buttons (thumbs up/down)
- [ ] Integrate with useMemoryRetrieval hook
  - [ ] Trigger retrieval on input change (debounced)
  - [ ] Update displayed memories

### Section 3: Message List
- [ ] Create `MessageList.jsx`
  - [ ] Scroll container with auto-scroll
  - [ ] Render user and assistant messages
  - [ ] Show loading state during response
- [ ] Create `Message.jsx`
  - [ ] User message styling
  - [ ] Assistant message styling
  - [ ] Markdown rendering for content
  - [ ] Code block syntax highlighting
- [ ] Create `ToolCallDisplay.jsx`
  - [ ] Collapsed: "Used X tools"
  - [ ] Expanded: List of tool calls with results
  - [ ] Status indicators (success/error)

### Section 4: Chat Input
- [ ] Create `ChatInput.jsx`
  - [ ] Multi-line textarea with auto-resize
  - [ ] Send button
  - [ ] Token counter display
  - [ ] Slash command trigger detection
  - [ ] Image attachment button
- [ ] Create `TokenCounter.jsx`
  - [ ] Estimate tokens from input text
  - [ ] Display formatted count
  - [ ] Warning color when approaching limit

### Section 5: Slash Command Autocomplete
- [ ] Create `SlashCommandMenu.jsx`
  - [ ] Trigger on "/" in input
  - [ ] Filter commands as user types
  - [ ] Keyboard navigation (up/down/enter)
  - [ ] Display command name and description
- [ ] Define available commands:
  - [ ] `/projects` - Navigate to projects
  - [ ] `/reminders` - Navigate to reminders
  - [ ] `/spark` - Quick spark capture
  - [ ] `/search` - Search knowledge base
  - [ ] `/memory` - Search memories
  - [ ] Custom agent commands from .claude/commands/

### Section 6: Session Management
- [ ] Create `SessionSidebar.jsx`
  - [ ] List past sessions
  - [ ] New session button
  - [ ] Session search
- [ ] Create `SessionListItem.jsx`
  - [ ] First message preview
  - [ ] Date, message count
  - [ ] Click to load session
- [ ] Implement session persistence
  - [ ] Save messages to chat_sessions + chat_messages tables
  - [ ] Load session on resume
  - [ ] Track token usage per session

### Section 7: Quick Actions
- [ ] Create `QuickActionBar.jsx`
  - [ ] Quick Spark button (capture idea to SparkFile)
  - [ ] Remind Me button (create reminder from selection)
  - [ ] Attach Image button (for Vision)
- [ ] Implement Quick Spark flow
  - [ ] Select text -> click Spark -> save to SparkFile
- [ ] Implement Remind Me flow
  - [ ] Select text -> click Remind -> open reminder modal

### Section 8: Chat Service
- [ ] Create `src/services/ChatService.js`
  - [ ] `sendMessage(content, sessionId)` - Send to Claude API
  - [ ] `streamResponse()` - Handle streaming response
  - [ ] `getHistory(sessionId)` - Get session messages
  - [ ] `createSession()` - Start new session
  - [ ] `injectMemories(query)` - Get relevant memories for context
  - [ ] `countTokens(text)` - Estimate token count

### Section 9: Memory Injection
- [ ] Implement memory context injection
  - [ ] Before sending message, retrieve relevant memories
  - [ ] Format memories as system context
  - [ ] Track which memories were injected
- [ ] Log memory recalls to session_recalls table
- [ ] Enable memory feedback to update rankings

### Section 10: Model Selection
- [ ] Create `ModelSelector.jsx`
  - [ ] Dropdown with available models
  - [ ] Claude Sonnet 4, Claude Opus, etc.
  - [ ] Show pricing/speed indicators
- [ ] Persist model selection in settings
- [ ] Pass model to API calls

### Section 11: Session Todo List
- [ ] Create `SessionTodos.jsx`
  - [ ] Display todo items from current session
  - [ ] Checkbox for completion
  - [ ] Auto-extract from assistant responses
- [ ] Parse assistant messages for todo items
- [ ] Store in session metadata

## Technical Details

### Files to Create
- `src/components/chat/ChatApp.jsx` - Main container
- `src/components/chat/ChatApp.css` - Styles
- `src/components/chat/MemoryLaneBar.jsx` - Memory display
- `src/components/chat/MemoryCard.jsx` - Individual memory
- `src/components/chat/MessageList.jsx` - Message container
- `src/components/chat/Message.jsx` - Single message
- `src/components/chat/ToolCallDisplay.jsx` - Tool calls
- `src/components/chat/ChatInput.jsx` - Input area
- `src/components/chat/TokenCounter.jsx` - Token display
- `src/components/chat/SlashCommandMenu.jsx` - Command autocomplete
- `src/components/chat/SessionSidebar.jsx` - Session list
- `src/components/chat/SessionListItem.jsx` - Session preview
- `src/components/chat/QuickActionBar.jsx` - Quick actions
- `src/components/chat/ModelSelector.jsx` - Model dropdown
- `src/components/chat/SessionTodos.jsx` - Session todos
- `src/services/ChatService.js` - Chat logic

### Files to Modify
- `src/App.jsx` - Add Chat to router

### Database Tables Used
```sql
SELECT * FROM chat_sessions;
SELECT * FROM chat_messages;
SELECT * FROM session_recalls;
SELECT * FROM memory_feedback;

-- Messages for a session
SELECT * FROM chat_messages
WHERE session_id = ?
ORDER BY created_at;
```

### IPC Channels
- `chat:send-message` - Send message to Claude
- `chat:create-session` - Start new session
- `chat:get-sessions` - List sessions
- `chat:get-messages` - Get session messages
- `chat:save-message` - Persist message
- `chat:retrieve-memories` - Get relevant memories
- `chat:log-recall` - Log memory recall
- `chat:feedback` - Submit memory feedback
- `chat:count-tokens` - Estimate tokens

## Implementation Hints

- Use fetch with streaming for Claude API responses
- Token counting can use tiktoken library or rough estimation
- Memory Lane bar should feel non-intrusive (collapsed by default)
- Slash commands should be extensible (load from .claude/commands/)
- Consider keyboard shortcuts: Cmd+Enter to send, Cmd+K for new session
- Message auto-scroll should pause if user scrolls up
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for ChatService methods
- [ ] Messages render with proper formatting
- [ ] Streaming responses display incrementally
- [ ] Memory retrieval returns relevant memories
- [ ] Feedback updates memory rankings
- [ ] Session persistence works across app restarts
- [ ] Slash command autocomplete filters correctly
- [ ] Token counter estimates accurately
- [ ] Quick actions trigger correct flows
- [ ] Error handling for API failures

---
**Notes**: The Chat is where Memory Lane comes alive. Users should see that the AI "remembers" their preferences and decisions. The Memory Lane bar provides transparency into what context is being used. Quick actions reduce friction for common captures.
