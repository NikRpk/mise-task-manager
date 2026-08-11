/**
 * Single note template API
 * Update and delete specific template
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rowToNoteTemplate, NoteTemplateRow } from '@/lib/db-mappers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();

      if (id === 'default') {
        return NextResponse.json(
          { error: 'Cannot edit default template' },
          { status: 400 }
        );
      }

      const db = getSupabaseAdmin();
      const { data: existing, error: fetchError } = await db
        .from('note_templates')
        .select('created_by')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      if (existing.created_by !== user.uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const { data: updatedRow, error: updateError } = await db
        .from('note_templates')
        .update({ name: body.name, content: body.content })
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      return NextResponse.json(rowToNoteTemplate(updatedRow as NoteTemplateRow));
    } catch (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
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

      if (id === 'default') {
        return NextResponse.json(
          { error: 'Cannot delete default template' },
          { status: 400 }
        );
      }

      const db = getSupabaseAdmin();
      const { data: existing, error: fetchError } = await db
        .from('note_templates')
        .select('created_by')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      if (existing.created_by !== user.uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const { error: deleteError } = await db.from('note_templates').delete().eq('id', id);
      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }
  });
}
