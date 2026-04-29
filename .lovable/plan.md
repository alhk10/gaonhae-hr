# Phase 3 — Auto-posting + Backfill

Make every financial event in the existing modules automatically create a balanced journal in the new ledger, and provide a one-time backfill so historical data appears in the new reports.

## What gets auto-posted

| Trigger (existing module) | Journal posted |
|---|---|
| Invoice **issued/sent** | Dr A/R · Cr Sales Income (split by product → School Fees / Grading / Ad-Hoc / Uniform / Trial / Other) + Cr GST Payable |
| Invoice **cancelled / voided** | Reverses the above |
| Invoice **line refund** | Dr Sales Income + Dr GST Payable · Cr Student Credits (or Bank if cash refund) |
| Payment **created** (verified or cash) | Dr Bank/Cash/PayNow · Cr A/R |
| Payment **rejected/deleted** | Reverses |
| Student **credit applied** to invoice | Dr Student Credits liability · Cr A/R |
| Claim **approved** | Dr Staff Claims expense · Cr Claims Payable |
| Claim **paid** (status → paid) | Dr Claims Payable · Cr Bank |
| Branch **expense** added (`branch_profit_loss_entries` type=expense) | Dr Expense (mapped from category) · Cr Bank/Cash |
| Inventory **order received** | Dr Inventory · Cr A/P |
| Inventory **sold** (uniform invoice item) | Dr COGS · Cr Inventory (at cost) |
| Payroll **finalized** | Dr Wages expense · Dr CPF/Super expense · Cr Wages Payable · Cr CPF/Super/PAYG payable |
| Payroll **salary paid** | Dr Wages Payable · Cr Bank |
| Payroll **CPF/Super paid** | Dr CPF/Super Payable · Cr Bank |

Each posting is tagged with `source_type` + `source_id` so we can detect duplicates and update/reverse cleanly when the source changes.

## How it's wired

**Service layer (`accountingService.ts`)** gains module-specific posters that take a domain object and produce balanced lines:
- `postInvoiceIssuedJournal(invoice)`
- `postInvoiceVoidJournal(invoice)`
- `postPaymentJournal(payment, invoice)`
- `postPaymentReversalJournal(payment, invoice)`
- `postClaimApprovedJournal(claim)` / `postClaimPaidJournal(claim)`
- `postBranchExpenseJournal(expenseRow)`
- `postInventoryReceivedJournal(order)` / `postInventorySoldJournal(invoiceItem, costPrice)`
- `postPayrollFinalizedJournal(payrollRecord)` / `postPayrollSalaryPaidJournal(...)` / `postPayrollStatutoryPaidJournal(...)`

All go through one router: `postJournalForSource(sourceType, sourceId, payload)` which:
1. Looks up branch + country from `branches`.
2. Resolves account IDs from `chart_of_accounts` by **system code** (e.g. `1100` A/R, `4000` School Fees) — no hardcoded UUIDs.
3. Idempotency: if a posted journal already exists for this `(source_type, source_id, sub_event)`, it's voided and replaced (so edits stay consistent).
4. Posts the journal in `posted` status (no manual draft step for automated entries).

**Hook points** — the existing services call the new posters at the end of their own functions, only after their main DB write succeeds:
- `invoiceService.ts` → after status changes (draft→sent, sent→cancelled), after refund.
- `paymentService.ts` → after create / verify / delete / reject.
- `claimsService.ts` → after status update.
- `branchOperatingService.ts` (and the P&L expense entry path) → after insert/update/delete on `branch_profit_loss_entries`.
- `inventoryOrderService.ts` → after status → received.
- `payrollService.ts` → after finalize, after salary_paid / cpf_paid flags flip.
- Inventory COGS posts when a uniform/gear invoice item is included in a sent invoice (uses product cost from `products`).

Failures in posting are **logged but do not roll back the source operation** — staff can re-run via the backfill below. A toast warning is shown to superadmins so problems are visible.

## Account mapping

A single `mapping` table built from the seeded CoA system codes (constants in `accountingMappings.ts`):

```text
A/R                = code 1100
Student Credits    = code 1110 (asset) / 2300 (liability)
GST Output         = code 2100
GST Input          = code 2110
Bank               = code 1010   (PayNow → 1020 SG, fallback 1010)
Cash               = code 1000
A/P                = code 2000
Wages Payable      = code 2200
CPF Payable        = code 2210 (SG); Super Payable 2230 (AU); PAYG 2150 (AU)
Claims Payable     = code 2400
Inventory          = code 1200
COGS               = code 5000
Wages              = code 6000
Casual Coaching    = code 6010
Staff Claims       = code 6040
School Fees        = code 4000   (Term)
Grading Fees       = code 4010
Ad-Hoc Lessons     = code 4020
Uniform & Gear     = code 4030
Trial              = code 4040
Other Income       = code 4090
Sales Discounts    = code 4900   (contra-income)
```

Income classification picks the right code per invoice line by inspecting `product_id` → product `category` (Term / Grading / Ad-Hoc / Uniform / Trial). For branch expenses, a category-to-code table maps existing P&L categories ("Rent", "Utilities", "Marketing", etc.) to existing or auto-created expense accounts under code range 6100+.

## Backfill — `accounting-backfill` Edge Function

A single edge function (`supabase/functions/accounting-backfill/index.ts`) that superadmins can run from a new **Backfill** card in `/finance` (date range + module checkboxes).

**Behaviour**
- Idempotent: scans existing posted journals by `(source_type, source_id)` and skips ones already booked unless `force=true`.
- Modules selectable: `invoices`, `payments`, `claims`, `branch_expenses`, `inventory`, `payroll` — or `all`.
- Date range: `from` / `to` (default = current fiscal year).
- Runs in batches of 200 and streams progress (returns `{module, total, posted, skipped, failed}`).
- Auth: requires JWT + checks the caller is in `superadmin_users` (uses service-role client internally).
- Logs each failure into the existing `security_audit_log` with `action='backfill_failure'`.

A small `BackfillRunner.tsx` UI under `/finance/backfill` lets superadmins:
- Pick date range, modules, force re-post checkbox.
- Click Run → shows per-module summary table.
- Lists last 5 runs (stored in a new `accounting_backfill_runs` table).

## New / changed files

```text
src/services/accountingMappings.ts         (new — code→accountId resolver, cached)
src/services/accountingPostings.ts         (new — module-specific posters)
src/services/accountingService.ts          (extend: postJournalForSource router + idempotency helper)
src/services/invoiceService.ts             (call postings after status/refund changes)
src/services/paymentService.ts             (call postings on create/verify/delete)
src/services/claimsService.ts              (call postings on approve/paid)
src/services/branchOperatingService.ts     (call postings on expense entry CRUD)
src/services/inventoryOrderService.ts      (call postings on received)
src/services/payrollService.ts             (call postings on finalize / paid flips)

supabase/functions/accounting-backfill/index.ts
src/pages/finance/BackfillRunner.tsx       (UI in /finance/backfill)
src/App.tsx                                (route)
src/pages/finance/FinanceDashboard.tsx     (new tile)
```

## Database additions (small)

- `accounting_backfill_runs` — `id, run_at, run_by, modules, from_date, to_date, summary jsonb` (superadmin-only RLS).

No changes to existing tables.

## Safety & migration

- Posting is wrapped in try/catch; failures are surfaced as console + toast for superadmin only.
- All auto-postings carry `source_type != 'manual'` so they're easy to find and bulk re-issue.
- Replacing an automated journal: void old (status→void), insert new posted journal — keeps audit trail.
- The legacy Branch P&L is untouched; new ledger runs in parallel until Phase 10.

## Out of scope for this phase

- Reconciliation between legacy P&L and new ledger (Phase 10).
- The new real-time Branch P&L page (Phase 4).
- Bank statement import (Phase 7).

---

Approve to implement Phase 3.
