## Root cause

The grading payment flow calls `send-transactional-email` after a successful submission, but the email backend has never been provisioned for this project:

- The `email_send_log` table does not exist
- The `enqueue_email` RPC does not exist
- The pgmq queues and cron dispatcher are missing

The send call is wrapped in `try/catch` and only logs `console.warn`, so the user sees "Payment Submitted" but no email is ever delivered.

The email domain `notify.gaonhaetaekwondo.com` is already verified — only the queue/table infrastructure and Edge Function deployment are missing.

## Fix

1. **Provision email infrastructure** (`setup_email_infra`) — creates `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, the `auth_emails` / `transactional_emails` pgmq queues, the `enqueue_email` / `read_email_batch` / `delete_email` / `move_to_dlq` RPC wrappers, the `process-email-queue` cron job (every 5s), and the vault secret. Safe/idempotent.

2. **Deploy the Edge Functions** that already exist in the repo but were never deployed: `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `process-email-queue`.

3. **Re-test** the grading payment submission to `alhk10@gmail.com` and verify the email arrives. Confirm with a query on `email_send_log` (filtered by `template_name = 'grading-confirmation'`).

## Notes

- No code changes to `PublicGradingPayment.tsx` are needed — the call site is correct.
- One small caveat: the email is only sent when `selectedSlot` is truthy. If a Foundation submission ever completes without a chosen slot, no email goes out. We can extend the send to cover that case in a follow-up if desired, but it is out of scope for this fix.