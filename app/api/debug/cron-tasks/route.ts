/**
 * Debug endpoint: Mirrors the daily-reminders cron job's Firestore queries so
 * we can inspect exactly which tasks the cron finds (and excludes) for each
 * user. Safe to remove once the notification pipeline is confirmed healthy.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Task, UserSettings } from '@/types';
import { startOfDay, addDays, isBefore, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { withAuth } from '@/lib/auth-middleware';

const BERLIN_TZ = 'Europe/Berlin';

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
  try {
    const usersSnapshot = await adminDb.collection('userSettings').get();
    const allUsersData = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const settings = userDoc.data() as UserSettings;

      const dailyReminderSettings = settings.notifications?.dailyTaskReminder;
      const hasSlackEnabled = !!(dailyReminderSettings?.slack);

      const userEmail = settings.email || null;
      const userName = settings.displayName || 'Unknown';

      if (!userEmail) {
        allUsersData.push({ userId, userName, skipped: 'no email in userSettings' });
        continue;
      }

      const projectsSnapshot = await adminDb.collection('projects').get();
      const userProjectIds = new Set<string>();
      const projectNames = new Map<string, string>();

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        projectNames.set(projectDoc.id, projectData.name || 'Unnamed');
        const members = projectData.members || [];
        const isMember = members.some((m: { userId: string }) => m.userId === userId);
        if (isMember) userProjectIds.add(projectDoc.id);
      }

      const tasksSnapshot = await adminDb
        .collection('tasks')
        .where('owner', '==', userEmail)
        .get();

      const rawTasks = tasksSnapshot.docs.map(doc => {
        const data = doc.data() as Partial<Task>;
        return {
          id: doc.id,
          title: data.title || data.description || '(no title)',
          status: data.status,
          deadline: data.deadline,
          owner: data.owner,
          projectId: data.projectId,
          projectName: data.projectId
            ? projectNames.get(data.projectId) || '(unknown/deleted project)'
            : '(no projectId)',
          inUserProjects: data.projectId ? userProjectIds.has(data.projectId) : false,
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

      // Look up tasks that *should* belong to this user but were stored with
      // a non-email owner (the legacy displayName bug). This is the most
      // common reason a task silently disappears from the reminder query.
      const legacyOwnerSnapshot = await adminDb
        .collection('tasks')
        .where('owner', '==', userName)
        .get();
      const legacyOwnerTasks = legacyOwnerSnapshot.docs.map(doc => {
        const data = doc.data() as Partial<Task>;
        return {
          id: doc.id,
          title: data.title || data.description || '(no title)',
          owner: data.owner,
          deadline: data.deadline,
          status: data.status,
          projectName: data.projectId
            ? projectNames.get(data.projectId) || '(unknown/deleted project)'
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
