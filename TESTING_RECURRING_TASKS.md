# Recurring Tasks - Testing Guide

## How to Test Recurring Tasks Feature

### Prerequisites
- Development server running (`npm run dev`)
- Logged into the application
- Access to at least one project

### Test Scenario 1: Create a Recurring Task

1. **Open Task Modal**
   - Click "New Task" button in the main interface
   - Or use quick add functionality

2. **Fill Basic Information**
   - Title: "Weekly Team Standup Prep"
   - Description: "Prepare agenda and updates for team standup"
   - Set a due date (e.g., next Monday)

3. **Enable Recurring**
   - Toggle "Recurring Task" switch to ON
   - Notice the interval and unit fields appear
   - Set interval to: `1`
   - Set unit to: `Week(s)`
   - Preview should show: "Repeats every 1 week(s)"

4. **Save Task**
   - Click "Save" button
   - Task should appear in your task list

### Test Scenario 2: Complete a Recurring Task

1. **Find the Recurring Task**
   - Locate "Weekly Team Standup Prep" in your task list
   - Note the current due date

2. **Mark as Complete**
   - Change status to "Done" OR
   - Use quick complete button (checkmark icon)

3. **Verify New Instance Created**
   - Wait a moment for the task list to refresh
   - You should see TWO tasks now:
     - The completed one (status: Done, original due date)
     - A new instance (status: To Do, due date = original + 1 week)

4. **Check New Task Properties**
   - New task should have:
     - Same title and description
     - Status: To Do
     - Due date: 1 week after the original
     - Empty comments section
     - Any subtasks should be reset (uncompleted)

### Test Scenario 3: Recurring with Different Intervals

Test with various configurations:

**Daily Task:**
- Interval: 1, Unit: Day(s)
- Example: "Daily standup notes"

**Bi-weekly Task:**
- Interval: 2, Unit: Week(s)
- Example: "Bi-weekly sprint planning"

**Monthly Task:**
- Interval: 1, Unit: Month(s)
- Example: "Monthly review meeting"

**Quarterly Task:**
- Interval: 3, Unit: Month(s)
- Example: "Quarterly planning session"

### Test Scenario 4: Edge Cases

**No Due Date:**
1. Try to enable recurring without setting a due date
2. Should show warning: "Due Date Required"
3. Should not allow enabling recurring

**Edit Recurring Task:**
1. Edit an existing recurring task
2. Change interval from 1 to 2 weeks
3. Save and complete it
4. New instance should use the updated recurrence rules

**Disable Recurring:**
1. Edit a recurring task
2. Toggle recurring OFF
3. Save the task
4. Complete it
5. No new instance should be created

### Expected Behavior Summary

✅ **What Should Happen:**
- Toggle enables recurrence settings
- Due date becomes required when recurring is enabled
- Preview text accurately shows recurrence pattern
- Completing recurring task creates new instance
- New instance has correct future due date
- New instance resets status, comments, subtasks
- Original completed task remains in history
- Task list auto-refreshes after completion

❌ **What Should NOT Happen:**
- Can't enable recurring without due date
- Completing non-recurring task doesn't duplicate
- Changing status to anything other than "Done" doesn't create new instance
- Can't set negative or zero interval

### Known Limitations

1. **No End Date**: Recurring tasks will continue indefinitely
2. **No Skip Option**: Can't skip a recurrence without completing
3. **Manual Cleanup**: Old completed recurring tasks stay in list (can be filtered)
4. **Calendar Integration**: New instances don't auto-create calendar events

### Browser Console Checks

Open browser console (F12) and look for:
- No errors during task creation
- No errors during completion
- Log messages showing recurring task creation (if debug logging enabled)

### API Verification

Check Network tab:
1. **POST /api/tasks** - Creating recurring task
   - Body should include: `isRecurring`, `recurrenceInterval`, `recurrenceUnit`

2. **PUT /api/tasks/:id** - Completing task
   - Should see status change to "done"

3. **POST /api/tasks** - New instance creation (if recurring)
   - Body should show new task with future deadline
   - Should have `parentRecurringTaskId` field

### Troubleshooting

**New instance not appearing:**
- Check browser console for errors
- Verify task had all required recurrence fields
- Confirm status was changed to "Done" (not just "Review")
- Wait a moment for auto-refresh

**Wrong due date on new instance:**
- Verify original due date was set correctly
- Check interval and unit values
- Test with smaller intervals (days) to see pattern

**Can't enable recurring:**
- Ensure due date is set first
- Check for any console errors
- Verify you have edit permissions on the project

## Success Criteria

The feature is working correctly if:
- ✅ Can create recurring tasks with various intervals
- ✅ Completing recurring task creates new instance
- ✅ New instance has correct due date calculation
- ✅ New instance resets appropriately
- ✅ Non-recurring tasks behave normally
- ✅ No errors in console
- ✅ UI is responsive and intuitive
