# Phase 6 Plan: Reporting Basis + Trial Balance + Balance Sheet

## Goal
Add proper accounting reports on top of the ledger already built in earlier phases:

- A finance-wide Cash / Accrual basis toggle
- Trial Balance report
- Balance Sheet report
- Drill-down from reports into underlying ledger lines
- CSV/PDF exports for the new reports

## User-facing changes

### 1. Finance basis toggle
Add a visible toggle in the Finance area:

- Accrual basis: reports use posted journal dates and outstanding receivables/payables.
- Cash basis: reports are adjusted to reflect received/paid cash timing where possible.

The selected basis should persist per browser session so Finance, P&L, Tax, Trial Balance, and Balance Sheet stay consistent while navigating.

### 2. Trial Balance
Create a new Finance report page:

- Route: `/finance/reports/trial-balance`
- Shows all ledger accounts for a selected period and branch.
- Columns: Account Code, Account Name, Account Type, Debit, Credit, Net Balance.
- Totals must balance: total debits = total credits.
- Account rows are clickable to show the contributing journal lines.
- Export to CSV and PDF.

### 3. Balance Sheet
Create a new Finance report page:

- Route: `/finance/reports/balance-sheet`
- Shows Assets, Liabilities, and Equity as of a selected date.
- Includes subtotals per section and final accounting equation check:
  - Assets = Liabilities + Equity
- Supports branch filtering.
- Optional comparison against prior month/period if cleanly supported by existing ledger data.
- Export to CSV and PDF.

### 4. Navigation updates
Update the Finance dashboard so users can access:

- Live Branch P&L
- Tax Centre
- Trial Balance
- Balance Sheet
- Backfill tools

## Technical implementation

### 1. Reporting basis context
Add a small shared context/service:

- `FinanceBasisContext.tsx`
- Tracks `cash` or `accrual`
- Persists selection in `localStorage`
- Used by Finance reports and tax/P&L pages where applicable

### 2. Ledger reporting view
Add a database migration for a normalized reporting view, likely:

- `v_ledger_lines`

The view should join journal lines with:

- journal entries
- chart of accounts
- branches where needed
- tax code fields already added in Phase 5

This keeps reports consistent and reduces duplicate query logic.

### 3. Reporting services
Add focused services:

- `reportingBasisService.ts`
  - Applies accrual/cash reporting rules.
- `trialBalanceService.ts`
  - Aggregates debits and credits by account.
- `balanceSheetService.ts`
  - Aggregates balances by account type and section.

Services should use existing Supabase patterns and respect branch access/RLS.

### 4. Export utilities
Add or extend report export utilities:

- Trial Balance CSV/PDF
- Balance Sheet CSV/PDF

Exports should use existing date formatting rules: DD/MM/YYYY via `@/utils/dateFormat` helpers.

## Data and compliance rules

- All report data remains stored in Supabase.
- Reports derive from posted ledger/journal data, not from separate duplicated totals.
- Existing country tax rules from Phase 5 remain intact.
- No roles are stored on user/profile tables.
- Existing branch access and RLS patterns must be respected.
- User-facing dates must use DD/MM/YYYY helpers.

## Validation checklist

Before completion:

- Confirm Finance navigation exposes the new reports.
- Confirm Trial Balance totals balance.
- Confirm Balance Sheet equation is shown and calculated.
- Confirm basis toggle changes report output where cash/accrual differences exist.
- Confirm CSV/PDF exports generate successfully.
- Check affected integrations step by step:
  - Finance dashboard navigation
  - Ledger view/query service
  - P&L/Tax compatibility with basis toggle
  - Report drill-downs
  - Export utilities

## Implementation order

1. Add database reporting view migration and Supabase types updates.
2. Add reporting basis context and wrap Finance routes.
3. Build Trial Balance service and page.
4. Build Balance Sheet service and page.
5. Add navigation cards/buttons in Finance dashboard.
6. Add CSV/PDF exports.
7. Validate report calculations and routing.

Approve this plan to implement Phase 6.