/**
 * Slack Integration Client
 * Handles sending meeting notes and task summaries to Slack users
 */

import { WebClient } from '@slack/web-api';
import { NoteTask } from '@/types';
import { logger } from './logger';

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
  } catch (error: any) {
    if (error.data?.error === 'users_not_found') {
      logger.warn('Slack user not found', { email });
      return null;
    }
    logger.error('Failed to lookup Slack user', error, { email });
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
 * Generates markdown content for the note
 */
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
): any[] {
  // Format date as dd.MM.YYYY (German format)
  const formattedDate = new Date(meetingDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:memo: See the notes from *${noteTitle}*\n\nMeeting date: ${formattedDate}`,
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
        // Format deadline as dd.MM (just day and month)
        const deadlineDate = new Date(task.deadline);
        const formattedDeadline = `${String(deadlineDate.getDate()).padStart(2, '0')}.${String(deadlineDate.getMonth() + 1).padStart(2, '0')}`;
        taskText += ` (Due: ${formattedDeadline})`;
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
 * @returns Success status and message
 */
export async function sendNoteToSlackUser(
  email: string,
  noteTitle: string,
  noteContent: string,
  noteUrl: string,
  meetingDate: string,
  userTasks: NoteTask[],
  allTasks: NoteTask[]
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

    // Format message blocks
    const blocks = formatMessageBlocks(noteTitle, noteContent, noteUrl, meetingDate, userTasks);

    // Send message
    const messageResult = await slack.chat.postMessage({
      channel: userId,
      text: `Meeting notes: ${noteTitle}`,
      blocks,
    });

    if (!messageResult.ok) {
      throw new Error('Failed to send Slack message');
    }

    // Note: File upload removed - requires files:write permission
    // Users can access the full notes via the link provided in the message

    logger.info('Slack notification sent successfully', { email, noteTitle });
    
    return {
      success: true,
      message: 'Notification sent successfully',
    };
  } catch (error: any) {
    logger.error('Failed to send Slack notification', error, { email, noteTitle });
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to send notification';
    
    if (error.data?.error === 'channel_not_found') {
      errorMessage = 'Cannot send DM - user may need to message the bot first';
    } else if (error.data?.error === 'not_in_channel') {
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
  attendees: Array<{ email: string; tasks: NoteTask[] }>
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
        noteData.allTasks
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
  } catch (error: any) {
    logger.error('Slack connection test failed', error);
    return {
      success: false,
      message: error.message || 'Connection failed',
    };
  }
}
