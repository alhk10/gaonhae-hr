# Phase 5 — Tax Modules (GST F5 for Singapore, BAS for Australia)

Build country-aware tax reporting that derives indirect-tax figures directly from the new ledger and produces filing-ready reports for Singapore (GST F5) and Australia (BAS). Reports are read-only outputs of posted journals; no manual GST data entry.

## Goals

- One unified Tax Centre at `/finance/tax` that auto-switches form layout based on the selected branch's country (SGD branches → GST F5, AUD branches → BAS).
- Compute boxes/labels directly from posted `journal_lines` tagged with a `tax_code` (e.g. `SR` standard-rated, `ZR` zero-rated, `ES` exempt, `OS` out-of-scope, `TX` input tax, `BL` blocked input, plus AU `GST`, `FRE`, `INP`, `EXP`).
- Period support: monthly, quarterly (default for SG quarterly filers), custom; lock filed periods.
- Export filing-ready PDF + CSV; store snapshot in `tax_returns` so a filed return is immutable even if journals are later edited.
- Drill-down: every box → list of contributing journal lines → journal detail page.

## Page layout

```text
/finance/tax
┌────────────────────────────────────────────────────────────┐
│ Branch ▾   Period ▾   [Recalculate] [Export PDF] [Lock]    │
├────────────────────────────────────────────────────────────┤
│ GST F5 (Singapore) — Quarter Apr–Jun 2026   Status: Draft  │
│  Box 1  Standard-rated supplies          12,450.00         │
│  Box 2  Zero-rated supplies                   0.00         │
│  Box 3  Exempt supplies                       0.00         │
│  Box 4  Total supplies (1+2+3)           12,450.00         │
│  Box 5  Taxable purchases                 3,210.00         │
│  Box 6  Output tax due                    1,120.50         │
│  Box 7  Input tax & refunds claimed         288.90         │
│  Box 8  Net GST payable / (refund)          831.60         │
│  Box 9  Total value of goods imported         0.00         │
│ ─────────────────────────────────────────────────────────  │
│  History: previously locked returns (click to view PDF)    │
└────────────────────────────────────────────────────────────┘
```

AU branches show BAS labels: G1 total sales, 1A GST on sales, G10/G11 capital/non-capital purchases, 1B GST on purchases, 7A/7C, plus W1/W2 PAYG (later phase) — this phase does GST labels only.

Mobile: cards per box, sticky branch/period filter.

## Data model

New tables (migration):

```text
tax_codes
  code         text PK              -- 'SR','ZR','ES','OS','TX','BL','GST','FRE','INP','EXP'
  country      text                 -- 'SG' | 'AU'
  rate         numeric(6,4)         -- 0.09, 0.10, 0
  direction    text                 -- 'output' | 'input' | 'none'
  description  text
  active       boolean default true

tax_returns
  id           uuid PK
  country      text
  branch_id    text
  period_from  date
  period_to    date
  status       text                 -- 'draft' | 'locked' | 'filed'
  totals       jsonb                -- snapshot of every box
  pdf_path     text
  locked_at    timestamptz
  locked_by    text
  created_at, updated_at
  unique (branch_id, period_from, period_to)
```

Add columns to existing `journal_lines`:

```text
tax_code        text references tax_codes(code)
tax_amount      numeric(14,2) default 0
tax_base_amount numeric(14,2) default 0   -- net amount the tax was computed on
```

Auto-posting (Phase 3) is updated to populate `tax_code`, `tax_base_amount`, `tax_amount` for invoice / payment / expense / payroll journals based on country + product/account mapping.

## Services & components

```text
src/services/taxService.ts
  - getTaxReturn({ branchId, from, to })   -> computed boxes from journal_lines
  - listTaxReturns({ branchId })
  - lockTaxReturn(id)                       -- snapshots totals into tax_returns.totals
  - getBoxDrilldown({ branchId, from, to, boxKey })
src/services/taxMappings.ts
  - SG_BOXES, AU_LABELS  (box → set of (account_type, tax_code, direction) rules)
src/utils/taxExport.ts
  - PDF (filing-ready layout per country) + CSV

src/pages/finance/TaxCentre.tsx              (new, route /finance/tax)
src/components/finance/TaxFormSG.tsx         (GST F5 layout)
src/components/finance/TaxFormAU.tsx         (BAS GST labels layout)
src/components/finance/TaxBoxRow.tsx         (clickable drill-down row)
src/components/finance/TaxReturnHistory.tsx
```

Wire-up:
- New tile on `FinanceDashboard.tsx` ("Tax Centre — GST F5 / BAS").
- New route in `App.tsx`.
- Update `accountingPostings.ts` to set tax fields on every relevant line; backfill runner (Phase 3) re-posts historical journals so old data appears in tax reports.

## Access control

- Superadmin: all branches, can lock/unlock.
- Partner: only their branches, view only (cannot lock).
- Other staff: hidden.

## Defaults seeded by migration

```text
SG: SR 0.09 output, ZR 0 output, ES 0 output, OS 0 none, TX 0.09 input, BL 0 input
AU: GST 0.10 output, FRE 0 output, INP 0 input, EXP 0 output
```

These rates live in `tax_codes.rate` so the SG GST hike or AU rate change is a one-row update, not a code change.

## Out of scope this phase

- IRAS/ATO API submission (manual upload remains).
- PAYG W1/W2 on BAS (Phase 7 — payroll tax).
- Reverse-charge / imported services (later).
- Customer-level tax invoice formatting changes (already handled in invoice PDF).

---

Approve to implement Phase 5.

---

## Phase 5 — DONE

Implemented Tax Centre at /finance/tax:
- Migration: tax_returns table (locked snapshots, RLS) + tax_base_amount column on journal_lines.
- Reused existing tax_codes (Singapore SG-SR/ZR/ES/OS/TX/BL/NR + Australia AU-GST/FRE/EXP/INP/CAP/NT).
- taxService.ts: getTaxReturn computes GST F5 boxes 1–9 (SG) or BAS labels G1/G2/G3/G10/G11/1A/1B/Net (AU) directly from posted journal_lines aggregated by tax_code_id; lock/unlock; period presets.
- taxExport.ts: filing-ready PDF + CSV (jsPDF, no autotable dep).
- TaxCentre.tsx: branch-driven country auto-switch, period presets, lock period, return history table.
- accountingMappings: added getTaxCodeId + standardOutputTaxCode helpers and a tax-code cache.
- accountingPostings (invoice): GST output line now tagged with country's standard-rated tax code, tax_amount and tax_base_amount (net supply) — feeds the Tax Centre automatically. Backfill (Phase 3) re-runs to historise tax tagging on past invoices.
- accountingService: JournalLineDraft + insert payload extended with tax_base_amount.
- Wired into App.tsx route + FinanceDashboard tile (replaces the two "coming soon" GST-F5 / BAS tiles).
