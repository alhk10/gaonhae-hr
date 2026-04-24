# Term-Aware Grading Readiness + Refund Logic

## Goal
Make `ready_for_grading` term-aware on invoice creation, derive ready state in the UI, lazily sync the DB on next write, and handle grading refunds correctly.

## Changes

### 1. Gated auto-mark on invoice creation — `src/services/invoiceService.ts`
When a new invoice contains a grading slot, look up the slot's term and set:
- `ready_for_grading = true` if `term.start_date <= CURRENT_DATE` (current/past term)
- `ready_for_grading = false` otherwise (future term — e.g., Term 2 2026 today)

Applied to all code paths that auto-create `grading_registrations` from invoice items.

### 2. UI-derived "Ready" + lazy DB sync — `BranchGradingList.tsx` and `GradingListTab.tsx`
- Compute `displayReady = db.ready_for_grading === true || (term.start_date <= today && result IS NULL)`.
- Render the "Ready" toggle and badges from `displayReady`.
- On save: if `displayReady === true` and DB row's `ready_for_grading === false` and no `result`, include `ready_for_grading: true` in the update payload (lazy convergence).

### 3. Refund handling — `src/services/invoiceRefundService.ts`
Inside `refundLineItem`, after marking the item refunded, locate any `grading_registrations` row tied to this invoice (regardless of term — Term 1 grading on a Term 2 class is valid):

- If the refunded item is the **grading fee** (item maps to a `grading_registrations.invoice_item_id`):
  - Check if any other non-refunded lesson item from the same invoice still references that registration's `term_id`/student.
  - If lesson item is still active → `UPDATE grading_registrations SET ready_for_grading = false, grading_slot_id = NULL, invoice_item_id = NULL` (keep row as Source B).
  - If no lesson item remains active for that student on that invoice → `DELETE` the registration row when `result IS NULL`.

- If the refunded item is a **lesson item** and a grading registration exists for the same student linked to this invoice:
  - If the grading item on the same invoice has also been refunded (or never existed) → `DELETE` the registration row when `result IS NULL`.
  - Otherwise → leave the registration intact (grading still paid).

### 4. Data backfill migration
Restore Ready for current/past terms that were reset earlier:
```sql
UPDATE public.grading_registrations gr
SET ready_for_grading = true
FROM public.terms t
WHERE gr.term_id = t.id
  AND t.start_date <= CURRENT_DATE
  AND gr.grading_slot_id IS NOT NULL
  AND gr.result IS NULL
  AND gr.ready_for_grading = false;
```

## Verification
- Term 1 2026 Morley: all paid grading registrations show Ready (via backfill).
- New invoice today with Term 1 grading slot → registration ready_for_grading = true.
- New invoice today with Term 2 grading slot → registration ready_for_grading = false; UI shows Not Ready until 28 Apr 2026.
- After 28 Apr 2026: Term 2 rows display Ready via UI derivation; DB flag flips on next save.
- Refund Term 2 grading only (class kept) → row stays, Ready unchecked, slot cleared.
- Refund both Term 2 class + Term 2 grading → row deleted (no result).
- Refund Term 1 grading only on a Term 2 class invoice → Term 1 registration row stays, Ready unchecked.
- Refund both class + Term 1 grading on the same invoice → Term 1 registration row deleted (no result).

## Files
- `src/services/invoiceService.ts`
- `src/services/invoiceRefundService.ts`
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`
- New migration: backfill Ready for current/past terms
