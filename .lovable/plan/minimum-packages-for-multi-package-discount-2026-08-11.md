# Minimum packages for multi-package discount

Add a "Minimum number of packages" setting (default 2) directly under the Multi-package discount toggle in the Seminar Events settings dialog, and honour it wherever the discount is calculated.

## Behaviour

- Shown only when the Multi-package discount toggle is on.
- Numeric stepper, minimum 2, default 2.
- The discount only kicks in once the participant selects at least this many packages:
  - below the minimum: no discount
  - at the minimum: $10 off
  - each additional package beyond the minimum: +$10 (so min 3 → 3 packages = $10, 4 = $20, etc.)
- Existing events keep today's behaviour, because the default of 2 reproduces the current $10 / $20 / $30 ladder.

## Where it applies

- Event settings dialog (/access → Seminars → Events): new field, saved with the event.
- Public Event Registration (/seminars): discount line reflects the rule; the summary explains the minimum.
- Admin edit dialog for a seminar submission: same calculation, so the two never drift.

## Technical notes

- Migration: add `min_packages integer NOT NULL DEFAULT 2` (check >= 2) to `seminar_events`; extend `admin_upsert_seminar_event` with a `p_min_packages` parameter and return the column from `get_public_seminar_events`.
- `seminarMultiPackageDiscount(count, minPackages = 2)` in `src/services/seminarPaymentSubmissionService.ts` becomes `max(0, (count - minPackages + 1)) * 10` when `count >= minPackages`, else 0; `combineSeminarPackages` takes the event's minimum.
- Update callers: `SeminarEventsSettingsDialog.tsx` (form state + field), `PublicSeminarPayment.tsx`, `EditSeminarSubmissionDialog.tsx`.
