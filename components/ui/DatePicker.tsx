'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  /**
   * The current date value (ISO string or YYYY-MM-DD format)
   */
  value?: string | null;
  
  /**
   * Callback when the date changes
   * @param date - The new date in YYYY-MM-DD format, or null if cleared
   */
  onChange?: (date: string | null) => void;
  
  /**
   * Label text displayed above the input
   */
  label?: string;
  
  /**
   * Error message to display below the input
   */
  error?: string;
  
  /**
   * Helper text displayed below the input when no error
   */
  helperText?: string;
  
  /**
   * Whether the input should take full width
   */
  fullWidth?: boolean;
  
  /**
   * Minimum selectable date (ISO string or YYYY-MM-DD format)
   */
  min?: string;
  
  /**
   * Maximum selectable date (ISO string or YYYY-MM-DD format)
   */
  max?: string;
}

/**
 * DatePicker Component
 * 
 * A styled date input that matches the application's design system.
 * Works seamlessly on both desktop and mobile devices with native date pickers.
 * 
 * @example
 * ```tsx
 * <DatePicker
 *   label="Due Date"
 *   value={deadline}
 *   onChange={(date) => setDeadline(date)}
 *   placeholder="Select a date"
 * />
 * ```
 */
const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      error,
      helperText,
      label,
      fullWidth = false,
      className = '',
      style,
      disabled,
      min,
      max,
      ...props
    },
    ref
  ) => {
    /**
     * Format ISO date string or null to YYYY-MM-DD for input
     */
    const formatDateForInput = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        // Convert to local date format (YYYY-MM-DD)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return '';
      }
    };

    /**
     * Handle date change from input
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (onChange) {
        // If empty, return null; otherwise return YYYY-MM-DD string
        onChange(newValue || null);
      }
    };

    const baseStyles: React.CSSProperties = {
      padding: '0.5rem 0.75rem',
      border: `1px solid ${error ? '#f30047' : 'var(--color-border)'}`,
      borderRadius: '6px',
      fontSize: '0.875rem',
      fontWeight: '500',
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
            className="block text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="date"
          disabled={disabled}
          value={formatDateForInput(value)}
          onChange={handleChange}
          min={min ? formatDateForInput(min) : undefined}
          max={max ? formatDateForInput(max) : undefined}
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

DatePicker.displayName = 'DatePicker';

export default DatePicker;
