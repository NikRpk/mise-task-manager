/**
 * Note Templates API
 * CRUD operations for note templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_NOTE_TEMPLATE } from '@/lib/constants';
import { rowToNoteTemplate, NoteTemplateRow } from '@/lib/db-mappers';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const db = getSupabaseAdmin();
      const { data: rows, error } = await db
        .from('note_templates')
        .select('*')
        .eq('created_by', user.uid);

      if (error) throw error;

      const templates = ((rows as NoteTemplateRow[]) || []).map(rowToNoteTemplate);

      const hasDefault = templates.some(t => t.id === 'default');
      if (!hasDefault) {
        templates.unshift({
          id: DEFAULT_NOTE_TEMPLATE.id,
          name: DEFAULT_NOTE_TEMPLATE.name,
          content: DEFAULT_NOTE_TEMPLATE.content,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true,
        });
      }

      return NextResponse.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
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

      const { data: row, error } = await db
        .from('note_templates')
        .insert({
          name: body.name || 'Untitled Template',
          content: body.content || '',
          created_by: user.uid,
          is_default: false,
        })
        .select('*')
        .single();

      if (error) throw error;

      return NextResponse.json(rowToNoteTemplate(row as NoteTemplateRow), { status: 201 });
    } catch (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }
  });
}
