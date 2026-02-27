

## Plan: Push Notifications for Notices, Outstanding Fees & Grading Reminders

### 1. New Notification Templates (DB insert)

Insert 3 new templates into `notification_templates`:

| template_key | title | body |
|---|---|---|
| `new_notice` | New Notice: {subject} | A new notice has been posted: {subject} |
| `outstanding_fees_reminder` | Outstanding Fees Reminder | You have outstanding fees of {amount}. Please make payment at your earliest convenience. |
| `grading_test_reminder` | Ready for Grading Test | {student_name} is ready for grading test on {grading_date} at {branch}. Belt: {current_belt} → {target_belt} |

### 2. Trigger Push on Notice Creation

Modify `src/components/notices/CreateEditNoticeDialog.tsx` — after a new notice is saved successfully (not edit), call the push-notification edge function for all employees with subscriptions in the targeted branches. Add a helper in `noticeService.ts` that:
- Queries `notification_subscriptions` joined with `employees` to get employee IDs in target branches (or all if `target_branches` is null)
- Calls push-notification edge function for each subscribed employee with template `new_notice` and `{subject}` variable

### 3. New Edge Function: `check-outstanding-fees`

Creates `supabase/functions/check-outstanding-fees/index.ts`:
- Queries `invoices` where `balance_due > 0` and `status` in ('sent', 'overdue')
- Groups by `student_id`, gets total outstanding
- For each student with a `student_notification_subscriptions` record, sends push via `push-notification` with template `outstanding_fees_reminder`
- Deduplicates using a daily check (query notification_logs or use a simple date check)
- Runs weekly via cron (configured separately)

### 4. New Edge Function: `check-grading-reminders`

Creates `supabase/functions/check-grading-reminders/index.ts`:
- Queries `grading_registrations` where `ready_for_grading = true` and `result IS NULL`
- Joins `grading_slots` to get date, branch; joins `students` for name
- For students with grading in the next 3 days, sends push via `push-notification` with template `grading_test_reminder` to the student's subscription
- Also notifies the student's parent/guardian (via student subscription)
- Deduplicates daily

### 5. Config & Template Updates

- Add `check-outstanding-fees` and `check-grading-reminders` to `supabase/config.toml` with `verify_jwt = false`
- Update `notificationTemplateService.ts` defaults and `TEMPLATE_VARIABLES` to include new templates

### 6. Cron Setup (manual step)

User will need to set up pg_cron jobs:
- `check-outstanding-fees`: weekly (every Monday 9am SGT)
- `check-grading-reminders`: daily at 9am SGT

### Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/check-outstanding-fees/index.ts` | Create |
| `supabase/functions/check-grading-reminders/index.ts` | Create |
| `supabase/config.toml` | Add 2 new function entries |
| `src/services/noticeService.ts` | Add `sendNoticeNotifications()` |
| `src/components/notices/CreateEditNoticeDialog.tsx` | Call notification after create |
| `src/services/notificationTemplateService.ts` | Add new template defaults & variables |
| DB insert: 3 notification templates | Via insert tool |

