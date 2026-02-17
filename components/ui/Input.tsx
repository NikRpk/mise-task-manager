'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  label?: string;
  fullWidth?: boolean;
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
  label?: string;
  fullWidth?: boolean;
  autoResize?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error,
      helperText,
      label,
      fullWidth = false,
      className = '',
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      padding: '0.5rem 0.75rem',
      border: `1px solid ${error ? '#f30047' : 'var(--color-border)'}`,
      borderRadius: '6px',
      fontSize: '0.875rem',
      width: fullWidth ? '100%' : undefined,
      backgroundColor: disabled ? '#f1f5f9' : 'var(--color-surface)',
      color: 'var(--color-text)',
      transition: 'all 0.2s ease',
      ...style,
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label 
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`focus:outline-none focus:ring-2 focus:ring-opacity-50 ${className}`}
          style={baseStyles}
          onFocus={(e) => {
            if (!error) {
              e.target.style.boxShadow = '0 0 0 2px var(--color-primary)';
              e.target.style.borderColor = 'var(--color-primary)';
            }
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = '';
            e.target.style.borderColor = error ? '#f30047' : 'var(--color-border)';
          }}
          {...props}
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: '#f30047' }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      error,
      helperText,
      label,
      fullWidth = false,
      autoResize = false,
      className = '',
      style,
      disabled,
      onChange,
      onInput,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      padding: '0.5rem 0.75rem',
      border: `1px solid ${error ? '#f30047' : 'var(--color-border)'}`,
      borderRadius: '6px',
      fontSize: '0.875rem',
      width: fullWidth ? '100%' : undefined,
      backgroundColor: disabled ? '#f1f5f9' : 'var(--color-surface)',
      color: 'var(--color-text)',
      transition: 'all 0.2s ease',
      resize: autoResize ? 'none' : undefined,
      overflow: autoResize ? 'hidden' : undefined,
      minHeight: '80px',
      ...style,
    };

    const handleResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = target.scrollHeight + 'px';
      }
      if (onInput) {
        onInput(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label 
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={`focus:outline-none focus:ring-2 focus:ring-opacity-50 ${className}`}
          style={baseStyles}
          onChange={handleChange}
          onInput={handleResize}
          onFocus={(e) => {
            if (!error) {
              e.target.style.boxShadow = '0 0 0 2px var(--color-primary)';
              e.target.style.borderColor = 'var(--color-primary)';
            }
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = '';
            e.target.style.borderColor = error ? '#f30047' : 'var(--color-border)';
          }}
          {...props}
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: '#f30047' }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default Input;
