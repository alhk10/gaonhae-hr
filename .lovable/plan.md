# Phase 4 — Real-time Branch P&L (live ledger view)

A new `/finance/branch-pl-live` page that builds the Profit & Loss statement directly from the new accounting ledger (`journal_entries` + `journal_lines`), updates in real time via Supabase Realtime, and runs alongside the legacy Branch P&L page until Phase 10 reconciliation.

## Goals

- Show a true accounting-grade P&L (Income → COGS → Gross Profit → Expenses → Net Profit) sourced from posted journals only.
- Filter by **branch**, **period** (month / quarter / FY / custom range), and **comparison period** (prior month / prior year).
- Update live as new invoices, payments, expenses, payroll get posted (via Realtime subscription on `journal_lines`).
- Drill-down: click any line → opens the General Ledger page filtered to that account + period.
- Respect access rules: superadmin sees all branches; partner sees only their owned branches; staff cannot access.

## Page layout

```text
/finance/branch-pl-live
┌─────────────────────────────────────────────────────────┐
│ Branch ▾   Period ▾   Compare to ▾   [Export PDF] [CSV] │
├─────────────────────────────────────────────────────────┤
│ INCOME                              This period   Prior │
│   School Fees (4000)                  12,340     10,200 │
│   Grading Fees (4010)                    980        750 │
│   Ad-Hoc Lessons (4020)                  216          0 │
│   Uniform & Gear (4030)                1,420      1,100 │
│   Trial (4040)                            90        180 │
│   Other Income (4090)                      0          0 │
│   (-) Sales Discounts (4900)            (240)      (180)│
│   Total Income                        14,806     12,050 │
│                                                          │
│ COST OF SALES                                            │
│   COGS (5000)                            860        710 │
│   Gross Profit                        13,946     11,340 │
│                                                          │
│ EXPENSES                                                 │
│   Wages (6000)                         5,200      4,800 │
│   Casual Coaching (6010)               1,100        900 │
│   Staff Claims (6040)                    220        160 │
│   Rent (6100)                          2,000      2,000 │
│   Utilities (6110)                       340        310 │
│   Marketing (6120)                       180         50 │
│   Other Expenses (6190)                   60          0 │
│   Total Expenses                       9,100      8,220 │
│                                                          │
│ NET PROFIT                             4,846      3,120 │
│ Margin                                32.7%      25.9%  │
└─────────────────────────────────────────────────────────┘
```

Mobile: single column, sticky filter bar, rows collapse into "Income / GP / Net" summary cards with expandable detail.

## Data flow

1. New service `src/services/branchPnlLiveService.ts`:
   - `getBranchPnl({ branchId, from, to })` → SQL aggregate on `journal_lines` joined to `journal_entries` filtered by `entry_date`, `branch_id`, `status='posted'`, joined to `chart_of_accounts` for code/name/type.
   - Returns `{ income[], cogs[], expenses[], totals: { income, cogs, grossProfit, expenses, netProfit, margin } }`.
   - Comparison period fetched in parallel via the same query with shifted dates.
2. A Postgres view `v_pnl_lines` (read-only) precomputes `branch_id, account_code, account_name, account_type, entry_date, signed_amount` to keep the client query simple. Created in a new migration. RLS: superadmin always; partners limited to branches in `partner_branch_access`.
3. Realtime: subscribe to `journal_lines` insert/update/delete; on event, debounce 800 ms and refetch the current view's totals only.
4. PDF export reuses the existing PDF utility (`@/utils/pdf*`) to render the same layout; CSV export streams a flat row list.

## Files

```text
src/pages/finance/BranchPnlLive.tsx           (new — page)
src/components/finance/PnlTable.tsx           (new — desktop table)
src/components/finance/PnlMobileCards.tsx     (new — mobile)
src/components/finance/PnlFilterBar.tsx       (new — branch / period / compare)
src/services/branchPnlLiveService.ts          (new — query + realtime)
src/utils/pnlExport.ts                        (new — PDF + CSV)

src/App.tsx                                   (route /finance/branch-pl-live)
src/pages/finance/FinanceDashboard.tsx        (new tile "Live Branch P&L")

supabase/migrations/<timestamp>_pnl_view.sql  (v_pnl_lines view + RLS-equivalent policy via security definer function)
```

## Access control

- Route guarded same as `/finance/general-ledger`.
- Branch dropdown is filtered to:
  - Superadmin → all branches.
  - Partner → only branches where they appear in `partner_branch_access` (matches the existing Partner Branch P&L memory rule — for partners, totals are shown 100 %; ownership-% adjustment happens only on the dedicated Partner P&L PDF, not here).
  - Other staff → page hidden / 403.

## Date / period helpers

- Use `@/utils/dateFormat` for all displayed dates (DD/MM/YYYY).
- "Current month" defaults to today's month; FY = configurable via `accounting_settings.fiscal_year_start_month` (added in Phase 1).

## Out of scope for this phase

- Cash vs accrual toggle (Phase 6).
- Multi-currency consolidation (Phase 8).
- Reconciliation diff vs legacy `branch_profit_loss_entries` (Phase 10).
- Budget vs actual columns (Phase 5).

---

Approve to implement Phase 4.
