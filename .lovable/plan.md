# Phase 6 — Cash vs Accrual toggle + Trial Balance + Balance Sheet

Add the two foundational accounting reports (Trial Balance and Balance Sheet) and a global Cash vs Accrual basis toggle that re-bases every finance report (P&L, Tax, TB, BS) from the same posted ledger.

## Goals

- Single basis toggle (Accrual | Cash) that all finance reports respect.
  - Accrual: use journal lines as posted (invoice date / bill date).
  - Cash: only recognise income/expense when the matching cash movement (payment received / bill paid) is posted; AR/AP balances replace income/expense until then.
- Trial Balance at `/finance/reports/trial-balance` — every account, period debit / credit / net, with drill-down to GL.
- Balance Sheet at `/finance/reports/balance-sheet` — Assets / Liabilities / Equity as at a date, with comparative column and "must balance" indicator.
- All reports honour branch filter (single, multi, consolidated) and respect access rules already used by P&L Live.

## Page layouts

```text
/finance/reports/trial-balance
┌─────────────────────────────────────────────────────────────┐
│ Branch ▾  Period ▾  Basis [Accrual|Cash]  [Export] [PDF]    │
├─────────────────────────────────────────────────────────────┤
│ Code  Account                 Debit       Credit     Net    │
│ 1000  Cash on hand          12,300.00         0.00 12,300Dr │
│ 1100  Bank — DBS             8,420.50         0.00  8,420Dr │
│ 4000  Tuition income              0.00   45,000.00 45,000Cr │
│ ...                                                         │
│ TOTALS                      57,820.50    57,820.50      0.00│
└─────────────────────────────────────────────────────────────┘

/finance/reports/balance-sheet
As-at: 30/06/2026   Compare: 31/03/2026   Basis: Accrual
ASSETS
  Current assets
    Cash on hand .......... 12,300   8,150
    Bank — DBS ............  8,420   6,200
    AR ....................  3,100   2,400
  Total current assets ...  23,820  16,750
  ...
LIABILITIES
EQUITY
  Retained earnings, P&L YTD
TOTAL L+E vs TOTAL ASSETS  → balanced ✓
```

Mobile: cards per section, sticky filter bar.

## Data model

No new tables. Add a small reporting view to keep service code tidy:

```text
v_ledger_lines  (security_invoker)
  branch_id, account_id, account_code, account_name, account_type,
  entry_date, debit, credit, signed_amount, journal_entry_id
```

Cash basis is computed by service-side mapping:
- Income lines (account_type = income) are deferred until the payment journal that settles the originating invoice is posted; we trace via `journal_entries.source_table='payments'` + `source_id`.
- Expense lines (account_type = expense) are deferred until the bill payment is posted (later phase still uses cash already, so behaviour unchanged for now).
- Until cash event happens, the offsetting AR / AP line stays on the balance sheet.

## Services & components

```text
src/services/reportingBasisService.ts
  - applyBasis(rows, basis): rewrites entry_date / inclusion based on cash settlement
  - getSettlementMap(branchId, range): map invoice_id → cash date for income
src/services/trialBalanceService.ts
  - getTrialBalance({ branchId, from, to, basis })
src/services/balanceSheetService.ts
  - getBalanceSheet({ branchId, asAt, compareAsAt, basis })
src/utils/financeReportExport.ts
  - CSV + PDF for TB and BS (jsPDF)

src/contexts/FinanceBasisContext.tsx       (basis stored in localStorage, default 'accrual')

src/pages/finance/TrialBalance.tsx         (new, /finance/reports/trial-balance)
src/pages/finance/BalanceSheet.tsx         (new, /finance/reports/balance-sheet)
src/components/finance/BasisToggle.tsx     (shared switch, used in P&L, Tax, TB, BS)
```

Wire-up:
- New routes in `App.tsx`.
- Activate the two existing "coming soon" tiles on `FinanceDashboard.tsx` (P&L + Balance Sheet); add a Trial Balance tile.
- Drop `<BasisToggle/>` into `BranchPnlLive.tsx` and `TaxCentre.tsx` so the same toggle drives all four reports.

## Access control

Same rules as Branch P&L Live:
- Superadmin: all branches, both bases.
- Partner: own branches only.
- Other staff: hidden.

## Validation

- TB total debit = total credit (assert and surface a red warning if not).
- BS Assets = Liabilities + Equity + YTD P&L (red badge if not).
- Comparative period uses same basis.

## Out of scope this phase

- Budget vs Actual columns.
- Departmental / class tracking dimensions.
- Multi-currency revaluation (still single-currency per branch).
- Cash basis for AP (bills) — deferred until Phase 8 Bills/AP module.

---

Approve to implement Phase 6.
