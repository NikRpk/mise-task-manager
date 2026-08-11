/**
 * Single note API
 * Get, update, delete specific note
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rowToNote, noteToRow, NoteRow } from '@/lib/db-mappers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const includePrevious = searchParams.get('includePrevious') === 'true';

      const db = getSupabaseAdmin();
      const { data: row, error } = await db.from('notes').select('*').eq('id', id).maybeSingle();

      if (error) throw error;
      if (!row) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (row.created_by !== user.uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const currentNote = rowToNote(row as NoteRow);

      if (includePrevious && currentNote.recurringEventId && currentNote.recurringInstanceDate) {
        try {
          const { data: previousRows, error: previousError } = await db
            .from('notes')
            .select('*')
            .eq('created_by', user.uid)
            .eq('recurring_event_id', currentNote.recurringEventId)
            .lt('recurring_instance_date', currentNote.recurringInstanceDate)
            .order('recurring_instance_date', { ascending: false })
            .limit(5);

          if (previousError) throw previousError;

          if (previousRows && previousRows.length > 0) {
            const previousNotes = (previousRows as NoteRow[]).map(rowToNote);
            return NextResponse.json({ currentNote, previousNotes });
          }
        } catch {
          return NextResponse.json({ currentNote, previousNotes: [] });
        }
      }

      return NextResponse.json({ currentNote, previousNotes: [] });
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch note' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const db = getSupabaseAdmin();
      const { data: existingRow, error: fetchError } = await db.from('notes').select('*').eq('id', id).maybeSingle();

      if (fetchError) throw fetchError;
      if (!existingRow) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (existingRow.created_by !== user.uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const updateRow = noteToRow(body);

      const { data: updatedRow, error: updateError } = await db
        .from('notes')
        .update(updateRow)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      return NextResponse.json(rowToNote(updatedRow as NoteRow));
    } catch {
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const db = getSupabaseAdmin();

      const { data: existingRow, error: fetchError } = await db.from('notes').select('created_by').eq('id', id).maybeSingle();
      if (fetchError) throw fetchError;
      if (!existingRow) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (existingRow.created_by !== user.uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const { error: deleteError } = await db.from('notes').delete().eq('id', id);
      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }
  });
}
