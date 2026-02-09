/**
 * Custom hook for managing people/contacts data
 * Now uses the shared PeopleContext for caching
 */

import { usePeople } from '@/lib/people-context';

interface UsePeopleDataResult {
  people: Array<{ email: string; displayName: string; photoUrl?: string; source: 'calendar' | 'workspace' }>;
  loading: boolean;
  error: string | null;
  fetchPeople: () => Promise<void>;
  syncWorkspace: () => Promise<void>;
  clearPeople: (source?: 'calendar' | 'workspace' | 'all') => Promise<void>;
  clearError: () => void;
}

/**
 * @deprecated This hook now wraps the new PeopleContext for backward compatibility
 * New code should use usePeople() directly from @/lib/people-context
 */
export function usePeopleData(): UsePeopleDataResult {
  const { people, isLoading, error, refetch, syncFromWorkspace, clearPeople: contextClearPeople } = usePeople();
  
  return {
    people,
    loading: isLoading,
    error: error?.message || null,
    fetchPeople: refetch,
    syncWorkspace: syncFromWorkspace,
    clearPeople: contextClearPeople,
    clearError: () => {}, // No-op since errors are managed by context
  };
}
