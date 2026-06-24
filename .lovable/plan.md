## Goal
Add a **Weight (kg)** field to competition submissions — stored on `competition_payment_submissions`, editable in the staff edit dialog, and captured on the public competition registration form.

## 1. Database
New migration:
- `ALTER TABLE public.competition_payment_submissions ADD COLUMN weight_kg numeric(5,2)` (nullable).

## 2. Service layer
`src/services/competitionPaymentSubmissionService.ts`
- Add `weight_kg: number | null` to the submission type/interface and to insert / update payloads (public submit + staff edit).

## 3. Edit dialog (staff)
`src/components/grading-list/EditCompetitionSubmissionDialog.tsx`
- Add `weight_kg` to local form state, initialised from the loaded submission.
- Render a **Weight (kg)** numeric input as its own section/row **immediately after the Categories block and before the Files block** (full width on mobile, half width on desktop to match the existing two-column grid pattern). Empty input → null.
- Include `weight_kg` in the update payload sent to the service.

## 4. Public registration form
`src/pages/public/PublicGradingList.tsx` (and the public submission form section for competitions)
- Add a **Weight (kg)** numeric input near the other personal fields (current belt / DOB area, same column layout as the existing fields).
- Include `weight_kg` in the payload submitted via `competitionPaymentSubmissionService`.

## 5. Display (read-only surfaces)
- Add `weight_kg` to the row payload in the competition list so it can be shown later if needed. No UI changes required to the list rows or print PDF in this pass.

## Out of scope
- No changes to extra-line presets / `requires_weight`.
- No changes to invoices, PDF, or email templates.
