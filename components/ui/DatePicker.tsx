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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedDate(date);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentMonth(date);
          }
        } catch {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSelectedDate(null);
        }
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const handleDateSelect = (date: Date, isCurrentMonth: boolean) => {
      // If clicking a date from previous/next month, switch to that month first
      if (!isCurrentMonth) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        // Don't close calendar or select date yet, just switch the month view
        return;
      }
      
      setSelectedDate(date);
      setShowCalendar(false);
      if (onChange) {
        onChange(date.toISOString());
      }
    };

    // Generate calendar days including previous and next month dates
    const generateCalendarDays = () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      
      // Convert Sunday (0) to 7, so Monday becomes 1 and Sunday becomes 7
      let startingDayOfWeek = firstDay.getDay();
      startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

      const days: { date: Date; isCurrentMonth: boolean }[] = [];

      // Add dates from previous month
      const prevMonth = new Date(year, month, 0); // Last day of previous month
      const daysInPrevMonth = prevMonth.getDate();
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        days.push({
          date: new Date(year, month - 1, daysInPrevMonth - i),
          isCurrentMonth: false
        });
      }

      // Add all days of current month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push({
          date: new Date(year, month, day),
          isCurrentMonth: true
        });
      }

      // Add dates from next month to complete the grid (5 rows minimum, 6 only if needed)
      const minCells = days.length <= 35 ? 35 : 42;
      const remainingCells = minCells - days.length;
      for (let day = 1; day <= remainingCells; day++) {
        days.push({
          date: new Date(year, month + 1, day),
          isCurrentMonth: false
        });
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
            className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all ${fullWidth ? 'w-full' : ''} ${className}`}
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
              className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border"
              style={{
                borderColor: 'var(--color-border)',
                width: '100%',
                left: 0,
              }}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); previousMonth(); }}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors text-lg font-semibold"
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
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors text-lg font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  ›
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="px-2 py-1">
                {/* Day names */}
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                    <div key={day} className="text-center text-xs font-medium py-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-0.5">
                  {generateCalendarDays().map((item, index) => {
                    const { date, isCurrentMonth } = item;
                    const selected = isDateSelected(date);
                    const today = isToday(date);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect(date, isCurrentMonth);
                        }}
                        className="flex items-center justify-center text-sm rounded transition-all"
                        style={{
                          minHeight: '26px',
                          backgroundColor: selected ? 'var(--color-primary)' : today ? 'rgba(0, 150, 70, 0.1)' : 'transparent',
                          color: selected ? 'white' : isCurrentMonth ? 'var(--color-text)' : '#94a3b8',
                          fontWeight: selected || today ? '600' : '400',
                          opacity: isCurrentMonth ? 1 : 0.6,
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) {
                            e.currentTarget.style.backgroundColor = isCurrentMonth ? 'rgba(0, 150, 70, 0.1)' : 'rgba(148, 163, 184, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) {
                            e.currentTarget.style.backgroundColor = today ? 'rgba(0, 150, 70, 0.1)' : 'transparent';
                          }
                        }}
                        title={!isCurrentMonth ? 'Click to switch to this month' : undefined}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 px-3 py-1.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const today = new Date();
                    setSelectedDate(today);
                    setShowCalendar(false);
                    if (onChange) {
                      onChange(today.toISOString());
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all hover:opacity-90"
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
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all hover:bg-gray-50"
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
