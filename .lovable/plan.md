## Problem

On the public Grading List, the inline certificate (Award) button doesn't appear, and "Download selected certificates" shows "No eligible rows selected" — even when the row's Result is set to Pass — for any row that originated from a payment submission (e.g. the verified TEST TEST row in the screenshot).

Root cause: `isCertEligible` in `src/pages/public/PublicGradingList.tsx` (~line 903) requires `r.source === 'registration'`. Submission rows are excluded from both the inline button render (line 1273) and the bulk picker (line 967), even though they carry a valid `grading_date`, `current_belt`, and `result`.

## Change

In `src/pages/public/PublicGradingList.tsx`, drop the `source === 'registration'` restriction from `isCertEligible`:

```ts
const isCertEligible = (r: PublicGradingListRow): boolean =>
  !!r.grading_date
  && !!r.current_belt
  && (r.result === 'pass' || r.result === 'double');
```

That alone fixes both symptoms because:
- The inline Award button block (line 1273) is gated only by `isCertEligible(r)`.
- `handleDownloadSelectedCertificates` (line 967) skips non-eligible rows via the same helper; once submissions qualify, `rowToCertInput` already handles them (it reads `grading_date`, `current_belt`, and resolves the name from `certificate_name` / `first_name` + `last_name` / `student_name`).
- `rowCertKey` already keys on `submission_id` when `registration_id` is absent, so selection state is stable.

No DB, RPC, or service changes. No mass-edit/dialog changes.

## Out of scope

- Showing certificates for `confirmed`/`fail` results.
- Scorecard data for submissions (cert continues to render with empty scorecard, same as registrations today).
- Realtime refresh changes.
