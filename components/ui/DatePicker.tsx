'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

export interface DatePickerProps {
  value?: string | null;
  onChange?: (date: string | null) => void;
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      error,
      helperText,
      label,
      fullWidth = false,
      className = '',
      disabled,
      placeholder = 'Select date',
    },
    ref
  ) => {
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse date value
    useEffect(() => {
      if (value) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            setSelectedDate(date);
            setCurrentMonth(date);
          }
        } catch {
          setSelectedDate(null);
        }
      } else {
        setSelectedDate(null);
      }
    }, [value]);

    // Close calendar when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowCalendar(false);
        }
      };

      if (showCalendar) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [showCalendar]);

    // Format date for display
    const formatDateForDisplay = (date: Date | null): string => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${day}.${month}.${year}`;
    };

    // Handle container click
    const handleContainerClick = () => {
      if (disabled) return;
      setShowCalendar(!showCalendar);
    };

    // Handle date selection
    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      setShowCalendar(false);
      if (onChange) {
        onChange(date.toISOString());
      }
    };

    // Generate calendar days
    const generateCalendarDays = () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const days: (Date | null)[] = [];

      // Add empty slots for days before the month starts
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }

      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }

      return days;
    };

    // Navigate months
    const previousMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    // Check if date is selected
    const isDateSelected = (date: Date) => {
      if (!selectedDate) return false;
      return (
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      );
    };

    // Check if date is today
    const isToday = (date: Date) => {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    return (
      <div ref={ref} className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label 
            className="block text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}
          >
            {label}
          </label>
        )}
        
        <div className="relative" ref={containerRef}>
          {/* Input Container - Clickable */}
          <div
            onClick={handleContainerClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all ${className}`}
            style={{
              border: `1px solid ${error ? '#f30047' : 'var(--color-border)'}`,
              backgroundColor: disabled ? '#f1f5f9' : 'var(--color-surface)',
              pointerEvents: disabled ? 'none' : 'auto',
              opacity: disabled ? 0.6 : 1,
            }}
            onFocus={(e) => {
              if (!error && !disabled) {
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = error ? '#f30047' : 'var(--color-border)';
            }}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-label={label || 'Select date'}
          >
            <Calendar 
              size={16} 
              style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}
            />
            
            <span
              className="flex-1 text-sm font-medium"
              style={{ 
                color: selectedDate ? 'var(--color-text)' : 'var(--color-text-secondary)' 
              }}
            >
              {selectedDate ? formatDateForDisplay(selectedDate) : placeholder}
            </span>
          </div>

          {/* Custom Calendar Popup */}
          {showCalendar && (
            <div
              className="absolute z-50 mt-2 bg-white rounded-lg shadow-xl border left-0 right-0"
              style={{
                borderColor: 'var(--color-border)',
                minWidth: '280px',
              }}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); previousMonth(); }}
                  className="p-2 rounded hover:bg-gray-100 transition-colors text-lg font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  ‹
                </button>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                  className="p-2 rounded hover:bg-gray-100 transition-colors text-lg font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  ›
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="p-3">
                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium p-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="p-2" />;
                    }

                    const selected = isDateSelected(date);
                    const today = isToday(date);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect(date);
                        }}
                        className="p-2 text-sm rounded-md transition-all hover:scale-105"
                        style={{
                          backgroundColor: selected ? 'var(--color-primary)' : today ? 'rgba(0, 150, 70, 0.1)' : 'transparent',
                          color: selected ? 'white' : 'var(--color-text)',
                          fontWeight: selected || today ? '600' : '400',
                        }}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDateSelect(new Date());
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(null);
                    setShowCalendar(false);
                    if (onChange) onChange(null);
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all hover:bg-gray-50"
                  style={{
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text)',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error or Helper Text */}
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
