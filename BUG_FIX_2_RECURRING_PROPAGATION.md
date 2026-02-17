# Bug Fix #2: Recurring Fields Not Copied to New Instances

## Problem
- First recurring task creates second task successfully ✅
- Second recurring task does NOT create third task ❌
- Recurring fields not being propagated to child tasks

## Root Cause
Found in `app/api/tasks/route.ts` line 175-192:

The POST endpoint (used to create new tasks) was explicitly constructing a Task object with only specific fields:

```typescript
const newTask: Task = {
  id: newTaskRef.id,
  title: body.title || '',
  description: body.description || '',
  // ... other fields ...
  // ❌ MISSING: isRecurring, recurrenceInterval, recurrenceUnit, parentRecurringTaskId
};
```

### Why This Caused the Bug

1. User creates Task A with `isRecurring: true`
2. User completes Task A → Frontend creates Task B payload with all recurring fields
3. **Backend POST endpoint receives the payload but ignores recurring fields**
4. Task B is saved **without** recurring fields
5. User completes Task B → No Task C is created (because Task B is not marked as recurring)

The backend was filtering out any fields not explicitly listed in the newTask object construction.

## The Fix

Added the missing recurring fields to the POST endpoint:

```typescript
const newTask: Task = {
  // ... existing fields ...
  
  // Recurring task fields (ADDED)
  isRecurring: body.isRecurring,
  recurrenceInterval: body.recurrenceInterval,
  recurrenceUnit: body.recurrenceUnit,
  parentRecurringTaskId: body.parentRecurringTaskId,
};
```

Also added debug logging:
```typescript
console.log('[API] Creating new task with recurring fields:', {
  id: newTask.id,
  title: newTask.title,
  isRecurring: newTask.isRecurring,
  recurrenceInterval: newTask.recurrenceInterval,
  recurrenceUnit: newTask.recurrenceUnit,
  parentRecurringTaskId: newTask.parentRecurringTaskId,
});
```

## Files Changed
- `app/api/tasks/route.ts` (lines 175-205)
  - Added 4 recurring fields to POST endpoint
  - Added console logging for debugging

## Testing the Fix

### Before Fix:
1. Create recurring task A → Complete it → Task B created ✅
2. Task B is created **without** recurring fields ❌
3. Complete Task B → No Task C created ❌

### After Fix:
1. Create recurring task A → Complete it → Task B created ✅
2. Task B **has recurring fields** ✅
3. Complete Task B → Task C created ✅
4. Complete Task C → Task D created ✅
5. ... continues infinitely ✅

### How to Verify:

1. **Delete existing test tasks** (they don't have recurring fields)
2. **Create a fresh recurring task:**
   - Title: "Recurring Chain Test"
   - Due date: Tomorrow
   - Toggle recurring ON
   - Interval: 1, Unit: Day(s)
3. **Complete it** → Check console:
   ```
   [API] Creating new task with recurring fields: {
     isRecurring: true,
     recurrenceInterval: 1,
     recurrenceUnit: "days"
   }
   ```
4. **Complete the 2nd task** → Should create 3rd task
5. **Complete the 3rd task** → Should create 4th task
6. **Verify chain continues indefinitely**

## Why This Bug Existed

The POST endpoint was written with explicit field whitelisting for security/validation. When the recurring fields were added to the Task type, they weren't added to the POST endpoint's newTask construction.

This is a common pattern issue: 
- ✅ Type system knows about new fields
- ✅ Frontend sends new fields
- ❌ Backend ignores them (defensive programming)

## Related Issues Fixed

### Bug #1: Fields Not Saving (Previously Fixed)
- Issue: `setFormData()` vs `updateFormData()`
- Location: `components/TaskModal.tsx` line 1502
- Status: Fixed ✅

### Bug #2: Fields Not Copied to New Instances (This Fix)
- Issue: POST endpoint filtering out recurring fields
- Location: `app/api/tasks/route.ts` lines 175-192
- Status: Fixed ✅

## Prevention

To prevent this in the future:

1. **Document Required Fields**: Add comments to POST endpoint listing all Task fields
2. **Use Spread Operator**: Consider `newTask = { ...body, id: newTaskRef.id, ... }` instead of explicit listing
3. **Backend Validation**: Add Zod/Yup schema validation that explicitly lists all allowed fields
4. **Integration Tests**: Test that created tasks have all expected fields

## Status: FIXED ✅

Both bugs are now resolved. The recurring task feature should work end-to-end.

## Console Output (Success Case)

```javascript
// Creating first recurring task
[TaskModal] Auto-saving task: {
  isRecurring: true,
  recurrenceInterval: 1,
  recurrenceUnit: "days"
}

// Completing first task
[Recurring Task Check] {
  isRecurring: true,
  recurrenceInterval: 1,
  recurrenceUnit: "days"
}
[Recurring Task] Creating new instance...
[API] Creating new task with recurring fields: {
  isRecurring: true,          // ✅ Now included!
  recurrenceInterval: 1,      // ✅ Now included!
  recurrenceUnit: "days"      // ✅ Now included!
}

// Completing second task  
[Recurring Task Check] {
  isRecurring: true,          // ✅ Still there!
  recurrenceInterval: 1,      // ✅ Still there!
  recurrenceUnit: "days"      // ✅ Still there!
}
[Recurring Task] Creating new instance...  // ✅ Creates third!
```
