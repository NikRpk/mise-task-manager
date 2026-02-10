'use client';

import { useRef, useState, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Code, 
  Palette,
  Link2,
  Image as ImageIcon,
} from 'lucide-react';
import AlertDialog from './AlertDialog';
import { sanitizeHTML } from '@/lib/sanitize';
import { logger } from '@/lib/logger';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const editingLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLinkTooltip, setShowLinkTooltip] = useState(false);
  const [linkTooltipPosition, setLinkTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isEditingExistingLink, setIsEditingExistingLink] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' | 'success' }>({ isOpen: false, title: '', message: '', type: 'info' });
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: null as 'ul' | 'ol' | null,
    codeBlock: false,
  });

  // 8 main colors
  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#f30047' },
    { name: 'Green', value: '#009646' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Yellow', value: '#f6c400' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Gray', value: '#64748b' },
  ];

  const applyListStyles = () => {
    if (!editorRef.current) return;
    
    // Apply inline styles to all lists to ensure proper formatting
    const lists = editorRef.current.querySelectorAll('ul, ol');
    lists.forEach((list) => {
      const el = list as HTMLElement;
      el.style.margin = '0.5rem 0';
      el.style.marginLeft = '0.5rem';
      el.style.paddingLeft = '1.25rem';
      el.style.display = 'block';
      
      // Set list style type
      if (el.tagName === 'UL') {
        el.style.listStyleType = 'disc';
      } else if (el.tagName === 'OL') {
        el.style.listStyleType = 'decimal';
      }
      
      // Check if it's a nested list
      if (el.parentElement && (el.parentElement.tagName === 'UL' || el.parentElement.tagName === 'OL' || el.parentElement.tagName === 'LI')) {
        el.style.marginTop = '0.25rem';
        el.style.marginBottom = '0.25rem';
        el.style.marginLeft = '0';
        el.style.paddingLeft = '1.25rem';
        
        // Nested lists use different bullet styles
        if (el.tagName === 'UL') {
          el.style.listStyleType = 'circle';
        }
      }
    });
    
    // Apply inline styles to all list items
    const items = editorRef.current.querySelectorAll('li');
    items.forEach((item) => {
      const el = item as HTMLElement;
      el.style.display = 'list-item';
      el.style.margin = '0.2rem 0';
      el.style.paddingLeft = '0.25rem';
      el.style.listStylePosition = 'outside';
    });
  };

  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      // Sanitize HTML before setting it to prevent XSS
      const sanitizedValue = sanitizeHTML(value);
      editorRef.current.innerHTML = sanitizedValue;
      applyListStyles();
    }
  }, [value]);

  // Check active formatting states
  const checkActiveFormats = () => {
    if (!editorRef.current) return;
    
    try {
      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');
      
      // Check if we're in a list
      let list: 'ul' | 'ol' | null = null;
      let codeBlock = false;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node: Node | null = range.commonAncestorContainer;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = (node as HTMLElement).tagName.toLowerCase();
            if (tagName === 'ul') {
              list = 'ul';
              break;
            } else if (tagName === 'ol') {
              list = 'ol';
              break;
            } else if (tagName === 'pre') {
              codeBlock = true;
              break;
            }
          }
          node = node.parentNode;
        }
      }
      
      setActiveFormats({
        bold,
        italic,
        underline,
        list,
        codeBlock,
      });
    } catch (error) {
      // Ignore errors
    }
  };

  // Update active formats on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      checkActiveFormats();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    try {
      document.execCommand(command, false, value || null);
      updateContent();
      setTimeout(() => checkActiveFormats(), 10);
    } catch (error) {
      logger.error('Command execution failed', error as Error, { command });
    }
  };

  const updateContent = () => {
    if (editorRef.current) {
      // Sanitize content before passing it up
      const content = editorRef.current.innerHTML;
      const sanitized = sanitizeHTML(content);
      onChange(sanitized);
    }
  };

  const handleInput = () => {
    applyListStyles();
    updateContent();
    checkActiveFormats();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    updateContent();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Tab/Shift+Tab for list indentation
    if (e.key === 'Tab' && editorRef.current) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      
      // Find if we're in a list item
      let listItem: HTMLElement | null = null;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName === 'LI') {
            listItem = el;
            break;
          }
        }
        node = node.parentNode;
      }

      if (listItem) {
        e.preventDefault();
        editorRef.current.focus();
        
        if (e.shiftKey) {
          // Shift+Tab: Outdent
          document.execCommand('outdent', false);
        } else {
          // Tab: Indent (creates nested list)
          document.execCommand('indent', false);
        }
        
        setTimeout(() => {
          applyListStyles();
          updateContent();
          checkActiveFormats();
        }, 10);
      }
    }
  };

  const handleListClick = (ordered: boolean) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection) return;
    
    // Check if we're already in a list
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range) return;
    
    let listElement: HTMLElement | null = null;
    let node: Node | null = range.commonAncestorContainer;
    
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'UL' || el.tagName === 'OL') {
          listElement = el;
          break;
        }
      }
      node = node.parentNode;
    }
    
    if (listElement) {
      // If already in a list, toggle it off
      document.execCommand('insertUnorderedList', false, undefined);
      document.execCommand('insertOrderedList', false, undefined);
    } else {
      // Create new list
      if (ordered) {
        document.execCommand('insertOrderedList', false, undefined);
      } else {
        document.execCommand('insertUnorderedList', false, undefined);
      }
    }
    
    // Apply inline styles to ensure proper formatting
    setTimeout(() => {
      applyListStyles();
      updateContent();
      checkActiveFormats();
    }, 10);
  };

  const handleCodeBlock = () => {
    if (!editorRef.current) return;
    
    try {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const node: Node | null = range.commonAncestorContainer;
      
      // Find if we're in a PRE block or a block element
      let codeBlockElement: HTMLElement | null = null;
      let blockElement: HTMLElement | null = null;
      let currentNode = node;
      
      while (currentNode && currentNode !== editorRef.current) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const el = currentNode as HTMLElement;
          if (el.tagName === 'PRE') {
            codeBlockElement = el;
            break;
          }
          if (['P', 'DIV', 'H1', 'H2', 'H3'].includes(el.tagName)) {
            blockElement = el;
          }
        }
        currentNode = currentNode.parentNode;
      }
      
      if (codeBlockElement) {
        // Convert PRE back to paragraph
        const p = document.createElement('p');
        // Convert newlines to <br> tags for paragraph
        const text = codeBlockElement.textContent || '';
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          p.appendChild(document.createTextNode(line));
          if (index < lines.length - 1) {
            p.appendChild(document.createElement('br'));
          }
        });
        codeBlockElement.parentNode?.replaceChild(p, codeBlockElement);
        
        // Move cursor
        const newRange = document.createRange();
        newRange.selectNodeContents(p);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else if (blockElement) {
        // Convert block element to PRE
        const pre = document.createElement('pre');
        // Apply inline styles to ensure they show up
        pre.style.backgroundColor = '#f1f5f9';
        pre.style.padding = '0.875rem';
        pre.style.borderRadius = '0.375rem';
        pre.style.fontFamily = "'Courier New', Courier, monospace";
        pre.style.fontSize = '13px';
        pre.style.margin = '0.75rem 0';
        pre.style.border = '1px solid #e2e8f0';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordWrap = 'break-word';
        pre.style.color = '#1e293b';
        pre.style.lineHeight = '1.5';
        pre.style.overflowX = 'auto';
        
        // Preserve line breaks by converting <br> tags to newlines
        const clonedElement = blockElement.cloneNode(true) as HTMLElement;
        const brs = clonedElement.querySelectorAll('br');
        brs.forEach(br => {
          const textNode = document.createTextNode('\n');
          br.parentNode?.replaceChild(textNode, br);
        });
        pre.textContent = clonedElement.textContent || '';
        blockElement.parentNode?.replaceChild(pre, blockElement);
        
        // Move cursor
        const newRange = document.createRange();
        newRange.selectNodeContents(pre);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Create new PRE if cursor is in editor root
        const pre = document.createElement('pre');
        pre.style.backgroundColor = '#f1f5f9';
        pre.style.padding = '0.875rem';
        pre.style.borderRadius = '0.375rem';
        pre.style.fontFamily = "'Courier New', Courier, monospace";
        pre.style.fontSize = '13px';
        pre.style.margin = '0.75rem 0';
        pre.style.border = '1px solid #e2e8f0';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordWrap = 'break-word';
        pre.style.color = '#1e293b';
        pre.style.lineHeight = '1.5';
        pre.style.overflowX = 'auto';
        
        if (range.collapsed) {
          pre.textContent = '\u200B'; // Zero-width space
        } else {
          // Extract contents and convert to text with preserved line breaks
          const fragment = range.cloneContents();
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(fragment);
          
          // Replace <br> tags with newlines
          const brs = tempDiv.querySelectorAll('br');
          brs.forEach(br => {
            const textNode = document.createTextNode('\n');
            br.parentNode?.replaceChild(textNode, br);
          });
          
          pre.textContent = tempDiv.textContent || '';
          range.deleteContents();
        }
        
        range.insertNode(pre);
        
        // Move cursor into PRE
        const newRange = document.createRange();
        newRange.selectNodeContents(pre);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      updateContent();
      setTimeout(() => checkActiveFormats(), 10);
    } catch (error) {
      logger.error('Code block formatting failed', error as Error);
    }
  };

  const handleLinkClick = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Save the current selection range
    savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    
    const selectedText = selection.toString();
    setLinkText(selectedText);
    setLinkUrl('');
    setShowLinkModal(true);
  };

  // Ensure URL has proper protocol
  const normalizeUrl = (url: string): string => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return '';
    
    // If it already has a protocol, return as is
    if (/^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl;
    }
    
    // Otherwise, add https://
    return `https://${trimmedUrl}`;
  };

  const insertLink = () => {
    if (!editorRef.current || !linkUrl) return;
    
    editorRef.current.focus();
    
    const normalizedUrl = normalizeUrl(linkUrl);
    
    if (isEditingExistingLink && editingLinkRef.current) {
      // Update existing link
      editingLinkRef.current.href = normalizedUrl;
      editingLinkRef.current.textContent = linkText || normalizedUrl;
      editingLinkRef.current = null;
    } else if (savedSelectionRef.current) {
      // Create new link
      const link = document.createElement('a');
      link.href = normalizedUrl;
      link.textContent = linkText || normalizedUrl;
      link.style.color = '#3b82f6';
      link.style.textDecoration = 'underline';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Restore the saved selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
        
        const range = savedSelectionRef.current;
        range.deleteContents();
        range.insertNode(link);
        
        // Move cursor after link
        range.setStartAfter(link);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      savedSelectionRef.current = null;
    }
    
    updateContent();
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    setIsEditingExistingLink(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;
    
    if (!file.type.startsWith('image/')) {
      setAlertDialog({
        isOpen: true,
        title: 'Invalid File',
        message: 'Please select an image file',
        type: 'warning',
      });
      return;
    }
    
    // Save the current selection before file reading
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.margin = '0.5rem 0';
      img.style.borderRadius = '0.375rem';
      
      editorRef.current?.focus();
      
      // Restore the saved selection
      const selection = window.getSelection();
      if (selection && savedSelectionRef.current) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
        
        const range = savedSelectionRef.current;
        range.insertNode(img);
        
        // Move cursor after image
        range.setStartAfter(img);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        savedSelectionRef.current = null;
      }
      
      updateContent();
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if user clicked on a link
    const target = e.target as HTMLElement;
    const link = target.closest('a') as HTMLAnchorElement | null;
    
    if (link) {
      if (!isEditing) {
        // If not editing and clicked a link, open it
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
        return;
      } else {
        // If editing and clicked a link, show tooltip
        e.preventDefault();
        const rect = link.getBoundingClientRect();
        setLinkTooltipPosition({ x: rect.left, y: rect.bottom + 5 });
        setHoveredLink(link);
        setShowLinkTooltip(true);
        return;
      }
    }
    
    // Hide tooltip if clicking elsewhere
    setShowLinkTooltip(false);
    
    // Otherwise, enable editing mode
    if (!isEditing) {
      setIsEditing(true);
      // Focus the editor after a small delay to ensure contentEditable is enabled
      setTimeout(() => {
        editorRef.current?.focus();
      }, 0);
    } else {
      checkActiveFormats();
    }
  };

  const handleEditLink = () => {
    if (!hoveredLink) return;
    
    editingLinkRef.current = hoveredLink;
    setLinkUrl(hoveredLink.href);
    setLinkText(hoveredLink.textContent || '');
    setIsEditingExistingLink(true);
    setShowLinkTooltip(false);
    setShowLinkModal(true);
  };

  // Handle clicking outside to exit editing mode
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (editorRef.current && !editorRef.current.contains(target)) {
        // Check if click is not on toolbar or modals
        const isToolbarClick = (e.target as Element).closest('[data-editor-toolbar]');
        const isModalClick = (e.target as Element).closest('[data-link-modal]');
        const isTooltipClick = (e.target as Element).closest('[data-link-tooltip]');
        if (!isToolbarClick && !isModalClick && !isTooltipClick) {
          setIsEditing(false);
          setShowColorPicker(false);
          setShowLinkTooltip(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  return (
    <div className="border rounded-md" style={{ borderColor: 'var(--color-border)' }}>
      {/* Toolbar - only show when editing */}
      {isEditing && (
        <div className="flex items-center gap-1 p-2 border-b flex-wrap" style={{ borderColor: 'var(--color-border)', backgroundColor: '#f8fafc' }} data-editor-toolbar>
        {/* Bold */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('bold');
          }}
          className={`p-1.5 rounded transition-colors ${!activeFormats.bold ? 'hover:bg-gray-200' : ''}`}
          style={{
            backgroundColor: activeFormats.bold ? '#009646' : 'transparent',
          }}
          title="Bold"
        >
          <Bold size={16} style={{ color: activeFormats.bold ? '#ffffff' : '#0f172a' }} />
        </button>
        
        {/* Italic */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('italic');
          }}
          className={`p-1.5 rounded transition-colors ${!activeFormats.italic ? 'hover:bg-gray-200' : ''}`}
          style={{
            backgroundColor: activeFormats.italic ? '#009646' : 'transparent',
          }}
          title="Italic"
        >
          <Italic size={16} style={{ color: activeFormats.italic ? '#ffffff' : '#0f172a' }} />
        </button>
        
        {/* Underline */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('underline');
          }}
          className={`p-1.5 rounded transition-colors ${!activeFormats.underline ? 'hover:bg-gray-200' : ''}`}
          style={{
            backgroundColor: activeFormats.underline ? '#009646' : 'transparent',
          }}
          title="Underline"
        >
          <Underline size={16} style={{ color: activeFormats.underline ? '#ffffff' : '#0f172a' }} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* Unordered List */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleListClick(false);
          }}
          className={`p-1.5 rounded transition-colors ${activeFormats.list !== 'ul' ? 'hover:bg-gray-200' : ''}`}
          style={{
            backgroundColor: activeFormats.list === 'ul' ? '#009646' : 'transparent',
          }}
          title="Bullet List"
        >
          <List size={16} style={{ color: activeFormats.list === 'ul' ? '#ffffff' : '#0f172a' }} />
        </button>
        
        {/* Ordered List */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleListClick(true);
          }}
          className={`p-1.5 rounded transition-colors ${activeFormats.list !== 'ol' ? 'hover:bg-gray-200' : ''}`}
          style={{
            backgroundColor: activeFormats.list === 'ol' ? '#009646' : 'transparent',
          }}
          title="Numbered List"
        >
          <ListOrdered size={16} style={{ color: activeFormats.list === 'ol' ? '#ffffff' : '#0f172a' }} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* Code Block */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCodeBlock();
          }}
          className={`p-1.5 rounded transition-colors ${!activeFormats.codeBlock ? 'hover:bg-gray-200' : ''}`}
          style={{
            backgroundColor: activeFormats.codeBlock ? '#009646' : 'transparent',
          }}
          title="Code Block"
        >
          <Code size={16} style={{ color: activeFormats.codeBlock ? '#ffffff' : '#0f172a' }} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* Hyperlink */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleLinkClick();
          }}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Link"
        >
          <Link2 size={16} style={{ color: 'var(--color-text)' }} />
        </button>
        
        {/* Image Upload */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            // Save selection before opening file dialog
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
            }
            fileInputRef.current?.click();
          }}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Insert Image"
        >
          <ImageIcon size={16} style={{ color: 'var(--color-text)' }} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        {/* Color Picker */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColorPicker(!showColorPicker);
            }}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Text Color"
          >
            <Palette size={16} style={{ color: 'var(--color-text)' }} />
          </button>
          {showColorPicker && (
            <div 
              className="absolute top-full left-0 mt-1 bg-surface border rounded-md shadow-lg p-3 z-20"
              style={{ borderColor: 'var(--color-border)', minWidth: '200px' }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Text Color</div>
              <div className="grid grid-cols-4 gap-2">
                {colors.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      execCommand('foreColor', color.value);
                      setShowColorPicker(false);
                    }}
                    className="w-10 h-10 rounded border-2 hover:scale-110 hover:border-gray-400 transition-all"
                    style={{ 
                      backgroundColor: color.value,
                      borderColor: 'var(--color-border)'
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={isEditing}
        onInput={handleInput}
        onPaste={isEditing ? handlePaste : undefined}
        onKeyDown={isEditing ? handleKeyDown : undefined}
        onMouseUp={isEditing ? checkActiveFormats : undefined}
        onKeyUp={isEditing ? checkActiveFormats : undefined}
        onFocus={isEditing ? checkActiveFormats : undefined}
        onClick={handleEditorClick}
        className={`min-h-[150px] p-4 focus:outline-none transition-colors ${!isEditing ? 'hover:bg-gray-50' : ''}`}
        style={{ 
          color: 'var(--color-text)',
          fontSize: '14px',
          lineHeight: '1.6',
          cursor: isEditing ? 'text' : 'pointer',
        }}
        data-placeholder={placeholder || 'Task description (supports rich text formatting)'}
        suppressContentEditableWarning
        title={!isEditing ? 'Click to edit' : ''}
      />
      
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        [contenteditable]:focus {
          outline: none;
        }
        [contenteditable="false"] a {
          cursor: pointer;
          pointer-events: auto;
        }
        [contenteditable="true"] a {
          pointer-events: none;
        }
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin: 0.5rem 0;
          margin-left: 0.5rem;
          padding-left: 1.25rem;
          display: block;
        }
        [contenteditable] ul ul, [contenteditable] ol ol,
        [contenteditable] ul ol, [contenteditable] ol ul {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          margin-left: 0;
          padding-left: 1.25rem;
        }
        [contenteditable] li {
          display: list-item;
          margin: 0.2rem 0;
          padding-left: 0.25rem;
        }
        [contenteditable] pre {
          background-color: #f1f5f9;
          padding: 0.875rem;
          border-radius: 0.375rem;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          margin: 0.75rem 0;
          display: block;
          overflow-x: auto;
          line-height: 1.5;
          border: 1px solid #e2e8f0;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #1e293b;
        }
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          margin: 0.5rem 0;
          border-radius: 0.375rem;
          display: block;
        }
      `}</style>

      {/* Link Modal */}
      {showLinkModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowLinkModal(false);
              setIsEditingExistingLink(false);
              // Clear saved selection on cancel
              savedSelectionRef.current = null;
              editingLinkRef.current = null;
            }
          }}
        >
          <div
            className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md"
            onMouseDown={(e) => e.stopPropagation()}
            data-link-modal
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
              {isEditingExistingLink ? 'Edit Link' : 'Insert Link'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ borderColor: 'var(--color-border)' }}
                  placeholder="Enter link text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  style={{ borderColor: 'var(--color-border)' }}
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkModal(false);
                    setIsEditingExistingLink(false);
                    // Clear saved selection on cancel
                    savedSelectionRef.current = null;
                    editingLinkRef.current = null;
                  }}
                  className="px-4 py-2 rounded-md border"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={insertLink}
                  className="px-4 py-2 rounded-md text-white"
                  style={{
                    backgroundColor: '#009646',
                  }}
                >
                  {isEditingExistingLink ? 'Update' : 'Insert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Tooltip - shown when clicking a link in edit mode */}
      {showLinkTooltip && hoveredLink && (
        <div
          className="fixed bg-surface border rounded-lg shadow-xl p-3 z-50"
          style={{
            left: `${linkTooltipPosition.x}px`,
            top: `${linkTooltipPosition.y}px`,
            borderColor: 'var(--color-border)',
            maxWidth: '400px',
          }}
          data-link-tooltip
        >
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Link URL:
          </div>
          <div 
            className="text-sm mb-3 break-all" 
            style={{ color: '#3b82f6' }}
          >
            {hoveredLink.href}
          </div>
          <button
            type="button"
            onClick={handleEditLink}
            className="px-3 py-1.5 text-sm rounded-md text-white w-full"
            style={{
              backgroundColor: '#009646',
            }}
          >
            Edit Link
          </button>
        </div>
      )}
      
      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  );
}
