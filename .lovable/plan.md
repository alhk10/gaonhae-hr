

## Plan: Auto-create grading registrations on invoice + show all funded terms in Grading List

### Root cause

**Issue 1 — empty Grading List:**
`BranchGradingList.availableTerms` (and `GradingListTab.availableTerms`) only includes past/current terms plus the **single nearest upcoming term**. Today is **21 Apr 2026**, which sits between *Term 1 2026* (ends 10 Apr) and *Term 2 2026* (starts 28 Apr). All Morley invoices were created against **Term 3 2026** (starts 13 Jul) → Term 3 is filtered out as "far-future" → dropdown never offers it → list is empty even though invoices and students exist.

**Issue 2 — students never appear as "Ready":**
`createInvoice` (in `src/services/invoiceService.ts`) creates entitlements and class enrollments for lesson products, but does **not** create a `grading_registrations` row. Today, that row is only created later by `PayGradingDialog`. So `BranchGradingList` reads `reg?.ready_for_grading || false` → always `false` for new term invoices. The list also wouldn't have shown even with Issue 1 fixed.

### Fix

#### A. Show every term that has an invoice (Branch Grading List + Sales Grading List Tab)

`src/components/dashboard/BranchGradingList.tsx` and `src/components/sales/GradingListTab.tsx`

Replace the current "past + current + next-upcoming" filter with: **past + current + every future term that already has at least one lesson invoice in this branch**. This ensures Term 3 (and any future term with funded students) shows up immediately, while still hiding empty far-future terms from the dropdown.

Implementation:
- Add a small query that returns the set of `metadata->>'term_id'` values for invoice_items with `is_lesson` products belonging to the branch (status ∈ all-but-cancelled, same set as the existing filter).
- `availableTerms = past + current + future-terms-with-invoices`. Sort: most recent first.
- Auto-select rule: prefer the term containing today; else the most recent term that has invoices; else the latest past term.

#### B. Auto-create `grading_registrations` (with `ready_for_grading = true`) when an invoice is created by a branch user or superadmin

`src/services/invoiceService.ts` (inside `createInvoice`, after entitlements / enrollments are created):

For each inserted invoice item where the product `is_lesson = true` AND `metadata.term_id` is set:
- Look up the student's `current_belt`.
- Compute `target_belt` via `getNextBeltLevel(currentBelt, branchCountry)` from `@/constants/beltLevels`. If no next belt (already at top), skip.
- Upsert into `grading_registrations` keyed by `(student_id, term_id)`:
  ```
  {
    student_id,
    term_id,
    current_belt,
    target_belt,
    ready_for_grading: true,   // auto-checked per request
    invoice_item_id: null,     // grading invoice item — paid later
    grading_slot_id: null,
    result: null,
    created_by: <auth email>
  }
  ```
- If a row already exists for `(student_id, term_id)` (e.g. user re-issued the invoice or PayGradingDialog ran first), only set `ready_for_grading = true` and refresh `current_belt` / `target_belt`; do not overwrite an existing `result`, `invoice_item_id`, or `grading_slot_id`.
- Skip students with `current_belt = null` (no belt yet → nothing to grade to).
- Wrap in try/catch; non-fatal (matches the existing entitlement/enrollment failure pattern).

This means: every time a branch staffer or superadmin issues a term invoice for a student, that student appears in the Grading List with the **Ready** checkbox already ticked.

#### C. Cleanup parity on invoice deletion

`invoiceService.ts` already deletes `grading_registrations` linked by `invoice_item_id` (line 624). Auto-created rows have `invoice_item_id = null`, so they would be orphaned. Extend the deletion path to also delete `grading_registrations` matching `(student_id, term_id)` derived from the deleted invoice items where `invoice_item_id IS NULL` AND `result IS NULL` (don't wipe rows that have a grading payment attached or a recorded result).

### Database

No schema changes. `grading_registrations` already supports nullable `invoice_item_id` and a `term_id` column with FK to `term_calendars`.

### Verification

1. Open **Branch Dashboard → Morley → Grading → Grading List** → term dropdown now lists *Term 1 2026*, *Term 2 2026*, and *Term 3 2026*. Selecting Term 3 shows all 7 students with Term 3 invoices, each with **Ready ✓** pre-checked, **Term Paid** = invoice status, **Grading Paid** = `n/a`.
2. Create a new invoice for a Morley student with the *Unlimited* lesson product on *Term 4 2026* → Term 4 appears in the dropdown; the student appears with Ready pre-checked.
3. From `/sales/grading` → Grading List tab → same behaviour for any branch.
4. Issue an invoice for a student already at the top belt (`current_belt = '5th Dan'`) → no `grading_registrations` row inserted (no next belt). Student does not appear as Ready.
5. Re-issue an invoice for a student who already has a manually-checked Ready row with a `grading_slot_id` → existing slot/result preserved; row simply stays Ready.
6. Delete the invoice that auto-created the registration → registration is removed (only when no result and no linked grading invoice item).
7. Country handling: AU branch uses AU belt progression via `getNextBeltLevel(belt, 'Australia')`; SG branch unchanged.

### Out of scope

- Backfilling `grading_registrations` for existing Morley invoices (user can simply click Ready in the list once the term filter fix lands; or we can run a one-off script later if requested).
- Changing the Grading **Slots** tab in the screenshot — that tab only shows scheduled slots and is a separate view.

