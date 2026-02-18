export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  description: string;
  completed: boolean;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: TaskStatus | null; // null for initial status
  toStatus: TaskStatus;
  changedBy: string;
  changedAt: string; // ISO date string
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title?: string; // Optional title field
  description: string; // Rich text/markdown support
  subTasks: SubTask[];
  deadline: string | null; // ISO date string
  status: TaskStatus;
  owner: string;
  projectId: string;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  images?: string[];
  comments?: Comment[];
  statusHistory?: StatusHistoryEntry[]; // Track status changes
  isRecurring?: boolean; // Whether this task recurs
  recurrenceInterval?: number; // Number of units between recurrences (e.g., 2 for "every 2 weeks")
  recurrenceUnit?: 'days' | 'weeks' | 'months'; // Unit for recurrence
  parentRecurringTaskId?: string; // If this was created from a recurring task, ID of the parent
}

export interface Project {
  id: string;
  name: string;
  description: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  members?: ProjectMember[];
  settings?: ProjectSettings;
}

export type ProjectRole = 'VIEW' | 'EDIT' | 'ADMIN';

export interface ProjectMember {
  userId: string;
  email?: string;
  displayName?: string;
  role: ProjectRole;
  addedAt?: string;
  addedBy?: string;
}

export interface ProjectSettings {
  statusOptions?: StatusOption[];
  priorityOptions?: PriorityOption[];
  customFields?: CustomField[];
  [key: string]: string | number | boolean | undefined | StatusOption[] | PriorityOption[] | CustomField[];
}

export interface StatusOption {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
}

export interface PriorityOption {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}

export interface FilterOptions {
  deadline?: 'overdue' | 'today' | 'this-week' | 'this-month' | 'future';
  status?: TaskStatus[];
  owner?: string[];
  priority?: Priority[];
}

// ========== NOTES & TEMPLATES ==========

export interface NoteTask {
  id: string;
  title: string;
  owner: string;
  deadline: string | null;
  createdTaskId?: string; // Links to actual Task if created
  createInProject?: boolean; // Whether to create this task in the default project
}

export interface Note {
  id: string;
  title: string;
  content: string; // Single rich text content field
  tasks: NoteTask[];
  calendarEventId: string | null; // Google Calendar event ID
  calendarEventLink: string | null;
  calendarEventData?: CalendarEvent | null; // Full calendar event data including attendees
  googleDocId: string | null; // Google Doc ID if attached
  googleDocUrl: string | null; // Google Doc URL for easy access
  recurringEventId: string | null; // Google Calendar recurring event series ID
  recurringInstanceDate: string | null; // ISO date of this specific instance
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
  recurringEventId?: string; // ID of the recurring event series (if part of recurring series)
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    organizer?: boolean;
    self?: boolean;
    resource?: boolean; // Meeting rooms/resources have this set to true
  }>;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      uri: string;
      entryPointType: string;
    }>;
  };
}

// ========== PEOPLE & CONTACTS ==========

export interface Person {
  id: string; // email as ID
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  source: 'workspace' | 'calendar' | 'manual';
  organizationId?: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

// Auth User type (Firebase User simplified)
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ========== USER SETTINGS ==========

export interface UserSettings {
  colorScheme: string;
  displayName?: string;
  timezone?: string;
  noteTemplate?: string;
  driveFolderId?: string;
  defaultProjectId?: string;
  googleCalendarRefreshToken?: string;
  googleCalendarConnectedAt?: string;
  notifications?: {
    email?: boolean;
    desktop?: boolean;
    dailyTaskReminder?: {
      slack: boolean;
      email: boolean;
      time?: string; // Format: "HH:MM" (24-hour)
    };
  };
  slackTemplates?: {
    meetingNote?: string;
    dailyReminder?: string;
  };
}
