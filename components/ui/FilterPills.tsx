/**
 * FilterPills — multi-select filter dropdown.
 *
 * Styled to match the Deadline <select> for visual consistency. Shows a
 * trigger button ("All" / "High" / "2 selected") that opens a checklist.
 *
 * `selected === undefined` means "all active / no filter applied".
 *
 * A pills fallback is still available via `maxPills` if ever needed.
 *
 * @example
 * <FilterPills
 *   options={[{ value: 'high', label: 'High', color: '#ef4444' }]}
 *   selected={filters.priority}
 *   onChange={(v) => setFilters({ ...filters, priority: v })}
 * />
 */

'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterPillOption<T extends string> {
  value: T;
  label: string;
  /** Active background/dot colour. Defaults to var(--color-primary). */
  color?: string;
}

export interface FilterPillsProps<T extends string> {
  options: FilterPillOption<T>[];
  /** undefined = all selected (no filter active). */
  selected: T[] | undefined;
  onChange: (values: T[] | undefined) => void;
  size?: 'sm' | 'md';
  /**
   * Use pills instead of the dropdown when the option count is ≤ this value.
   * Defaults to 0 (always use the dropdown).
   */
  maxPills?: number;
}

export function FilterPills<T extends string>({
  options,
  selected,
  onChange,
  size = 'sm',
  maxPills = 0,
}: FilterPillsProps<T>) {
  const allSelected = selected === undefined || selected.length === 0;

  const isActive = useCallback(
    (value: T) => allSelected || selected!.includes(value),
    [allSelected, selected],
  );

  const toggle = useCallback(
    (value: T) => {
      const allValues = options.map(o => o.value);
      const current = selected ?? allValues;

      if (current.includes(value)) {
        const next = current.filter(v => v !== value);
        onChange(next.length === 0 ? undefined : next);
      } else {
        const next = [...current, value];
        onChange(next.length === allValues.length ? undefined : next);
      }
    },
    [selected, options, onChange],
  );

  // ── Pills mode ────────────────────────────────────────────────────────────
  if (options.length <= maxPills) {
    const pillClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map(option => {
          const active = isActive(option.value);
          const activeColor = option.color ?? 'var(--color-primary)';

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={`${pillClass} rounded-full font-medium border transition-all duration-150 whitespace-nowrap`}
              style={{
                backgroundColor: active ? activeColor : 'transparent',
                color: active ? 'white' : 'var(--color-text-secondary)',
                borderColor: active ? activeColor : 'var(--color-border)',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Dropdown mode (> maxPills options) ───────────────────────────────────
  return (
    <FilterDropdown
      options={options}
      selected={selected}
      allSelected={allSelected}
      isActive={isActive}
      toggle={toggle}
      onClear={() => onChange(undefined)}
      size={size}
    />
  );
}

// ── Internal dropdown component ───────────────────────────────────────────────

interface FilterDropdownProps<T extends string> {
  options: FilterPillOption<T>[];
  selected: T[] | undefined;
  allSelected: boolean;
  isActive: (value: T) => boolean;
  toggle: (value: T) => void;
  onClear: () => void;
  size: 'sm' | 'md';
}

function FilterDropdown<T extends string>({
  options,
  selected,
  allSelected,
  isActive,
  toggle,
  onClear,
  size,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selectedCount = selected?.length ?? 0;
  const isFiltering = !allSelected;

  // Human-readable trigger label: "All" / "High" / "2 selected"
  const triggerLabel = (() => {
    if (!isFiltering) return 'All';
    if (selectedCount === 1) {
      return options.find(o => o.value === selected![0])?.label ?? '1 selected';
    }
    return `${selectedCount} selected`;
  })();

  const triggerClass = size === 'sm'
    ? 'px-3 py-1.5 text-sm'
    : 'px-3 py-2 text-sm';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`${triggerClass} rounded-md border transition-all duration-150 flex items-center justify-between gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-opacity-50`}
        style={{
          minWidth: '110px',
          backgroundColor: 'var(--color-surface)',
          color: isFiltering ? 'var(--color-primary)' : 'var(--color-text)',
          borderColor: isFiltering ? 'var(--color-primary)' : 'var(--color-border)',
        }}
      >
        {triggerLabel}
        <ChevronDown
          size={13}
          strokeWidth={2}
          className="transition-transform duration-150 flex-shrink-0"
          style={{
            color: isFiltering ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 rounded-lg shadow-lg border overflow-hidden"
          style={{
            top: '100%',
            left: 0,
            minWidth: '180px',
            maxHeight: '260px',
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Select all / Clear row */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b text-xs font-semibold"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <span>{allSelected ? 'All selected' : `${selectedCount} of ${options.length}`}</span>
            {!allSelected && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium transition-colors hover:opacity-70"
                style={{ color: 'var(--color-primary)' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="overflow-y-auto" style={{ maxHeight: '210px' }}>
            {options.map(option => {
              const active = isActive(option.value);
              const dotColor = option.color ?? 'var(--color-primary)';

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--color-text)' }}
                >
                  {/* Colour dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="flex-1 truncate">{option.label}</span>
                  {/* Check mark */}
                  {active && (
                    <Check size={14} strokeWidth={2.5} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
