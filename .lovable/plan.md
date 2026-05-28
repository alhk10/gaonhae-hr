## Add `/seminar` registration confirmation email

Currently no email is sent on seminar submission. Add a transactional email that fires after a successful `submitSeminarPayment`.

### New template — `supabase/functions/_shared/transactional-email-templates/seminar-confirmation.tsx`

- Props: `fullName`, `firstName`, `packageLabel`, `sessionDates[]`, `amount`, `referenceNumber`.
- Subject: `` `${fullName} Seminar` `` (fallback "Your Seminar").
- Body copy:
  - Greeting `Hi <FirstName>,`
  - `Thank you for your Seminar Registration. The details are as follows:`
  - Details box: Seminar (packageLabel), Session Date(s) formatted DD/MM/YYYY, Amount (`$X.XX`), Reference Number.
  - `Should you have any further questions, please check with your masters.`
  - `Please do not reply to this email.`
  - Sign-off `Thank you` / `Gaonhae Taekwondo`.
- Style consistent with `grading-confirmation.tsx`.

### Registry — `supabase/functions/_shared/transactional-email-templates/registry.ts`

Import and register under key `seminar-confirmation`.

### Caller — `src/services/seminarPaymentSubmissionService.ts`

In `submitSeminarPayment`, after the RPC returns successfully and `input.email` is present, fire-and-forget invoke:

```ts
void supabase.functions.invoke('send-transactional-email', {
  body: {
    templateName: 'seminar-confirmation',
    recipientEmail: input.email,
    idempotencyKey: `seminar-confirm-${inserted.id}`,
    templateData: {
      firstName: fn,
      fullName: `${fn} ${ln}`,
      packageLabel: input.package_label,
      sessionDates: input.session_dates,
      amount: input.amount,
      referenceNumber: inserted.reference_number,
    },
  },
});
```

### Deploy

Redeploy `send-transactional-email` so the new template registers.

### Out of scope

Collection/verification emails, admin notifications, changes to existing templates.
