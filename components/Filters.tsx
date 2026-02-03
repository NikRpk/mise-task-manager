'use client';

import { useState, useEffect } from 'react';
import { FilterOptions, TaskStatus, Priority } from '@/types';

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

export default function Filters({ filters, onChange, owners }: FiltersProps) {
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [statusColors, setStatusColors] = useState<Record<string, string>>(defaultStatusColors);

  useEffect(() => {
    // Fetch status options from settings
    fetch('/api/settings')
      .then(res => {
        if (!res.ok && res.status === 401) {
          // User not authenticated yet, use defaults silently
          throw new Error('Not authenticated');
        }
        return res.json();
      })
      .then(data => {
        if (data.statusOptions && Array.isArray(data.statusOptions)) {
          setStatusOptions(data.statusOptions);
          const colors: Record<string, string> = {};
          data.statusOptions.forEach((opt: StatusOption) => {
            colors[opt.value] = opt.color || defaultStatusColors[opt.value] || '#64748b';
          });
          setStatusColors(colors);
        } else {
          // Fallback to defaults if settings not available
          setStatusOptions([
            { id: '1', label: 'To Do', value: 'todo', color: 'var(--color-text-secondary)' },
            { id: '2', label: 'In Progress', value: 'in-progress', color: '#f6c400' },
            { id: '3', label: 'Review', value: 'review', color: '#3b82f6' },
            { id: '4', label: 'Done', value: 'done', color: '#00a61c' },
          ]);
        }
      })
      .catch(() => {
        // Use defaults if fetch fails (including 401)
        setStatusOptions([
          { id: '1', label: 'To Do', value: 'todo', color: 'var(--color-text-secondary)' },
          { id: '2', label: 'In Progress', value: 'in-progress', color: '#f6c400' },
          { id: '3', label: 'Review', value: 'review', color: '#3b82f6' },
          { id: '4', label: 'Done', value: 'done', color: '#00a61c' },
        ]);
      });
  }, []);

  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[120px]">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
          Deadline
        </label>
        <select
          value={filters.deadline || ''}
          onChange={(e) => {
            const value = e.target.value;
            updateFilter('deadline', value ? (value as 'overdue' | 'today' | 'this-week' | 'this-month' | 'future') : undefined);
          }}
          className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
          style={{
            borderColor: 'var(--color-border)',
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

      <div className="flex-1 min-w-[120px]">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
          Status
        </label>
        <select
          value={filters.status?.[0] || ''}
          onChange={(e) => updateFilter('status', e.target.value ? [e.target.value as TaskStatus] : undefined)}
          className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all font-medium"
          style={{
            borderColor: filters.status?.[0] ? statusColors[filters.status[0]] || '#cbd5e1' : '#cbd5e1',
            backgroundColor: filters.status?.[0] ? `${statusColors[filters.status[0]]}15` || '#ffffff' : '#ffffff',
            color: filters.status?.[0] ? statusColors[filters.status[0]] || '#0f172a' : '#0f172a',
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

      <div className="flex-1 min-w-[120px]">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
          Owner
        </label>
        <select
          value={filters.owner?.[0] || ''}
          onChange={(e) => updateFilter('owner', e.target.value ? [e.target.value] : undefined)}
          className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all"
          style={{
            borderColor: 'var(--color-border)',
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
  );
}
