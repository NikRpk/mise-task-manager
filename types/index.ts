export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  description: string;
  completed: boolean;
}

export interface Task {
  id: string;
  description: string; // Rich text/markdown support
  subTasks: SubTask[];
  deadline: string | null; // ISO date string
  status: TaskStatus;
  links: string[];
  owner: string;
  projectId: string;
  priority: Priority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterOptions {
  deadline?: 'overdue' | 'today' | 'this-week' | 'this-month' | 'future';
  status?: TaskStatus[];
  owner?: string[];
  priority?: Priority[];
  tags?: string[];
}

// ========== NOTES & TEMPLATES ==========

export interface NoteTask {
  id: string;
  title: string;
  owner: string;
  deadline: string | null;
  createdTaskId?: string; // Links to actual Task if created
}

export interface Note {
  id: string;
  title: string;
  content: string; // Single rich text content field
  tasks: NoteTask[];
  calendarEventId: string | null; // Google Calendar event ID
  calendarEventLink: string | null;
  templateId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  content: string; // HTML template content
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink: string;
  description?: string | null;
}
