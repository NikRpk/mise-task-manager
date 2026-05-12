/**
 * Test API for Template Rendering
 * Returns the rendered template without sending to Slack
 * 
 * GET /api/test/template-render
 */

import { NextResponse } from 'next/server';
import Handlebars from 'handlebars';
import { DEFAULT_SLACK_TEMPLATES } from '@/lib/slack-client';

export async function GET() {
  const variables = {
    userName: 'Niklas Röpke',
    totalTasks: 7,
    singleTask: false,
    appUrl: 'https://hf-tasks.web.app',
    overdueTasks: [
      { title: 'Fix production bug (Project Alpha)' },
      { title: 'Review PR #1234 (Backend Team)' },
      { title: 'Update documentation (Project Alpha)' }
    ],
    overdueCount: 3,
    singleOverdue: false,
    todayTasks: [
      { title: 'Client presentation (Sales Team)' },
      { title: 'Code review (Backend Team)' },
      { title: 'Team standup (Project Alpha)' },
      { title: 'Deploy to production (Project Alpha)' }
    ],
    todayCount: 4,
    singleToday: false,
    tomorrowTasks: null,
    tomorrowCount: 0,
    singleTomorrow: true,
  };

  const template = Handlebars.compile(DEFAULT_SLACK_TEMPLATES.dailyReminder);
  const renderedText = template(variables);

  return NextResponse.json({
    success: true,
    template: DEFAULT_SLACK_TEMPLATES.dailyReminder,
    variables,
    renderedText,
  });
}
