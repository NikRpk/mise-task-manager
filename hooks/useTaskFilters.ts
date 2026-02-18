/**
 * Custom hook for managing task filtering and search
 * Extracted from app/page.tsx to improve maintainability
 */

import { useState, useMemo } from 'react';
import { Task, FilterOptions } from '@/types';
import { filterTasks } from '@/lib/filters';

interface UseTaskFiltersResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  filteredTasks: Task[];
  owners: string[];
}

/**
 * Hook to manage task filtering and search
 * @param tasks - Array of tasks to filter
 * @returns Filtered tasks and filter controls
 */
export function useTaskFilters(tasks: Task[]): UseTaskFiltersResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});

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
  };
}
