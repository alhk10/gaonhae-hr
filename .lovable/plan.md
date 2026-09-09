# Rename Branch to "Grading Venue" + add "Centralised Grading" venue

In the Grading Events settings dialog (`/access` → Grading tab → Events), rename the "Branch *" field to "Grading Venue *" and add "Centralised Grading" as a selectable venue.

## What the user sees

- The event form's first field is labelled **Grading Venue *** with placeholder "Select grading venue".
- The dropdown lists "Centralised Grading" alongside the existing branches (Balmoral, Bukit Merah, …, Yishun).
- Choosing "Centralised Grading" behaves like any venue: slot titles re-title with "Centralised Grading" as the leading name, and the event list shows "DD/MM/YYYY · Centralised Grading".
- "Centralised Grading" appears in grading-slot pickers (grading events dialog, Add/Bulk Add Grading Slot dialogs) but does **not** appear as a school branch anywhere else — student registration, employee branch access, invoices, dashboards, payroll, attendance, and branch filters keep their current branch lists.

## Technical detail

- The venue is stored as `grading_slots.branch_id`, so "Centralised Grading" must be a real row in `public.branches`. Migration: `INSERT INTO public.branches (id, name, country) VALUES ('centralised-grading', 'Centralised Grading', 'Singapore')` — same pseudo-branch pattern as the existing `Headquarters` row.
- `src/components/grading-list/GradingEventsSettingsDialog.tsx`: rename the label to "Grading Venue *" and placeholder to "Select grading venue". Its branch query must include the new venue (no name-exclusion added here).
- Add `'Centralised Grading'` to the existing Competition/Headquarters name-exclusion lists so it never surfaces as a real branch:
  - `src/hooks/useBranches.ts`
  - `src/services/priceRulesService.ts`
  - `src/components/employee/InvoiceAccessManager.tsx`
  - `src/components/sales/ImportProductsDialog.tsx`
  - `src/components/sales/InvoiceDialog.tsx`
  - `src/components/sales/ProductManagementList.tsx`
  - `src/pages/sales/GradingManagement.tsx` (branch lists, except grading-slot pickers)
- Keep it selectable in grading-venue contexts: `GradingEventsSettingsDialog.tsx`, `src/components/sales/AddGradingSlotDialog.tsx`, `src/components/sales/BulkAddGradingSlotsDialog.tsx`, and `src/components/sales/GradingListTab.tsx` (grading branch filter).
- Verify each of the above files individually and include/exclude per context rather than blanket edits; then check other branch dropdowns (student registration, employee forms, notices targeting) and exclude the venue there too if it appears.
- Grading eligibility for students is unchanged: a Centralised Grading event with empty "Available to branches" is open to all branches, which matches the intended use.
