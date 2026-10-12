# Prevent duplicate public form submissions

## Problem
Competition submissions (and the same pattern in grading, seminar, guards, school fees) can be created multiple times when timing is close: retries after an error, double-taps, or two devices. Each attempt generates a fresh `client_ref`, so the existing idempotency never matches, and three identical rows for LEE SOO HYUK were created within the same minute.

## Fix: server-side duplicate detection

Client-side button disabling already exists but cannot cover retries, slow networks, or multiple devices. The dedupe must happen in the database.

### 1. Submission fingerprint + dedupe window
Add a SECURITY DEFINER insert RPC (or extend the existing insert path) for each public submission table that, before inserting, looks for an existing row with the same fingerprint:

- same event/product + branch
- same normalised first name, last name, DOB
- same total amount and identical line items
- status still pending (not rejected/deleted)
- created within the last 15 minutes

If a match exists, return the existing row instead of inserting — the parent sees the same confirmation and reference number, and no duplicate is created.

### 2. Stable client reference per form session
Generate the `client_ref` once when the form loads (stored in state/ref), not on every submit attempt. Retries of the same form then reuse the same ref, so the existing unique-index idempotency (grading, guards, chat) actually catches them. Add the same `client_ref` column + unique partial index to `competition_payment_submissions` and `seminar_payment_submissions`, which currently lack it.

### 3. Apply to all public payment forms
Same treatment across: competitions (`/comps` + `/hello`), grading, seminars, uniforms & guards, school fees (`/hello` chat already has session idempotency — verify it covers this case).

### 4. Clean up the existing duplicates
The three LEE SOO HYUK rows (COMP-261009-6be275, bb680a, b6f65a): keep one, reject/delete the other two via the existing staff delete-with-approval flow.

## Technical notes
- New migration: `client_ref` columns + unique partial indexes for competition and seminar submissions; dedupe logic inside SECURITY DEFINER RPCs so anonymous public inserts stay safe.
- Dedupe match is on normalised identity + amount + line items, never on email alone (families share emails).
- Legitimate re-submission after rejection or after the 15-minute window still works.
- `src/services/competitionPaymentSubmissionService.ts` moves `newClientRef()` out of the submit function; the form generates it once per loaded form.
