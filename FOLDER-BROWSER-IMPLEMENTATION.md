# Folder Browser Implementation

This document summarizes the folder browser feature implementation for the Projects module.

## Files Created

### 1. Custom Hook: `src/components/projects/hooks/useFolderTree.js`
- Manages folder tree state (expanded paths, loading paths, contents cache, errors)
- Provides methods: `toggleFolder()`, `loadDirectory()`, `clearCache()`
- Lazy loads directory contents on expand
- Caches loaded directories to avoid redundant API calls

### 2. Tree Component: `src/components/projects/FolderTree.jsx`
- Recursive tree rendering component
- Displays folders with ChevronRight, Folder/FolderOpen icons
- Displays files with appropriate icons based on extension
  - FileCode: .js, .jsx, .ts, .tsx, .py, .html, .css, etc.
  - FileJson: .json
  - FileText: .md, .txt, .yml, .yaml
  - FileImage: .png, .jpg, .svg, etc.
- Shows loading spinners and error messages
- Handles empty folders

### 3. Browser Component: `src/components/projects/FolderBrowser.jsx`
- Main container component
- Shows header with "Folder Tree" title and truncated path
- Loads root directory on mount
- Displays loading/error states
- Shows truncation notice when directory has >100 items

### 4. Styles: `src/components/projects/FolderBrowser.css`
- Dark theme styling matching AI Command Center design
- Gold accent for folders (--accent-gold)
- Hover states with elevated backgrounds
- Smooth chevron rotation animation
- Custom scrollbar styling
- Nested indentation with border-left guides

## Key Features

1. **Lazy Loading**: Directories are only loaded when expanded
2. **Caching**: Once loaded, directory contents are cached
3. **Error Handling**: Shows error messages for failed loads
4. **Truncation**: Limits to 100 items per directory, shows count
5. **Icons**: File-type-specific icons for better UX
6. **Performance**: Efficient state management with Maps and Sets

## Integration

To use in a project detail view:

```jsx
import FolderBrowser from './FolderBrowser';

<FolderBrowser fsPath={project.fs_path} projectId={project.id} />
```

## API Dependency

Requires `window.electronAPI.listDirectoryDetailed(path)` to return:

```javascript
{
  success: true,
  items: [
    { name: 'file.txt', path: '/full/path/file.txt', isDirectory: false, size: 1024 },
    { name: 'folder', path: '/full/path/folder', isDirectory: true }
  ],
  truncated: false,
  totalCount: 42
}
```

## Next Steps

- Integrate into ProjectDetailsView component
- Add file click handlers (open in editor, copy path, etc.)
- Add context menu for files/folders
- Add search/filter functionality
- Add file type badges or additional metadata
