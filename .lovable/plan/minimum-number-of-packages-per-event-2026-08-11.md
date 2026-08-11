# Minimum number of packages per event

Add a "Minimum number of packages" switch under the Multi-package discount toggle in the /access Seminars event settings dialog, with a number input defaulting to 2. When on, the public Event Registration form requires at least that many packages before it can be submitted.

## Behaviour

- Switch off (default): no minimum, current behaviour (1 package is enough).
- Switch on: number field appears (default 2, min 2). Participants must select at least that many packages.
- The minimum only makes sense with multi-select, so the switch is only shown/enabled when Multi-package discount is on. Turning multi-package discount off clears the minimum.
- Discount ladder is unchanged and keeps applying when multi-package discount is on.
- On the public form, the packages section shows a hint ("Select at least N packages") and the submit button stays disabled with an inline message until the minimum is met.
- The admin edit-submission dialog uses the same rule when editing selected packages.

## Technical

- Migration: add `min_packages integer not null default 0` to `public.seminar_events` (0 = no minimum). Update `get_public_seminar_events` and `admin_upsert_seminar_event` to return/accept the new column.
- `src/services/seminarPaymentSubmissionService.ts`: add `min_packages` to the `SeminarEvent` interface, the upsert input, and the mapper.
- `src/components/grading-list/SeminarEventsSettingsDialog.tsx`: add `min_packages` to `emptyForm`, `startEdit`, `duplicateEvent`, save payload; render the switch + number input directly beneath the multi-package discount block; clamp value to >= 2 when enabled.
- `src/pages/public/PublicSeminarPayment.tsx`: derive `minPackages` from the selected event and add `selectedPackages.length >= minPackages` to `canSubmit`, plus the hint text.
- `src/components/grading-list/EditSeminarSubmissionDialog.tsx`: apply the same minimum check before saving.
