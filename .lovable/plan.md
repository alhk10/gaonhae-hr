# Superadmin alerts for new approvals and verifications

## What you get
Every time a new item needing approval or payment verification comes in, each superadmin who has turned on notifications gets a phone/browser notification like:

> **New payment to verify** — 3 approvals and 5 verifications waiting

Tapping it opens the superadmin dashboard. Works on the installed web app and desktop browsers (iPhone requires the app added to the Home Screen).

## How superadmins turn it on
- A "Notify me of new approvals" switch on the superadmin dashboard (reuses the existing notification opt-in).
- Can be turned off anytime.

## What counts
- **Verifications**: payments waiting for proof check, public submissions needing matching/verification (grading, competition, seminar, school fees, uniforms & guards). Auto-verified clean scans are not counted and do not trigger alerts.
- **Approvals**: registrations, detail updates, invoice edits/discounts/refunds/cancellations, deletion and edit requests, withdrawals, merges, leave, claims and other existing superadmin approval types.

## Noise control
- Alerts grouped: if several arrive within about 1 minute, one notification is sent with the latest totals.
- Replaces the previous notification instead of stacking many.

## Technical details
- Reuse existing VAPID push setup, `notification_subscriptions`, and the `push-notification` edge function pattern.
- New DB function `superadmin_pending_counts()` returning `{approvals, verifications}` from the relevant tables.
- AFTER INSERT triggers (and status changes into pending) on the approval/verification tables call a new `notify-superadmin-approvals` edge function via `pg_net`, debounced through a small `superadmin_alert_state` table (last_sent_at).
- Edge function computes counts, looks up subscriptions for superadmin users, sends push with tag `superadmin-approvals` (so it replaces the prior one) and url `/superadmin`.
- Opt-in toggle added to the superadmin dashboard using a topic `superadmin_approvals`.
- Requires the existing VAPID secrets (already used); if missing, I'll request them.
