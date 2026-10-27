# Rebuild Finance as a branch running journal in /access

## What you'll get
A new **Finance** tab in `/access`, visible only with the all-branch password (Hp97533488). It shows one running journal per branch: every money movement in date order, with a running balance.

- **Branch picker** at the top (all branches available), plus a month/date-range filter.
- **Automatic lines** (read-only), pulled live from existing records:
  - Payments received (verified/paid) — money in, linked to invoice number and student/customer
  - Refunds and rental deposit refunds — money out
- **Manual lines** staff can add, edit and delete: expenses (rent, salaries, supplies, etc.) and other income, with date, category, description, amount, optional receipt image (paste supported).
- Columns: Date, Type (Auto / Manual), Description, Reference, In, Out, Running balance, Remark.
- Totals for the period: total in, total out, net, closing balance. Opening balance carries over from before the selected period.
- Currency per branch (S$ / A$); dates DD/MM/YYYY.
- Export current view to CSV/PDF.

## What gets removed
All old finance screens and logic:
- Finance dashboard, Journals, New Journal, Journal Detail, General Ledger, Trial Balance, Balance Sheet, Branch P&L Live, Backfill Runner, Branch Profit & Loss page/dialog, P&L drilldown, finance-basis toggle, tax returns
- Their sidebar links and routes (no redirects)
- Automatic accounting postings from invoices/payments
- Partner Branch P&L view on the employee dashboard (depends on the old P&L) — removed too

Old database tables (chart of accounts, journal entries/lines, fiscal periods, tax codes/returns, P&L entries/categories, published P&L reports, backfill runs) are dropped. Existing manual P&L expense entries are copied into the new journal first so nothing is lost.

## Technical details
- New table `branch_journal_entries` (branch_id, entry_date, direction in/out, category, description, amount, receipt_path, remark, created_by_label); grants + RLS; writes only via password-gated SECURITY DEFINER RPCs restricted to the all-branch scope.
- RPC `access_branch_journal(password, branch_id, from, to)` unions payments, refunds/credit refunds and manual entries, computes opening balance and window running balance server-side.
- RPCs `access_branch_journal_upsert` / `_delete`.
- Migrate `branch_profit_loss_entries` rows into the new table, then drop old finance triggers/functions and tables; remove `accountingPostings` calls from invoice/payment services.
- New `FinanceTab.tsx` in grading-list, wired in `PublicGradingList.tsx` behind `isAllBranch`.
- Unit test for running-balance/opening-balance calculation.
- Record the rule in AGENTS.md and update the Partner P&L memory.
