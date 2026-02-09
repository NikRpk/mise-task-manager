/**
 * Custom hook for calculating daily task completion statistics
 */

import { useMemo } from 'react';
import { Task } from '@/types';
import { parseISO } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';

interface DailyStatsResult {
  completedToday: number;
  totalTasks: number;
  percentComplete: number;
}

/**
 * Hook to calculate how many tasks were completed today
 * @param tasks - Array of tasks
 * @param userTimezone - User's timezone (e.g., 'Europe/Berlin')
 * @returns Statistics about today's completions
 */
export function useDailyStats(tasks: Task[], userTimezone: string = 'Europe/Berlin'): DailyStatsResult {
  const stats = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        completedToday: 0,
        totalTasks: 0,
        percentComplete: 0,
      };
    }

    // Get today's date in user's timezone
    const now = new Date();
    const todayInUserTz = toZonedTime(now, userTimezone);
    const todayDateString = format(todayInUserTz, 'yyyy-MM-dd', { timeZone: userTimezone });

    // Count tasks completed today by checking statusHistory
    const completedToday = tasks.filter(task => {
      // Task must be currently done
      if (task.status !== 'done') return false;

      // Check statusHistory for when it was marked as done
      if (!task.statusHistory || task.statusHistory.length === 0) {
        // Fallback: if no history but task is done, check updatedAt
        const updatedDate = toZonedTime(parseISO(task.updatedAt), userTimezone);
        const updatedDateString = format(updatedDate, 'yyyy-MM-dd', { timeZone: userTimezone });
        return updatedDateString === todayDateString;
      }

      // Find the most recent completion in history
      const completionEntry = task.statusHistory
        .filter(h => h.toStatus === 'done')
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())[0];

      if (!completionEntry) return false;

      // Check if completion happened today
      const completionDate = toZonedTime(parseISO(completionEntry.changedAt), userTimezone);
      const completionDateString = format(completionDate, 'yyyy-MM-dd', { timeZone: userTimezone });
      
      return completionDateString === todayDateString;
    }).length;

    const percentComplete = tasks.length > 0 ? Math.round((completedToday / tasks.length) * 100) : 0;

    return {
      completedToday,
      totalTasks: tasks.length,
      percentComplete,
    };
  }, [tasks, userTimezone]);

  return stats;
}
