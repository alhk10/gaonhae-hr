## Change

In `PublicGradingList.tsx` → `handleDownloadSummaryPdf`, update the "Students per slot by branch" table so each branch cell shows the count on the first line and the paid+verified amount in brackets on a second line.

## Details

For each slot row × branch column:
- Line 1: current student count (excluding `rejected`) — unchanged.
- Line 2: `($X.XX)` — sum of `amount` for that slot × branch where `paid_status` is `paid` or `verified`. Show `($0.00)` when none.

Apply the same treatment to:
- The `Total` column (row total amount across branches).
- The bottom `Total` row (column total amount across slots).
- Grand total cell (sum of all paid+verified amounts).

Format amounts with the existing `formatCurrency` helper, matching Table 2's currency style. Cells stay center-aligned; the bracketed amount renders slightly smaller via a newline in the cell string (autotable wraps naturally at 8pt).

No changes to Table 2 (amount collected by branch), no schema or service changes.
