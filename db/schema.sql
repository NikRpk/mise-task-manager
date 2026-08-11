-- Mise — Supabase Postgres schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`) on a fresh project.
-- Replaces the Firestore collections: projects, tasks, notes, noteTemplates,
-- userSettings, people.
--
-- Design note: nested arrays that were embedded directly in Firestore documents
-- (Task.subTasks, Task.comments, Task.statusHistory, Note.tasks) are kept as
-- JSONB columns here rather than normalized into child tables. This mirrors the
-- app's existing "whole object" read/write pattern (the client always sends/
-- receives the full Task or Note object) and keeps the API route rewrite a
-- faithful, low-risk port instead of a bigger relational redesign.

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

create type project_role as enum ('VIEW', 'EDIT', 'ADMIN');
create type task_status as enum ('todo', 'in-progress', 'review', 'done');
create type task_priority as enum ('low', 'medium', 'high');
create type person_source as enum ('workspace', 'calendar', 'manual');

-- ============================================================================
-- PROJECTS
-- ============================================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  icon text default '📋',
  created_by uuid references auth.users(id) on delete set null,
  settings jsonb not null default jsonb_build_object(
    'statusOptions', '[]'::jsonb,
    'priorityOptions', '[]'::jsonb,
    'topicOptions', '[]'::jsonb,
    'customFields', '[]'::jsonb
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null, -- not FK'd to auth.users: members can be invited by email before they've signed up
  email text,
  display_name text,
  role project_role not null default 'VIEW',
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id),
  primary key (project_id, user_id)
);

create index idx_project_members_user on project_members(user_id);

-- ============================================================================
-- TASKS
-- ============================================================================

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text default '',
  description text default '',
  status task_status not null default 'todo',
  owner text not null default '', -- email, canonical identity used by the reminder cron
  priority task_priority not null default 'medium',
  topic_id text,
  deadline timestamptz,
  images text[] default '{}',
  sub_tasks jsonb not null default '[]'::jsonb,     -- SubTask[]
  comments jsonb not null default '[]'::jsonb,      -- Comment[]
  status_history jsonb not null default '[]'::jsonb, -- StatusHistoryEntry[]
  is_recurring boolean default false,
  recurrence_interval int,
  recurrence_unit text,
  parent_recurring_task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_project on tasks(project_id);
create index idx_tasks_owner on tasks(owner);

-- ============================================================================
-- NOTES
-- ============================================================================

create table notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Note',
  agenda text default '',
  content text default '',
  tasks jsonb not null default '[]'::jsonb, -- NoteTask[]
  calendar_event_id text,
  calendar_event_link text,
  calendar_event_data jsonb,
  google_doc_id text,
  google_doc_url text,
  recurring_event_id text,
  recurring_instance_date text, -- kept as ISO text to match string comparisons in the app
  template_id text default 'default',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_notes_created_by on notes(created_by);
create index idx_notes_recurring on notes(recurring_event_id, recurring_instance_date);

create table note_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_note_templates_created_by on note_templates(created_by);

-- ============================================================================
-- USER SETTINGS  (1 row per auth.users, keyed by user id)
-- ============================================================================

create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  color_scheme text not null default 'mise',
  timezone text not null default 'Europe/Berlin',
  note_template text,
  default_project_id uuid references projects(id) on delete set null,
  feedback_webhook_url text,
  google_calendar_refresh_token text,
  google_calendar_connected_at timestamptz,
  notifications jsonb not null default jsonb_build_object(
    'email', true,
    'desktop', true,
    'dailyTaskReminder', jsonb_build_object('slack', false, 'email', false, 'time', '08:00')
  ),
  slack_templates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- PEOPLE (organisation contact directory)
-- ============================================================================

create table people (
  email text primary key,
  display_name text not null,
  first_name text,
  last_name text,
  photo_url text,
  source person_source not null default 'manual',
  organization_id text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function set_updated_at();
create trigger trg_notes_updated_at before update on notes
  for each row execute function set_updated_at();
create trigger trg_note_templates_updated_at before update on note_templates
  for each row execute function set_updated_at();
create trigger trg_user_settings_updated_at before update on user_settings
  for each row execute function set_updated_at();
create trigger trg_people_updated_at before update on people
  for each row execute function set_updated_at();

-- ============================================================================
-- Auto-create a user_settings row on sign-up (mirrors ensureUserSettings())
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
--
-- All API routes in this app go through the service-role client
-- (`getSupabaseAdmin()`), which bypasses RLS — permission checks are done in
-- application code (see lib/auth-middleware.ts). RLS below is a second line
-- of defence in case a client-side Supabase call is ever made directly with
-- the user's own session/anon key.
-- ============================================================================

alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table note_templates enable row level security;
alter table user_settings enable row level security;
alter table people enable row level security;

create or replace function public.is_project_member(p_project_id uuid, p_min_role project_role default 'VIEW')
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and (
        case p_min_role
          when 'VIEW' then true
          when 'EDIT' then role in ('EDIT', 'ADMIN')
          when 'ADMIN' then role = 'ADMIN'
        end
      )
  );
$$ language sql security definer stable;

create policy "select own projects" on projects for select
  using (public.is_project_member(id));
create policy "insert own projects" on projects for insert
  with check (created_by = auth.uid());
create policy "update projects as admin" on projects for update
  using (public.is_project_member(id, 'ADMIN'));
create policy "delete projects as admin" on projects for delete
  using (public.is_project_member(id, 'ADMIN'));

create policy "select project members" on project_members for select
  using (public.is_project_member(project_id));
create policy "admins manage members" on project_members for all
  using (public.is_project_member(project_id, 'ADMIN'))
  with check (public.is_project_member(project_id, 'ADMIN'));
create policy "self-join as first admin" on project_members for insert
  with check (user_id = auth.uid());

create policy "select project tasks" on tasks for select
  using (public.is_project_member(project_id));
create policy "insert project tasks" on tasks for insert
  with check (public.is_project_member(project_id, 'EDIT'));
create policy "update project tasks" on tasks for update
  using (public.is_project_member(project_id, 'EDIT'));
create policy "delete project tasks" on tasks for delete
  using (public.is_project_member(project_id, 'EDIT'));

create policy "select own notes" on notes for select using (created_by = auth.uid());
create policy "insert own notes" on notes for insert with check (created_by = auth.uid());
create policy "update own notes" on notes for update using (created_by = auth.uid());
create policy "delete own notes" on notes for delete using (created_by = auth.uid());

create policy "select own templates" on note_templates for select using (created_by = auth.uid());
create policy "insert own templates" on note_templates for insert with check (created_by = auth.uid());
create policy "update own templates" on note_templates for update using (created_by = auth.uid());
create policy "delete own templates" on note_templates for delete using (created_by = auth.uid());

create policy "select own settings" on user_settings for select using (user_id = auth.uid());
create policy "insert own settings" on user_settings for insert with check (user_id = auth.uid());
create policy "update own settings" on user_settings for update using (user_id = auth.uid());

create policy "select people" on people for select using (auth.role() = 'authenticated');
