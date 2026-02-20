/**
 * Slack Integration Client
 * Handles sending meeting notes and task summaries to Slack users
 */

import { WebClient } from '@slack/web-api';
import { NoteTask, Task, Priority } from '@/types';
import { logger } from './logger';

/**
 * Default Slack message templates
 */
export const DEFAULT_SLACK_TEMPLATES = {
  meetingNote: `Notes from *"{{noteTitle}}"*

:page_facing_up: <{{noteUrl}}|View full meeting notes>

{{#if hasTasks}}
---
*Your Tasks ({{taskCount}}):*
{{#each tasks}}
• {{title}}{{#if deadline}}   \`Due: {{deadline}}\`{{/if}}
{{/each}}
{{/if}}`,
  
  dailyReminder: `*Daily Task Summary*

Good morning, {{userName}}! You have *{{totalTasks}}* task{{#unless singleTask}}s{{/unless}} that need your attention.

{{#if overdueTasks}}
---
*🔴 OVERDUE ({{overdueCount}} task{{#unless singleOverdue}}s{{/unless}})*
{{#each overdueTasks}}
- {{title}}
{{/each}}
{{/if}}

{{#if todayTasks}}
---
*📅 DUE TODAY ({{todayCount}} task{{#unless singleToday}}s{{/unless}})*
{{#each todayTasks}}
- {{title}}
{{/each}}
{{/if}}

{{#if tomorrowTasks}}
---
*📆 DUE TOMORROW ({{tomorrowCount}} task{{#unless singleTomorrow}}s{{/unless}})*
{{#each tomorrowTasks}}
- {{title}}
{{/each}}
{{/if}}

---
<{{appUrl}}|View all tasks →>`
};

/**
 * Replaces template variables with actual values
 * Supports basic Slack markdown
 * @param template - Template string with variables
 * @param variables - Object with variable values
 * @returns Rendered string
 */
function renderTemplate(template: string, variables: Record<string, unknown>): string {
  let result = template;
  
  // FIRST: Handle {{#each array}} blocks (before replacing simple variables!)
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, itemTemplate) => {
    const array = variables[arrayName];
    if (!Array.isArray(array) || array.length === 0) return '';
    
    console.log(`Processing {{#each ${arrayName}}}:`, array);
    console.log('Item template:', itemTemplate);
    
    return array.map(item => {
      let itemResult = itemTemplate;
      // Replace variables within the item
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          const value = (item as Record<string, unknown>)[key];
          console.log(`Replacing {{${key}}} with:`, value);
          itemResult = itemResult.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), 
            value !== undefined && value !== null ? String(value) : '');
        });
      }
      console.log('Item result:', itemResult);
      return itemResult;
    }).join('');
  });
  
  // THEN: Handle {{#if condition}} blocks
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    return variables[condition] ? content : '';
  });
  
  // THEN: Handle {{#unless condition}} blocks
  result = result.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, condition, content) => {
    return !variables[condition] ? content : '';
  });
  
  // FINALLY: Replace simple variables {{varName}}
  result = result.replace(/\{\{([^#/}]+)\}\}/g, (match, varName) => {
    const trimmedVarName = varName.trim();
    const value = variables[trimmedVarName];
    return value !== undefined && value !== null ? String(value) : '';
  });
  
  // Clean up empty lines
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return result.trim();
}

/**
 * Converts rendered markdown text to Slack Block Kit format
 * @param text - Markdown text
 * @returns Slack blocks
 */
function markdownToBlocks(text: string): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const lines = text.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    if (line.trim() === '---') {
      // Add current section if exists
      if (currentSection.trim()) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: currentSection.trim(),
          },
        });
        currentSection = '';
      }
      // Add divider
      blocks.push({ type: 'divider' });
    } else if (line.trim()) {
      currentSection += line + '\n';
    } else if (currentSection.trim()) {
      // Empty line - end current section
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: currentSection.trim(),
        },
      });
      currentSection = '';
    }
  }
  
  // Add remaining section
  if (currentSection.trim()) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: currentSection.trim(),
      },
    });
  }
  
  return blocks;
}

// Initialize Slack client
const slackToken = process.env.SLACK_BOT_TOKEN;

if (!slackToken) {
  logger.warn('SLACK_BOT_TOKEN not configured - Slack notifications disabled');
}

const slack = slackToken ? new WebClient(slackToken) : null;

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Looks up Slack user ID by email address
 * @param email - User's email address
 * @returns Slack user ID or null if not found
 */
async function getUserIdByEmail(email: string): Promise<string | null> {
  if (!slack) {
    throw new Error('Slack client not initialized');
  }

  if (!isValidEmail(email)) {
    logger.error('Invalid email format', new Error('Invalid email'), { email });
    return null;
  }

  try {
    const result = await slack.users.lookupByEmail({ email });
    return result.user?.id || null;
  } catch (error: unknown) {
    const slackError = error as { data?: { error?: string } };
    if (slackError.data?.error === 'users_not_found') {
      logger.warn('Slack user not found', { email });
      return null;
    }
    const err = error as Error & { message?: string };
    logger.error('Failed to lookup Slack user', err, { email });
    throw error;
  }
}

/**
 * Converts HTML content to plain text for markdown
 * @param html - HTML content
 * @returns Plain text
 */
function htmlToPlainText(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  return text.trim();
}

/**
 * Generates markdown content for the note (currently unused, kept for future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateMarkdownContent(
  noteTitle: string,
  noteContent: string,
  meetingDate: string,
  allTasks: NoteTask[]
): string {
  const plainContent = htmlToPlainText(noteContent);
  
  let markdown = `# ${noteTitle}\n\n`;
  markdown += `**Date:** ${meetingDate}\n\n`;
  markdown += `---\n\n`;
  markdown += `## Meeting Notes\n\n`;
  markdown += `${plainContent}\n\n`;
  
  if (allTasks.length > 0) {
    markdown += `---\n\n`;
    markdown += `## All Tasks\n\n`;
    allTasks.forEach(task => {
      const checkbox = task.createInProject ? '[x]' : '[ ]';
      const owner = task.owner ? ` (@${task.owner})` : '';
      const deadline = task.deadline ? ` - Due: ${new Date(task.deadline).toLocaleDateString()}` : '';
      markdown += `${checkbox} ${task.title}${owner}${deadline}\n`;
    });
  }
  
  return markdown;
}

/**
 * Formats Slack message blocks for the notification
 */
function formatMessageBlocks(
  noteTitle: string,
  noteContent: string,
  noteUrl: string,
  meetingDate: string,
  userTasks: NoteTask[]
): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Notes from *"${noteTitle}"*`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:page_facing_up: <${noteUrl}|View full meeting notes>`,
      },
    },
  ];

  // Add tasks section if user has tasks
  if (userTasks.length > 0) {
    blocks.push({
      type: 'divider',
    });
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Your Tasks (${userTasks.length}):*`,
      },
    });

    userTasks.forEach(task => {
      let taskText = `• ${task.title}`;
      
      if (task.deadline) {
        // Format deadline as DD.MM (just day and month)
        const deadlineDate = new Date(task.deadline);
        const formattedDeadline = `${String(deadlineDate.getDate()).padStart(2, '0')}.${String(deadlineDate.getMonth() + 1).padStart(2, '0')}`;
        taskText += `   \`Due: ${formattedDeadline}\``;
      }
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: taskText,
        },
      });
    });
  }

  return blocks;
}

/**
 * Sends a meeting note to a Slack user
 * @param email - User's email address
 * @param noteTitle - Meeting note title
 * @param noteContent - HTML content of the note
 * @param noteUrl - URL to view the note
 * @param meetingDate - Date of the meeting
 * @param userTasks - Tasks assigned to this user
 * @param allTasks - All tasks from the meeting
 * @param customTemplate - Optional custom Slack template
 * @returns Success status and message
 */
export async function sendNoteToSlackUser(
  email: string,
  noteTitle: string,
  noteContent: string,
  noteUrl: string,
  meetingDate: string,
  userTasks: NoteTask[],
  _allTasks: NoteTask[],
  customTemplate?: string
): Promise<{ success: boolean; message: string }> {
  // Check if Slack is configured
  if (!slack) {
    return {
      success: false,
      message: 'Slack bot token not configured',
    };
  }

  try {
    // Get Slack user ID
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return {
        success: false,
        message: `User not found in Slack workspace: ${email}`,
      };
    }

    // Prepare template variables
    const tasks = userTasks.map(task => ({
      title: task.title,
      deadline: task.deadline 
        ? (() => {
            const deadlineDate = new Date(task.deadline);
            return `${String(deadlineDate.getDate()).padStart(2, '0')}.${String(deadlineDate.getMonth() + 1).padStart(2, '0')}`;
          })()
        : null,
    }));

    const templateVars = {
      noteTitle,
      noteUrl,
      meetingDate,
      hasTasks: userTasks.length > 0,
      taskCount: userTasks.length,
      tasks,
    };

    // Render template
    const template = customTemplate || DEFAULT_SLACK_TEMPLATES.meetingNote;
    const renderedText = renderTemplate(template, templateVars);
    const blocks = markdownToBlocks(renderedText);

    // Send message
    const messageResult = await slack.chat.postMessage({
      channel: userId,
      text: `Meeting notes: ${noteTitle}`,
      blocks: blocks as never,
      unfurl_links: false,
      unfurl_media: false,
    });

    if (!messageResult.ok) {
      throw new Error('Failed to send Slack message');
    }

    logger.info('Slack notification sent successfully', { email, noteTitle });
    
    return {
      success: true,
      message: 'Notification sent successfully',
    };
  } catch (error: unknown) {
    logger.error('Failed to send Slack notification', error as Error, { email, noteTitle });
    
    // Provide more helpful error messages
    const err = error as { message?: string; data?: { error?: string } };
    let errorMessage = err.message || 'Failed to send notification';
    
    if (err.data?.error === 'channel_not_found') {
      errorMessage = 'Cannot send DM - user may need to message the bot first';
    } else if (err.data?.error === 'not_in_channel') {
      errorMessage = 'Bot does not have permission to send DMs';
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Sends meeting notes to multiple attendees
 * @param noteData - Meeting note data
 * @param attendees - List of attendee emails with their tasks
 * @param customTemplate - Optional custom Slack template
 * @returns Results for each attendee
 */
export async function sendNoteToAttendees(
  noteData: {
    title: string;
    content: string;
    noteUrl: string;
    meetingDate: string;
    allTasks: NoteTask[];
  },
  attendees: Array<{ email: string; tasks: NoteTask[] }>,
  customTemplate?: string
): Promise<Array<{ email: string; success: boolean; message: string }>> {
  const results = await Promise.all(
    attendees.map(async (attendee) => {
      const result = await sendNoteToSlackUser(
        attendee.email,
        noteData.title,
        noteData.content,
        noteData.noteUrl,
        noteData.meetingDate,
        attendee.tasks,
        noteData.allTasks,
        customTemplate
      );
      
      return {
        email: attendee.email,
        ...result,
      };
    })
  );

  return results;
}

/**
 * Tests Slack connection
 * @returns Connection status
 */
export async function testSlackConnection(): Promise<{ success: boolean; message: string }> {
  if (!slack) {
    return {
      success: false,
      message: 'Slack bot token not configured',
    };
  }

  try {
    const result = await slack.auth.test();
    return {
      success: true,
      message: `Connected to workspace: ${result.team}`,
    };
  } catch (error: unknown) {
    logger.error('Slack connection test failed', error as Error);
    const err = error as { message?: string };
    return {
      success: false,
      message: err.message || 'Connection failed',
    };
  }
}

/**
 * Get priority circle emoji for task reminders
 */
function getPriorityCircle(priority: Priority): string {
  const priorityMap = {
    high: ':red_circle:',
    medium: ':large_yellow_circle:',
    low: ':large_green_circle:',
  };
  return priorityMap[priority] || '';
}

interface TaskGroup {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
}

/**
 * Sends daily task reminder to a Slack user
 * @param email - User's email address
 * @param userName - User's display name
 * @param tasks - Grouped tasks (overdue, today, tomorrow)
 * @param projectNames - Map of project IDs to project names
 * @param appUrl - URL to the task manager app
 * @param customTemplate - Optional custom Slack template
 * @returns Success status and message
 */
export async function sendDailyTaskReminder(
  email: string,
  userName: string,
  tasks: TaskGroup,
  projectNames: Map<string, string>,
  appUrl: string = 'https://hf-tasks.web.app',
  customTemplate?: string
): Promise<{ success: boolean; message: string }> {
  if (!slack) {
    return {
      success: false,
      message: 'Slack bot token not configured',
    };
  }

  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return {
        success: false,
        message: `User not found in Slack workspace: ${email}`,
      };
    }

    const totalTasks = tasks.overdue.length + tasks.today.length + tasks.tomorrow.length;

    console.log('Preparing daily reminder for', email);
    console.log('Tasks:', {
      overdue: tasks.overdue.length,
      today: tasks.today.length,
      tomorrow: tasks.tomorrow.length,
    });

    // Prepare template variables
    const templateVars = {
      userName,
      totalTasks,
      singleTask: totalTasks === 1,
      appUrl,
      // Overdue tasks
      overdueTasks: tasks.overdue.length > 0 ? tasks.overdue.map(t => {
        const taskTitle = t.title || t.description || 'Untitled task';
        const projectName = t.projectId ? projectNames.get(t.projectId) : null;
        return { 
          title: projectName ? `${taskTitle} (${projectName})` : taskTitle
        };
      }) : null,
      overdueCount: tasks.overdue.length,
      singleOverdue: tasks.overdue.length === 1,
      // Today tasks
      todayTasks: tasks.today.length > 0 ? tasks.today.map(t => {
        const taskTitle = t.title || t.description || 'Untitled task';
        const projectName = t.projectId ? projectNames.get(t.projectId) : null;
        return { 
          title: projectName ? `${taskTitle} (${projectName})` : taskTitle
        };
      }) : null,
      todayCount: tasks.today.length,
      singleToday: tasks.today.length === 1,
      // Tomorrow tasks
      tomorrowTasks: tasks.tomorrow.length > 0 ? tasks.tomorrow.map(t => {
        const taskTitle = t.title || t.description || 'Untitled task';
        const projectName = t.projectId ? projectNames.get(t.projectId) : null;
        return { 
          title: projectName ? `${taskTitle} (${projectName})` : taskTitle
        };
      }) : null,
      tomorrowCount: tasks.tomorrow.length,
      singleTomorrow: tasks.tomorrow.length === 1,
    };

    console.log('Template vars:', JSON.stringify(templateVars, null, 2));

    // Render template
    const template = customTemplate || DEFAULT_SLACK_TEMPLATES.dailyReminder;
    const renderedText = renderTemplate(template, templateVars);
    const blocks = markdownToBlocks(renderedText);

    const messageResult = await slack.chat.postMessage({
      channel: userId,
      text: `Daily Task Summary: ${totalTasks} task${totalTasks !== 1 ? 's' : ''} need your attention`,
      blocks: blocks as never,
      unfurl_links: false,
      unfurl_media: false,
    });

    if (!messageResult.ok) {
      throw new Error('Failed to send Slack message');
    }

    logger.info('Daily task reminder sent via Slack', { email, totalTasks });
    
    return {
      success: true,
      message: 'Reminder sent successfully',
    };
  } catch (error) {
    logger.error('Failed to send daily task reminder via Slack', error as Error, { email });
    
    const err = error as { message?: string; data?: { error?: string } };
    let errorMessage = err.message || 'Failed to send reminder';
    
    if (err.data?.error === 'channel_not_found') {
      errorMessage = 'Cannot send DM - user may need to message the bot first';
    } else if (err.data?.error === 'not_in_channel') {
      errorMessage = 'Bot does not have permission to send DMs';
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}
