import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { DEFAULT_PROJECT_ICON, DEFAULT_STATUS_OPTIONS, DEFAULT_PRIORITY_OPTIONS } from '@/lib/constants';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      logger.apiRequest('GET', '/api/projects', { userId: user.uid });

      // Get all projects where user is a member
      const projectsRef = adminDb.collection('projects');
      const snapshot = await projectsRef.get();

      // Filter projects where user is a member (client-side filtering)
      interface ProjectMember {
        userId: string;
        email?: string;
        displayName?: string;
        role: string;
      }
      
      interface ProjectData {
        id: string;
        members?: ProjectMember[];
        updatedAt?: string;
        [key: string]: unknown;
      }
      
      const projects = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((project: ProjectData) => {
          const members = project.members || [];
          return members.some((member: ProjectMember) => member.userId === user.uid);
        })
        .sort((a: ProjectData, b: ProjectData) => {
          const aDate = new Date(a.updatedAt || 0).getTime();
          const bDate = new Date(b.updatedAt || 0).getTime();
          return bDate - aDate;
        });

      logger.apiResponse('GET', '/api/projects', 200, undefined, {
        userId: user.uid,
        projectCount: projects.length,
      });

      return successResponse(projects);
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/projects',
        method: 'GET',
        userId: user.uid,
      });
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();

      if (!body.name || body.name.trim().length === 0) {
        throw new ValidationError('Project name is required');
      }

      logger.apiRequest('POST', '/api/projects', {
        userId: user.uid,
        projectName: body.name,
      });

      const projectsRef = adminDb.collection('projects');
      const newProjectRef = projectsRef.doc();

      const newProject = {
        id: newProjectRef.id,
        name: body.name || 'New Project',
        description: body.description || '',
        icon: body.icon || DEFAULT_PROJECT_ICON,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [
          {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: 'ADMIN',
            addedAt: new Date().toISOString(),
            addedBy: user.uid,
          },
        ],
        settings: {
          statusOptions: DEFAULT_STATUS_OPTIONS,
          priorityOptions: DEFAULT_PRIORITY_OPTIONS,
          customFields: [],
        },
      };

      await newProjectRef.set(newProject);

      logger.apiResponse('POST', '/api/projects', 201, undefined, {
        userId: user.uid,
        projectId: newProject.id,
      });

      return successResponse(newProject, 201);
    } catch (error) {
      return handleApiError(error, {
        endpoint: '/api/projects',
        method: 'POST',
        userId: user.uid,
      });
    }
  });
}
