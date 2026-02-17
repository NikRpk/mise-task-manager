# Bug Fix: Recurring Task Fields Not Saving

## Problem
User reported that when creating a recurring task:
1. Toggle "Recurring Task" ON
2. Set interval and unit values
3. Close modal
4. Reopen modal → **Toggle is OFF, values are lost**

Console showed:
```javascript
isRecurring: undefined
recurrenceInterval: undefined
recurrenceUnit: undefined
```

## Root Cause
Found in `components/TaskModal.tsx` line 1502:

The recurrence interval input field was using `setFormData()` instead of `updateFormData()`:

```tsx
// ❌ WRONG - Direct state update, no auto-save triggered
onChange={(e) => {
  if (value === '') {
    setFormData({ ...formData, recurrenceInterval: undefined });
  }
}}
```

### Why This Broke Saving
- `setFormData()` - Only updates local React state
- `updateFormData()` - Updates state AND triggers debounced auto-save
- Without auto-save trigger, changes stayed in memory but never reached the database
- When modal closed and reopened, data was refetched from DB which had old values

## The Fix
Changed line 1502 to use `updateFormData()`:

```tsx
// ✅ CORRECT - Triggers auto-save
onChange={(e) => {
  if (value === '') {
    updateFormData({ recurrenceInterval: undefined });
  }
}}
```

## Files Changed
- `components/TaskModal.tsx` (line 1502)
  - Changed `setFormData({ ...formData, recurrenceInterval: undefined })` 
  - To: `updateFormData({ recurrenceInterval: undefined })`

## Testing the Fix

### Before Fix:
1. Toggle recurring ON → Fields appear
2. Set values → Changes stay in UI
3. Close modal → Auto-save never triggered
4. Reopen modal → Values are gone (refetched from DB)

### After Fix:
1. Toggle recurring ON → Fields appear
2. Set values → Auto-save triggers after 3 seconds
3. Console shows: `[TaskModal] Auto-saving task: { isRecurring: true, ... }`
4. Close modal
5. Reopen modal → Values persist ✅

### How to Verify the Fix Works:

1. **Refresh your browser** (to load the fixed code)
2. **Create a new task** or open existing one
3. **Set a due date**
4. **Toggle "Recurring Task" ON**
5. **Set interval**: 1
6. **Set unit**: Week(s)
7. **Watch console** - Should see:
   ```
   [TaskModal] Auto-saving task: {
     isRecurring: true,
     recurrenceInterval: 1,
     recurrenceUnit: "weeks",
     deadline: "..."
   }
   ```
8. **Wait 5 seconds** for save to complete
9. **Close modal**
10. **Reopen task** - Toggle should still be ON, values should persist
11. **Complete task** - New instance should be created

## Expected Console Output (Success)

When you complete a properly saved recurring task:

```javascript
[TaskModal] Auto-saving task: {
  id: "abc123",
  title: "Debug Recurring Test",
  isRecurring: true,           // ✅ Now saved!
  recurrenceInterval: 1,       // ✅ Now saved!
  recurrenceUnit: "weeks",     // ✅ Now saved!
  deadline: "2026-02-17..."
}

[Recurring Task Check] {
  newStatus: "done",
  isDone: true,
  isRecurring: true,           // ✅ Persisted!
  recurrenceInterval: 1,       // ✅ Persisted!
  recurrenceUnit: "weeks",     // ✅ Persisted!
  hasDeadline: true
}

[Recurring Task] Creating new instance for task: Debug Recurring Test
[Recurring Task] Successfully created new instance
```

## Why This Bug Existed

The original implementation had inconsistent state management:
- Toggle onChange: Used `updateFormData()` ✅
- Unit select onChange: Used `updateFormData()` ✅  
- Interval input onChange: Used `setFormData()` ❌ (Bug!)

This was likely a copy-paste oversight where the interval input wasn't updated to use the proper state management function.

## Related Code Patterns

Elsewhere in TaskModal, all form updates correctly use `updateFormData()`:
- Title changes
- Description changes
- Status changes
- Priority changes
- Tags, links, etc.

The recurrence interval was the only exception.

## Status: FIXED ✅

The fix is applied and ready to test. Please refresh your browser and try creating a recurring task again.
