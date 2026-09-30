# Register for Competition in /hello

Add a **Register for Competition** button to the /hello menu, directly under **Register for grading**. Tapping it runs the competition registration inside the /hello chat, mirroring the public `/comps` form but pre-filled with the recognized student's details.

## What changes

1. **Menu button** (`src/pages/public/PublicHelloChat.tsx`)
   - New outline button "Register for Competition" with arrow, placed between "Register for grading" and the disabled uniform/protection buttons.
   - Opens a new chat step `competition` (only shown when at least one active competition event exists; otherwise the button is hidden).

2. **Embedded competition step**
   - Reuse the existing `/comps` logic by extracting the form body of `src/pages/public/PublicCompetitionPayment.tsx` into a shared component (e.g. `src/components/public/CompetitionRegistrationForm.tsx`) that accepts optional prefill props: first name, last name, DOB, branch, belt, email, phone.
   - `/comps` route renders the shared component with no prefill (behavior unchanged).
   - /hello renders it inside the chat flow with the matched student's details pre-filled and locked to their branch (same as other /hello flows).
   - Keeps all existing /comps behavior: event-driven fields, extra line presets, belt filtering by age, signature pad, payment method selection (PayNow / bank transfer with SG vs AU details), proof-of-payment upload with amount scan advisory, duplicate-submission prompt with "update my submission" flow, and blocked-email check.

3. **Submission**
   - Submits through the existing `submitCompetitionPayment` service (SECURITY DEFINER RPC) — no new database changes.
   - On success shows the same confirmation/reference inside the chat and returns to the main menu.
   - Logs a chat event (`competition_registration_submitted`) for the session, consistent with existing `logChatEvent` usage.

4. **No changes to**
   - Student portal, /access tabs, grading flow, or the standalone `/comps` page behavior.

## Technical notes

- Files touched: `src/pages/public/PublicHelloChat.tsx` (button + new step), `src/pages/public/PublicCompetitionPayment.tsx` (extract form into shared component), new `src/components/public/CompetitionRegistrationForm.tsx`.
- Services reused as-is: `competitionPaymentSubmissionService`, `publicDuplicateSubmissionService`, `usePaymentProofScan`.
- Verification: typecheck + build, then a Playwright run through /hello with a test student confirming the button appears, the form is prefilled, and a submission lands in the competitions list.
