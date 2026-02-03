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
import ResizableImage from 'tiptap-extension-resize-image';
import CodeBlock from '@tiptap/extension-code-block';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Mention from '@tiptap/extension-mention';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link2, Undo, Redo, Image as ImageIcon, Heading1, Heading2, Type, Code, Minus, CheckSquare, Palette } from 'lucide-react';
import { useState, useCallback } from 'react';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  attendees?: string[];
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

export default function TipTapEditor({ value, onChange, placeholder = 'Start typing...', disabled = false, attendees = [] }: TipTapEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Mention suggestion configuration
  const mentionSuggestion = useCallback(() => ({
    items: ({ query }: { query: string }) => {
      return attendees
        .filter(person => person.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
    },
    render: () => {
      let popup: HTMLDivElement;
      
      return {
        onStart: (props: any) => {
          popup = document.createElement('div');
          popup.className = 'mention-suggestions';
          popup.style.cssText = 'position: absolute; background: white; border: 1px solid #e2e8f0; border-radius: 0.375rem; padding: 0.25rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 1000;';
          
          props.items.forEach((item: string, index: number) => {
            const button = document.createElement('button');
            button.textContent = item;
            button.className = 'mention-item';
            button.style.cssText = 'display: block; width: 100%; text-align: left; padding: 0.5rem; border-radius: 0.25rem; background: transparent; border: none; cursor: pointer;';
            button.onmouseover = () => button.style.background = '#f3f4f6';
            button.onmouseout = () => button.style.background = 'transparent';
            button.onclick = () => props.command({ id: item });
            popup.appendChild(button);
          });
          
          document.body.appendChild(popup);
        },
        onUpdate: (props: any) => {
          // Update position and content
        },
        onKeyDown: (props: any) => {
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
  }), [attendees]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Using custom CodeBlock
        horizontalRule: false, // Using custom HorizontalRule
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
      }),
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
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        
        for (const item of Array.from(items)) {
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                editor?.chain().focus().setImage({ src: base64 }).run();
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
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
            className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Bold"
            type="button"
          >
            <Bold size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Italic"
            type="button"
          >
            <Italic size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Underline"
            type="button"
          >
            <UnderlineIcon size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Text Styles */}
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('paragraph') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Normal Text"
            type="button"
          >
            <Type size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Heading 1"
            type="button"
          >
            <Heading1 size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Heading 2"
            type="button"
          >
            <Heading2 size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Bullet List"
            type="button"
          >
            <List size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Numbered List"
            type="button"
          >
            <ListOrdered size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Task List"
            type="button"
          >
            <CheckSquare size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Code & Blocks */}
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded transition-colors ${editor.isActive('codeBlock') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Code Block"
            type="button"
          >
            <Code size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Horizontal Line"
            type="button"
          >
            <Minus size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Link & Media */}
          <button
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={`p-1.5 rounded transition-colors ${editor.isActive('link') ? 'bg-green-600 text-white' : 'hover:bg-gray-200'}`}
            title="Add Link"
            type="button"
          >
            <Link2 size={16} />
          </button>
          
          <button
            onClick={() => {
              const url = window.prompt('Enter image URL (or paste image with Ctrl+V):');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Insert Image"
            type="button"
          >
            <ImageIcon size={16} />
          </button>
          
          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Text Color"
              type="button"
            >
              <Palette size={16} />
            </button>
            
            {showColorPicker && (
              <div 
                className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg p-3 z-50"
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
          >
            <Undo size={16} />
          </button>
          
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Redo"
            type="button"
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
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin: 0.25rem 0;
          display: list-item;
        }
        .ProseMirror ul:not([data-type="taskList"]) li {
          list-style: disc;
          list-style-position: outside;
        }
        .ProseMirror ol li {
          list-style: decimal;
          list-style-position: outside;
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
          outline: 2px solid #009646;
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
          align-items: flex-start;
          gap: 0.5rem;
        }
        .ProseMirror ul[data-type="taskList"] li label {
          flex: 0 0 auto;
          margin-top: 0.25rem;
        }
        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
          cursor: pointer;
        }
        .ProseMirror .mention {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.1rem 0.3rem;
          border-radius: 0.25rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
