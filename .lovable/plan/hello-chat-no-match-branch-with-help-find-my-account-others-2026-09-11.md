# Hello chat: no-match branch with Help find my account / Others buttons

## What you'll see

When a visitor's details don't match a student record, the chat currently shows one remarks box. It will change to:

1. Bot message: "We couldn't find your record with the details provided." (the "Leave any remarks…" sentence is removed)
2. Two buttons under it:
   - **Help find my account** — asks the visitor for their email and/or contact number (at least one required), then submits.
   - **Others** — shows the existing remarks box ("Leave any remarks below and our team will reach out to help."), then submits.
3. After either submission, the confirmation reads: "Thank you for submitting your query. We strive to get back to you within 2 business days."

## Emails to management

Both submissions still create the same staff callback record as today, and also send the notification email with:

- **Help find my account** → subject `Help find my account - <Name>`
- **Others** → subject `Others - <Name>`
- Recipient changes from hello@gaonhaetaekwondo.com to **management@gaonhaetaekwondo.com** for these two no-match submissions.

## How it's built

- `src/pages/public/PublicHelloChat.tsx`
  - Replace the `choice` stage's single remarks card with the two buttons.
  - New sub-stage `help_find_account`: email + phone inputs (at least one required), plus the visitor's name/DOB already collected; submits and goes to the done stage.
  - **Others** reuses the existing remarks textarea card, with the "Leave any remarks below…" line shown there.
  - Update the `callback_done` confirmation text to the new 2-business-days wording.
- `src/services/publicChatService.ts` — extend `SubmitCallbackInput` with optional `notify_email` (default hello@gaonhaetaekwondo.com) and `email_subject_prefix` so only the no-match flow changes recipient/subject; other callback flows (registration, lesson schedule, trial lead) are untouched.
- `supabase/functions/_shared/transactional-email-templates/hello-callback-request.tsx` — subject function honors `templateData.subjectPrefix` when present (`<prefix> - <Name>`), otherwise keeps the current subject.
- No database changes; the existing callback RPC and staff approvals keep working.

## Checks

- Build + type-check pass.
- Walk both paths in the preview: Help find my account (validation blocks empty email+phone) and Others, confirming the done message wording.
