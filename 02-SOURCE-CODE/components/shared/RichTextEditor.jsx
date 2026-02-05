import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Code,
  Quote
} from 'lucide-react';
import './RichTextEditor.css';

/**
 * RichTextEditor Component
 *
 * A TipTap-based rich text editor with dark theme styling.
 * Provides formatting toolbar with common text formatting options.
 *
 * @param {Object} props
 * @param {string} props.content - HTML content to display/edit
 * @param {Function} props.onChange - Callback when content changes (receives HTML string)
 * @param {string} props.placeholder - Placeholder text when editor is empty
 * @param {boolean} props.editable - Whether the editor is editable
 * @param {boolean} props.showHeadings - Show heading buttons in toolbar
 * @param {boolean} props.showCodeBlock - Show code block button in toolbar
 * @param {boolean} props.showBlockquote - Show blockquote button in toolbar
 * @param {string} props.minHeight - Minimum height of the editor
 * @param {string} props.maxHeight - Maximum height of the editor (enables scroll)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Label text above the editor
 * @param {string} props.error - Error message to display
 */
function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  showHeadings = false,
  showCodeBlock = false,
  showBlockquote = false,
  minHeight = '200px',
  maxHeight = '400px',
  className = '',
  label,
  error
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: showHeadings ? { levels: [1, 2, 3] } : false,
        codeBlock: showCodeBlock,
        blockquote: showBlockquote
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'rte-link'
        }
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: 'rte-image'
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    }
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editable state when prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Link handling
  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl || 'https://');

    if (url === null) {
      return; // Cancelled
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const containerClasses = [
    'rte-container',
    error && 'rte-has-error',
    !editable && 'rte-readonly',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label className="rte-label">{label}</label>
      )}

      {/* Toolbar */}
      {editable && (
        <div className="rte-toolbar">
          {/* Text Formatting */}
          <div className="rte-toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`rte-toolbar-btn ${editor.isActive('bold') ? 'rte-toolbar-btn-active' : ''}`}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
            >
              <Bold size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`rte-toolbar-btn ${editor.isActive('italic') ? 'rte-toolbar-btn-active' : ''}`}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
            >
              <Italic size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`rte-toolbar-btn ${editor.isActive('underline') ? 'rte-toolbar-btn-active' : ''}`}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
            >
              <UnderlineIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`rte-toolbar-btn ${editor.isActive('strike') ? 'rte-toolbar-btn-active' : ''}`}
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <Strikethrough size={18} />
            </button>
          </div>

          {/* Headings (optional) */}
          {showHeadings && (
            <div className="rte-toolbar-group">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`rte-toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'rte-toolbar-btn-active' : ''}`}
                title="Heading 1"
                aria-label="Heading 1"
              >
                <Heading1 size={18} />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`rte-toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'rte-toolbar-btn-active' : ''}`}
                title="Heading 2"
                aria-label="Heading 2"
              >
                <Heading2 size={18} />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`rte-toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'rte-toolbar-btn-active' : ''}`}
                title="Heading 3"
                aria-label="Heading 3"
              >
                <Heading3 size={18} />
              </button>
            </div>
          )}

          {/* Lists */}
          <div className="rte-toolbar-group">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`rte-toolbar-btn ${editor.isActive('bulletList') ? 'rte-toolbar-btn-active' : ''}`}
              title="Bullet List"
              aria-label="Bullet List"
            >
              <List size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`rte-toolbar-btn ${editor.isActive('orderedList') ? 'rte-toolbar-btn-active' : ''}`}
              title="Numbered List"
              aria-label="Numbered List"
            >
              <ListOrdered size={18} />
            </button>
          </div>

          {/* Code Block (optional) */}
          {showCodeBlock && (
            <div className="rte-toolbar-group">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`rte-toolbar-btn ${editor.isActive('codeBlock') ? 'rte-toolbar-btn-active' : ''}`}
                title="Code Block"
                aria-label="Code Block"
              >
                <Code size={18} />
              </button>
            </div>
          )}

          {/* Blockquote (optional) */}
          {showBlockquote && (
            <div className="rte-toolbar-group">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`rte-toolbar-btn ${editor.isActive('blockquote') ? 'rte-toolbar-btn-active' : ''}`}
                title="Quote"
                aria-label="Quote"
              >
                <Quote size={18} />
              </button>
            </div>
          )}

          {/* Links */}
          <div className="rte-toolbar-group">
            <button
              type="button"
              onClick={setLink}
              className={`rte-toolbar-btn ${editor.isActive('link') ? 'rte-toolbar-btn-active' : ''}`}
              title="Add Link"
              aria-label="Add Link"
            >
              <LinkIcon size={18} />
            </button>
            {editor.isActive('link') && (
              <button
                type="button"
                onClick={removeLink}
                className="rte-toolbar-btn"
                title="Remove Link"
                aria-label="Remove Link"
              >
                <Unlink size={18} />
              </button>
            )}
          </div>

          {/* Undo/Redo */}
          <div className="rte-toolbar-group rte-toolbar-group-right">
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="rte-toolbar-btn"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="rte-toolbar-btn"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div
        className="rte-content"
        style={{
          minHeight,
          maxHeight,
          overflowY: 'auto'
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Error Message */}
      {error && (
        <span className="rte-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

RichTextEditor.propTypes = {
  content: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  editable: PropTypes.bool,
  showHeadings: PropTypes.bool,
  showCodeBlock: PropTypes.bool,
  showBlockquote: PropTypes.bool,
  minHeight: PropTypes.string,
  maxHeight: PropTypes.string,
  className: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string
};

export default RichTextEditor;
