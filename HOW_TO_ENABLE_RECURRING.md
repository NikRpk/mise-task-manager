# How to Enable Recurring Tasks - Step by Step

## The Issue
Your task shows:
- ✅ Due date is set: 17.02.2026
- ❌ Recurring is OFF: `isRecurring: undefined`
- ❌ No interval set: `recurrenceInterval: undefined`
- ❌ No unit set: `recurrenceUnit: undefined`

**The recurring toggle needs to be turned ON!**

## Step-by-Step Guide

### Step 1: Open Your Task
- Open the "Debug Recurring Test" task (or create a new one)

### Step 2: Set Due Date (Already Done ✓)
- You already have: 17.02.2026 ✓

### Step 3: Enable Recurring Toggle
Look on the right side panel under "DUE DATE" section.

**BEFORE (Currently):**
```
RECURRING TASK  ○──  (OFF - Gray/Light)
```

**Click the toggle to turn it ON:**
```
RECURRING TASK  ──○  (ON - Green/Blue - Primary Color)
```

### Step 4: Set Recurrence Pattern
Once you toggle it ON, two new fields will appear below:

```
Every [1] [Day(s)  ▼]
      ↑        ↑
   Number   Unit
```

**Set your desired recurrence:**
- Interval: 1 (or any number)
- Unit: Choose from dropdown:
  - Day(s) - repeats every X days
  - Week(s) - repeats every X weeks
  - Month(s) - repeats every X months

**Examples:**
- Every 1 Day(s) = Daily task
- Every 1 Week(s) = Weekly task
- Every 2 Week(s) = Bi-weekly task
- Every 1 Month(s) = Monthly task

### Step 5: Wait for Auto-Save
**IMPORTANT:** After toggling and setting values, wait 5 seconds for auto-save.

You should see in the console:
```
[TaskModal] Auto-saving task: {
  isRecurring: true,           ← Should be true!
  recurrenceInterval: 1,       ← Should be a number!
  recurrenceUnit: "days",      ← Should be set!
  deadline: "2026-02-17..."
}
```

### Step 6: Close and Test
1. Close the task modal
2. Reopen it to verify settings are saved
3. Mark the task as "Done"
4. Check console for:
```
[Recurring Task Check] {
  isRecurring: true,           ← Should be true!
  recurrenceInterval: 1,       ← Should have value!
  recurrenceUnit: "days"       ← Should be set!
}
```

### Step 7: Verify New Instance
If all values are set correctly, you'll see:
```
[Recurring Task] Creating new instance for task: Debug Recurring Test
[Recurring Task] Successfully created new instance
```

And a new task will appear with a future due date!

## Visual Checklist

Before completing the task, verify in the browser console when you save:

```javascript
// ❌ BAD (Current state):
{
  isRecurring: undefined,      // Toggle is OFF
  recurrenceInterval: undefined,
  recurrenceUnit: undefined
}

// ✅ GOOD (What you need):
{
  isRecurring: true,           // Toggle is ON
  recurrenceInterval: 1,       // Number is set
  recurrenceUnit: "weeks"      // Unit is selected
}
```

## Quick Test

1. Open task
2. **Click the toggle** (make sure it turns green/blue)
3. Set interval: **1**
4. Set unit: **Day(s)**
5. **Wait 5 seconds** (count: 1-Mississippi, 2-Mississippi, 3-Mississippi, 4-Mississippi, 5-Mississippi)
6. Close modal
7. Complete task
8. Check console
9. Look for new task in list

## Troubleshooting

**Q: I toggled it ON but it's still undefined**
A: You didn't wait for auto-save (3-5 seconds). Try again and wait longer.

**Q: Where is the toggle?**
A: Right side panel, under "DUE DATE", labeled "RECURRING TASK"

**Q: I don't see interval/unit fields**
A: The toggle is still OFF. Click it again to turn it ON (it should change color).

**Q: Console still shows undefined after waiting**
A: Refresh the page and try again. There might be a cached state issue.

## Expected Behavior

When everything is set correctly:
1. Toggle ON → Interval and Unit fields appear
2. Set values → Wait for auto-save (5 sec)
3. Console shows values saved
4. Complete task → Console shows recurring check with all values
5. New task created automatically
6. New task appears with future due date

Try it now and let me know if you see the interval/unit fields after toggling ON!
