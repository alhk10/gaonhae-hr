## Goal
Each seminar package gets an optional short description, editable in the Events settings dialog and displayed under the package label wherever packages are listed.

## Changes

**1. Package shape (`src/services/seminarPaymentSubmissionService.ts`)**
- Add optional `description?: string | null` to `SeminarPackageOption`.
- Packages are stored as JSONB on `seminar_events`, so **no database migration is needed** — the new key rides along with existing data, and packages without it simply have no description.
- Normalise it when reading events (default to empty/null).

**2. Events settings dialog (`SeminarEventsSettingsDialog.tsx`)**
- Under each package's label/price row, add a small textarea (placeholder "Description (optional, shown under the package name)").
- Include `description` in the save payload, trimmed; save as `null` when blank.

**3. Public page (`src/pages/public/PublicSeminarPayment.tsx`)**
- In the package checkbox/radio list, render the description beneath the label in muted small text; nothing renders when empty.

**4. Admin edit dialog (`EditSeminarSubmissionDialog.tsx`)**
- Same treatment in its package picker list so admin and public views match.

## Notes
- Description is presentational only: it is not stored on submissions and does not affect `package_label`, totals, or the multi-package discount.
