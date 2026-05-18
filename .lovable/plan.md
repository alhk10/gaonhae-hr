## Goal

Add a **separate** "Summary PDF" download button on `/grading-list` that is only visible when unlocked with the full-admin password (`39SeagullWalk`, i.e. `unlockLevel === 'full'`). The existing Grading List PDF stays unchanged.

## Scope

Single file: `src/pages/public/PublicGradingList.tsx`.
No service / RPC / DB changes — `PublicGradingListRow.amount` and `branch_name` are already available.

## UI

In the toolbar Card (currently holds the date Select + Download icon), conditionally render a second icon button next to the existing one:

- Visible only when `canDelete` (already === `unlockLevel === 'full'`).
- Icon: `Download` (reuse), `title="Download Summary PDF"`, distinct `variant="secondary"` so it's visually distinguishable.
- Disabled when `isLoading || groups.length === 0`.

## New handler: `handleDownloadSummaryPdf`

Builds a small standalone PDF (A4, same margins/title style as the list PDF) containing two tables.

Branch list = unique `branch_name` from `filteredRows`, sorted alphabetically. Used as columns in both tables so colors stay consistent across them.

### Table 1 — Students per slot by branch

- One row per group (same grouping used for the list).
- Row label: `{slot_title} — {formatDate(date)} {HH:mm}`.
- Columns: `Slot | <Branch 1> … <Branch n> | Total`.
- Cell value = count of `g.items` matching that branch, **excluding `rejected`** (`r.paid_status.toLowerCase() !== 'rejected'`).
- Footer row: `Total` with column sums; final cell = grand total ("Total number of students this grading").

### Table 2 — Amount collected by branch

- Columns: `<Branch 1> … <Branch n> | Total`.
- Single data row: sum of `r.amount ?? 0` where `r.paid_status.toLowerCase()` is `paid` or `verified`, grouped by branch.
- Format with `formatCurrency` (SGD default).

### Styling

- Reuse `autoTable` config (`fontSize: 7`, center/middle aligned, light alt rows).
- Apply `branchColor()` to branch header cells in both tables so columns visually match the main list PDF.
- Page-break safe: if Table 2 would overflow, `doc.addPage()` first.
- Filename: `grading-summary-${dateFilter === 'all' ? 'all' : dateFilter}.pdf`.
- Same footer pattern (page X of Y + generated timestamp).

## Verification

1. Without unlocking → only the original Download button shows.
2. Unlock with `39SeagullWalk` → second Summary button appears; standard password unlock does **not** show it.
3. Click Summary → PDF opens with the two tables; counts match the list (rejected excluded); amount row matches manual sum of paid + verified rows; branch colors match the list PDF.
4. Lock again → Summary button disappears.
