# Fix birth dates saved one day early

## What is going wrong

Singapore is 8 hours ahead of UTC. Three of the public forms take the date picked in the calendar
(midnight Singapore time) and convert it to the universal clock before saving, which lands on
16:00 the previous day — so the birth date is stored one day earlier than the person selected.

Two other forms (Competitions and Events/Seminars) were already written the correct way, which is
why the problem only shows up on some transactions.

## The fix

1. Use one shared, timezone-safe conversion everywhere a picked date is saved. The project already
   has this helper; the affected forms simply are not using it.
2. Apply it to the three forms that still convert wrongly:
   - School fees payment page
   - Uniforms & guards purchase page
   - Grading registration page
3. Sweep the rest of the app for the same unsafe conversion on any saved date (not only birth
   dates) — invoice dates, payment dates, attendance dates and report ranges use the same pattern
   in places and can drift a day for the same reason.
4. Add a lint rule so this conversion cannot be reintroduced in future date fields.

## Why this also improves matching

Automatic matching of submissions to students scores an exact birth-date agreement. A one-day drift
silently drops that score, so some payments fail to auto-match. Fixing the write path removes that
class of failures.

## Existing records (optional, your call)

Records already saved are one day early and cannot be distinguished by looking at them alone. What
can be done safely: run a report listing submissions whose birth date is exactly one day before the
birth date on the matched student record, on the affected pages, during the period the bug existed.
You review that list and approve corrections in bulk. No automatic rewriting of data without your
approval.

## Technical notes

- Replace `dob.toISOString().split('T')[0]` with `toISODate(dob)` from `@/utils/dateFormat`
  (`format(d, 'yyyy-MM-dd')`, local time) in `src/pages/public/PublicSchoolFeesPayment.tsx:204`,
  `src/pages/public/PublicGuardsPurchase.tsx:179`, `src/pages/public/PublicGradingPayment.tsx:375`,
  and `PublicGradingPayment.tsx:282` (`dobIso`).
- Audit the ~115 other `toISOString().slice(0,10)` / `.split('T')[0]` call sites; convert the ones
  that serialise a user-picked or local calendar date. Leave genuine UTC timestamp usage alone.
- Add an ESLint `no-restricted-syntax` rule flagging `toISOString()` followed by `slice(0, 10)` or
  `split('T')[0]`, with a message pointing at `toISODate`.
- No database schema or RPC changes.
