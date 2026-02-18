# Slack Template Customization Guide

This guide explains how to customize Slack notifications using templates with variables and Slack markdown.

## Template Syntax

### Variables
Use `{{variableName}}` to insert dynamic values:
```
Hello, {{userName}}!
You have {{totalTasks}} tasks.
```

### Conditionals
Use `{{#if condition}}...{{/if}}` to show content conditionally:
```
{{#if hasTasks}}
You have tasks to review!
{{/if}}
```

Use `{{#unless condition}}...{{/unless}}` for inverse conditions:
```
You have {{totalTasks}} task{{#unless singleTask}}s{{/unless}}
```

### Loops
Use `{{#each arrayName}}...{{/each}}` to iterate over arrays:
```
{{#each tasks}}
• {{title}}{{#if deadline}} - Due: {{deadline}}{{/if}}
{{/each}}
```

## Slack Markdown

Slack supports special formatting:

### Text Formatting
- `*bold text*` → **bold text**
- `_italic text_` → _italic text_
- `~strikethrough~` → ~~strikethrough~~
- `` `code` `` → `code`
- ``` ```code block``` ``` → code block

### Links
- `<https://example.com|Link text>` → [Link text](https://example.com)
- `<https://example.com>` → https://example.com

### Emojis
- `:smile:` → 😄
- `:fire:` → 🔥
- `:check:` → ✅
- `:x:` → ❌
- `:red_circle:` → 🔴
- `:large_yellow_circle:` → 🟡
- `:large_green_circle:` → 🟢

### Lists
```
• Item 1
• Item 2
• Item 3
```

### Dividers
Use `---` on its own line to create a horizontal divider

---

## Meeting Note Template

### Available Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `noteTitle` | string | Meeting title | "Weekly Standup" |
| `noteUrl` | string | Link to full notes | "https://..." |
| `meetingDate` | string | Date of meeting | "2026-02-17" |
| `hasTasks` | boolean | Whether user has tasks | true/false |
| `taskCount` | number | Number of tasks | 3 |
| `tasks` | array | Array of task objects | See below |

### Task Object Properties
- `title` (string): Task title
- `deadline` (string | null): Formatted deadline (DD.MM)

### Default Template
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

### Example Customizations

#### Minimal Version
```
*{{noteTitle}}*

<{{noteUrl}}|View notes>

{{#if hasTasks}}
Tasks: {{taskCount}}
{{#each tasks}}
• {{title}}
{{/each}}
{{/if}}
```

#### Detailed Version
```
:memo: *Meeting Notes: {{noteTitle}}*
_Date: {{meetingDate}}_

<{{noteUrl}}|:arrow_right: Read full notes>

{{#if hasTasks}}
---
:clipboard: *Action Items for You ({{taskCount}})*

{{#each tasks}}
{{#if deadline}}
:alarm_clock: {{title}} - *Due {{deadline}}*
{{/if}}
{{#unless deadline}}
:white_check_mark: {{title}}
{{/unless}}
{{/each}}
{{/if}}

{{#unless hasTasks}}
_No tasks assigned to you from this meeting._
{{/unless}}
```

---

## Daily Reminder Template

### Available Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `userName` | string | User's display name | "John Doe" |
| `totalTasks` | number | Total task count | 5 |
| `singleTask` | boolean | Whether exactly 1 task | true/false |
| `appUrl` | string | Link to task manager | "https://..." |
| `overdueTasks` | array\|null | Overdue tasks | See below |
| `overdueCount` | number | Number of overdue tasks | 2 |
| `singleOverdue` | boolean | Whether exactly 1 overdue | true/false |
| `todayTasks` | array\|null | Tasks due today | See below |
| `todayCount` | number | Number of today tasks | 1 |
| `singleToday` | boolean | Whether exactly 1 today | true/false |
| `tomorrowTasks` | array\|null | Tasks due tomorrow | See below |
| `tomorrowCount` | number | Number of tomorrow tasks | 2 |
| `singleTomorrow` | boolean | Whether exactly 1 tomorrow | true/false |

### Task Object Properties
- `title` (string): Task title

### Default Template
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

### Example Customizations

#### Compact Version
```
:wave: Morning {{userName}}!

{{#if overdueTasks}}
:rotating_light: *{{overdueCount}} OVERDUE*
{{#each overdueTasks}}
• {{title}}
{{/each}}
{{/if}}

{{#if todayTasks}}
:calendar: *{{todayCount}} DUE TODAY*
{{#each todayTasks}}
• {{title}}
{{/each}}
{{/if}}

<{{appUrl}}|Open Task Manager>
```

#### Motivational Version
```
:sunny: Good morning, {{userName}}!

You've got this! Here's what's on your plate today:

{{#if overdueTasks}}
:fire: *Priority Items ({{overdueCount}})*
These need your attention first:
{{#each overdueTasks}}
:red_circle: {{title}}
{{/each}}

{{/if}}
{{#if todayTasks}}
:dart: *Today's Focus ({{todayCount}})*
{{#each todayTasks}}
:large_blue_circle: {{title}}
{{/each}}

{{/if}}
{{#if tomorrowTasks}}
:eyes: *Coming Up Tomorrow ({{tomorrowCount}})*
{{#each tomorrowTasks}}
:large_green_circle: {{title}}
{{/each}}

{{/if}}
:rocket: <{{appUrl}}|Let's get started!>
```

#### Status-Based Version
```
*Daily Task Overview* | {{userName}}

{{#if overdueTasks}}
*STATUS: URGENT* :rotating_light:
{{overdueCount}} task{{#unless singleOverdue}}s{{/unless}} overdue

{{#each overdueTasks}}
:red_circle: {{title}}
{{/each}}
---
{{/if}}

{{#if todayTasks}}
*TODAY'S AGENDA* :calendar:
{{todayCount}} task{{#unless singleToday}}s{{/unless}} due

{{#each todayTasks}}
:large_yellow_circle: {{title}}
{{/each}}
---
{{/if}}

{{#if tomorrowTasks}}
*UPCOMING* :crystal_ball:
{{tomorrowCount}} task{{#unless singleTomorrow}}s{{/unless}} due tomorrow

{{#each tomorrowTasks}}
:large_green_circle: {{title}}
{{/each}}
---
{{/if}}

<{{appUrl}}|Manage Tasks>
```

---

## Tips

1. **Test your templates**: Use the preview feature in settings to see how they look
2. **Keep it concise**: Slack messages work best when they're scannable
3. **Use emojis wisely**: They add personality but too many can be distracting
4. **Include links**: Always provide a way to access more details
5. **Consider mobile**: Many users read Slack on mobile, so keep formatting simple
6. **Use dividers**: The `---` separator helps organize sections visually

## Troubleshooting

### Variables not showing
- Check spelling: `{{userName}}` not `{{username}}`
- Ensure the variable exists for that template type

### Conditionals not working
- Use `{{#if}}` not `{{if}}`
- Close blocks with `{{/if}}`
- Arrays need `{{#each}}` not `{{#if}}`

### Formatting issues
- Slack markdown is different from standard markdown
- Use `*bold*` not `**bold**`
- Links must use `<url|text>` format
