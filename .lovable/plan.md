## Add `/comps` competition registration confirmation email

No email is currently sent on competition submission. Add a transactional email that fires after a successful `submitCompetitionPayment`.

### New template — `supabase/functions/_shared/transactional-email-templates/competition-confirmation.tsx`

Props: `firstName`, `fullName`, `competitionName`, `coachingName`, `categories[]`, `amount`, `referenceNumber`.

- Subject: `` `${fullName} ${competitionName}` `` (fallback "Your Competition Registration").
- Body:
  - `Hi <FirstName>,`
  - `Thank you for your Competition Registration. The details are as follows:`
  - Details box: Competition, Coaching (coachingName), Categories (comma-joined list — only if any), Amount (`$X.XX`), Reference Number.
  - `Should you have any further questions, please check with your masters.`
  - `Please do not reply to this email.`
  - `Thank you` / `Gaonhae Taekwondo`
- Style consistent with grading/seminar templates.

### Registry — `supabase/functions/_shared/transactional-email-templates/registry.ts`

Add import + entry under key `competition-confirmation`.

### Caller — pass product names from the page

Change `SubmitCompetitionPaymentInput` (in `src/services/competitionPaymentSubmissionService.ts`) to also accept optional `coaching_name` and `category_names: string[]`. Use them only for the email payload, not the RPC row.

In `src/pages/public/PublicCompetitionPayment.tsx`, when invoking `submitCompetitionPayment`, also pass:
- `coaching_name: coachingProduct.name`
- `category_names: selectedCategoryIds.map(id => categoryProducts.find(p=>p.id===id)?.name).filter(Boolean)`

For the subject's "Competition Name", use the coaching product name (e.g. "Singapore Open Coaching") as the source of competition identity — this is the only competition-identifying string available in the flow.

In `submitCompetitionPayment`, after the RPC succeeds and `input.email` is present, fire-and-forget:

```ts
void supabase.functions.invoke('send-transactional-email', {
  body: {
    templateName: 'competition-confirmation',
    recipientEmail: recipient,
    idempotencyKey: `comp-confirm-${inserted.id}`,
    templateData: {
      firstName: fn,
      fullName: `${fn} ${ln}`.trim(),
      competitionName: input.coaching_name || 'Competition',
      coachingName: input.coaching_name || '',
      categories: input.category_names || [],
      amount: input.amount,
      referenceNumber: inserted.reference_number,
    },
  },
});
```

### Deploy

Redeploy `send-transactional-email` to register the new template.

### Out of scope

Verification/rejection/collection emails, admin notifications.
