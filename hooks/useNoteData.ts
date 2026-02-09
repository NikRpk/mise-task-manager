/**
 * Custom hook for managing note data and operations
 * Now with caching for better performance
 */

import { useState, useCallback } from 'react';
import { Note } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { useCachedFetch, useCache } from '@/lib/cache-context';

interface UseNoteDataResult {
  notes: Note[];
  loading: boolean;
  fetchNotes: () => Promise<void>;
  createNote: (noteData: Partial<Note>) => Promise<Note>;
  updateNote: (noteId: string, noteData: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

/**
 * Hook to manage notes
 * @param userId - Current user ID
 * @returns Note data and operations
 */
export function useNoteData(userId: string | undefined): UseNoteDataResult {
  const cache = useCache();
  const [manualNotes, setManualNotes] = useState<Note[] | null>(null);

  // Use cached fetch with 5-minute TTL (notes change more frequently than projects)
  const { data: cachedNotes, isLoading, refetch } = useCachedFetch<Note[]>(
    'user-notes',
    async () => {
      const res = await authenticatedFetch('/api/notes');
      return res.json();
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      enabled: !!userId,
      onError: (error) => {
        logger.error('Failed to fetch notes', error, { userId });
      },
    }
  );

  // Use manual notes if set, otherwise use cached notes
  const notes = manualNotes !== null ? manualNotes : (cachedNotes || []);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    setManualNotes(null); // Clear manual override
    await refetch();
  }, [userId, refetch]);

  const createNote = useCallback(async (noteData: Partial<Note>): Promise<Note> => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const res = await authenticatedFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify(noteData),
      });
      
      if (!res.ok) {
        throw new Error('Failed to create note');
      }
      
      const newNote = await res.json();
      
      // Optimistically update local state
      setManualNotes(prev => [newNote, ...(prev || cachedNotes || [])]);
      
      // Invalidate cache so next fetch gets fresh data
      cache.invalidate('user-notes');
      
      return newNote;
    } catch (error) {
      logger.error('Failed to create note', error as Error, { userId });
      throw error;
    }
  }, [userId, cache, cachedNotes]);

  const updateNote = useCallback(async (noteId: string, noteData: Partial<Note>) => {
    if (!userId) return;

    try {
      const res = await authenticatedFetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify(noteData),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update note');
      }
      
      const updatedNote = await res.json();
      
      // Optimistically update local state
      setManualNotes(prev => 
        (prev || cachedNotes || []).map(note => 
          note.id === noteId ? updatedNote : note
        )
      );
      
      // Invalidate cache
      cache.invalidate('user-notes');
    } catch (error) {
      logger.error('Failed to update note', error as Error, { userId, noteId });
      throw error;
    }
  }, [userId, cache, cachedNotes]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!userId) return;

    try {
      const res = await authenticatedFetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete note');
      }
      
      // Optimistically update local state
      setManualNotes(prev => 
        (prev || cachedNotes || []).filter(note => note.id !== noteId)
      );
      
      // Invalidate cache
      cache.invalidate('user-notes');
    } catch (error) {
      logger.error('Failed to delete note', error as Error, { userId, noteId });
      throw error;
    }
  }, [userId, cache, cachedNotes]);

  return {
    notes,
    loading: isLoading,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}
