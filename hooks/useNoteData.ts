/**
 * Custom hook for managing note data and operations
 */

import { useState, useCallback } from 'react';
import { Note } from '@/types';
import { authenticatedFetch } from '@/lib/api-client';
import { logger } from '@/lib/logger';

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
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/notes');
      const data = await res.json();
      
      setNotes(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Failed to fetch notes', error as Error, { userId });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      setNotes(prev => [newNote, ...prev]);
      
      return newNote;
    } catch (error) {
      logger.error('Failed to create note', error as Error, { userId });
      throw error;
    }
  }, [userId]);

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
      setNotes(prev => prev.map(note => 
        note.id === noteId ? updatedNote : note
      ));
    } catch (error) {
      logger.error('Failed to update note', error as Error, { userId, noteId });
      throw error;
    }
  }, [userId]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!userId) return;

    try {
      const res = await authenticatedFetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete note');
      }
      
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      logger.error('Failed to delete note', error as Error, { userId, noteId });
      throw error;
    }
  }, [userId]);

  return {
    notes,
    loading,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}
