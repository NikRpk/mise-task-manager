'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, Check } from 'lucide-react';

interface DisplayOptionsMenuProps {
  showOwner: boolean;
  showPriority: boolean;
  showDueDate: boolean;
  onToggleOwner: () => void;
  onTogglePriority: () => void;
  onToggleDueDate: () => void;
}

export default function DisplayOptionsMenu({
  showOwner,
  showPriority,
  showDueDate,
  onToggleOwner,
  onTogglePriority,
  onToggleDueDate,
}: DisplayOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const activeCount = [showOwner, showPriority, showDueDate].filter(Boolean).length;

  return (
    <div className="relative">
      {/* Display Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-1.5 text-sm border rounded-md transition-all font-medium"
        style={{
          backgroundColor: activeCount > 0 ? 'var(--color-primary)' : 'white',
          color: activeCount > 0 ? 'white' : 'var(--color-text)',
          borderColor: activeCount > 0 ? 'var(--color-primary)' : 'var(--color-border)',
        }}
        title="Customize card display"
      >
        <Eye size={16} />
        <span>Display</span>
        {activeCount > 0 && (
          <span className="text-xs font-bold">({activeCount})</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-[60]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
              Card Display
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Show on task cards
            </p>
          </div>

          {/* Options */}
          <div className="p-2">
            {/* Owner Option */}
            <button
              onClick={() => {
                onToggleOwner();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <span>Owner</span>
              {showOwner && (
                <Check size={14} style={{ color: 'var(--color-primary)' }} />
              )}
            </button>

            {/* Priority Option */}
            <button
              onClick={() => {
                onTogglePriority();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <span>Priority</span>
              {showPriority && (
                <Check size={14} style={{ color: 'var(--color-primary)' }} />
              )}
            </button>

            {/* Due Date Option */}
            <button
              onClick={() => {
                onToggleDueDate();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              <span>Due Date</span>
              {showDueDate && (
                <Check size={14} style={{ color: 'var(--color-primary)' }} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
