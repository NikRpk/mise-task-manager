/**
 * Debug endpoint: Mirrors the daily-reminders cron job's queries so we can
 * inspect exactly which tasks the cron finds (and excludes) for each user.
 * Safe to remove once the notification pipeline is confirmed healthy.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { UserSettings } from '@/types';
import { startOfDay, addDays, isBefore, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { withAuth } from '@/lib/auth-middleware';
import { rowToTask, TaskRow } from '@/lib/db-mappers';

const BERLIN_TZ = 'Europe/Berlin';

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const db = getSupabaseAdmin();
      const { data: settingsRows } = await db.from('mise_user_settings').select('*');
      const allUsersData = [];

      for (const settingsRow of settingsRows || []) {
        const userId = settingsRow.user_id as string;
        const settings = {
          email: settingsRow.email,
          displayName: settingsRow.display_name,
          notifications: settingsRow.notifications,
        } as UserSettings;

        const dailyReminderSettings = settings.notifications?.dailyTaskReminder;
        const hasSlackEnabled = !!(dailyReminderSettings?.slack);

        const userEmail = settings.email || null;
        const userName = settings.displayName || 'Unknown';

        if (!userEmail) {
          allUsersData.push({ userId, userName, skipped: 'no email in userSettings' });
          continue;
        }

        const [{ data: projectRows }, { data: memberRows }, { data: taskRows }, { data: legacyOwnerRows }] = await Promise.all([
          db.from('projects').select('id, name'),
          db.from('project_members').select('project_id').eq('user_id', userId),
          db.from('tasks').select('*').eq('owner', userEmail),
          db.from('tasks').select('*').eq('owner', userName),
        ]);

        const projectNames = new Map<string, string>();
        (projectRows || []).forEach(p => projectNames.set(p.id, p.name || 'Unnamed'));
        const userProjectIds = new Set((memberRows || []).map(m => m.project_id));

        const rawTasks = ((taskRows as TaskRow[]) || []).map(row => {
          const t = rowToTask(row);
          return {
            id: t.id,
            title: t.title || t.description || '(no title)',
            status: t.status,
            deadline: t.deadline,
            owner: t.owner,
            projectId: t.projectId,
            projectName: t.projectId
              ? projectNames.get(t.projectId) || '(unknown/deleted project)'
              : '(no projectId)',
            inUserProjects: t.projectId ? userProjectIds.has(t.projectId) : false,
          };
        });

        const memberTasks = rawTasks.filter(t => t.inUserProjects);

        const nowBerlin = toZonedTime(new Date(), BERLIN_TZ);
        const todayBerlin = startOfDay(nowBerlin);
        const tomorrowBerlin = addDays(todayBerlin, 1);
        const parseDeadlineBerlin = (d: string) => toZonedTime(new Date(d), BERLIN_TZ);

        const classified = memberTasks.map(t => {
          if (t.status === 'done') return { ...t, bucket: 'ignored_done' };
          if (!t.deadline) return { ...t, bucket: 'ignored_no_deadline' };
          const dl = parseDeadlineBerlin(t.deadline);
          if (isBefore(dl, todayBerlin)) return { ...t, bucket: 'overdue' };
          if (isSameDay(dl, todayBerlin)) return { ...t, bucket: 'today' };
          if (isSameDay(dl, tomorrowBerlin)) return { ...t, bucket: 'tomorrow' };
          return { ...t, bucket: 'future' };
        });

        const legacyOwnerTasks = ((legacyOwnerRows as TaskRow[]) || []).map(row => {
          const t = rowToTask(row);
          return {
            id: t.id,
            title: t.title || t.description || '(no title)',
            owner: t.owner,
            deadline: t.deadline,
            status: t.status,
            projectName: t.projectId
              ? projectNames.get(t.projectId) || '(unknown/deleted project)'
              : '(no projectId)',
          };
        });

        const excludedByMembership = rawTasks.filter(t => !t.inUserProjects);

        allUsersData.push({
          userId,
          userName,
          userEmail,
          hasSlackEnabled,
          memberOfProjects: Array.from(userProjectIds),
          totalTasksFoundByOwnerQuery: rawTasks.length,
          tasksExcludedByMembershipFilter: excludedByMembership,
          legacyOwnerTasksByDisplayName: legacyOwnerTasks,
          cronWillSend: classified.filter(t =>
            ['overdue', 'today', 'tomorrow'].includes(t.bucket)
          ).length,
          allTasksWithBucket: classified,
          buckets: {
            overdue: classified.filter(t => t.bucket === 'overdue').length,
            today: classified.filter(t => t.bucket === 'today').length,
            tomorrow: classified.filter(t => t.bucket === 'tomorrow').length,
            future: classified.filter(t => t.bucket === 'future').length,
            ignored: classified.filter(t => t.bucket.startsWith('ignored')).length,
          },
        });
      }

      return NextResponse.json({ debug: true, users: allUsersData });
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  });
}
