## Plan — Backfill missing grading registrations + auto-fix on read

### Problem
Thomas Couto has invoice INV-2026-00290 (Morley, draft) with:
- A Grading line item "White >> Yellow Tip" linked to grading slot 2026-04-11 (Morley).
- A lesson item for Term 2 2026.

But there is **no row** in `grading_registrations` for this invoice item, so Thomas does not appear in the Term 1 grading list. Two more students in the same branch (Rory and another) have the same orphan state. Their invoices were created before the auto-create fix landed, or before the latest changes. We also confirmed the slot date (2026-04-11) sits between Term 1 (ends 04-10) and Term 2 (starts 04-28); the helper correctly resolves this to Term 1 via the "previous term" fallback — but only if the helper actually runs.

Two distinct bugs to fix:

1. **Backfill** — existing draft/sent/paid invoices with Grading line items have no registration row. They never will, unless someone re-edits them.
2. **Self-heal on read** — even after the latest createInvoice/edit fixes, a future invoice path (or a row that slipped through) can leave a grading item without a registration. The grading-list query should detect orphan grading items for the displayed term and lazily create the registration so the student appears immediately.

### Fix

**1. Backfill via migration**
Add a one-shot SQL migration that inserts a `grading_registrations` row for every Grading-category invoice item without one, on non-cancelled invoices. Term resolution mirrors the app helper:
- Use the slot's term (slot date inside a term, else previous term, else next term).
- Else use `metadata.term_id` on the grading item.
- Else use any lesson item's `metadata.term_id` on the same invoice.
- Belt transition parsed from product name; falls back to student's current_belt for both sides if no `>>`.
- `ready_for_grading = (term.start_date <= today)`.
- `current_belt`, `target_belt`, `invoice_item_id`, `grading_slot_id`, `term_id`, `student_id` set; `result = NULL`.
Skip rows where no term can be derived. Idempotent (LEFT JOIN ... WHERE registration IS NULL).

**2. Self-healing in the grading list query**
In `src/components/dashboard/BranchGradingList.tsx` and `src/components/sales/GradingListTab.tsx`, after fetching `lessonInvoicedItems` add a parallel fetch of **Grading-category invoice items** for active invoices in the branch whose linked slot resolves to the selected term and which have no `grading_registrations` row yet. For each such orphan, call `syncGradingRegistrationsForInvoice(invoice.id)` once, then re-query `grading_registrations` for the term and proceed normally. This guarantees the user sees the student on next render even if the registration was never written.

To keep the read fast, only run the orphan repair when the orphan list is non-empty (cheap query — Grading category is small and per-branch).

**3. Defensive query-key invalidation on save (already done)**
The earlier change in `InvoiceDialog.handleSave` already invalidates `grading-list-students`, `grading-list-count`, and `grading-registrations` after invoice edits and calls `syncGradingRegistrationsForInvoice`. No additional change needed there.

### Out of scope
- No schema changes other than the data backfill.
- No change to `createInvoice`'s existing inline auto-create.
- No change to Term 2 grading list behaviour — Thomas's slot resolves to Term 1 by design (slot date 11 Apr is after Term 1 end but before Term 2 start, prev-term wins).

### Files
- New migration: backfill grading_registrations for orphan items branch-wide.
- `src/components/dashboard/BranchGradingList.tsx` — add orphan detection + lazy sync inside the existing query.
- `src/components/sales/GradingListTab.tsx` — same orphan detection + lazy sync.
