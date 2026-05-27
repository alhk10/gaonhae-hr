## Context

I verified server-side end-to-end as the anon role:

- `submit_competition_payment` RPC works (test row inserted)
- `POST /storage/v1/object/payment-proofs/public-comps/...` upload works
- The storage policies for `public-comps` exist
- Only 1 row exists in `competition_payment_submissions` (my test) — the user's submission never reached the DB
- No `ERROR`/`FATAL` Postgres logs match the user's attempt

So the submit is failing or hanging **client-side** (likely the file upload from mobile Chrome), and the existing code silently keeps the button in "Submitting…" without surfacing anything actionable. Two contributing issues:

1. `submitCompetitionPayment` swallows the `error` returned by `createSignedUrl` and has no per-step timeout or per-step diagnostic.
2. The `public-comps` storage policies are defined `TO public` whereas the working `public-grading` / `public-guards` ones are `TO anon, authenticated`. Functionally equivalent in Postgres but worth aligning so behavior matches the known-good flows exactly.

## Plan

### A. Frontend — `src/services/competitionPaymentSubmissionService.ts`

Rewrite `submitCompetitionPayment` so every step is observable and bounded:

- Wrap the proof upload, optional certificate upload, signed-URL creation and RPC call in a small `withTimeout(promise, ms, label)` helper (30s for uploads, 15s for RPC).
- On any step failure throw `new Error("<step> failed: <reason>")` so the existing `toast.error(err.message)` in the page shows something concrete (e.g. "Proof upload failed: network error").
- Log `[/comps]` breadcrumbs to `console.info` at each step so future repros leave a trail in the user's console.
- Keep the existing fallback `proofUrl = proofPath` when `createSignedUrl` returns no data (anon has no SELECT on the folder, expected).
- No behavior change on the happy path.

### B. Frontend — `src/pages/public/PublicCompetitionPayment.tsx`

- In the `catch` block, also show the error in an `Alert` underneath the Submit button (in addition to the toast) so it stays visible on mobile after the toast auto-dismisses.
- Disable the Submit button correctly when `submitting` and reset it in `finally` (already done — verify).

### C. Migration — align `public-comps` storage policies with `public-grading`

- Drop existing `Public can upload comps proof` and `Staff can read comps proof uploads`.
- Recreate them targeting `anon, authenticated` (INSERT) and `authenticated` (SELECT), mirroring the working grading/guards policies exactly.

### Out of scope

- No changes to the RPC, the table schema, or the verification / import flow.
- No change to the public payment options or PayNow QR logic.

## Verification after build

1. Reload `/comps` on the preview, fill the form with the same belt/categories the user used, attach a small image, submit → expect either success view or a concrete error toast + inline alert within ~30s.
2. Re-run the same on mobile to confirm timeouts surface a real message.
3. `select count(*) from competition_payment_submissions` should increment.
