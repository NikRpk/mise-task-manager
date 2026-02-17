# Bug Fix #3: Firestore Rejecting Undefined Values

## Error Message
```
500 Internal Server Error
Cannot use "undefined" as a Firestore value (found in field "isRecurring"). 
If you want to ignore undefined values, enable `ignoreUndefinedProperties`.
```

## Root Cause

**Problem 1:** Initial form state included `isRecurring: false` and `recurrenceInterval/Unit: undefined`
```typescript
// components/TaskModal.tsx (OLD)
const [formData, setFormData] = useState<Partial<Task>>({
  // ... other fields ...
  isRecurring: false,           // ❌ Always sent, even when not needed
  recurrenceInterval: undefined, // ❌ Firestore rejects undefined
  recurrenceUnit: undefined,     // ❌ Firestore rejects undefined
});
```

**Problem 2:** When saving, these undefined values were sent to the API
```typescript
onSave(cleanedFormData); // Contains undefined values ❌
```

**Problem 3:** Backend tried to save to Firestore with undefined values
```typescript
await newTaskRef.set(newTask); // Firestore rejects undefined ❌
```

### Why This Happened

Firestore (Firebase's database) has strict validation:
- ✅ Accepts: `null`, `true`, `false`, strings, numbers, objects, arrays
- ❌ Rejects: `undefined`

When a field is `undefined`, it must be **completely omitted** from the object, not set to `undefined`.

## The Fixes

### Fix 1: Remove Unnecessary Initial Values (TaskModal)
```typescript
// components/TaskModal.tsx (NEW)
const [formData, setFormData] = useState<Partial<Task>>({
  title: '',
  description: '',
  // ... other required fields ...
  // ✅ No recurring fields - they'll be added when toggle is ON
});
```

### Fix 2: Filter Out Undefined Values Before Saving
```typescript
// Filter out undefined values for Firestore
const cleanedData = Object.fromEntries(
  Object.entries(cleanedFormData).filter(([_, value]) => value !== undefined)
) as Partial<Task>;

onSave(cleanedData); // ✅ Only defined values
```

### Fix 3: Conditionally Include Fields in Backend (Already Done)
```typescript
// app/api/tasks/route.ts (ALREADY FIXED)
const newTask: Task = {
  // ... required fields ...
  // Only include if not undefined:
  ...(body.isRecurring !== undefined && { isRecurring: body.isRecurring }),
  ...(body.recurrenceInterval !== undefined && { recurrenceInterval: body.recurrenceInterval }),
  ...(body.recurrenceUnit !== undefined && { recurrenceUnit: body.recurrenceUnit }),
};
```

## Files Changed

1. **components/TaskModal.tsx** (lines 40-56)
   - Removed `isRecurring`, `recurrenceInterval`, `recurrenceUnit` from initial state
   
2. **components/TaskModal.tsx** (lines 480-503)
   - Added undefined value filtering in `handleSubmit()`
   - Added undefined value filtering in `handleSaveNewTask()`

3. **app/api/tasks/route.ts** (lines 189-213)
   - Already fixed: Conditional field inclusion

## How The Fix Works

### Before Fix:
```javascript
// TaskModal sends:
{
  title: "My Task",
  description: "...",
  isRecurring: false,          // ❌ Always present
  recurrenceInterval: undefined, // ❌ Firestore rejects
  recurrenceUnit: undefined      // ❌ Firestore rejects
}

// Firestore: 500 Error ❌
```

### After Fix:
```javascript
// Non-recurring task:
{
  title: "My Task",
  description: "..."
  // ✅ No recurring fields at all
}

// Recurring task:
{
  title: "My Task",
  description: "...",
  isRecurring: true,      // ✅ Defined
  recurrenceInterval: 1,  // ✅ Defined
  recurrenceUnit: "weeks" // ✅ Defined
}

// Firestore: Success! ✅
```

## Testing

### Test Case 1: Non-Recurring Task
1. Create task WITHOUT toggling recurring
2. Should save successfully ✅
3. Console shows NO recurring fields in payload ✅

### Test Case 2: Recurring Task
1. Create task WITH recurring toggle ON
2. Set interval and unit
3. Should save successfully ✅
4. Console shows recurring fields WITH values ✅

### Test Case 3: Complete Recurring Task
1. Complete recurring task
2. New instance created ✅
3. New instance has recurring fields ✅
4. Can complete new instance → creates another ✅

## Summary of All Bugs Fixed

### Bug #1: Recurring Fields Not Saving
- **Issue:** `setFormData()` instead of `updateFormData()`
- **Location:** `components/TaskModal.tsx` line 1502
- **Fix:** Changed to use `updateFormData()`
- **Status:** ✅ Fixed

### Bug #2: Recurring Fields Not Copied to Child Tasks
- **Issue:** POST endpoint not including recurring fields
- **Location:** `app/api/tasks/route.ts` lines 175-192
- **Fix:** Added conditional field inclusion
- **Status:** ✅ Fixed

### Bug #3: Firestore Rejecting Undefined Values (This Fix)
- **Issue:** Sending `undefined` values to Firestore
- **Location:** Multiple places (TaskModal, API)
- **Fix:** Filter out undefined, don't include in initial state
- **Status:** ✅ Fixed

## Prevention Tips

1. **Never send `undefined` to Firestore**
   - Use conditional spreads: `...(value !== undefined && { field: value })`
   - Filter before saving: `Object.entries(...).filter(([_, v]) => v !== undefined)`
   - Don't initialize fields with `undefined` in state

2. **Use `null` instead of `undefined`** for "no value"
   - Firestore accepts `null`
   - TypeScript handles both
   - Example: `deadline: null` ✅ not `deadline: undefined` ❌

3. **Partial<Task> doesn't mean all fields must be present**
   - Optional fields can be omitted entirely
   - Don't initialize them unless needed

## Status: FIXED ✅

All three bugs are now resolved:
1. ✅ Recurring fields save properly
2. ✅ Child recurring tasks inherit fields
3. ✅ Firestore accepts the data

Tasks should now create and appear immediately!
