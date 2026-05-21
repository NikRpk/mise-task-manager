# Migration Guide: Task Owner Standardization

## What Changed
- **Task owner field** now uses **email** as the standard ID across the entire platform
- **Display names** are shown to users in the UI (TaskCard, OwnerSelector)
- **New tasks** automatically use email as owner
- **Existing tasks** need to be migrated from displayName to email

## Running the Migration

### 1. Set Admin Secret (One-time)
Add to your `.env.local` or Cloud Run environment:

```bash
ADMIN_MIGRATION_SECRET=your-secure-random-secret-here
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

### 2. Update Cloud Run Environment
```bash
gcloud run services update hf-tasks \
  --region=europe-west1 \
  --update-env-vars ADMIN_MIGRATION_SECRET=your-secret-here \
  --project=dach-ai-mvps
```

### 3. Run Migration
```bash
curl -X POST https://hf-tasks-1014309748045.europe-west1.run.app/api/migrate/task-owners \
  -H "x-admin-secret: your-secret-here" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "totalTasks": 150,
  "migratedTasks": 120,
  "skippedTasks": 30,
  "errors": []
}
```

### 4. Test Daily Reminder
After migration, test the daily reminder:
```bash
curl -X POST https://hf-tasks-1014309748045.europe-west1.run.app/api/cron/daily-reminders \
  -H "X-CloudScheduler-JobName: daily-task-reminders" \
  -H "Content-Type: application/json"
```

## What the Migration Does

1. **Builds email mapping** from the `people` collection (name → email)
2. **Scans all tasks** across all projects
3. **Converts owner field**:
   - `"Display Name"` → `"user@example.com"`
   - `"Another User"` → `"another@example.com"`
4. **Skips tasks** that already have email as owner
5. **Reports errors** for tasks where no email mapping exists

## After Migration

- ✅ Daily reminders will work correctly
- ✅ Task filtering by owner will be consistent
- ✅ All new tasks will use email
- ✅ UI will display names, not emails

## Rollback (If Needed)

If something goes wrong, the original displayNames are preserved in the `people` collection and can be restored manually if needed.
