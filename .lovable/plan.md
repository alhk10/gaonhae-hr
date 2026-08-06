# Fix: Event payment submissions rejected by outdated package rule

## What's happening

Submitting proof of payment on the public Event Registration page fails with
"violates check constraint seminar_payment_submissions_package_code_check".

The submissions table still enforces an old rule from the original single-seminar
setup: the package code must be exactly one of three legacy values
(`single_13`, `single_20`, `combo`).

Since the move to multi-event support, each event defines its own package codes
(e.g. `tuesday_board_breaking`, `friday_jump_rope`), and multi-select saves a
comma-joined list of codes. Every one of those values is rejected by the old rule,
so no submission for any of the current 2026 Term 3 events can be saved.

## The fix

Remove the obsolete constraint from the `seminar_payment_submissions` table so
package codes are validated by the event configuration (as they already are in the
registration form) rather than by a hardcoded list.

- Confirmed: constraint `seminar_payment_submissions_package_code_check` exists and
  allows only the three legacy codes.
- Confirmed: current events in the database use entirely different codes.
- The column stays required (not null), so a package must still be chosen.

No frontend changes are needed — the form already validates that the selected
packages belong to the chosen event.

## Verification

After the change, submit a test payment on the public event page for a 2026 Term 3
event with both a single package and a multi-package selection, and confirm the row
appears in the Seminars tab of /access.
