# Export Student List to CSV (Branch Dashboard)

## What you'll see

- A new **Export CSV** button (download icon, outline style) in the Students tab toolbar of the branch dashboard, placed immediately before the **Add Student/Trial** button.
- Clicking it downloads a CSV file of exactly the students currently shown in the list — so it respects the search text and the status filter (Active + Inactive, Active Only, Trial, Uninvoiced Class Fees, etc.).
- Filename includes the branch and date, e.g. `students-yishun-2026-09-16.csv`.
- If the filtered list is empty, the button is disabled.

## CSV columns

Display Name, First Name, Last Name, Belt, Status, Phone, Email, Date of Birth (DD/MM/YYYY via the standard date helper).

## Technical details

- Single-file change: `src/components/dashboard/BranchDashboard.tsx`.
- Build rows from the existing `filteredStudents` array (already applies search + status filter).
- Simple inline CSV builder with proper quoting/escaping (commas, quotes, newlines); download via `Blob` + anchor click — same pattern used by the finance exports.
- Dates formatted with `formatDate` from `@/utils/dateFormat` (DD/MM/YYYY standard).
- Button: `size="sm" variant="outline"` with `h-8`, Download icon, label "Export CSV" (`hidden sm:inline` label, icon-only on mobile) to match the neighbouring buttons.

## Verification

- Typecheck + build log check.
- Playwright on a public route is limited (authenticated /access preview not available in this environment), so verification is compile-level plus code review of the export logic.
