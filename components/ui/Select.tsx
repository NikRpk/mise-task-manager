'use client';

import { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  label?: string;
  error?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  style = {},
  disabled = false,
  label,
  error,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`${className}`}>
      {label && (
        <label 
          className="block text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}
        >
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full px-3 py-2 border rounded-md text-base text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: error ? '#f30047' : 'var(--color-border)',
            backgroundColor: '#ffffff',
            color: 'var(--color-text)',
            ...style,
          }}
        >
          <span>{selectedOption?.label || placeholder}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[200]"
              onClick={() => setIsOpen(false)}
            />
            {/* Options */}
            <div 
              className="absolute z-[201] w-full mt-1 bg-white border rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-3 text-base text-left hover:bg-gray-50 transition-colors ${
                    index > 0 ? 'border-t' : ''
                  }`}
                  style={{ 
                    color: 'var(--color-text)',
                    borderColor: '#f1f5f9',
                    backgroundColor: option.value === value ? '#f8fafc' : 'white',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: '#f30047' }}>
          {error}
        </p>
      )}
    </div>
  );
}
