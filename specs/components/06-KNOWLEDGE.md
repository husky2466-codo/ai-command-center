# Knowledge System

**Status**: Not Started
**Priority**: P2 (Medium)
**Estimated Effort**: 6 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup required
- `specs/features/EMBEDDING-SYSTEM.md` - For semantic search
- `specs/features/SHARED-COMPONENTS.md` - MarkdownEditor, Modal
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Cyan `--module-knowledge` (#06b6d4)
- **Visual Theme**: Second brain, folder organization, auto-filing

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-knowledge` | #06b6d4 |
| Card backgrounds | `--bg-card` | #2d2d4a |
| Folder icons | `--module-knowledge` | #06b6d4 |
| Tags | Various by category | Context-dependent |
| SparkFile accent | `--accent-gold` | #ffd700 |

### Tag Colors (suggested)
```css
/* Tags can use softer versions of module colors */
.tag-code { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.tag-research { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
.tag-ideas { background: rgba(236, 72, 153, 0.2); color: #ec4899; }
.tag-resources { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
```

### Icon Style
- Line art, 2px stroke weight
- Knowledge icons: folder, file-text, tag, search, bookmark
- SparkFile icons: zap, lightbulb, plus

### Layout Pattern - Three Panel
```
+-------------+------------------+----------------------------+
| FOLDERS     | ARTICLE LIST     | ARTICLE CONTENT            |
|             |                  |                            |
| > Articles  | [Search...]      | # How to Use Git           |
|   > Code    |                  | Created: Dec 29, 2025      |
|   > Design  | [Git Guide]      | Tags: [code] [git]         |
| > Research  | [CSS Tips]       +----------------------------+
| > Ideas     | [React Hooks]    | ## Introduction            |
| > SparkFile |                  | Git is a version control...|
|             | [+ New Article]  |                            |
+-------------+------------------+----------------------------+
```

### Component Specifics
- **Folder Tree**: Indented, expandable, drag-drop target
- **Article List**: Title, date, tag preview
- **Article View**: Rendered markdown, tag chips, source link
- **SparkFile**: Minimal list with quick expand option
- **Auto-file Suggestion**: Inline suggestion bar

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Cyan accent for module highlights
- [ ] Folder tree is intuitive and expandable
- [ ] Markdown renders correctly
- [ ] Tags are clickable for filtering
- [ ] SparkFile feels instant

---

## Overview

The Knowledge system is a "second brain" for capturing and organizing information. It features auto-filing based on content analysis, tag extraction, and relationship suggestions ("who would be interested in this?"). The system organizes content into a folder hierarchy and includes a SparkFile for quick idea capture.

## Acceptance Criteria

- [ ] Folder tree navigation with nested folders
- [ ] Document view with markdown rendering and editing
- [ ] Create articles with title, content, source URL, tags
- [ ] Auto-filing suggests folder based on content analysis
- [ ] Auto-tag extraction from content
- [ ] Relationship suggestions ("Share with: Alex? Beth?")
- [ ] SparkFile for quick idea capture (single-line sparks)
- [ ] Search across all articles (title, content, tags)
- [ ] Embedding generation for semantic search

## Tasks

### Section 1: Component Structure
- [ ] Create `src/components/knowledge/` directory
  - [ ] Create `KnowledgeApp.jsx` - Main container (sidebar + content)
  - [ ] Create `KnowledgeApp.css` - Knowledge styles
- [ ] Implement three-panel or sidebar layout

### Section 2: Folder Tree
- [ ] Create `FolderTree.jsx`
  - [ ] Recursive folder rendering
  - [ ] Expand/collapse folders
  - [ ] Click to select/filter
  - [ ] Drag-drop articles into folders
- [ ] Create `FolderItem.jsx`
  - [ ] Folder icon, name, article count
  - [ ] Context menu (rename, delete)
- [ ] Create `FolderModal.jsx`
  - [ ] Create/rename folder
  - [ ] Parent folder selector

### Section 3: Article List
- [ ] Create `ArticleList.jsx`
  - [ ] List articles in selected folder
  - [ ] Search/filter input
  - [ ] Sort options (date, title)
- [ ] Create `ArticleListItem.jsx`
  - [ ] Title, date, tag preview
  - [ ] Spark indicator if is_spark
  - [ ] Source URL indicator

### Section 4: Article View/Edit
- [ ] Create `ArticleView.jsx`
  - [ ] Markdown rendered content
  - [ ] Header with title, date, source link
  - [ ] Tags display with click-to-filter
  - [ ] "Share with" suggestions
  - [ ] Edit button toggle
- [ ] Create `ArticleEditor.jsx`
  - [ ] Title input
  - [ ] MarkdownEditor for content
  - [ ] Tag input (chip-style)
  - [ ] Source URL input
  - [ ] Folder selector
  - [ ] Auto-save with debounce

### Section 5: Auto-Filing System
- [ ] Create `AutoFileSuggestion.jsx`
  - [ ] Display suggested folder
  - [ ] Accept/reject buttons
  - [ ] Manual folder override
- [ ] Implement `suggestFolder(content)` function
  - [ ] Use AI to analyze content
  - [ ] Match to existing folders
  - [ ] Return top 3 suggestions with confidence

### Section 6: Auto-Tag Extraction
- [ ] Create `TagExtractor.jsx`
  - [ ] Extract tags button
  - [ ] Display extracted tags for review
  - [ ] Add/remove before saving
- [ ] Implement `extractTags(content)` function
  - [ ] Use AI to identify key topics/themes
  - [ ] Return array of suggested tags

### Section 7: Relationship Suggestions
- [ ] Create `ShareSuggestions.jsx`
  - [ ] "Who might be interested?"
  - [ ] Display suggested contacts
  - [ ] Click to open email/message draft
- [ ] Implement `suggestContacts(article)` function
  - [ ] Match article content/tags to contact interests
  - [ ] Use contact context fields
  - [ ] Return top 3 contacts

### Section 8: SparkFile
- [ ] Create `src/components/sparkfile/` directory
  - [ ] Create `SparkFile.jsx` - Quick capture list
  - [ ] Create `SparkFile.css` - Spark styles
- [ ] Create `SparkInput.jsx`
  - [ ] Single-line input
  - [ ] Auto-focus, quick add
  - [ ] Keyboard shortcut trigger
- [ ] Create `SparkList.jsx`
  - [ ] List all sparks (is_spark = true)
  - [ ] Quick actions: expand, file, delete
  - [ ] "Expand to Article" button
- [ ] Implement spark -> article promotion

### Section 9: Knowledge Service
- [ ] Create `src/services/KnowledgeService.js`
  - [ ] CRUD for folders and articles
  - [ ] `search(query)` - Full-text search
  - [ ] `getByFolder(folderId)` - Articles in folder
  - [ ] `suggestFolder(content)` - AI filing
  - [ ] `extractTags(content)` - AI tagging
  - [ ] `generateEmbedding(article)` - Create embedding
- [ ] Create `src/services/SparkService.js`
  - [ ] `addSpark(content)` - Quick add
  - [ ] `getSparks()` - List sparks
  - [ ] `promoteToArticle(sparkId)` - Convert to full article

### Section 10: Embedding Integration
- [ ] Generate embeddings on article create/update
- [ ] Store in embedding BLOB column
- [ ] Enable semantic search via embedding similarity

### Section 11: Default Folders
- [ ] Create default folders on first run:
  ```javascript
  const DEFAULT_FOLDERS = [
    'Articles', 'Code Snippets', 'Content Ideas', 'Courses',
    'Frameworks', 'Newsletters', 'Research', 'Resources',
    'Social Media', 'SparkFile', 'Stories', 'Tools', 'Transcripts'
  ];
  ```
- [ ] Check for empty database and seed

## Technical Details

### Files to Create
- `src/components/knowledge/KnowledgeApp.jsx` - Main container
- `src/components/knowledge/KnowledgeApp.css` - Styles
- `src/components/knowledge/FolderTree.jsx` - Folder navigation
- `src/components/knowledge/FolderItem.jsx` - Single folder
- `src/components/knowledge/FolderModal.jsx` - Create/edit folder
- `src/components/knowledge/ArticleList.jsx` - Article list
- `src/components/knowledge/ArticleListItem.jsx` - Article preview
- `src/components/knowledge/ArticleView.jsx` - View/render
- `src/components/knowledge/ArticleEditor.jsx` - Edit mode
- `src/components/knowledge/AutoFileSuggestion.jsx` - AI filing
- `src/components/knowledge/TagExtractor.jsx` - AI tagging
- `src/components/knowledge/ShareSuggestions.jsx` - Contact suggestions
- `src/components/sparkfile/SparkFile.jsx` - Spark container
- `src/components/sparkfile/SparkFile.css` - Spark styles
- `src/components/sparkfile/SparkInput.jsx` - Quick input
- `src/components/sparkfile/SparkList.jsx` - Spark list
- `src/services/KnowledgeService.js` - Article/folder logic
- `src/services/SparkService.js` - Spark capture

### Files to Modify
- `src/App.jsx` - Add Knowledge to router

### Database Tables Used
```sql
SELECT * FROM knowledge_folders;
SELECT * FROM knowledge_articles;

-- With parent folder
SELECT a.*, f.name as folder_name
FROM knowledge_articles a
LEFT JOIN knowledge_folders f ON a.folder_id = f.id;
```

### IPC Channels
- `knowledge:get-folders` - List folders
- `knowledge:create-folder` - Create folder
- `knowledge:update-folder` - Update folder
- `knowledge:delete-folder` - Delete folder
- `knowledge:get-articles` - List articles (with filters)
- `knowledge:get-article` - Get single article
- `knowledge:create-article` - Create article
- `knowledge:update-article` - Update article
- `knowledge:delete-article` - Delete article
- `knowledge:search` - Search articles
- `knowledge:suggest-folder` - AI folder suggestion
- `knowledge:extract-tags` - AI tag extraction
- `knowledge:suggest-contacts` - Relationship suggestions
- `sparks:add` - Add spark
- `sparks:list` - List sparks
- `sparks:promote` - Convert to article
- `sparks:delete` - Delete spark

## Implementation Hints

- Use marked + DOMPurify for safe markdown rendering
- Folder tree should support deep nesting (3+ levels)
- Auto-file/tag can run in background after save
- SparkFile should feel instant - no loading states
- Tags stored as JSON array or comma-separated
- Consider QuickSpark keyboard shortcut from any module
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for KnowledgeService and SparkService
- [ ] Folder CRUD operations work
- [ ] Article CRUD operations work
- [ ] Nested folder navigation works
- [ ] Search returns relevant results
- [ ] Auto-file suggests appropriate folders
- [ ] Tag extraction identifies key topics
- [ ] Spark to article promotion works
- [ ] Markdown renders correctly
- [ ] Empty states handled gracefully

---
**Notes**: The key insight is "auto-filing without categorization decisions." The AI handles the cognitive load of deciding where things go. SparkFile is for "I need to capture this NOW" moments - friction-free, expand later.
