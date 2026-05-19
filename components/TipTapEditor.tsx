/**
 * Stable Rich Text Editor Component
 * Uses TipTap - a reliable, professional-grade editor
 * Reusable across the entire application
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import BoldExtension from '@tiptap/extension-bold';
import ItalicExtension from '@tiptap/extension-italic';
import ResizableImage from 'tiptap-extension-resize-image';
import CodeBlock from '@tiptap/extension-code-block';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Mention from '@tiptap/extension-mention';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Typography from '@tiptap/extension-typography';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link2, Undo, Redo, Image as ImageIcon, Heading1, Heading2, Type, Code, Minus, CheckSquare, Palette, Table as TableIcon, Columns, Rows, Trash2, Plus, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Person } from '@/types';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  people?: Person[]; // Changed from attendees: string[]
  attendees?: unknown[]; // For backward compatibility
}

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#f30047' },
  { name: 'Green', value: '#009646' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Yellow', value: '#f6c400' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Gray', value: '#64748b' },
];

export default function TipTapEditor({ value, onChange, placeholder = 'Start typing...', disabled = false, people = [] }: TipTapEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isInTable, setIsInTable] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Mention suggestion configuration
  const mentionSuggestion = useCallback(() => ({
    items: ({ query }: { query: string }) => {
      return people
        .filter(person => 
          person.displayName.toLowerCase().includes(query.toLowerCase()) ||
          person.email.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
        .map(p => ({ 
          id: p.email, 
          label: p.displayName 
        }));
    },
    render: () => {
      let popup: HTMLDivElement;
      
      return {
        onStart: (props: { items: Array<{ id: string; label: string }>; command: (item: { id: string; label: string }) => void }) => {
          popup = document.createElement('div');
          popup.className = 'mention-suggestions';
          popup.style.cssText = 'position: absolute; background: white; border: 1px solid #e2e8f0; border-radius: 0.375rem; padding: 0.25rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999;';
          
          props.items.forEach((item: { id: string; label: string }) => {
            const button = document.createElement('button');
            button.textContent = item.label;
            button.className = 'mention-item';
            button.style.cssText = 'display: block; width: 100%; text-align: left; padding: 0.5rem; border-radius: 0.25rem; background: transparent; border: none; cursor: pointer;';
            button.onmouseover = () => button.style.background = '#f3f4f6';
            button.onmouseout = () => button.style.background = 'transparent';
            button.onclick = () => props.command(item);
            popup.appendChild(button);
          });
          
          document.body.appendChild(popup);
        },
        onUpdate: (props: { items: unknown[] }) => {
          // Update position
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === 'Escape') {
            popup?.remove();
            return true;
          }
          return false;
        },
        onExit: () => {
          popup?.remove();
        },
      };
    },
  }), [people]);

  // Image compression utility
  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Skip compression for images under 500KB
      const SIZE_THRESHOLD = 500 * 1024; // 500KB in bytes
      
      if (file.size < SIZE_THRESHOLD) {
        console.log('[Image Upload] Skipping compression - file under 500KB', {
          size: `${(file.size / 1024).toFixed(0)}KB`,
        });
        
        // Just convert to base64 without compression
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
        return;
      }
      
      // Compress images 500KB and above
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Calculate new dimensions (max 1200px width/height)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }
          
          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with 90% quality (higher quality for better text readability)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.9);
          
          console.log('[Image Compression]', {
            originalSize: `${(file.size / 1024).toFixed(0)}KB`,
            originalDimensions: `${img.width}x${img.height}`,
            newDimensions: `${width}x${height}`,
            compressedSize: `${(compressedBase64.length / 1024).toFixed(0)}KB`,
            reduction: `${(100 - (compressedBase64.length / file.size * 100)).toFixed(0)}%`
          });
          
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Using custom CodeBlock
        horizontalRule: false, // Using custom HorizontalRule
        bold: false, // Using custom Bold extension
        italic: false, // Using custom Italic extension
      }),
      BoldExtension,
      ItalicExtension,
      Typography,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      ResizableImage,
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      TextStyle,
      Color,
      HorizontalRule,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: mentionSuggestion(),
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'tiptap-table-row',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'tiptap-table-header',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'tiptap-table-cell',
        },
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Only call onChange if content actually changed
      if (html !== value) {
        // Use setTimeout to avoid updating parent during render
        setTimeout(() => onChange(html), 0);
      }
      // Update table state
      setIsInTable(editor.isActive('table'));
    },
    onSelectionUpdate: ({ editor }) => {
      // Update table state on selection change
      setIsInTable(editor.isActive('table'));
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Handle Enter key on empty list items to un-indent
        if (event.key === 'Enter' && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          
          // Check if we're in a list item
          const listItem = $from.node($from.depth - 1);
          const isList = listItem?.type.name === 'listItem';
          
          if (isList) {
            // Check if the list item is empty
            const listItemContent = listItem?.textContent || '';
            if (listItemContent.trim() === '') {
              // Check if we can lift (un-indent)
              if (editor?.can().liftListItem('listItem')) {
                event.preventDefault();
                editor?.chain().focus().liftListItem('listItem').run();
                return true;
              }
            }
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        
        // Check for images in clipboard
        for (const item of Array.from(items)) {
          if (item.type.indexOf('image') !== -1) {
            // Prevent default paste behavior
            event.preventDefault();
            event.stopPropagation();
            
            const file = item.getAsFile();
            if (file) {
              // Compress image before inserting
              compressImage(file)
                .then((compressedBase64) => {
                  if (editor) {
                    editor.chain().focus().insertContent({ type: 'imageResize', attrs: { src: compressedBase64, alt: 'Image' } }).run();
                  }
                })
                .catch(() => {
                  // Fallback to uncompressed if compression fails
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    if (editor) {
                      editor.chain().focus().insertContent({ type: 'imageResize', attrs: { src: base64, alt: 'Image' } }).run();
                    }
                  };
                  reader.readAsDataURL(file);
                });
            }
            return true; // Handled - don't continue with default paste
          }
        }
        
        return false; // Not an image, allow default paste
      },
    },
  });

  if (editor && editor.getHTML() !== value && !editor.isFocused) {
    editor.commands.setContent(value);
  }

  if (editor && editor.isEditable !== !disabled) {
    editor.setEditable(!disabled);
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
      {!disabled && (
        <div className="flex items-center gap-1 p-2 border-b flex-wrap" style={{ borderColor: 'var(--color-border)', backgroundColor: '#f8fafc' }}>
          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('bold') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Bold"
            type="button"
            tabIndex={-1}
          >
            <Bold size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('italic') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Italic"
            type="button"
            tabIndex={-1}
          >
            <Italic size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('underline') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Underline"
            type="button"
            tabIndex={-1}
          >
            <UnderlineIcon size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Text Styles */}
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('paragraph') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('paragraph') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Normal Text"
            type="button"
            tabIndex={-1}
          >
            <Type size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('heading', { level: 1 }) ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Heading 1"
            type="button"
            tabIndex={-1}
          >
            <Heading1 size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('heading', { level: 2 }) ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Heading 2"
            type="button"
            tabIndex={-1}
          >
            <Heading2 size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('bulletList') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Bullet List"
            type="button"
            tabIndex={-1}
          >
            <List size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('orderedList') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Numbered List"
            type="button"
            tabIndex={-1}
          >
            <ListOrdered size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('taskList') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Task List"
            type="button"
            tabIndex={-1}
          >
            <CheckSquare size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Code & Blocks */}
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('codeBlock') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('codeBlock') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Code Block"
            type="button"
            tabIndex={-1}
          >
            <Code size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Horizontal Line"
            type="button"
            tabIndex={-1}
          >
            <Minus size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Link & Media */}
          <button
            onClick={() => {
              setLinkUrl('');
              setShowLinkDialog(true);
            }}
            className={`p-1.5 rounded transition-colors ${editor.isActive('link') ? 'text-white' : 'hover:bg-gray-200'}`}
            style={editor.isActive('link') ? { backgroundColor: 'var(--color-primary)' } : {}}
            title="Add Link"
            type="button"
            tabIndex={-1}
          >
            <Link2 size={16} />
          </button>
          
          <button
            onClick={() => {
              setImageUrl('');
              setShowImageDialog(true);
            }}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Insert Image"
            type="button"
            tabIndex={-1}
          >
            <ImageIcon size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Table - Only show insert button when NOT in a table */}
          {!isInTable && (
            <button
              onClick={() => {
                editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
              }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Insert Table"
              type="button"
              tabIndex={-1}
            >
              <TableIcon size={16} />
            </button>
          )}
          
          {/* Table Controls - Show when cursor is in a table */}
          {isInTable && (
            <>
              <button
                onClick={() => editor.chain().addColumnBefore().run()}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs"
                title="Add Column Before"
                type="button"
                tabIndex={-1}
              >
                <ArrowLeftToLine size={16} />
              </button>
              
              <button
                onClick={() => editor.chain().addColumnAfter().run()}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs"
                title="Add Column After"
                type="button"
                tabIndex={-1}
              >
                <ArrowRightToLine size={16} />
              </button>
              
              <button
                onClick={() => editor.chain().deleteColumn().run()}
                className="p-1.5 rounded hover:bg-red-100 transition-colors text-red-600"
                title="Delete Column"
                type="button"
                tabIndex={-1}
              >
                <Columns size={16} />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              <button
                onClick={() => editor.chain().addRowBefore().run()}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs"
                title="Add Row Before"
                type="button"
                tabIndex={-1}
              >
                <ArrowUpToLine size={16} />
              </button>
              
              <button
                onClick={() => editor.chain().addRowAfter().run()}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs"
                title="Add Row After"
                type="button"
                tabIndex={-1}
              >
                <ArrowDownToLine size={16} />
              </button>
              
              <button
                onClick={() => editor.chain().deleteRow().run()}
                className="p-1.5 rounded hover:bg-red-100 transition-colors text-red-600"
                title="Delete Row"
                type="button"
                tabIndex={-1}
              >
                <Rows size={16} />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              <button
                onClick={() => editor.chain().deleteTable().run()}
                className="p-1.5 rounded hover:bg-red-100 transition-colors text-red-600"
                title="Delete Table"
                type="button"
                tabIndex={-1}
              >
                <Trash2 size={16} />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
            </>
          )}
          
          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Text Color"
              type="button"
              tabIndex={-1}
            >
              <Palette size={16} />
            </button>
            
            {showColorPicker && (
              <div 
                className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg p-3 z-[9999]"
                style={{ borderColor: 'var(--color-border)', minWidth: '180px' }}
              >
                <div className="text-xs font-medium mb-2 text-gray-600">Text Color</div>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(color.value).run();
                        setShowColorPicker(false);
                      }}
                      className="w-8 h-8 rounded border-2 hover:scale-110 transition-all"
                      style={{ 
                        backgroundColor: color.value,
                        borderColor: 'var(--color-border)'
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowColorPicker(false);
                  }}
                  className="w-full mt-2 px-2 py-1 text-xs border rounded hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Reset Color
                </button>
              </div>
            )}
          </div>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Undo/Redo */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Undo"
            type="button"
            tabIndex={-1}
          >
            <Undo size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Redo"
            type="button"
            tabIndex={-1}
          >
            <Redo size={16} />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div style={{ 
        backgroundColor: disabled ? '#f9fafb' : '#ffffff',
        maxWidth: '100%',
        overflow: 'hidden',
      }}>
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-4 focus:outline-none"
          style={{
            minHeight: '200px',
            maxWidth: '100%',
            overflow: 'auto',
          }}
        />
      </div>
      
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .ProseMirror > *:first-child {
          margin-top: 0 !important;
        }
        .ProseMirror > *:last-child {
          margin-bottom: 0 !important;
        }
        .ProseMirror ul > li:first-child,
        .ProseMirror ol > li:first-child {
          margin-top: 0 !important;
        }
        .ProseMirror ul > li:last-child,
        .ProseMirror ol > li:last-child {
          margin-bottom: 0 !important;
        }
        .ProseMirror li > p:first-child {
          margin-top: 0 !important;
        }
        .ProseMirror li > p:last-child {
          margin-bottom: 0 !important;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror ul:not([data-type="taskList"]) {
          list-style-type: disc;
        }
        /* Nested bullet list styling - alternating colors */
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) {
          list-style-type: circle !important; /* Second level - white/hollow circle */
        }
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) > li {
          list-style-type: circle !important;
        }
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) {
          list-style-type: disc !important; /* Third level - back to disc */
        }
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) > li {
          list-style-type: disc !important;
        }
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) {
          list-style-type: circle !important; /* Fourth level - circle again */
        }
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) > li {
          list-style-type: circle !important;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin: 0.25rem 0;
          display: list-item;
          min-height: 1.5em; /* Ensure list items have minimum height */
        }
        .ProseMirror ul:not([data-type="taskList"]) li {
          list-style: disc;
          list-style-position: outside;
        }
        /* Override for nested levels - alternating bullet styles */
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) > li {
          list-style: circle !important;
          list-style-position: outside;
        }
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) > li {
          list-style: disc !important;
          list-style-position: outside;
        }
        .ProseMirror ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) > li {
          list-style: circle !important;
          list-style-position: outside;
        }
        .ProseMirror ol li {
          list-style: decimal;
          list-style-position: outside;
        }
        /* Fix cursor visibility in empty list items - multiple approaches */
        .ProseMirror li:empty::after,
        .ProseMirror li p:empty::after {
          content: '';
          display: inline-block;
          width: 0;
          height: 1em;
          vertical-align: top;
        }
        .ProseMirror li br:only-child::after {
          content: '';
          display: inline-block;
          width: 0;
        }
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror strong {
          font-weight: 600;
        }
        .ProseMirror em {
          font-style: italic;
        }
        .ProseMirror u {
          text-decoration: underline;
        }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
        }
        .ProseMirror h1 {
          font-size: 1.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
        }
        .ProseMirror h3 {
          font-size: 1.1rem;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
          cursor: pointer;
        }
        .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
        .ProseMirror .resize-cursor {
          cursor: nwse-resize;
        }
        .ProseMirror pre {
          background: #f1f5f9;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          overflow-x: auto;
          margin: 0.75rem 0;
          border: 1px solid #e2e8f0;
          max-width: 100%;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .ProseMirror pre code {
          background: transparent;
          padding: 0;
          color: #1e293b;
          white-space: pre-wrap;
        }
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 1.5rem 0;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: baseline;
          gap: 0;
          min-height: 1.5em;
        }
        .ProseMirror ul[data-type="taskList"] li label {
          width: 1.5rem;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          translate: 0 0.1em;
        }
        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
          cursor: pointer;
        }
        .ProseMirror ul[data-type="taskList"] li > div,
        .ProseMirror ul[data-type="taskList"] li > p {
          cursor: text;
          flex: 1;
        }
        .ProseMirror ul[data-type="taskList"] li > div:empty::after,
        .ProseMirror ul[data-type="taskList"] li > p:empty::after {
          content: '\\u200B';
          display: inline;
        }
        .ProseMirror .mention {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.1rem 0.3rem;
          border-radius: 0.25rem;
          font-weight: 500;
        }
        /* Table styles */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
          background: white;
        }
        .ProseMirror table th {
          font-weight: 600;
          text-align: left;
          background-color: #f8fafc;
        }
        .ProseMirror table .selectedCell {
          background: #e0f2fe;
        }
        .ProseMirror table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: var(--color-primary);
          pointer-events: none;
        }
        .ProseMirror table p {
          margin: 0;
        }
      `}</style>
      
      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[10000]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} onClick={() => setShowLinkDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Insert Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border rounded-md mb-4"
              style={{ borderColor: 'var(--color-border)' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && linkUrl.trim()) {
                  editor.chain().focus().setLink({ href: linkUrl }).run();
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }
                if (e.key === 'Escape') {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }}
                className="px-4 py-2 rounded-md border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (linkUrl.trim()) {
                    editor.chain().focus().setLink({ href: linkUrl }).run();
                    setShowLinkDialog(false);
                    setLinkUrl('');
                  }
                }}
                disabled={!linkUrl.trim()}
                className="px-4 py-2 rounded-md text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[10000]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} onClick={() => setShowImageDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Insert Image</h3>
            
            {/* File Upload Option */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Upload from device
              </label>
              <label className="w-full px-3 py-2 border rounded-md text-sm cursor-pointer inline-block text-center"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Compress and insert image
                    compressImage(file)
                      .then((compressedBase64) => {
                        editor.chain().focus().insertContent({ type: 'imageResize', attrs: { src: compressedBase64, alt: 'Image' } }).run();
                        setShowImageDialog(false);
                        setImageUrl('');
                      })
                        .catch(() => {
                          // Fallback to uncompressed if compression fails
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const base64 = e.target?.result as string;
                          editor.chain().focus().insertContent({ type: 'imageResize', attrs: { src: base64, alt: 'Image' } }).run();
                          setShowImageDialog(false);
                          setImageUrl('');
                        };
                        reader.readAsDataURL(file);
                        });
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>OR</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>
            
            {/* URL Option */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Insert from URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: 'var(--color-border)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && imageUrl.trim()) {
                    editor.chain().focus().insertContent({ type: 'imageResize', attrs: { src: imageUrl, alt: 'Image' } }).run();
                    setShowImageDialog(false);
                    setImageUrl('');
                  }
                  if (e.key === 'Escape') {
                    setShowImageDialog(false);
                    setImageUrl('');
                  }
                }}
              />
            </div>
            
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You can also paste an image with Ctrl+V in the editor
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl('');
                }}
                className="px-4 py-2 rounded-md border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (imageUrl.trim()) {
                    editor.chain().focus().insertContent({ type: 'imageResize', attrs: { src: imageUrl, alt: 'Image' } }).run();
                    setShowImageDialog(false);
                    setImageUrl('');
                  }
                }}
                disabled={!imageUrl.trim()}
                className="px-4 py-2 rounded-md text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
