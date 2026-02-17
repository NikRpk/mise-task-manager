# Debugging Recurring Tasks Issue

## Issue Report
User created a recurring task called "Test = Reoccuring" but when it was completed, no new instance was created.

## Debug Steps

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab, then try completing the task again. Look for these log messages:

**When completing a task:**
```
[Recurring Task Check] {
  newStatus: "done",
  isDone: true,
  isRecurring: ???,     // ← Check this value
  recurrenceInterval: ???,  // ← Check this value
  recurrenceUnit: ???,      // ← Check this value
  deadline: "...",
  taskTitle: "Test = Reoccuring"
}
```

**If recurring logic triggers:**
```
[Recurring Task] Creating new instance for task: Test = Reoccuring
[Recurring Task] Calculated new deadline: ...
[Recurring Task] Creating new task: {...}
[Recurring Task] API response: 200 true
[Recurring Task] Successfully created new instance
```

### 2. What to Look For

**If you DON'T see the first log at all:**
- The task wasn't saved with recurring fields
- Check when creating the task if you see the save log

**If `isRecurring` is `false` or `undefined`:**
- The recurring toggle wasn't saved
- Check: Did you toggle it ON and wait for auto-save (3 seconds)?
- Check: Any errors during save?

**If `recurrenceInterval` or `recurrenceUnit` are `undefined`:**
- The interval/unit weren't saved
- Check: Did you set both values?
- Check: Did you wait for auto-save?

**If `deadline` is `null`:**
- No due date was set
- Recurring requires a due date

**If you see "Failed to create new instance":**
- Check the API error message in console
- Could be permissions or backend issue

### 3. Manual Check: View Task Data

To see what's actually stored in the database for your task:

1. Open the task "Test = Reoccuring"
2. Open browser console
3. In the console, find the network request when the modal opened:
   - Look for `GET /api/tasks/[taskId]` or similar
   - Check the Response tab to see the task data

4. Verify the response has:
```json
{
  "id": "...",
  "title": "Test = Reoccuring",
  "isRecurring": true,          // ← Should be true
  "recurrenceInterval": 1,      // ← Should be a number
  "recurrenceUnit": "weeks",    // ← Should be "days", "weeks", or "months"
  "deadline": "2026-02-...",    // ← Should have a date
  ...
}
```

### 4. Create a New Test Task

Let's create a fresh recurring task with detailed monitoring:

1. **Click "New Task"**
2. **Fill in details:**
   - Title: "Debug Test Recurring"
   - Description: "Testing recurring feature"
   - **Set a due date** (e.g., tomorrow)
3. **Enable Recurring:**
   - Toggle "Recurring Task" to ON
   - Set interval: 1
   - Set unit: Day(s)
4. **Watch Console** for save log:
   ```
   [TaskModal] Auto-saving task: {
     isRecurring: true,
     recurrenceInterval: 1,
     recurrenceUnit: "days",
     deadline: "..."
   }
   ```
5. **Wait 3 seconds** for auto-save to complete
6. **Close the modal**
7. **Reopen the task** and verify recurring settings are still there
8. **Complete the task** (mark as Done)
9. **Check console** for recurring task logs
10. **Wait a moment** and check if new task appears

### 5. Common Issues & Fixes

**Issue: Auto-save didn't trigger**
- Fix: Close and reopen the modal, or click outside a field to blur it
- The save triggers 3 seconds after the last change

**Issue: Due date not set**
- Fix: Recurring tasks REQUIRE a due date
- You should see a warning if you try to enable recurring without one

**Issue: Task was edited but not saved**
- Fix: Wait at least 3 seconds after making changes before closing modal
- Look for save status indicator (if present)

**Issue: Old task data cached**
- Fix: Refresh the page (Ctrl+R / Cmd+R)
- The task list should refresh automatically, but force refresh helps

### 6. Check Network Tab

In browser DevTools → Network tab:

**When saving task:**
- Look for: `PUT /api/tasks/[id]`
- Check Request Payload:
  ```json
  {
    "isRecurring": true,
    "recurrenceInterval": 1,
    "recurrenceUnit": "weeks",
    ...
  }
  ```
- Check Response Status: Should be 200 OK

**When completing task:**
- Look for: `PUT /api/tasks/[id]` (status change)
- Then: `POST /api/tasks` (new instance created)
- Check the POST request payload to see the new task being created

### 7. Firestore Direct Check (If needed)

If you have access to Firestore console:

1. Go to Firestore Database
2. Find the task in the `tasks` collection
3. Verify these fields exist:
   - `isRecurring`: boolean (true)
   - `recurrenceInterval`: number (1, 2, etc.)
   - `recurrenceUnit`: string ("days", "weeks", "months")
   - `deadline`: timestamp

### 8. Quick Fix Attempts

**Try #1: Edit the existing task**
1. Open "Test = Reoccuring"
2. Make sure due date is set
3. Toggle recurring OFF then ON again
4. Set interval: 1
5. Set unit: weeks
6. Wait 5 seconds
7. Close modal
8. Complete the task

**Try #2: Create a new task from scratch**
- Follow the "Create a New Test Task" steps above

**Try #3: Clear browser cache**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear site data in DevTools → Application → Storage

## Expected Console Output (Success Case)

When everything works correctly, you should see:

```
[TaskModal] Auto-saving task: {
  id: "abc123",
  title: "Test = Reoccuring",
  isRecurring: true,
  recurrenceInterval: 1,
  recurrenceUnit: "weeks",
  deadline: "2026-02-18T00:00:00.000Z"
}

[Recurring Task Check] {
  newStatus: "done",
  isDone: true,
  isRecurring: true,
  recurrenceInterval: 1,
  recurrenceUnit: "weeks",
  deadline: "2026-02-18T00:00:00.000Z",
  taskTitle: "Test = Reoccuring"
}

[Recurring Task] Creating new instance for task: Test = Reoccuring
[Recurring Task] Calculated new deadline: 2026-02-25T00:00:00.000Z
[Recurring Task] Creating new task: {...}
[Recurring Task] API response: 200 true
[Recurring Task] Successfully created new instance
```

## Next Steps

Please try the debugging steps above and let me know:
1. What you see in the console when completing the task
2. What the task data looks like in the network tab
3. Any error messages

This will help me identify exactly where the issue is occurring.
