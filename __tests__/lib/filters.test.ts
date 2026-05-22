/**
 * Tests for task filtering logic
 * Critical: Date calculations are prone to timezone and edge case bugs
 */

import { filterTasks } from '@/lib/filters';
import { Task, FilterOptions } from '@/types';

// Helper to create a mock task
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    subTasks: [],
    deadline: null,
    status: 'todo',
    owner: 'John Doe',
    projectId: 'project-1',
    priority: 'medium',
    images: [],
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('filterTasks', () => {
  describe('Deadline Filtering', () => {
    const now = new Date('2026-02-03T12:00:00Z'); // Use fixed date for tests
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });

    test('filters overdue tasks correctly', () => {
      const tasks = [
        createMockTask({ id: '1', deadline: '2026-02-01T00:00:00Z', status: 'todo' }), // overdue
        createMockTask({ id: '2', deadline: '2026-02-05T00:00:00Z', status: 'todo' }), // future
        createMockTask({ id: '3', deadline: '2026-02-01T00:00:00Z', status: 'done' }), // overdue but done
      ];

      const result = filterTasks(tasks, { deadline: 'overdue' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('excludes done tasks from overdue filter', () => {
      const tasks = [
        createMockTask({ deadline: '2026-01-01T00:00:00Z', status: 'done' }),
      ];

      const result = filterTasks(tasks, { deadline: 'overdue' });

      expect(result).toHaveLength(0);
    });

    test('filters today tasks correctly', () => {
      const tasks = [
        createMockTask({ id: '1', deadline: '2026-02-03T10:00:00Z', status: 'todo' }), // today
        createMockTask({ id: '2', deadline: '2026-02-02T10:00:00Z', status: 'todo' }), // yesterday (overdue, included)
        createMockTask({ id: '3', deadline: '2026-02-04T10:00:00Z', status: 'todo' }), // tomorrow (excluded)
        createMockTask({ id: '4', deadline: '2026-02-01T10:00:00Z', status: 'done' }), // past but done (excluded)
      ];

      const result = filterTasks(tasks, { deadline: 'today' });

      // today + overdue non-done tasks are included
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toContain('1');
      expect(result.map(t => t.id)).toContain('2');
    });

    test('filters this-week tasks correctly', () => {
      const tasks = [
        createMockTask({ id: '1', deadline: '2026-02-05T00:00:00Z', status: 'todo' }), // within week
        createMockTask({ id: '2', deadline: '2026-02-11T00:00:00Z', status: 'todo' }), // next week (excluded)
        createMockTask({ id: '3', deadline: '2026-02-01T00:00:00Z', status: 'todo' }), // past overdue (included)
        createMockTask({ id: '4', deadline: '2026-02-01T00:00:00Z', status: 'done' }), // past but done (excluded)
      ];

      const result = filterTasks(tasks, { deadline: 'this-week' });

      // within-week + overdue non-done tasks are included
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toContain('1');
      expect(result.map(t => t.id)).toContain('3');
    });

    test('filters this-month tasks correctly', () => {
      const tasks = [
        createMockTask({ id: '1', deadline: '2026-02-15T00:00:00Z', status: 'todo' }), // this month
        createMockTask({ id: '2', deadline: '2026-03-05T00:00:00Z', status: 'todo' }), // next month (excluded)
        createMockTask({ id: '3', deadline: '2026-01-15T00:00:00Z', status: 'todo' }), // last month overdue (included)
        createMockTask({ id: '4', deadline: '2026-01-15T00:00:00Z', status: 'done' }), // last month but done (excluded)
      ];

      const result = filterTasks(tasks, { deadline: 'this-month' });

      // this-month + overdue non-done tasks are included
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toContain('1');
      expect(result.map(t => t.id)).toContain('3');
    });

    test('filters future tasks correctly', () => {
      const tasks = [
        createMockTask({ id: '1', deadline: '2026-02-05T00:00:00Z' }), // future
        createMockTask({ id: '2', deadline: '2026-02-01T00:00:00Z' }), // past
      ];

      const result = filterTasks(tasks, { deadline: 'future' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('handles tasks without deadlines', () => {
      const tasks = [
        createMockTask({ id: '1', deadline: null }),
        createMockTask({ id: '2', deadline: '2026-02-01T00:00:00Z', status: 'todo' }),
      ];

      const result = filterTasks(tasks, { deadline: 'overdue' });

      // Task without deadline should pass through (filter only applies to tasks WITH deadlines)
      expect(result).toHaveLength(2);
    });
  });

  describe('Status Filtering', () => {
    test('filters by single status', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo' }),
        createMockTask({ id: '2', status: 'done' }),
        createMockTask({ id: '3', status: 'in-progress' }),
      ];

      const result = filterTasks(tasks, { status: ['todo'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('filters by multiple statuses', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo' }),
        createMockTask({ id: '2', status: 'done' }),
        createMockTask({ id: '3', status: 'in-progress' }),
      ];

      const result = filterTasks(tasks, { status: ['todo', 'done'] });

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toContain('1');
      expect(result.map(t => t.id)).toContain('2');
    });

    test('returns all tasks when no status filter', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'todo' }),
        createMockTask({ id: '2', status: 'done' }),
      ];

      const result = filterTasks(tasks, {});

      expect(result).toHaveLength(2);
    });
  });

  describe('Owner Filtering', () => {
    test('filters by single owner', () => {
      const tasks = [
        createMockTask({ id: '1', owner: 'Alice' }),
        createMockTask({ id: '2', owner: 'Bob' }),
      ];

      const result = filterTasks(tasks, { owner: ['Alice'] });

      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('Alice');
    });

    test('filters by multiple owners', () => {
      const tasks = [
        createMockTask({ id: '1', owner: 'Alice' }),
        createMockTask({ id: '2', owner: 'Bob' }),
        createMockTask({ id: '3', owner: 'Charlie' }),
      ];

      const result = filterTasks(tasks, { owner: ['Alice', 'Bob'] });

      expect(result).toHaveLength(2);
    });
  });

  describe('Priority Filtering', () => {
    test('filters by priority', () => {
      const tasks = [
        createMockTask({ id: '1', priority: 'high' }),
        createMockTask({ id: '2', priority: 'low' }),
        createMockTask({ id: '3', priority: 'medium' }),
      ];

      const result = filterTasks(tasks, { priority: ['high'] });

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('high');
    });
  });

  describe('Combined Filtering', () => {
    test('applies multiple filters together (AND logic)', () => {
      const tasks = [
        createMockTask({ 
          id: '1', 
          status: 'todo', 
          owner: 'Alice', 
          priority: 'high',
          deadline: '2026-02-05T00:00:00Z',
        }),
        createMockTask({ 
          id: '2', 
          status: 'done', 
          owner: 'Alice', 
          priority: 'high',
          deadline: '2026-02-05T00:00:00Z',
        }),
        createMockTask({ 
          id: '3', 
          status: 'todo', 
          owner: 'Bob', 
          priority: 'high',
          deadline: '2026-02-05T00:00:00Z',
        }),
      ];

      const result = filterTasks(tasks, {
        status: ['todo'],
        owner: ['Alice'],
        priority: ['high'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('returns empty array when no tasks match all filters', () => {
      const tasks = [
        createMockTask({ status: 'todo', owner: 'Alice' }),
      ];

      const result = filterTasks(tasks, {
        status: ['done'],
        owner: ['Alice'],
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('Topic Filtering', () => {
    test('returns tasks that match the specified topic', () => {
      const tasks = [
        createMockTask({ id: '1', topicId: 'topic-a' }),
        createMockTask({ id: '2', topicId: 'topic-b' }),
      ];
      const result = filterTasks(tasks, { topic: ['topic-a'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    test('excludes tasks without a topicId when topic filter is active', () => {
      const tasks = [
        createMockTask({ id: '1', topicId: undefined }),
        createMockTask({ id: '2', topicId: 'topic-a' }),
      ];
      const result = filterTasks(tasks, { topic: ['topic-a'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    test('excludes tasks whose topicId is not in the filter list', () => {
      const tasks = [
        createMockTask({ id: '1', topicId: 'topic-z' }),
      ];
      const result = filterTasks(tasks, { topic: ['topic-a', 'topic-b'] });
      expect(result).toHaveLength(0);
    });

    test('skips topic filter when topic array is empty', () => {
      const tasks = [
        createMockTask({ id: '1', topicId: 'topic-a' }),
        createMockTask({ id: '2', topicId: undefined }),
      ];
      const result = filterTasks(tasks, { topic: [] });
      expect(result).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty task array', () => {
      const result = filterTasks([], { status: ['todo'] });
      expect(result).toHaveLength(0);
    });

    test('handles empty filters object', () => {
      const tasks = [createMockTask(), createMockTask()];
      const result = filterTasks(tasks, {});
      expect(result).toHaveLength(2);
    });

    test('handles null/undefined deadline gracefully', () => {
      const tasks = [
        createMockTask({ deadline: null }),
        createMockTask({ deadline: undefined as unknown as string }),
      ];

      const result = filterTasks(tasks, { deadline: 'overdue' });
      
      // Tasks without deadlines pass through (deadline filter only applies to tasks with deadlines)
      expect(result).toHaveLength(2);
    });
  });
});
