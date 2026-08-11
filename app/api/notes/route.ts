/**
 * Notes API
 * CRUD operations for meeting notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rowToNote, noteToRow, NoteRow } from '@/lib/db-mappers';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const db = getSupabaseAdmin();
      const { data: rows, error } = await db
        .from('notes')
        .select('*')
        .eq('created_by', user.uid)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const notes = ((rows as NoteRow[]) || []).map(rowToNote);

      return NextResponse.json(notes);
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();
      const db = getSupabaseAdmin();

      const insertRow = {
        ...noteToRow(body),
        title: body.title || 'Untitled Note',
        agenda: body.agenda || '',
        content: body.content || '',
        tasks: body.tasks || [],
        calendar_event_id: body.calendarEventId || null,
        calendar_event_link: body.calendarEventLink || null,
        calendar_event_data: body.calendarEventData || null,
        google_doc_id: null,
        google_doc_url: null,
        recurring_event_id: body.recurringEventId || null,
        recurring_instance_date: body.recurringInstanceDate || null,
        template_id: body.templateId || 'default',
        created_by: user.uid,
      };

      const { data: row, error } = await db.from('notes').insert(insertRow).select('*').single();
      if (error) throw error;

      return NextResponse.json(rowToNote(row as NoteRow), { status: 201 });
    } catch {
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }
  });
}
