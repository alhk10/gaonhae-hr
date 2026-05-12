## Branch P&L (Live) — Quarter preset + drill-down dialog

### 1. Quarter period preset

In `src/services/branchPnlLiveService.ts` and `src/pages/finance/BranchPnlLive.tsx`:

- Confirm calendar quarters: Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec.
- Expand the "Period" Select with explicit quarters for the current year:
  - This month / Last month
  - This quarter (auto)
  - Q1 / Q2 / Q3 / Q4 (current year)
  - Last quarter
  - This FY / Custom
- Update `PnlPeriodPreset` type and `periodFromPreset()` to compute `from = first day of quarter`, `to = last day of quarter` for each option. (Existing `this_quarter` math is already correct — just adding more options.)

### 2. Click-to-drill dialog

When the user clicks an amount in any P&L row (Income, COGS, Expenses), open a dialog listing every contributing transaction with:

| Date | Invoice # | Student | Amount |
|------|-----------|---------|--------|

Implementation:

- Add `getPnlAccountTransactions({ accountId, branchId, from, to })` in `branchPnlLiveService.ts`:
  1. Query `journal_lines` joined with `journal_entries` (filter by account_id, entry_date range, branch, posted/non-void).
  2. For each line: `source_type` + `source_id` → if `invoice` or `payment`, look up `invoices` table (invoice_number, invoice_date, student_id) and `students` (full_name).
  3. For `payment` source, resolve via `payments.invoice_id → invoices`.
  4. Return rows: `{ date, invoice_number, invoice_id, student_name, amount, journal_id, narration }`.

- New component `src/components/finance/PnlAccountDrilldownDialog.tsx`:
  - Props: `open, onClose, accountCode, accountName, branchId, from, to, accountId`.
  - Loads transactions on open, shows table with Date (DD/MM/YYYY via `formatDate`), Invoice # (link to invoice), Student name, Amount (right-aligned, tabular).
  - Footer shows total matching the row amount.
  - Handles non-invoice sources (e.g. expenses, manual journals) gracefully — show narration instead of student/invoice.

- In `BranchPnlLive.tsx`:
  - Make the amount cells in `renderRow` clickable buttons that open the drilldown dialog with the clicked account context.
  - Keep existing GL link on the account name (left column) — drill-down is a quick in-page view, GL link remains for full ledger.

### Out of scope
- No DB schema changes.
- Prior-period column stays read-only (clicking "This period" only).
- No changes to PDF/CSV export.

### Files

- `src/services/branchPnlLiveService.ts` — extend presets + add `getPnlAccountTransactions`.
- `src/pages/finance/BranchPnlLive.tsx` — Period dropdown options + click handler.
- `src/components/finance/PnlAccountDrilldownDialog.tsx` — new dialog component.
