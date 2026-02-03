/**
 * Create tasks from note
 * Converts note tasks into actual tasks in the project
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { Task, Note } from '@/types';
import { DEFAULT_TASK_STATUS } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { projectId } = body;
      
      if (!projectId) {
        return NextResponse.json(
          { error: 'Project ID is required' },
          { status: 400 }
        );
      }
      
      // Get the note
      const noteRef = adminDb.collection('notes').doc(id);
      const noteDoc = await noteRef.get();
      
      if (!noteDoc.exists) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      
      const noteData = noteDoc.data() as Note;
      
      // Check if user owns this note
      if (noteData.createdBy !== user.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      // Create tasks from note tasks
      const createdTasks: string[] = [];
      const tasksRef = adminDb.collection('tasks');
      
      for (const noteTask of noteData.tasks) {
        // Skip if already created
        if (noteTask.createdTaskId) {
          continue;
        }
        
        const newTask: Omit<Task, 'id'> = {
          title: noteTask.title,
          description: `Created from note: ${noteData.title}`,
          subTasks: [],
          deadline: noteTask.deadline,
          status: DEFAULT_TASK_STATUS,
          links: [],
          owner: noteTask.owner || user.displayName,
          projectId: projectId,
          priority: 'medium',
          tags: ['from-note'],
          images: [],
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          linkedNoteId: id,
        };
        
        const taskDoc = await tasksRef.add(newTask);
        createdTasks.push(taskDoc.id);
        
        // Update note task with created task ID
        noteTask.createdTaskId = taskDoc.id;
      }
      
      // Update note with task IDs
      await noteRef.update({
        tasks: noteData.tasks,
        updatedAt: new Date().toISOString(),
      });
      
      return NextResponse.json({
        success: true,
        createdTasks,
        message: `${createdTasks.length} task(s) created`,
      });
    } catch (error) {
      console.error('Error creating tasks from note:', error);
      return NextResponse.json(
        { error: 'Failed to create tasks' },
        { status: 500 }
      );
    }
  });
}
