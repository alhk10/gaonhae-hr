## Automatic trial status changes

### Rule 1: Trial becomes Active when a class is invoiced
- When an invoice for a trial student includes any product from the **Classes** category, the student switches from **trial** to **active**. This happens straight away, whether staff create the invoice in `/access` or the Sales page, or it comes from `/hello` or auto-invoicing.
- Cancelled invoices and refunded lines don't count. If the class line is later refunded, the student stays active, and staff can change them back by hand.

### Rule 2: Trial becomes Inactive after 2 weeks without an invoice or payment
- A **trial** student becomes **inactive** when 14 days pass with no new invoice and no payment for them.
- The 14 days count from their latest invoice or payment. If they have none, they count from the trial date (or the date they were added if there's no trial date).
- Only invoices and payments count as activity. Attending classes or editing their details doesn't restart the 14 days.
- A check runs once a day, early morning Singapore time, so students are switched within about a day of reaching 14 days. The 6 current trial students are checked on the first run.

### Both rules
- Only trial students are ever changed. Each automatic change is recorded in the student's change history with the reason.
- Staff can still set any status by hand.

### Technical details
- Rule 1: an AFTER INSERT/UPDATE trigger on `invoice_items` (also on `invoices` when status changes from draft/cancelled). It looks up `products.category_id` in "Classes" and sets `students.status='active'` where status = 'trial' and the invoice isn't cancelled. It logs to `student_change_logs`.
- Rule 2: a SECURITY DEFINER function `auto_inactivate_stale_trials()` using greatest(latest invoice, latest payment, coalesce(trial_date, created_at)) < now() - 14 days. It logs changes, and execute rights are revoked from anon/authenticated. It is scheduled with daily `pg_cron` `0 19 * * *` UTC (03:00 SGT).
- Save both rules to project memory, and add a small test of the 14-day cutoff and the class-category check.
