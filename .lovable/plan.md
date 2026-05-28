# Verify public submission works on /comps, /guards, /seminars, /pay

## Current state (already verified)

All four routes already submit through `SECURITY DEFINER` RPCs with `EXECUTE` granted to `anon` + `authenticated`, so PostgREST RLS visibility errors should no longer occur:

| Route        | Service                                 | RPC                          |
|--------------|-----------------------------------------|------------------------------|
| `/pay`       | `gradingPaymentSubmissionService.ts`    | `submit_grading_payments`    |
| `/comps`     | `competitionPaymentSubmissionService.ts`| `submit_competition_payment` |
| `/seminars`  | `seminarPaymentSubmissionService.ts`    | `submit_seminar_payment`     |
| `/guards`    | `guardsPurchaseService.ts`              | `submit_guards_purchase`     |

DB check confirmed: all four functions exist, `SECURITY DEFINER`, `search_path = public`, EXECUTE granted to `anon` and `authenticated`. The `payment-proofs` storage bucket already accepts anon uploads (proof upload step of `/guards` was working before the RLS fix).

## Verification plan

1. **Browser end-to-end smoke test (incognito / unauthenticated session)** for each of `/pay`, `/comps`, `/seminars`, `/guards`:
   - Fill the form with valid data (smallest cart / cheapest option).
   - Upload a tiny PNG as proof.
   - Submit and confirm the success state appears (reference number shown, no toast error).
   - Confirm a new row appears in the corresponding table via a read query.
2. **DB cleanup**: delete the four test rows + their proof files after the test.
3. If any route surfaces an error (RLS, validation, missing GRANT, storage policy), capture the exact error, fix the offending RPC or service, and re-test that route only.

## Robustness improvements (only if a test fails)

- If an RPC raises an unhandled exception, wrap the service call to surface the Postgres error code/hint in the toast (so future failures are diagnosable from the screenshot).
- If a storage upload step fails for anon, add an explicit INSERT policy on `storage.objects` scoped to `bucket_id = 'payment-proofs'`.

No proactive code changes — the four services and four RPCs are already aligned. The work in this task is verification; code edits happen only if a specific route fails the smoke test.

## Out of scope

- Admin views (`/grading-list`, superadmin dashboard) — already covered by separate policies and unaffected by public submission.
- Invoice creation flow downstream of `/guards` matching — only triggered by superadmin, not by the public form.
- Any UI redesign of the four public forms.
