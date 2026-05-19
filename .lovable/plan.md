## Goal

Remove all test grading data from the public Grading List and related database tables.

## Scope (what counts as "test data")

All 17 rows in `grading_payment_submissions` — every record has a `TEST…` name (TEST TEST, TEST 3, TEST5 TEST5, TEST6 TEST6, … TEST 14) and none are linked to a real invoice (`matched_invoice_id` is null on every row). All were created during the recent public-submission testing.

```
17 grading_payment_submissions (refs GP-202605-0001 … GP-202605-0017)
```

The 43 rows in `grading_registrations` are real student data (LUCERO, HII, BYEON, SONG, …) from the April 2026 Morley grading and are **not** touched.

## Changes

Single migration that runs inside one transaction:

1. **Delete proof-of-payment files** from the storage bucket for each submission's `proof_url` (best-effort via `storage.objects` rows matched on the file path).
2. **Delete** all 17 rows from `public.grading_payment_submissions`.
3. **Reset** the GP reference sequence for the current YYYYMM so the next public submission starts again at `GP-202605-0001` (handled naturally — the generator computes `MAX(...) + 1`, so no extra action needed once rows are gone).

Nothing else is connected:

- No `invoices` / `invoice_items` reference these submissions.
- No `payments` rows (submissions are pre-payment proof uploads).
- `grading_slots` are reused by future real bookings — kept as-is.
- `grading_registrations` left untouched.

## Out of scope

- Grading slots, products, real registrations, invoices, payments.
- UI/code changes — pure data cleanup.

After approval I will issue the migration to delete the 17 submission rows (and their storage objects). Confirm to proceed, or tell me if registrations / slots should also be cleared.
