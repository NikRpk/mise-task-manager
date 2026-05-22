/**
 * Searchable Owner Selector Component
 * Filterable dropdown with autocomplete
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Person } from '@/types';
import { User } from 'lucide-react';

interface OwnerSelectorProps {
  value: string;
  onChange: (value: string) => void;
  people: Person[];
  disabled?: boolean;
}

export default function OwnerSelector({ value, onChange, people, disabled = false }: OwnerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected person's display name
  const selectedPerson = people.find(p => p.email === value);
  const displayValue = selectedPerson?.displayName || '';

  // Filter people based on search query
  const filteredPeople = people.filter(person => 
    person.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside (must check both container and dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isInsideContainer = containerRef.current?.contains(event.target as Node);
      const isInsideDropdown = dropdownRef.current?.contains(event.target as Node);
      
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (email: string, displayName: string) => {
    onChange(email);
    setSearchQuery(displayName);
    setIsOpen(false);
  };

  const handleInputChange = (newQuery: string) => {
    setSearchQuery(newQuery);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Allow custom input - save whatever the user typed
    if (searchQuery.trim()) {
      // If it matches a person, use their email, otherwise use the custom text
      const matchingPerson = people.find(p => 
        p.displayName.toLowerCase() === searchQuery.toLowerCase() ||
        p.email.toLowerCase() === searchQuery.toLowerCase()
      );
      
      if (matchingPerson) {
        onChange(matchingPerson.email);
      } else {
        // Save the custom name/email
        onChange(searchQuery.trim());
      }
    } else {
      onChange('');
    }
  };

  const handleClear = () => {
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
  };

  // Update search query when value changes externally
  useEffect(() => {
    if (value) {
      const person = people.find(p => p.email === value);
      if (person) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchQuery(person.displayName);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearchQuery(value);
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery('');
    }
  }, [value, people]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Direct Text Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={(e) => {
            // Delay to allow click on dropdown items
            setTimeout(() => {
              if (!isOpen) return;
              handleInputBlur();
              setIsOpen(false);
            }, 200);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredPeople.length > 0) {
                handleSelect(filteredPeople[0].email, filteredPeople[0].displayName);
              } else {
                // No matches, save custom input
                handleInputBlur();
                setIsOpen(false);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          disabled={disabled}
          placeholder="Type name or email..."
          className="dense-table-input w-full px-2.5 py-1.5 pr-8 border rounded-md text-sm"
          style={{ 
            color: 'var(--color-text)'
          }}
          autoComplete="off"
          data-form-type="other"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <User size={14} style={{ color: 'var(--color-text-secondary)' }} className="flex-shrink-0" />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && createPortal(
        <div 
          ref={(el) => {
            dropdownRef.current = el;
          }}
          className="fixed z-[150] rounded-md shadow-lg border overflow-hidden"
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)'
          }}
        >
          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {/* Clear Selection Option */}
            {value && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleClear();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-opacity-50 transition-colors border-b"
                style={{ 
                  backgroundColor: 'transparent',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span className="italic">Clear selection</span>
              </button>
            )}

            {/* People Options */}
            {filteredPeople.length > 0 ? (
              filteredPeople.map(person => (
              <button
                key={person.email}
                type="button"
                onMouseDown={(e) => {
                  // Use onMouseDown instead of onClick to fire before onBlur
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(person.email, person.displayName);
                }}
                className="w-full px-3 py-2 text-left text-sm transition-colors"
                  style={{ 
                    backgroundColor: person.email === value ? 'var(--color-surface-muted)' : 'transparent',
                    color: 'var(--color-text)'
                  }}
                  onMouseEnter={(e) => {
                    if (person.email !== value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-muted)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (person.email !== value) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div className="font-medium">{person.displayName}</div>
                  <div className="text-xs opacity-60">{person.email}</div>
                </button>
              ))
            ) : searchQuery.trim() ? (
              <div className="px-3 py-4 text-sm">
                <div className="text-center mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  No contacts found
                </div>
                <div 
                  className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-center cursor-pointer hover:bg-blue-100 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInputBlur();
                    setIsOpen(false);
                  }}
                >
                  <div className="text-sm font-medium text-blue-700">
                    Use &quot;{searchQuery.trim()}&quot;
                  </div>
                  <div className="text-xs text-blue-600 mt-0.5">
                    Click or press Enter
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-3 py-4 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Start typing to search...
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
