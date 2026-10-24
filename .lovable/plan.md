## Trial students become inactive after 2 weeks without an invoice or payment

### Rule
- A student with status **trial** becomes **inactive** when 14 days pass with no new invoice and no payment for them.
- The 14 days count from their latest invoice or payment. If they have none, they count from the trial date (or the date they were added if there's no trial date).
- Only invoices and payments count as activity. Attending classes or editing their details doesn't restart the 14 days.
- Students with other statuses are never changed. Staff can still set a student back to trial or active by hand.

### How it runs
- A check runs once a day, early morning Singapore time, so students are switched within about a day of reaching 14 days.
- Each switch is recorded in the student's change history ("Auto: trial inactive after 14 days without invoice/payment").
- The 6 current trial students are checked on the first run.

### Technical details
- Add a SECURITY DEFINER function `auto_inactivate_stale_trials()`. It sets `status='inactive'` where `status='trial'` and `greatest(max(invoices.created_at/issue_date), max(payments.created_at via invoices), coalesce(trial_date, created_at))` is older than 14 days, and writes `student_change_logs` rows. Execute rights are revoked from anon/authenticated.
- Schedule it with daily `pg_cron` at `0 19 * * *` UTC (03:00 SGT).
- Add a small test of the 14-day cutoff, and save the rule to project memory.
