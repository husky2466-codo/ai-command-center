# Phase 5: Knowledge & Chat

**Status**: Not Started
**Timeline**: Weeks 12-13
**Priority**: P1 (High)
**Estimated Effort**: 10 days

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [06-KNOWLEDGE.md](../components/06-KNOWLEDGE.md) | [07-CHAT.md](../components/07-CHAT.md)

---

## Design Review Checkpoint

### Knowledge Design Requirements
- [ ] Module accent: Cyan `--module-knowledge` (#06b6d4)
- [ ] Folder tree uses indentation and expand/collapse icons
- [ ] Tag chips use softer color variants
- [ ] SparkFile has distinct "quick capture" feel
- [ ] Three-panel layout is balanced

### Chat Design Requirements
- [ ] Module accent: Gold `--module-chat` (#ffd700)
- [ ] Memory Lane bar uses gradient (cyan to purple)
- [ ] User messages: `--bg-card` (#2d2d4a), right-aligned
- [ ] Assistant messages: `--bg-secondary` (#252540), left-aligned
- [ ] Send button uses `--accent-gold` (#ffd700)
- [ ] Code blocks have syntax highlighting

### End of Phase 5 Design Checklist
- [ ] Folder tree is intuitive and expandable
- [ ] Markdown renders correctly in articles and chat
- [ ] Memory Lane bar is non-intrusive when collapsed
- [ ] Chat messages have clear visual distinction
- [ ] Quick actions (Spark, Remind) are accessible
- [ ] No hardcoded colors in Knowledge or Chat CSS

---

## Overview

Phase 5 builds the knowledge capture (second brain) and chat interface systems. Knowledge provides auto-filing with AI-suggested folders, tag extraction, and SparkFile for quick ideas. Chat wraps Claude with Memory Lane integration, bringing the memory system to life in conversations.

## Objectives

1. Build Knowledge base with folder tree
2. Implement auto-filing and tag extraction
3. Create SparkFile for quick capture
4. Build Chat interface with Memory Lane bar
5. Add slash command autocomplete
6. Implement session management
7. Create quick actions (Spark, Remind)

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 5 DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From Phase 1:                                                  │
│  • SQLite with knowledge_folders, knowledge_articles tables    │
│  • MarkdownEditor component                                    │
│  • EmbeddingService for semantic search                        │
│                                                                 │
│  From Phase 2:                                                  │
│  • useMemoryRetrieval hook                                     │
│  • MemoryLaneBar component                                     │
│  • Memory retrieval system                                     │
│                                                                 │
│  From Phase 3:                                                  │
│  • ReminderService for Quick Remind                            │
│  • SparkService for Quick Spark                                │
│                                                                 │
│  External Dependencies:                                         │
│  • Claude API (chat, auto-filing, tagging)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Task Checklist

### Week 12: Knowledge System

#### Knowledge Structure (Day 1)
- [ ] Create `src/components/knowledge/` directory
- [ ] Create `src/components/knowledge/KnowledgeApp.jsx`
  - [ ] Three-panel layout: folders, list, content
  - [ ] State for selected folder and article
- [ ] Create `src/components/knowledge/KnowledgeApp.css`
- [ ] Define default folders
  ```javascript
  const DEFAULT_FOLDERS = [
    'Articles', 'Code Snippets', 'Content Ideas', 'Courses',
    'Frameworks', 'Newsletters', 'Research', 'Resources',
    'Social Media', 'SparkFile', 'Stories', 'Tools', 'Transcripts'
  ];
  ```

#### Folder Tree (Days 1-2)
- [ ] Create `src/components/knowledge/FolderTree.jsx`
  - [ ] Recursive folder rendering
  - [ ] Expand/collapse
  - [ ] Click to select
  - [ ] Drag-drop articles into folders
- [ ] Create `src/components/knowledge/FolderItem.jsx`
  - [ ] Folder icon, name, article count
  - [ ] Context menu (rename, delete)
- [ ] Create `src/components/knowledge/FolderModal.jsx`
  - [ ] Create/rename folder
  - [ ] Parent folder selector

#### Article List (Day 2)
- [ ] Create `src/components/knowledge/ArticleList.jsx`
  - [ ] List articles in selected folder
  - [ ] Search/filter input
  - [ ] Sort by date, title
- [ ] Create `src/components/knowledge/ArticleListItem.jsx`
  - [ ] Title, date, tag preview
  - [ ] Spark indicator
  - [ ] Source URL indicator

#### Article View/Edit (Days 3-4)
- [ ] Create `src/components/knowledge/ArticleView.jsx`
  - [ ] Rendered markdown content
  - [ ] Header with title, date, source link
  - [ ] Tags with click-to-filter
  - [ ] Share suggestions
  - [ ] Edit button
- [ ] Create `src/components/knowledge/ArticleEditor.jsx`
  - [ ] Title input
  - [ ] MarkdownEditor for content
  - [ ] Tag input (chip-style)
  - [ ] Source URL input
  - [ ] Folder selector
  - [ ] Auto-save with debounce

#### Auto-Filing & Tagging (Day 4)
- [ ] Create `src/components/knowledge/AutoFileSuggestion.jsx`
  - [ ] Display suggested folder
  - [ ] Accept/reject buttons
- [ ] Implement `suggestFolder(content)` in KnowledgeService
  - [ ] Use AI to analyze content
  - [ ] Match to existing folders
- [ ] Create `src/components/knowledge/TagExtractor.jsx`
  - [ ] Extract tags button
  - [ ] Show suggestions for review
- [ ] Implement `extractTags(content)` in KnowledgeService

#### Share Suggestions (Day 5)
- [ ] Create `src/components/knowledge/ShareSuggestions.jsx`
  - [ ] "Who might be interested?"
  - [ ] Display suggested contacts
- [ ] Implement `suggestContacts(article)` in KnowledgeService
  - [ ] Match content to contact interests

### SparkFile

#### SparkFile Components (Day 5)
- [ ] Create `src/components/sparkfile/` directory
- [ ] Create `src/components/sparkfile/SparkFile.jsx`
  - [ ] Quick capture container
- [ ] Create `src/components/sparkfile/SparkInput.jsx`
  - [ ] Single-line input
  - [ ] Auto-focus, instant add
  - [ ] Keyboard shortcut
- [ ] Create `src/components/sparkfile/SparkList.jsx`
  - [ ] List all sparks
  - [ ] Expand, file, delete actions
- [ ] Create `src/services/SparkService.js`
  - [ ] `addSpark(content)`
  - [ ] `getSparks()`
  - [ ] `promoteToArticle(sparkId)`

### Week 13: Chat Interface

#### Chat Structure (Day 6)
- [ ] Create `src/components/chat/` directory
- [ ] Create `src/components/chat/ChatApp.jsx`
  - [ ] Layout: Memory Lane bar > Messages > Input
  - [ ] State for session, messages
- [ ] Create `src/components/chat/ChatApp.css`

#### Memory Lane Bar (Day 6)
- [ ] Enhance `src/components/chat/MemoryLaneBar.jsx`
  - [ ] Display memory count badges
  - [ ] Expandable on click
  - [ ] Compact default mode
- [ ] Enhance `src/components/chat/MemoryCard.jsx`
  - [ ] Feedback buttons
  - [ ] Source display

#### Message List (Days 7-8)
- [ ] Create `src/components/chat/MessageList.jsx`
  - [ ] Scroll container with auto-scroll
  - [ ] Render messages
  - [ ] Loading state
- [ ] Create `src/components/chat/Message.jsx`
  - [ ] User/assistant styling
  - [ ] Markdown rendering
  - [ ] Code block syntax highlighting
- [ ] Create `src/components/chat/ToolCallDisplay.jsx`
  - [ ] Collapsed: "Used X tools"
  - [ ] Expanded: Tool list with results

#### Chat Input (Day 8)
- [ ] Create `src/components/chat/ChatInput.jsx`
  - [ ] Multi-line textarea
  - [ ] Send button
  - [ ] Token counter
  - [ ] Image attachment
- [ ] Create `src/components/chat/TokenCounter.jsx`
  - [ ] Estimate tokens
  - [ ] Warning color at limit

#### Slash Commands (Day 9)
- [ ] Create `src/components/chat/SlashCommandMenu.jsx`
  - [ ] Trigger on "/"
  - [ ] Filter as typing
  - [ ] Keyboard navigation
- [ ] Define commands:
  - [ ] `/projects`, `/reminders`, `/spark`, `/search`, `/memory`
- [ ] Load custom commands from .claude/commands/

#### Session Management (Day 9)
- [ ] Create `src/components/chat/SessionSidebar.jsx`
  - [ ] List past sessions
  - [ ] New session button
  - [ ] Search
- [ ] Create `src/components/chat/SessionListItem.jsx`
  - [ ] Preview, date, count
- [ ] Implement session persistence in ChatService

#### Quick Actions & Chat Service (Day 10)
- [ ] Create `src/components/chat/QuickActionBar.jsx`
  - [ ] Quick Spark button
  - [ ] Remind Me button
  - [ ] Attach Image button
- [ ] Implement Quick Spark flow
  - [ ] Select text -> Spark -> save
- [ ] Implement Remind Me flow
  - [ ] Select text -> modal -> create reminder
- [ ] Create `src/services/ChatService.js`
  - [ ] `sendMessage(content, sessionId)`
  - [ ] `streamResponse()` - Handle streaming
  - [ ] `getHistory(sessionId)`
  - [ ] `createSession()`
  - [ ] `injectMemories(query)` - Format for context

## Deliverables

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 5 DELIVERABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Knowledge System                                               │
│  ├─ Folder tree with nesting                                   │
│  ├─ Article list with search                                   │
│  ├─ Article view and editor                                    │
│  ├─ Auto-filing suggestions                                    │
│  ├─ Tag extraction                                             │
│  ├─ Share suggestions                                          │
│  └─ Embedding generation for search                            │
│                                                                 │
│  SparkFile                                                      │
│  ├─ Quick spark input                                          │
│  ├─ Spark list with actions                                    │
│  └─ Promote to article                                         │
│                                                                 │
│  Chat Interface                                                 │
│  ├─ Message list with markdown                                 │
│  ├─ Memory Lane bar with retrieval                             │
│  ├─ Memory feedback integration                                │
│  ├─ Slash command autocomplete                                 │
│  ├─ Session management                                         │
│  ├─ Token counter                                              │
│  └─ Quick actions (Spark, Remind)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Auto-filing inaccuracy | Medium | Low | User review before save |
| Chat streaming issues | Low | Medium | Fallback to non-streaming |
| Token counting inaccuracy | Low | Low | Rough estimate is fine |

## Success Criteria

- [ ] Can create and organize articles in folders
- [ ] Auto-filing suggests appropriate folder
- [ ] Tags extracted and editable
- [ ] SparkFile captures and promotes ideas
- [ ] Chat displays messages with markdown
- [ ] Memory Lane bar shows relevant memories
- [ ] Feedback updates memory rankings
- [ ] Slash commands work with autocomplete
- [ ] Sessions persist across restarts
- [ ] Quick actions create sparks/reminders

## Files Created/Modified

### New Files (~30)
```
src/components/knowledge/KnowledgeApp.jsx
src/components/knowledge/KnowledgeApp.css
src/components/knowledge/FolderTree.jsx
src/components/knowledge/FolderItem.jsx
src/components/knowledge/FolderModal.jsx
src/components/knowledge/ArticleList.jsx
src/components/knowledge/ArticleListItem.jsx
src/components/knowledge/ArticleView.jsx
src/components/knowledge/ArticleEditor.jsx
src/components/knowledge/AutoFileSuggestion.jsx
src/components/knowledge/TagExtractor.jsx
src/components/knowledge/ShareSuggestions.jsx
src/services/KnowledgeService.js
src/components/sparkfile/SparkFile.jsx
src/components/sparkfile/SparkFile.css
src/components/sparkfile/SparkInput.jsx
src/components/sparkfile/SparkList.jsx
src/services/SparkService.js
src/components/chat/ChatApp.jsx
src/components/chat/ChatApp.css
src/components/chat/MessageList.jsx
src/components/chat/Message.jsx
src/components/chat/ToolCallDisplay.jsx
src/components/chat/ChatInput.jsx
src/components/chat/TokenCounter.jsx
src/components/chat/SlashCommandMenu.jsx
src/components/chat/SessionSidebar.jsx
src/components/chat/SessionListItem.jsx
src/components/chat/QuickActionBar.jsx
src/components/chat/ModelSelector.jsx
src/services/ChatService.js
```

### Modified Files (~3)
```
src/App.jsx - Add Knowledge and Chat routes
src/components/chat/MemoryLaneBar.jsx - Enhance with feedback
src/components/chat/MemoryCard.jsx - Add feedback buttons
```

## Agent Assignment

- Primary: `electron-react-dev`

---
**Notes**: Knowledge and Chat are where users spend significant time. Auto-filing should feel magical - reducing cognitive load. Chat with Memory Lane integration is the payoff for all the memory work. The AI should feel like it genuinely knows you.
