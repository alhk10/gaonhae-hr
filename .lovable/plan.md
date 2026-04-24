## Plan: Term-aware "Ready for Grading" + lazy DB sync + refund handling

### Context recap

- Term 1 2026 = current/past (already started). Term 2 2026 = future (starts 2026-04-28).
- Term 1 grading list was hand-keyed by superadmin; do not disturb existing Term 1 rows.
- Term 2 list currently shows the 42 lesson-invoiced students (good) but 7 are wrongly Ready (already reset).
- Going forward, the "Ready" state must depend on whether the **grading slot's term has started**, not whether the lesson invoice's term has started.

### Rule for `ready_for_grading`

A grading registration is "Ready" when the **term that owns the assigned grading slot** has started (`term.start_date <= today`) and no result has been recorded yet. The grading-slot term and the lesson-invoice term can differ (e.g., Term 2 lesson invoice + Term 1 grading slot).

### Changes

#### 1. `src/services/invoiceService.ts` — gated auto-mark on invoice creation

When an invoice with a Grading line item creates/updates a `grading_registrations` row:

- Look up the term that the **grading slot** belongs to (`grading_slots.term_id` → `terms.start_date`).
- Set `ready_for_grading = (slotTerm.start_date <= today)`.
- Result: invoicing today for a Term 1 grading slot → `true`; invoicing today for a Term 2 grading slot → `false`.

Belt-transition parsing and registration upsert behaviour are otherwise unchanged.

#### 2. UI-derived "Ready" + lazy DB sync — `BranchGradingList.tsx` and `GradingListTab.tsx`

- **Display**: a row renders as Ready when `db.ready_for_grading === true` **OR** (`slotTerm.start_date <= today` AND `result IS NULL`). This means once Term 2 starts on 2026-04-28, every Term 2 row with a slot automatically appears Ready in the UI without any backend job.
- **Lazy DB sync**: whenever the user saves a row (toggle Ready, assign slot, edit result, etc.), if the UI-derived Ready is `true` but the stored value is `false`, the save payload includes `ready_for_grading: true`. So the DB converges naturally on next write — no scheduler.
- Source B (lesson-invoice-only) rows: same rule. If they have no slot yet, they cannot be Ready; assigning a slot whose term has started flips them Ready immediately.

#### 3. `src/services/invoiceRefundService.ts` — refund handling for grading items

The rule is **term-agnostic**: it applies to any grading slot, regardless of whether the slot belongs to Term 1, Term 2, or any other term. The lesson invoice's term is also irrelevant — only the line items being refunded matter.

When `refundLineItem` runs on an invoice item, after the existing entitlement/enrollment cleanup, inspect the `grading_registrations` row(s) linked to this item (`invoice_item_id = refundedItem.id`):

- **Case A — Grading item refunded, lesson item still active for the same student:**
  - Examples covered:
    - Invoiced for Term 2 class + Term 2 grading, refund Term 2 grading → uncheck Ready, keep row.
    - Invoiced for Term 2 class + Term 1 grading, refund Term 1 grading → uncheck Ready, keep row.
  - Action: on the matching `grading_registrations` row, set `ready_for_grading = false`, clear `grading_slot_id`, clear `invoice_item_id`, and append a note `Grading refunded from invoice {n}`. Do **not** delete the row — the student stays in the list (Source B style) so staff retain visibility and can reassign later.
  - Detection: the student still has at least one active (non-refunded, non-cancelled) lesson invoice item for any term at the same branch.

- **Case B — Both grading and lesson items refunded/cancelled (no active lesson item remains for this student at this branch):**
  - Examples covered:
    - Invoiced for Term 2 class + Term 2 grading, refund both → remove from list.
    - Invoiced for Term 2 class + Term 1 grading, refund both → remove from list.
  - Action: hard-delete the `grading_registrations` row, but **only if `result IS NULL`**. If a result is already recorded, keep the row for audit and just clear `grading_slot_id` / `invoice_item_id`.

- **Detection logic** (run after the refund updates are applied):
  1. Fetch the registration row(s) where `invoice_item_id = refundedItem.id`.
  2. For each, check whether the student still has any non-refunded lesson invoice item at this branch (any active invoice status).
  3. Apply Case A or Case B accordingly.

- **Ordering**: refund flow remains: credit → deactivate entitlement → cancel enrollment → mark item refunded → recalculate invoice → **(new)** reconcile grading registration → log change.

- **Logging**: include the registration outcome (`ready_unchecked` or `registration_removed`) in the existing `logInvoiceChange` payload so the audit trail is complete.

#### 4. SQL backfill — restore Term 1 2026 Ready flags

Term 1 has started, so every Term 1 registration with an assigned slot and no result should be Ready. The earlier reset migration was correctly scoped to Term 2, but we need to ensure Term 1 rows are correct (the user reported they're showing as Not Ready).

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

This is global (every branch, every current/past term) and idempotent.

### Verification

1. **Term 1 2026 (Morley)**: every row with a slot shows Ready ✓; rows without slots stay unchecked.
2. **Term 2 2026 (Morley)**: all rows show Not Ready until 2026-04-28; on/after that date the UI flips them Ready automatically (DB lazily catches up on next save).
3. **New invoice today, Term 1 grading slot** → registration row created with `ready_for_grading = true`.
4. **New invoice today, Term 2 grading slot** → registration row created with `ready_for_grading = false`.
5. **Refund scenarios** (run for each combination — Term 2 class + Term 2 grading, and Term 2 class + Term 1 grading):
   - Refund only the grading item → registration row stays, Ready unchecked, slot/invoice_item_id cleared, student still visible in the relevant term's list.
   - Refund grading + cancel/refund the lesson item too → registration row deleted (no result), student disappears from the list.
6. **Sales → Grading List** mirrors all of the above.

### Out of scope

- Background scheduler for term-start auto-flip (handled by UI derivation + lazy sync).
- Cross-branch grading visibility changes.
- Refund logic for invoices that contain only a grading item with no associated lesson item (the existing refund flow already handles credit/entitlement; the new reconcile step still runs and will delete the registration row if `result IS NULL`).
