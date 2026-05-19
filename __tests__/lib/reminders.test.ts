/**
 * Tests for groupTasksByDeadline — the core logic of the daily reminder cron.
 *
 * All tests pin the system clock to 2026-05-07T10:00:00Z (UTC),
 * which is 2026-05-07T12:00:00+02:00 (Europe/Berlin / CEST).
 * "Today" in Berlin is therefore 2026-05-07.
 */

import { groupTasksByDeadline } from '@/lib/reminders';
import { Task } from '@/types';

const BASE_UTC = '2026-05-07T10:00:00.000Z';

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    description: '',
    subTasks: [],
    deadline: null,
    status: 'todo',
    owner: 'user@example.com',
    projectId: 'proj-1',
    priority: 'medium',
    images: [],
    comments: [],
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(BASE_UTC));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('groupTasksByDeadline', () => {
  describe('overdue bucket', () => {
    it('includes tasks with a past deadline', () => {
      const task = makeTask({ id: 't1', deadline: '2026-05-06' });
      const { overdue } = groupTasksByDeadline([task]);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].id).toBe('t1');
    });

    it('includes tasks from multiple days ago', () => {
      const tasks = [
        makeTask({ id: 'old1', deadline: '2026-01-01' }),
        makeTask({ id: 'old2', deadline: '2026-05-05' }),
      ];
      const { overdue } = groupTasksByDeadline(tasks);
      expect(overdue).toHaveLength(2);
    });

    it('excludes done tasks even if deadline is past', () => {
      const task = makeTask({ id: 'done1', deadline: '2026-05-06', status: 'done' });
      const { overdue } = groupTasksByDeadline([task]);
      expect(overdue).toHaveLength(0);
    });
  });

  describe('today bucket', () => {
    it('includes tasks due today in Berlin timezone', () => {
      const task = makeTask({ id: 'today1', deadline: '2026-05-07' });
      const { today } = groupTasksByDeadline([task]);
      expect(today).toHaveLength(1);
      expect(today[0].id).toBe('today1');
    });

    it('excludes done tasks due today', () => {
      const task = makeTask({ id: 'done2', deadline: '2026-05-07', status: 'done' });
      const { today } = groupTasksByDeadline([task]);
      expect(today).toHaveLength(0);
    });

    it('includes today ISO date-time strings in Berlin tz', () => {
      // 2026-05-07T22:00:00Z = 2026-05-08T00:00:00+02:00 — this is tomorrow in Berlin
      // 2026-05-07T08:00:00Z = 2026-05-07T10:00:00+02:00 — this is today in Berlin
      const task = makeTask({ id: 'today2', deadline: '2026-05-07T08:00:00.000Z' });
      const { today } = groupTasksByDeadline([task]);
      expect(today).toHaveLength(1);
    });
  });

  describe('tomorrow bucket', () => {
    it('includes tasks due tomorrow', () => {
      const task = makeTask({ id: 'tmr1', deadline: '2026-05-08' });
      const { tomorrow } = groupTasksByDeadline([task]);
      expect(tomorrow).toHaveLength(1);
      expect(tomorrow[0].id).toBe('tmr1');
    });

    it('excludes done tasks due tomorrow', () => {
      const task = makeTask({ id: 'done3', deadline: '2026-05-08', status: 'done' });
      const { tomorrow } = groupTasksByDeadline([task]);
      expect(tomorrow).toHaveLength(0);
    });
  });

  describe('no-deadline and future tasks', () => {
    it('ignores tasks without a deadline', () => {
      const task = makeTask({ id: 'nd1', deadline: null });
      const { overdue, today, tomorrow } = groupTasksByDeadline([task]);
      expect(overdue).toHaveLength(0);
      expect(today).toHaveLength(0);
      expect(tomorrow).toHaveLength(0);
    });

    it('ignores tasks due in the future beyond tomorrow', () => {
      const task = makeTask({ id: 'fut1', deadline: '2026-05-10' });
      const { overdue, today, tomorrow } = groupTasksByDeadline([task]);
      expect(overdue).toHaveLength(0);
      expect(today).toHaveLength(0);
      expect(tomorrow).toHaveLength(0);
    });
  });

  describe('Berlin timezone edge case', () => {
    it('correctly classifies tasks when UTC is midnight but Berlin is still yesterday', () => {
      // 2026-05-07T22:30:00Z = 2026-05-08T00:30:00+02:00 (Berlin)
      // "Today" in Berlin is now 2026-05-08, so 2026-05-07 is overdue
      jest.setSystemTime(new Date('2026-05-07T22:30:00.000Z'));

      const wasToday = makeTask({ id: 'edge1', deadline: '2026-05-07' });
      const nowToday = makeTask({ id: 'edge2', deadline: '2026-05-08' });
      const nowTomorrow = makeTask({ id: 'edge3', deadline: '2026-05-09' });

      const { overdue, today, tomorrow } = groupTasksByDeadline([wasToday, nowToday, nowTomorrow]);

      expect(overdue.map(t => t.id)).toContain('edge1');
      expect(today.map(t => t.id)).toContain('edge2');
      expect(tomorrow.map(t => t.id)).toContain('edge3');
    });
  });

  describe('empty and mixed inputs', () => {
    it('returns empty buckets for an empty task list', () => {
      const { overdue, today, tomorrow } = groupTasksByDeadline([]);
      expect(overdue).toHaveLength(0);
      expect(today).toHaveLength(0);
      expect(tomorrow).toHaveLength(0);
    });

    it('correctly distributes a mixed list across all buckets', () => {
      const tasks = [
        makeTask({ id: 'o1', deadline: '2026-05-06' }),
        makeTask({ id: 'o2', deadline: '2026-05-01' }),
        makeTask({ id: 't1', deadline: '2026-05-07' }),
        makeTask({ id: 't2', deadline: '2026-05-07' }),
        makeTask({ id: 'r1', deadline: '2026-05-08' }),
        makeTask({ id: 'done', deadline: '2026-05-06', status: 'done' }),
        makeTask({ id: 'no-dl', deadline: null }),
        makeTask({ id: 'fut', deadline: '2026-06-01' }),
      ];

      const { overdue, today, tomorrow } = groupTasksByDeadline(tasks);

      expect(overdue).toHaveLength(2);
      expect(today).toHaveLength(2);
      expect(tomorrow).toHaveLength(1);
    });
  });
});
