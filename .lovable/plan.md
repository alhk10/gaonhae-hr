# Accounting Module (Xero-style) + Real-Time Branch P&L

A complete double-entry accounting layer that sits on top of existing data (invoices, payments, payroll, claims, expenses, inventory) and adds GST/BAS reporting, manual journals, financial statements, and bank reconciliation — separated by country (Singapore / Australia). It also delivers a **new real-time Branch P&L** that replaces the existing manual one once feature-complete.

## Scope

- **Chart of Accounts** — pre-seeded SG + AU, editable
- **General Ledger / Journal Entries** — auto-posted from existing modules + manual entries
- **GST F5 (SG, 9%)** and **BAS (AU, 10% GST + W1/W2 PAYG)**
- **Profit & Loss** and **Balance Sheet** — per branch, per country, consolidated
- **Real-time Branch P&L (new page)** — replaces `/branch-profit-loss`
- **Bank Accounts + CSV statement import + Reconciliation**
- **Branch sales report import (CSV)** for branches not yet on the system

## Architecture

```text
                  Existing modules
   invoices · payments · payroll · claims · branch_expenses · inventory
                          │
                          ▼  (auto-post triggers + service)
                  ┌──────────────────┐
                  │ journal_entries  │  ◄── manual journals UI
                  │ + journal_lines  │
                  └────────┬─────────┘
                           │
            ┌──────────────┼──────────────┬─────────────────┐
            ▼              ▼              ▼                 ▼
        P&L / BS       GST / BAS      Bank Recon     Real-time Branch P&L
     (per country)    (per country)  (per bank acct)   (live, drilldown)
```

Every financial event becomes a balanced journal (debits = credits). Reports are computed from `journal_lines` filtered by account type, period, branch, country. The new Branch P&L is a **derived view of the same ledger**, so it stays in sync automatically.

## Database (new tables)

Country derived from `branches.country`. RLS-guarded (superadmin write; branch staff read for their branch).

- **chart_of_accounts** — `code, name, type (asset/liability/equity/income/expense), country, parent_id, gst_code, system_account, is_active`
- **tax_codes** — `code, name, country, rate, report_box`
- **journal_entries** — `id, entry_date, period, branch_id, country, source_type, source_id, narration, status (draft/posted/void), created_by, posted_at`
- **journal_lines** — `journal_id, account_id, debit, credit, tax_code, tax_amount, branch_id, contact_ref` (always balanced per journal)
- **bank_accounts**, **bank_statements**, **bank_statement_lines**, **bank_csv_mappings**
- **branch_sales_imports** — for non-system branches
- **gst_returns** — `country, period_start, period_end, status, totals jsonb, filed_at`
- **fiscal_periods** — `country, period (YYYY-MM), is_locked`
- **payg_summary** (AU only) — monthly W1/W2 from payroll

## Auto-posting rules

| Source | Dr | Cr |
|---|---|---|
| Invoice issued | A/R | Sales income + GST payable |
| Payment received | Bank/Cash + Merchant fees | A/R |
| Refund / credit | Sales income + GST | Student credits / Bank |
| Payroll run | Wages expense + PAYG/CPF expense | Wages payable + Statutory payable |
| Claim approved | Expense (per type) + GST input | Claims payable |
| Branch expense | Expense + GST input | Bank/Cash payable |
| Inventory purchase | Inventory + GST input | A/P |
| Inventory sold | COGS | Inventory |
| Manual | user-defined | user-defined |

Implemented as `accountingService.postJournalForSource()` called from existing services + a one-time **`accounting-backfill` edge function** to journal historical data from a chosen start date.

## Real-Time Branch P&L (replacement page)

New page at `/finance/branch-pl-live` (and eventually swapped into the current `/branch-profit-loss` route).

**Behaviour**
- Pulls live from `journal_lines` filtered by `branch_id` + period; no manual entry of revenue figures.
- **Real-time updates** via Supabase Realtime channels on `journal_entries` / `journal_lines` — when an invoice is paid, payroll is run, or an expense is added, the open P&L screen updates within seconds without refresh.
- Period selector: month / quarter / YTD / custom range; comparative column (vs prior period).
- Grouping: Income → COGS → Gross Profit → Operating Expenses → Net Profit, mirroring the seeded CoA.
- **Drilldown** — click any account row to see contributing journals (with link back to source invoice/payment/payroll).
- **Manual adjustments still possible** via the standard manual journal entry (kept auditable), instead of free-text edits in the P&L grid.
- Partner share view preserved: when viewed by a partner, amounts multiplied by their `share_percentage` from `partner_branch_shares` (existing logic).
- PDF export reuses the styling of the current Branch P&L for continuity.

**Migration / phase-out plan**
1. Build new page alongside the existing one — both visible in sidebar, new one labelled "P&L (Live)".
2. Run `accounting-backfill` over the period currently shown in the legacy report so numbers can be compared side-by-side.
3. Provide a **Reconciliation tool**: shows variance per category between legacy `branch_profit_loss_entries` and the new ledger; superadmin can post adjustment journals to close gaps.
4. Once superadmin signs off (per branch), legacy page is hidden behind a `legacyBranchPL` feature flag in `system_settings`.
5. After 1 full reporting period with no complaints, legacy page is removed and `branch_profit_loss_entries` / `pl_categories` / `published_pl_reports` tables are archived (renamed `_legacy`, kept read-only for audit).

## Pages (under new Finance section)

```text
/finance
  ├─ /chart-of-accounts
  ├─ /journals + /journals/new
  ├─ /bank-accounts
  ├─ /bank-import                CSV upload + column-mapper
  ├─ /bank-reconciliation/:id    2-pane match UI
  ├─ /branch-sales-import        CSV for non-system branches
  └─ /reports
       ├─ /branch-pl-live        ← replacement for current Branch P&L
       ├─ /profit-loss           country/branch/consolidated
       ├─ /balance-sheet         as-at date, comparative
       ├─ /general-ledger        account drilldown
       ├─ /gst-f5  (SG)          Box 1–16, draft → mark filed
       └─ /bas     (AU)          G1, G2, G3, G10, G11, 1A, 1B, W1, W2
```

Sidebar gets a **Finance** section, gated to superadmin (and roles via a new `admin_access.finance` flag).

## Bank CSV import flow

1. Pick bank account, upload CSV.
2. Saved mapping for that bank auto-applies; otherwise show column-mapper (date, description, amount OR debit/credit, balance, date format).
3. Preview rows → Commit → land in `bank_statement_lines` as `unmatched`.
4. Reconciliation: suggest matches by amount + date proximity; user clicks **Match**, **Create journal**, or **Transfer**. Matched lines become `reconciled`.

Pre-seeded mappings: **SG** DBS, OCBC, UOB; **AU** CBA, NAB, ANZ, Westpac.

## GST F5 (SG) computation

Box 1 Standard-rated · Box 2 Zero-rated · Box 3 Exempt · Box 5 Taxable purchases · Box 6 Output tax · Box 7 Input tax · Box 8 Net.

## BAS (AU) computation

G1 Total sales · G2 Export · G3 GST-free · G10 Capital · G11 Non-capital · 1A GST on sales · 1B GST on purchases · W1 Gross wages (from payroll) · W2 PAYG withheld. Quarterly or monthly, lockable once filed.

## Reports — country separation

P&L and Balance Sheet always filterable by **country** (default SG), **branch**, or **consolidated**. Per-country presentation templates (SGD / AUD currency, local statement layout). Comparative columns (vs prior period / YTD). Dates use `@/utils/dateFormat` (DD/MM/YYYY).

## Integration with existing modules

- Hook into `invoiceService`, `paymentService`, `payrollService`, `claimsService`, branch P&L expenses, `inventoryService` to post journals on every state change.
- `accounting-backfill` edge function (idempotent, dated range + module list).
- Supabase Realtime channels broadcast new journals → live P&L page reacts.

## Phased delivery (each phase shippable)

1. **Foundation** — schema, CoA seed (SG+AU), tax codes, RLS, sidebar entry, CoA UI.
2. **Journals** — entries/lines tables, manual journal UI, GL drilldown.
3. **Auto-posting + backfill** — wire existing modules; backfill edge function.
4. **Real-time Branch P&L** — new page, realtime subscriptions, drilldown, PDF.
5. **P&L + Balance Sheet (country/consolidated)** + comparatives.
6. **GST F5 + BAS** — calculation, draft/file, period lock.
7. **Bank accounts + CSV import** — mapping presets, preview, commit.
8. **Reconciliation** — 2-pane match UI, suggestions, on-the-fly journals.
9. **Branch sales import** — CSV → journal for non-system branches.
10. **Legacy P&L decommission** — reconciliation tool, feature flag, archive tables.

## Out of scope (flag for later)

Multi-currency revaluation, fixed-asset depreciation schedules, e-invoicing/PEPPOL, direct IRAS/ATO API filing, OCR receipts.

---

Approve to start with **Phase 1 (Foundation)**, then proceed phase-by-phase. The legacy Branch P&L stays untouched until Phase 10.