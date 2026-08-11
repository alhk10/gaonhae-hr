# Multi-package discount and minimum packages become mutually exclusive

Today the "Minimum number of packages" switch only appears while "Multi-package discount" is on, and turning the discount off clears the minimum. Change this so the two settings are independent alternatives: an event can have the discount, or a minimum package requirement, but never both.

## Behaviour

- Both switches are always visible in the /access Seminars event settings dialog.
- Turning on "Multi-package discount" turns off "Minimum number of packages" (min resets to 0).
- Turning on "Minimum number of packages" turns off "Multi-package discount" and shows the number input (default 2, min 2).
- Multi-select of packages on the public Event Registration form stays enabled when either switch is on, since both need more than one package.
- Discount ladder ($10 / $20 / $30 ...) applies only when the discount switch is on; a minimum-packages event charges full price for each package.
- Public form still blocks submit with a hint until the minimum is met.

## Technical

- `src/components/grading-list/SeminarEventsSettingsDialog.tsx`: move the minimum-packages block out of the `form.multi_package_discount &&` conditional; on discount toggle-on set `min_packages: 0`; on minimum toggle-on set `multi_package_discount: false, min_packages: 2`. Save payload sends `min_packages` as-is (no longer gated by the discount flag).
- `src/pages/public/PublicSeminarPayment.tsx`: derive multi-select from `multi_package_discount === true || min_packages >= 2` instead of the discount flag alone; keep discount math tied to `multi_package_discount`.
- `src/components/grading-list/EditSeminarSubmissionDialog.tsx`: same multi-select derivation so admin edits match the public form.
- No database change needed — `min_packages` already exists.
