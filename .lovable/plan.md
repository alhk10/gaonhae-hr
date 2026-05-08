## Goal

Extend the "Copy Previous" feature on the Branch Profit & Loss page to:
1. Also work for the **Revenue** section (currently only Expenses).
2. Replace the simple confirm dialog with a **selectable list** so the user can tick which previous-month entries to copy into the current month.
3. Reuse the same selectable dialog for **Expenses**.

All work stays in `src/pages/BranchProfitLoss.tsx` (frontend/presentation only — no schema changes).

## Changes

### 1. Revenue header — add a "Copy Previous" button
In the Revenue card header (around line 1783), add a `Copy Previous` button next to `Categories` / `Add`, mirroring the Expenses header at line 1860.

### 2. Generalize the copy-previous handler
Replace `handleCopyPreviousExpenses` / `confirmCopyExpenses` with a generic version parameterised by `type: 'revenue' | 'expense'`:

- `handleOpenCopyPrevious(type)` — fetches previous-month entries for the given type, opens the dialog with the list. Shows "No entries found" toast if empty.
- `confirmCopySelected(type, selectedIds)` — inserts only the selected previous entries into the current month (same field mapping as today, with `type` preserved). Updates `profitLossData` with the inserted rows.

### 3. New selectable dialog
Replace the existing confirmation dialog (lines 2053-2070ish) with a single dialog that:

- Title: `Copy Previous Month {Revenue|Expenses}` plus the source month label (e.g. "from April 2026").
- Body: a scrollable list of previous-month entries. Each row shows a checkbox + Category + Description + Amount (formatted via `formatCurrency`). For Revenue rows, also show Qty and Sales Amount inline so the user can distinguish entries.
- Top controls: **Select All** / **Clear** toggle, plus a count like "3 of 12 selected".
- Footer: `Cancel` and `Copy Selected (N)`. Button disabled when none selected or while copying.
- State additions:
  - `copyDialogType: 'revenue' | 'expense' | null`
  - `copySourceLabel: string` (e.g. "April 2026")
  - `copyCandidates: PreviousEntry[]` (raw rows fetched from Supabase)
  - `copySelectedIds: Set<string>` (defaults to all selected on open)

### 4. Wire up
- Revenue button → `handleOpenCopyPrevious('revenue')`.
- Existing Expenses button → `handleOpenCopyPrevious('expense')` (replaces current call).
- Drop the now-unused `showCopyExpensesDialog` / `copyExpensesCount` / `copyExpensesMonth` state.

## Out of scope

- No DB schema, RLS, or service-layer changes.
- No change to default categories, PDF export, or P&L calculations.
- No bulk-copy across multiple months.

## Open question

If the previous month has **no** entries of the requested type, should we:
- (a) Show a toast and not open the dialog (current behaviour for expenses), or
- (b) Open the dialog with an empty state and a "look back further" month picker?

Default plan assumes (a). Let me know if you'd prefer (b).