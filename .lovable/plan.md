## Plan: Fix grading confirmation email via Resend

### 1. Add secret
Request `RESEND_API_KEY` via the secrets tool. User obtains it from https://resend.com/api-keys.

### 2. Rewrite `supabase/functions/send-transactional-email/index.ts`
Replace the broken queue-based implementation with a direct Resend send, mirroring existing `send-invoice-email` / `send-payslip-email` patterns:
- Keep the same request contract (`templateName`, `recipientEmail`, `templateData`, `idempotencyKey`) so the call site in `gradingPaymentSubmissionService.ts` and `PublicGradingPayment.tsx` needs no changes.
- Look up template from existing `_shared/transactional-email-templates/registry.ts` (keeps `grading-confirmation.tsx` React Email template intact).
- Render to HTML via `@react-email/render`.
- Send via Resend API using `from: "Gaonhae Taekwondo <noreply@notify.gaonhaetaekwondo.com>"` (verified domain).
- Drop suppression checks, pgmq enqueue, unsubscribe footer injection (infra doesn't exist; not needed for this transactional use case).
- Return 200 with Resend message id; log errors but don't throw to caller (call site already swallows errors).

### 3. Deploy & test
Deploy the function, then re-test the grading payment submission flow to `alhk10@gmail.com` via the live form and confirm delivery + check function logs.

### Out of scope
- Other broken email functions (`send-invoice-email`, etc.) — only fix if user asks.
- pgmq queue infrastructure, unsubscribe page, suppression table — not needed for grading confirmation.
- No frontend/UI changes.