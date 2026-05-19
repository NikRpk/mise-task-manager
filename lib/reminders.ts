/**
 * Deadline grouping logic for daily reminders.
 * Extracted here so it can be unit-tested independently of the cron route.
 */

import { Task } from '@/types';
import { startOfDay, addDays, isBefore, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const REMINDERS_TZ = 'Europe/Berlin';

export interface GroupedTasks {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
}

/**
 * Groups tasks into overdue / today / tomorrow buckets relative to the
 * current moment in the Europe/Berlin timezone.
 *
 * All comparisons are done in Berlin TZ so that the 8 AM cron running in
 * UTC correctly reflects the user's local calendar day.
 *
 * @param tasks - Flat list of tasks to group (may include any status)
 * @returns Buckets containing only non-done tasks that have a deadline
 */
export function groupTasksByDeadline(tasks: Task[]): GroupedTasks {
  const nowBerlin = toZonedTime(new Date(), REMINDERS_TZ);
  const todayBerlin = startOfDay(nowBerlin);
  const tomorrowBerlin = addDays(todayBerlin, 1);

  const parseDeadlineBerlin = (deadline: string) =>
    toZonedTime(new Date(deadline), REMINDERS_TZ);

  const overdue = tasks.filter(
    task =>
      task.deadline &&
      task.status !== 'done' &&
      isBefore(parseDeadlineBerlin(task.deadline), todayBerlin)
  );

  const today = tasks.filter(
    task =>
      task.deadline &&
      task.status !== 'done' &&
      isSameDay(parseDeadlineBerlin(task.deadline), todayBerlin)
  );

  const tomorrow = tasks.filter(
    task =>
      task.deadline &&
      task.status !== 'done' &&
      isSameDay(parseDeadlineBerlin(task.deadline), tomorrowBerlin)
  );

  return { overdue, today, tomorrow };
}
