## Goal

Extend the Grading Summary PDF's "Amount collected by branch" table to also show GST (9% exclusive, added on top) and the unverified amount per branch.

## Scope

Frontend only. File: `src/pages/public/PublicGradingList.tsx`, inside `handleDownloadSummaryPdf` — just the second `autoTable` block.

## Restructure Table 2

Rename to: **Amount collected by branch**.

Add a leading label column and convert the single data row into four rows. Header becomes: `'' | <Branch 1> … <Branch n> | Total`.

Rows (per branch, plus a Total column):

1. **Subtotal (paid + verified)** — current sum (status `paid` or `verified`).
2. **GST 9%** — `subtotal × 0.09` (exclusive, added on top).
3. **Total (incl. GST)** — `subtotal × 1.09`.
4. **Unverified (pending)** — sum of `amount` where status is `pending_verification` or `pending verification`.

All values formatted with `formatCurrency` (SGD). Label column left-aligned and bold; data cells centered. Total column and Total row both bolded with light-grey fill (mirroring Table 1).

Branch header cells keep `branchColor()` fills so columns visually match Table 1 and the list PDF.

## Verification

1. `/grading-list` → unlock with `39SeagullWalk` → click Summary PDF.
2. Confirm Table 2 shows 4 labelled rows, branch columns + Total, correct colors.
3. Manual check: Subtotal × 0.09 == GST row; Subtotal + GST == Total row; Unverified row matches sum of pending submissions.
4. Layout still fits A4 width; page-break still works.
