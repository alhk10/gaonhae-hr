## Backfill journals for already-paid Morley invoices

### Diagnosis
Morley (`BR1768967806476`) has **45 postable invoices** (44 paid/verified) and **45 postable payments**, but only **1 journal each** has been posted. The Branch P&L (Live) is sourced from `journal_entries`, so it shows almost nothing.

The existing `accounting-backfill` edge function only **manifests** counts — its comment says actual posting "happens client-side via the already-deployed hooks when records are next touched". Nothing currently triggers a re-post for historical paid records, so the ledger is empty.

### Fix
Upgrade `src/pages/finance/BackfillRunner.tsx` so superadmins can actually post the missing journals, scoped to a branch:

1. **Branch filter dropdown** (loads from `branches`, with "All branches" default).
2. **Two-mode action**:
   - "Scan only" → keeps existing dry-run behaviour (calls edge function).
   - "Post journals now" → runs **client-side** using already-tested service functions:
     - For each selected module (`invoices` / `payments` for now), query IDs from Supabase filtered by branch + date range:
       - `invoices`: `status IN ('sent','unpaid','partially_paid','paid','verified','overdue')` and `issue_date` in range, and (if not Force) only those without an existing non-void `journal_entries` row.
       - `payments`: `payment_date` in range, joined to invoices for branch filter; only verified or cash/credit; and (if not Force) only those without an existing journal.
     - Loop with concurrency limit (e.g. 5) calling `postInvoiceIssuedJournal(id)` / `postPaymentJournal(id)` from `@/services/accountingPostings`. Both are already idempotent and `safePost`-wrapped.
   - Show running progress (`X / Y posted`, error count) and a final toast.
3. Persist the run via the same `accounting_backfill_runs` insert (mode + branch added to `summary`).

### Out of scope
- No DB schema changes. No edge function rewrite. Other modules (claims, payroll, inventory, branch_expenses) keep scan-only for now — can be wired up identically later if needed.

### Immediate user action after merge
1. Open `/finance/backfill` (existing route).
2. Select branch = Morley, From = `2026-01-01` (or earlier), To = today, modules = invoices + payments.
3. Click "Post journals now". Reload Branch P&L (Live) — Morley figures will reflect the full posted ledger.