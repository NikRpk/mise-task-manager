/**
 * Tests for Slack template rendering
 */

import Handlebars from 'handlebars';
import { DEFAULT_SLACK_TEMPLATES } from '@/lib/slack-client';

describe('Slack Template Rendering', () => {
  describe('Daily Reminder Template', () => {
    it('should render task titles correctly in overdue section', () => {
      const variables = {
        userName: 'John Doe',
        totalTasks: 3,
        singleTask: false,
        appUrl: 'https://app.example.com',
        overdueTasks: [
          { title: 'Fix production bug' },
          { title: 'Review PR #1234' },
          { title: 'Update documentation' }
        ],
        overdueCount: 3,
        singleOverdue: false,
        todayTasks: null,
        todayCount: 0,
        singleToday: true,
        tomorrowTasks: null,
        tomorrowCount: 0,
        singleTomorrow: true,
      };

      const template = Handlebars.compile(DEFAULT_SLACK_TEMPLATES.dailyReminder);
      const result = template(variables);

      // Check that task titles are present
      expect(result).toContain('Fix production bug');
      expect(result).toContain('Review PR #1234');
      expect(result).toContain('Update documentation');
      
      // Check that we don't have empty dashes
      expect(result).not.toMatch(/^- *$/m);
    });

    it('should render task titles correctly in today section', () => {
      const variables = {
        userName: 'Jane Smith',
        totalTasks: 2,
        singleTask: false,
        appUrl: 'https://app.example.com',
        overdueTasks: null,
        overdueCount: 0,
        singleOverdue: true,
        todayTasks: [
          { title: 'Client presentation' },
          { title: 'Code review' }
        ],
        todayCount: 2,
        singleToday: false,
        tomorrowTasks: null,
        tomorrowCount: 0,
        singleTomorrow: true,
      };

      const template = Handlebars.compile(DEFAULT_SLACK_TEMPLATES.dailyReminder);
      const result = template(variables);

      // Check that task titles are present
      expect(result).toContain('Client presentation');
      expect(result).toContain('Code review');
      
      // Check structure
      expect(result).toContain('DUE TODAY');
      expect(result).toContain('2 tasks');
    });

    it('should render task titles correctly in tomorrow section', () => {
      const variables = {
        userName: 'Bob Johnson',
        totalTasks: 1,
        singleTask: true,
        appUrl: 'https://app.example.com',
        overdueTasks: null,
        overdueCount: 0,
        singleOverdue: true,
        todayTasks: null,
        todayCount: 0,
        singleToday: true,
        tomorrowTasks: [
          { title: 'Prepare demo (Frontend Team)' }
        ],
        tomorrowCount: 1,
        singleTomorrow: true,
      };

      const template = Handlebars.compile(DEFAULT_SLACK_TEMPLATES.dailyReminder);
      const result = template(variables);

      // Check that task title is present
      expect(result).toContain('Prepare demo (Frontend Team)');
      
      // Check singular form
      expect(result).toContain('1 task');
      expect(result).not.toContain('1 tasks');
    });

    it('should render all sections correctly when all have tasks', () => {
      const variables = {
        userName: 'Alice Cooper',
        totalTasks: 7,
        singleTask: false,
        appUrl: 'https://app.example.com',
        overdueTasks: [
          { title: 'Overdue task 1' },
          { title: 'Overdue task 2' },
          { title: 'Overdue task 3' }
        ],
        overdueCount: 3,
        singleOverdue: false,
        todayTasks: [
          { title: 'Today task 1' },
          { title: 'Today task 2' }
        ],
        todayCount: 2,
        singleToday: false,
        tomorrowTasks: [
          { title: 'Tomorrow task 1' },
          { title: 'Tomorrow task 2' }
        ],
        tomorrowCount: 2,
        singleTomorrow: false,
      };

      const template = Handlebars.compile(DEFAULT_SLACK_TEMPLATES.dailyReminder);
      const result = template(variables);

      // Check all task titles are present
      expect(result).toContain('Overdue task 1');
      expect(result).toContain('Overdue task 2');
      expect(result).toContain('Overdue task 3');
      expect(result).toContain('Today task 1');
      expect(result).toContain('Today task 2');
      expect(result).toContain('Tomorrow task 1');
      expect(result).toContain('Tomorrow task 2');
      
      // Check all sections are present
      expect(result).toContain('OVERDUE');
      expect(result).toContain('DUE TODAY');
      expect(result).toContain('DUE TOMORROW');
      
      // Check no empty dashes
      expect(result).not.toMatch(/^- *$/m);
    });
  });
});
