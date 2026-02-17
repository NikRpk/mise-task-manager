# Debug: New Tasks Not Showing in UI

## Issue
After implementing recurring task fixes, new tasks are not appearing in the UI when created.

## Debugging Steps

### 1. Check Browser Console
Refresh your browser and try creating a new task. Watch for these logs:

**When creating a task:**
```javascript
[useTaskData] saveTask called: {
  isNew: true,
  taskId: undefined,
  title: "...",
  projectId: "..."
}

[useTaskData] Creating new task

[API POST /api/tasks] Received request: {
  projectId: "...",
  title: "...",
  hasRecurringFields: true/false
}

[API POST /api/tasks] Task created successfully: {
  id: "abc123",
  title: "...",
  projectId: "..."
}

[useTaskData] Task created successfully, refreshing list...
[useTaskData] Tasks refreshed
```

### 2. Look for Errors

**Common Errors to Check:**

**A) Validation Error:**
```
ValidationError: Task title or description is required
```
**Fix:** Make sure your task has either a title OR description filled in.

**B) Project ID Missing:**
```
ValidationError: Project ID is required
```
**Fix:** This shouldn't happen, but check that you have a project selected.

**C) Permission Error:**
```
AuthorizationError: You need EDIT permission to create tasks
```
**Fix:** Check your project membership and role.

**D) Network Error:**
```
Failed to create task: [error details]
```
**Fix:** Check network tab for the actual error response.

### 3. Check Network Tab

Open DevTools → Network tab:

1. **Look for POST /api/tasks**
2. **Check Status Code:**
   - 201 = Success ✅
   - 400 = Validation error ❌
   - 403 = Permission error ❌
   - 500 = Server error ❌

3. **Check Response:**
   - Should return the created task with ID
   - Should include recurring fields if set

4. **Check GET /api/tasks** (happens right after POST)
   - Should fetch updated list
   - Should include the new task

### 4. Possible Causes

**Cause #1: Title Validation Too Strict (FIXED)**
- **Issue:** POST endpoint required title, but UI allows description-only tasks
- **Fix Applied:** Changed validation to require title OR description
- **Test:** Create task with only description

**Cause #2: Recurring Fields Breaking Validation**
- **Check:** Are `isRecurring`, `recurrenceInterval`, `recurrenceUnit` set to `undefined`?
- **Issue:** Firestore might reject `undefined` values
- **Test:** Check if non-recurring tasks work but recurring ones don't

**Cause #3: fetchTasks() Not Refreshing**
- **Check:** Does `[useTaskData] Tasks refreshed` appear in console?
- **Issue:** Task list not updating after save
- **Test:** Manually refresh page - does task appear?

**Cause #4: Project Filter Issue**
- **Check:** Is the correct project selected?
- **Issue:** Task created in wrong project or project filter not matching
- **Test:** Switch to different project and back

### 5. Quick Fixes to Try

**Fix #1: Hard Refresh**
```
Ctrl+Shift+R (Windows)
Cmd+Shift+R (Mac)
```
Clears cached code and reloads fresh.

**Fix #2: Create Simple Task**
- Title: "Test"
- Description: "Test" 
- NO recurring
- NO subtasks
- Just basics
- See if it appears

**Fix #3: Check Console for Errors**
- Any red errors?
- Any failed network requests?
- Any validation failures?

**Fix #4: Verify Project Access**
- Are you a member of the selected project?
- Do you have EDIT role (not just VIEW)?

### 6. Expected Console Output (Success Case)

```javascript
// User clicks Save on new task
[useTaskData] saveTask called: {
  isNew: true,
  taskId: undefined,
  title: "My New Task",
  projectId: "pHZPRGzLD8UZbigAR5pA"
}

[useTaskData] Creating new task

// Backend receives request
[API POST /api/tasks] Received request: {
  projectId: "pHZPRGzLD8UZbigAR5pA",
  title: "My New Task",
  description: "<p>Some description</p>",
  hasRecurringFields: false
}

// Backend creates task
[API] Creating new task with recurring fields: {
  id: "gKQ8AclqKLcUzhrosLwE",
  title: "My New Task",
  isRecurring: undefined,
  recurrenceInterval: undefined,
  recurrenceUnit: undefined,
  parentRecurringTaskId: undefined
}

[API POST /api/tasks] Task created successfully: {
  id: "gKQ8AclqKLcUzhrosLwE",
  title: "My New Task",
  projectId: "pHZPRGzLD8UZbigAR5pA"
}

// Frontend receives success
[useTaskData] Task created successfully, refreshing list...

// Frontend fetches updated list
🔵 API GET: /api/tasks?projectId=pHZPRGzLD8UZbigAR5pA
✅ API Success: GET /api/tasks?projectId=pHZPRGzLD8UZbigAR5pA

[useTaskData] Tasks refreshed
```

### 7. Verify in Firestore (Optional)

If tasks are being created but not showing:

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `tasks` collection
4. Look for recently created tasks
5. Verify they have correct `projectId`
6. Check that all fields are present

### 8. Test Matrix

| Test Case | Expected Result | Status |
|-----------|----------------|--------|
| Simple task (title only) | Should appear | ? |
| Task with description only | Should appear | ? |
| Task with recurring enabled | Should appear | ? |
| Task with subtasks | Should appear | ? |
| Complete recurring task → new instance | Should appear | ? |

### 9. Report Back

Please share:
1. **What you see in console** when creating a task
2. **Network tab status codes** (201? 400? 500?)
3. **Any error messages** (red text in console)
4. **Does it work after hard refresh?**

This will help me identify exactly where the issue is.

## Likely Solution

Based on the timing (right after my fixes), the most likely cause is:

**Hypothesis:** The `undefined` values for recurring fields might be causing Firestore or validation issues.

**Test:** Try creating a task WITHOUT toggling recurring on at all (leave it off). Does that work?

If yes → Issue is with `undefined` recurring fields
If no → Issue is elsewhere (validation, permissions, etc.)
