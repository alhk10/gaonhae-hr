## Problem

The Grading tab (Branch Dashboard and Sales) takes a long time to show any data. The spinner stays until everything finishes.

Root cause in `src/services/invoiceService.ts` + `BranchGradingList.tsx` / `GradingListTab.tsx`:

1. Every time the Grading tab opens, the query function `awaits` `backfillOrphanGradingRegistrationsForBranch(branchId)` **before** loading the list.
2. That backfill loops through **every grading invoice in the branch** and calls `syncGradingRegistrationsForInvoice` one-by-one with `for … await` (no parallelism).
3. Each `syncGradingRegistrationsForInvoice` call performs ~5–10 Supabase round-trips (invoice, items, products, student, slot→term, term started, existing reg lookups, update/insert).

With Morley's 42 grading registrations + 24 invoices, that's hundreds of serial requests on every tab load → multi-second spinner.

The backfill is a "self-heal" that is only needed when something is genuinely orphaned. It should not block the initial render every time.

## Fix

### 1. `src/services/invoiceService.ts` — make the backfill lighter and parallel

- Add an early-exit fast path: query `grading_registrations` for invoice items in this branch and only re-sync invoices that are **actually missing a registration** (orphans), instead of re-syncing every grading invoice in the branch. Today the function name says "orphan" but it actually re-syncs everything.
- Run the remaining `syncGradingRegistrationsForInvoice` calls in parallel with `Promise.all` (chunked at e.g. 8 at a time to avoid hammering Supabase).
- Inside `syncGradingRegistrationsForInvoice`, replace the sequential per-item `await resolveTermFromSlot` / `existingByItem` / `existingByTerm` lookups with batched queries when there are multiple grading items on one invoice (single `.in(...)` calls), so each invoice resolves in 1–2 round-trips instead of 5–10.

### 2. `BranchGradingList.tsx` and `src/components/sales/GradingListTab.tsx` — don't block render on the heal

- Remove `await backfillOrphanGradingRegistrationsForBranch(branchId)` from inside the list `queryFn`.
- Instead, fire it from a separate `useEffect` (fire-and-forget). When it finishes and reports any changes, invalidate `['grading-list-students', branchId, selectedTerm]` so the list refreshes silently.
- The user sees data immediately; any belated repairs appear in a follow-up refetch without a spinner.

### 3. Cache the branch's grading-product lookup

The first two queries in `backfillOrphanGradingRegistrationsForBranch` (grading category id + grading product ids) are constant per session. Cache them in a module-level promise so repeated calls are instant.

## Expected result

- Grading tab shows the list as soon as the main data query returns (typically <500 ms).
- The self-heal still runs in the background on first open and only re-syncs invoices that are genuinely orphaned (usually zero), so it's effectively free after the initial repair.
- Behaviour for Earl/Rory and any future fixes is unchanged — they're already healed; subsequent loads simply skip the heavy work.

## Files to edit

- `src/services/invoiceService.ts`
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`

Approve to switch to default mode and apply the fix.