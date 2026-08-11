/**
 * Row <-> App-type mappers
 *
 * The Postgres schema (see db/schema.sql) uses snake_case columns; the app's
 * TypeScript types (types/index.ts) — inherited from the Firestore version —
 * use camelCase. These helpers keep that translation in one place instead of
 * scattered through every API route.
 */
import { Task, Project, ProjectMember, Note, NoteTemplate, UserSettings, Person } from '@/types';

// ============================================================================
// TASKS
// ============================================================================

export interface TaskRow {
  id: string;
  project_id: string;
  title: string | null;
  description: string | null;
  status: string;
  owner: string;
  priority: string;
  topic_id: string | null;
  deadline: string | null;
  images: string[] | null;
  sub_tasks: unknown;
  comments: unknown;
  status_history: unknown;
  is_recurring: boolean | null;
  recurrence_interval: number | null;
  recurrence_unit: string | null;
  parent_recurring_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    subTasks: (row.sub_tasks as Task['subTasks']) || [],
    deadline: row.deadline,
    status: row.status as Task['status'],
    owner: row.owner,
    projectId: row.project_id,
    priority: row.priority as Task['priority'],
    topicId: row.topic_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: row.images || [],
    comments: (row.comments as Task['comments']) || [],
    statusHistory: (row.status_history as Task['statusHistory']) || [],
    isRecurring: row.is_recurring || undefined,
    recurrenceInterval: row.recurrence_interval || undefined,
    recurrenceUnit: (row.recurrence_unit as Task['recurrenceUnit']) || undefined,
    parentRecurringTaskId: row.parent_recurring_task_id || undefined,
  };
}

/** Maps a client-shaped (partial) Task to snake_case columns for insert/update. */
export function taskToRow(task: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description;
  if (task.subTasks !== undefined) row.sub_tasks = task.subTasks;
  if (task.deadline !== undefined) row.deadline = task.deadline;
  if (task.status !== undefined) row.status = task.status;
  if (task.owner !== undefined) row.owner = task.owner;
  if (task.projectId !== undefined) row.project_id = task.projectId;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.topicId !== undefined) row.topic_id = task.topicId;
  if (task.images !== undefined) row.images = task.images;
  if (task.comments !== undefined) row.comments = task.comments;
  if (task.statusHistory !== undefined) row.status_history = task.statusHistory;
  if (task.isRecurring !== undefined) row.is_recurring = task.isRecurring;
  if (task.recurrenceInterval !== undefined) row.recurrence_interval = task.recurrenceInterval;
  if (task.recurrenceUnit !== undefined) row.recurrence_unit = task.recurrenceUnit;
  if (task.parentRecurringTaskId !== undefined) row.parent_recurring_task_id = task.parentRecurringTaskId;

  return row;
}

// ============================================================================
// PROJECTS
// ============================================================================

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_by: string | null;
  settings: unknown;
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberRow {
  project_id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  added_at: string;
  added_by: string | null;
}

export function rowToProjectMember(row: ProjectMemberRow): ProjectMember {
  return {
    userId: row.user_id,
    email: row.email || undefined,
    displayName: row.display_name || undefined,
    role: row.role as ProjectMember['role'],
    addedAt: row.added_at,
    addedBy: row.added_by || undefined,
  };
}

export function rowToProject(row: ProjectRow, members?: ProjectMemberRow[]): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settings: (row.settings as Project['settings']) || undefined,
    members: members ? members.map(rowToProjectMember) : undefined,
  };
}

// ============================================================================
// NOTES
// ============================================================================

export interface NoteRow {
  id: string;
  title: string;
  agenda: string | null;
  content: string | null;
  tasks: unknown;
  calendar_event_id: string | null;
  calendar_event_link: string | null;
  calendar_event_data: unknown;
  google_doc_id: string | null;
  google_doc_url: string | null;
  recurring_event_id: string | null;
  recurring_instance_date: string | null;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    agenda: row.agenda || '',
    content: row.content || '',
    tasks: (row.tasks as Note['tasks']) || [],
    calendarEventId: row.calendar_event_id,
    calendarEventLink: row.calendar_event_link,
    calendarEventData: (row.calendar_event_data as Note['calendarEventData']) || null,
    googleDocId: row.google_doc_id,
    googleDocUrl: row.google_doc_url,
    recurringEventId: row.recurring_event_id,
    recurringInstanceDate: row.recurring_instance_date,
    templateId: row.template_id || 'default',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function noteToRow(note: Partial<Note>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (note.title !== undefined) row.title = note.title;
  if (note.agenda !== undefined) row.agenda = note.agenda;
  if (note.content !== undefined) row.content = note.content;
  if (note.tasks !== undefined) row.tasks = note.tasks;
  if (note.calendarEventId !== undefined) row.calendar_event_id = note.calendarEventId;
  if (note.calendarEventLink !== undefined) row.calendar_event_link = note.calendarEventLink;
  if (note.calendarEventData !== undefined) row.calendar_event_data = note.calendarEventData;
  if (note.googleDocId !== undefined) row.google_doc_id = note.googleDocId;
  if (note.googleDocUrl !== undefined) row.google_doc_url = note.googleDocUrl;
  if (note.recurringEventId !== undefined) row.recurring_event_id = note.recurringEventId;
  if (note.recurringInstanceDate !== undefined) row.recurring_instance_date = note.recurringInstanceDate;
  if (note.templateId !== undefined) row.template_id = note.templateId;

  return row;
}

// ============================================================================
// NOTE TEMPLATES
// ============================================================================

export interface NoteTemplateRow {
  id: string;
  name: string;
  content: string;
  created_by: string;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export function rowToNoteTemplate(row: NoteTemplateRow): NoteTemplate {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDefault: row.is_default || false,
  };
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export interface UserSettingsRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  color_scheme: string;
  timezone: string;
  note_template: string | null;
  default_project_id: string | null;
  feedback_webhook_url: string | null;
  google_calendar_refresh_token: string | null;
  google_calendar_connected_at: string | null;
  notifications: unknown;
  slack_templates: unknown;
}

export function rowToUserSettings(row: UserSettingsRow): UserSettings {
  return {
    email: row.email || undefined,
    displayName: row.display_name || undefined,
    colorScheme: row.color_scheme,
    timezone: row.timezone,
    noteTemplate: row.note_template || undefined,
    defaultProjectId: row.default_project_id || undefined,
    feedbackWebhookUrl: row.feedback_webhook_url || undefined,
    googleCalendarRefreshToken: row.google_calendar_refresh_token || undefined,
    googleCalendarConnectedAt: row.google_calendar_connected_at || undefined,
    notifications: (row.notifications as UserSettings['notifications']) || undefined,
    slackTemplates: (row.slack_templates as UserSettings['slackTemplates']) || undefined,
  };
}

export function userSettingsToRow(settings: Partial<UserSettings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (settings.email !== undefined) row.email = settings.email;
  if (settings.displayName !== undefined) row.display_name = settings.displayName;
  if (settings.colorScheme !== undefined) row.color_scheme = settings.colorScheme;
  if (settings.timezone !== undefined) row.timezone = settings.timezone;
  if (settings.noteTemplate !== undefined) row.note_template = settings.noteTemplate;
  if (settings.defaultProjectId !== undefined) row.default_project_id = settings.defaultProjectId;
  if (settings.feedbackWebhookUrl !== undefined) row.feedback_webhook_url = settings.feedbackWebhookUrl;
  if (settings.googleCalendarRefreshToken !== undefined) row.google_calendar_refresh_token = settings.googleCalendarRefreshToken;
  if (settings.googleCalendarConnectedAt !== undefined) row.google_calendar_connected_at = settings.googleCalendarConnectedAt;
  if (settings.notifications !== undefined) row.notifications = settings.notifications;
  if (settings.slackTemplates !== undefined) row.slack_templates = settings.slackTemplates;

  return row;
}

// ============================================================================
// PEOPLE
// ============================================================================

export interface PersonRow {
  email: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  source: string;
  organization_id: string | null;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export function rowToPerson(row: PersonRow): Person {
  return {
    id: row.email,
    email: row.email,
    displayName: row.display_name,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    photoUrl: row.photo_url || undefined,
    source: row.source as Person['source'],
    organizationId: row.organization_id || undefined,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
