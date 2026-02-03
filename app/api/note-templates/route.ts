/**
 * Note Templates API
 * CRUD operations for note templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { NoteTemplate } from '@/types';
import { DEFAULT_NOTE_TEMPLATE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const templatesRef = adminDb.collection('noteTemplates');
      const query = templatesRef.where('createdBy', '==', user.uid);
      const snapshot = await query.get();
      
      const templates: NoteTemplate[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NoteTemplate[];
      
      // Always include default template
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
      
      const newTemplate: Omit<NoteTemplate, 'id'> = {
        name: body.name || 'Untitled Template',
        content: body.content || '',
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: false,
      };
      
      const docRef = await adminDb.collection('noteTemplates').add(newTemplate);
      
      return NextResponse.json(
        { id: docRef.id, ...newTemplate },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }
  });
}
