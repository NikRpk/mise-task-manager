/**
 * Single note template API
 * Update and delete specific template
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();
      
      // Prevent editing default template
      if (id === 'default') {
        return NextResponse.json(
          { error: 'Cannot edit default template' },
          { status: 400 }
        );
      }
      
      const templateRef = adminDb.collection('noteTemplates').doc(id);
      const templateDoc = await templateRef.get();
      
      if (!templateDoc.exists) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      
      const templateData = templateDoc.data();
      
      // Check if user owns this template
      if (templateData?.createdBy !== user.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      // Update template
      const updatedTemplate = {
        name: body.name,
        sections: body.sections,
        updatedAt: new Date().toISOString(),
      };
      
      await templateRef.update(updatedTemplate);
      
      return NextResponse.json({ id, ...templateData, ...updatedTemplate });
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
      
      // Prevent deleting default template
      if (id === 'default') {
        return NextResponse.json(
          { error: 'Cannot delete default template' },
          { status: 400 }
        );
      }
      
      const templateRef = adminDb.collection('noteTemplates').doc(id);
      const templateDoc = await templateRef.get();
      
      if (!templateDoc.exists) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      
      const templateData = templateDoc.data();
      
      // Check if user owns this template
      if (templateData?.createdBy !== user.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      await templateRef.delete();
      
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
