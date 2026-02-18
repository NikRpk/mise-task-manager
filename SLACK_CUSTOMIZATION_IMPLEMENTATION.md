# Customizable Slack Notifications - Implementation Summary

## Overview

I've implemented a fully customizable Slack notification system that allows users to customize the two types of Slack messages sent by the app:

1. **Meeting Note Notifications** - Sent when meeting notes are shared with attendees
2. **Daily Task Reminders** - Sent every morning at 8 AM with task summaries

## Features

### ✅ Template Variables
Users can insert dynamic data using handlebar-style syntax:
- Simple variables: `{{variableName}}`
- Conditionals: `{{#if condition}}...{{/if}}` and `{{#unless condition}}...{{/unless}}`
- Loops: `{{#each arrayName}}...{{/each}}`

### ✅ Slack Markdown Support
Templates support full Slack markdown:
- **Bold**: `*text*`
- _Italic_: `_text_`
- Links: `<url|text>`
- Emojis: `:fire:`, `:check:`, `:red_circle:`, etc.
- Dividers: `---`
- Code: `` `code` ``

### ✅ Settings UI
- Added new "Slack Message Templates" section in Notifications settings
- Separate text areas for Meeting Notes and Daily Reminders
- Variable documentation shown inline
- "Reset to default" buttons for each template
- Tips and examples provided
- Link to comprehensive guide

### ✅ Comprehensive Documentation
Created `SLACK_TEMPLATE_GUIDE.md` with:
- Complete variable reference for both notification types
- Slack markdown syntax guide
- Multiple example templates (minimal, detailed, motivational, status-based)
- Troubleshooting tips
- Best practices

## Available Variables

### Meeting Note Template
| Variable | Description | Example |
|----------|-------------|---------|
| `noteTitle` | Meeting title | "Weekly Standup" |
| `noteUrl` | Link to full notes | "https://..." |
| `meetingDate` | Date of meeting | "2026-02-17" |
| `hasTasks` | Whether user has tasks | true/false |
| `taskCount` | Number of tasks | 3 |
| `tasks` | Array with `title` and `deadline` | [...] |

### Daily Reminder Template
| Variable | Description | Example |
|----------|-------------|---------|
| `userName` | User's display name | "John Doe" |
| `totalTasks` | Total task count | 5 |
| `singleTask` | Whether exactly 1 task | true/false |
| `appUrl` | Link to task manager | "https://..." |
| `overdueTasks` | Array of overdue tasks | [...] |
| `overdueCount` | Number of overdue tasks | 2 |
| `singleOverdue` | Whether exactly 1 overdue | true/false |
| `todayTasks` | Array of tasks due today | [...] |
| `todayCount` | Number of today tasks | 1 |
| `singleToday` | Whether exactly 1 today | true/false |
| `tomorrowTasks` | Array of tasks due tomorrow | [...] |
| `tomorrowCount` | Number of tomorrow tasks | 2 |
| `singleTomorrow` | Whether exactly 1 tomorrow | true/false |

## Implementation Details

### Files Modified

1. **types/index.ts**
   - Added `slackTemplates` to UserSettings interface

2. **lib/slack-client.ts**
   - Added `DEFAULT_SLACK_TEMPLATES` with default templates
   - Implemented `renderTemplate()` function for variable replacement
   - Implemented `markdownToBlocks()` to convert markdown to Slack Block Kit
   - Updated `sendNoteToSlackUser()` to accept custom template
   - Updated `sendDailyTaskReminder()` to accept custom template
   - Updated `sendNoteToAttendees()` to pass custom template

3. **app/settings/page.tsx**
   - Added `slackTemplates` to UserSettings interface
   - Added new "Slack Message Templates" section with:
     - Meeting Notes template textarea
     - Daily Reminder template textarea
     - Reset buttons
     - Documentation and tips
   - Templates auto-save with existing settings save flow

4. **app/api/slack/send-note/route.ts**
   - Fetches custom template from user settings
   - Passes template to `sendNoteToAttendees()`

5. **app/api/cron/daily-reminders/route.ts**
   - Fetches custom template from user settings
   - Passes template to `sendDailyTaskReminder()`

6. **SLACK_TEMPLATE_GUIDE.md** (NEW)
   - Comprehensive guide for template customization
   - Variable reference tables
   - Slack markdown syntax guide
   - Multiple example templates
   - Troubleshooting section

## Default Templates

### Meeting Note (Default)
```
Notes from *"{{noteTitle}}"*

:page_facing_up: <{{noteUrl}}|View full meeting notes>

{{#if hasTasks}}
---
*Your Tasks ({{taskCount}}):*
{{#each tasks}}
• {{title}}{{#if deadline}}   `Due: {{deadline}}`{{/if}}
{{/each}}
{{/if}}
```

### Daily Reminder (Default)
```
*Daily Task Summary*

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
<{{appUrl}}|View all tasks →>
```

## How to Use

1. Navigate to **Settings → Notifications**
2. Scroll to **Slack Message Templates** section
3. Edit the templates using Slack markdown and variables
4. Click **Save** at the top of the page
5. Test by:
   - Sharing a meeting note (for Meeting Note template)
   - Waiting for the next daily reminder at 8 AM (for Daily Reminder template)

## Template Syntax Examples

### Simple Variable
```
Hello, {{userName}}!
```

### Conditional
```
{{#if hasTasks}}
You have tasks!
{{/if}}
```

### Inverse Conditional
```
You have {{taskCount}} task{{#unless singleTask}}s{{/unless}}
```

### Loop
```
{{#each tasks}}
• {{title}}
{{/each}}
```

### Combined
```
{{#if overdueTasks}}
*Overdue ({{overdueCount}}):*
{{#each overdueTasks}}
:red_circle: {{title}}
{{/each}}
{{/if}}
```

## Benefits

1. **Flexibility**: Users can customize messages to match their team's communication style
2. **Branding**: Easily add company-specific emojis, language, or formatting
3. **Localization**: Users can translate messages to their preferred language
4. **Personality**: Add motivational language, humor, or serious tone as needed
5. **Information Density**: Choose between compact or detailed notification styles
6. **No Code Changes**: All customization done through UI, no deployment needed

## Future Enhancements

Potential improvements for future iterations:
- Preview/test button to see rendered templates
- Template library with pre-made examples
- Per-user template preferences (currently uses first attendee's template for meeting notes)
- Template versioning/history
- Conditional formatting based on priority/status
- Additional variables (project name, priority, status, etc.)
