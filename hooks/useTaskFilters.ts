/**
 * Custom hook for managing task filtering and search
 * Extracted from app/page.tsx to improve maintainability
 * Now persists filters across sessions using localStorage
 */

import { useState, useMemo, useEffect } from 'react';
import { Task, FilterOptions } from '@/types';
import { filterTasks } from '@/lib/filters';

interface UseTaskFiltersResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  filteredTasks: Task[];
  owners: string[];
  hiddenTaskCount: number;
}

const FILTERS_STORAGE_KEY = 'task-filters';

/**
 * Hook to manage task filtering and search
 * @param tasks - Array of tasks to filter
 * @returns Filtered tasks and filter controls
 */
export function useTaskFilters(tasks: Task[]): UseTaskFiltersResult {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load filters from localStorage on mount
  const [filters, setFiltersState] = useState<FilterOptions>(() => {
    if (typeof window === 'undefined') return {};
    
    try {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Wrapper to save filters to localStorage
  const setFilters = (newFilters: FilterOptions) => {
    setFiltersState(newFilters);
    
    if (typeof window !== 'undefined') {
      try {
        if (Object.keys(newFilters).length === 0) {
          localStorage.removeItem(FILTERS_STORAGE_KEY);
        } else {
          localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
        }
      } catch (error) {
        console.error('Failed to save filters to localStorage', error);
      }
    }
  };

  // Memoize search query lowercase to avoid recreating on every render
  const searchQueryLower = useMemo(() => 
    searchQuery.toLowerCase(), 
    [searchQuery]
  );

  // Memoize filtered tasks to prevent unnecessary recalculations
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply search filter
    if (searchQueryLower) {
      result = result.filter(t =>
        (t.title && t.title.toLowerCase().includes(searchQueryLower)) ||
        t.description.toLowerCase().includes(searchQueryLower) ||
        t.owner.toLowerCase().includes(searchQueryLower)
      );
    }

    // Apply other filters
    return filterTasks(result, filters);
  }, [tasks, searchQueryLower, filters]);

  // Calculate hidden task count
  const hiddenTaskCount = useMemo(() => 
    tasks.length - filteredTasks.length,
    [tasks.length, filteredTasks.length]
  );

  // Memoize unique owners for filter dropdown
  const owners = useMemo(() => 
    Array.from(new Set(tasks.map(t => t.owner).filter(Boolean))),
    [tasks]
  );

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredTasks,
    owners,
    hiddenTaskCount,
  };
}
