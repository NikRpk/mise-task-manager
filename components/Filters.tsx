'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { FilterOptions, TaskStatus, Priority } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Filter, X } from 'lucide-react';

interface FiltersProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  owners: string[];
}

interface StatusOption {
  id: string;
  label: string;
  value: string;
  color?: string;
}

const defaultStatusColors: Record<string, string> = {
  'todo': '#64748b',
  'in-progress': '#f6c400',
  'review': '#3b82f6',
  'done': '#00a61c',
};

const Filters = memo(function Filters({ filters, onChange, owners }: FiltersProps) {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [statusColors, setStatusColors] = useState<Record<string, string>>(defaultStatusColors);
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

  // Update status options when settings change
  useEffect(() => {
    if (settings?.statusOptions && Array.isArray(settings.statusOptions)) {
      setStatusOptions(prevOptions => {
        // Only update if different to avoid infinite loops
        const newOptions = settings.statusOptions;
        if (JSON.stringify(prevOptions) === JSON.stringify(newOptions)) {
          return prevOptions;
        }
        return newOptions;
      });
      const colors: Record<string, string> = {};
      settings.statusOptions.forEach((opt: StatusOption) => {
        colors[opt.value] = opt.color || defaultStatusColors[opt.value] || '#64748b';
      });
      setStatusColors(colors);
    } else if (statusOptions.length === 0) {
      // Only set defaults if we don't have any options yet
      setStatusOptions([
        { id: '1', label: 'To Do', value: 'todo', color: 'var(--color-text-secondary)' },
        { id: '2', label: 'In Progress', value: 'in-progress', color: '#f6c400' },
        { id: '3', label: 'Review', value: 'review', color: '#3b82f6' },
        { id: '4', label: 'Done', value: 'done', color: '#00a61c' },
      ]);
    }
  }, [settings?.statusOptions]);

  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    onChange({ ...filters, [key]: value });
  };

  // Count active filters
  const activeFilterCount = [
    filters.deadline,
    filters.status?.[0],
    filters.priority?.[0],
    filters.owner?.[0],
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    onChange({});
  };

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
        style={{ 
          borderColor: 'var(--color-border)',
          backgroundColor: 'white',
          color: 'var(--color-text)',
        }}
      >
        <Filter size={16} />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span 
            className="px-1.5 py-0.5 text-xs font-semibold rounded-full"
            style={{ 
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-[60]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Filters</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={16} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          </div>

          {/* Filter Options */}
          <div className="p-4 space-y-4">
            {/* Deadline Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Deadline
              </label>
              <select
                value={filters.deadline || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateFilter('deadline', value ? (value as 'overdue' | 'today' | 'this-week' | 'this-month' | 'future') : undefined);
                }}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'white',
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'}
                onBlur={(e) => e.target.style.boxShadow = ''}
              >
                <option value="">All</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="future">Future</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Status
              </label>
              <select
                value={filters.status?.[0] || ''}
                onChange={(e) => updateFilter('status', e.target.value ? [e.target.value as TaskStatus] : undefined)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all font-medium"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'white',
                  color: '#0f172a',
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'}
                onBlur={(e) => e.target.style.boxShadow = ''}
              >
                <option value="">All</option>
                {statusOptions.map(option => (
                  <option 
                    key={option.id} 
                    value={option.value}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      color: statusColors[option.value] || '#0f172a',
                    }}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Priority
              </label>
              <select
                value={filters.priority?.[0] || ''}
                onChange={(e) => updateFilter('priority', e.target.value ? [e.target.value as Priority] : undefined)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all font-medium"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'white',
                  color: '#0f172a',
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'}
                onBlur={(e) => e.target.style.boxShadow = ''}
              >
                <option value="">All</option>
                <option value="high" style={{ color: '#f30047' }}>High</option>
                <option value="medium" style={{ color: '#f6c400' }}>Medium</option>
                <option value="low" style={{ color: '#00a61c' }}>Low</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Owner
              </label>
              <select
                value={filters.owner?.[0] || ''}
                onChange={(e) => updateFilter('owner', e.target.value ? [e.target.value] : undefined)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'white',
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'}
                onBlur={(e) => e.target.style.boxShadow = ''}
              >
                <option value="">All</option>
                {owners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if filters or owners actually changed
  return (
    JSON.stringify(prevProps.filters) === JSON.stringify(nextProps.filters) &&
    prevProps.owners.length === nextProps.owners.length &&
    prevProps.owners.every((owner, idx) => owner === nextProps.owners[idx])
  );
});

export default Filters;
