

## Plan: Tie auto-created grading registrations to the grading slot's term, not the lesson term

### Root cause

When an invoice contains both a **lesson** product (e.g. Term 2 *Unlimited*) and a **grading** product with a `metadata.grading_slot_id` (e.g. the *11 Apr 2026* slot — which is Term 1's grading event), `createInvoice` in `src/services/invoiceService.ts` (lines 396–441) only inspects the **lesson** items to derive `term_id`s for `grading_registrations`. The grading slot's actual term is ignored.

Result for Morley:

| Student | Lesson item term | Grading slot date | Registration created against |
|---|---|---|---|
| Daniel | Term 2 2026 | 11 Apr 2026 (Term 1) | **Term 2 2026** ❌ |
| Elliot | Term 2 2026 | 11 Apr 2026 (Term 1) | **Term 2 2026** ❌ |
| Earl | (no lesson — grading-only invoice) | 11 Apr 2026 (Term 1) | **none** ❌ |

So in the Grading List → **Term 1 2026**, none of them show up; in **Term 2 2026** they appear early. Earl appears nowhere because his invoice is grading-only, which the current auto-create path skips entirely.

`grading_slots` has no `term_id` column, so the slot's term must be derived by looking up the `term_calendars` row whose `[start_date, end_date]` window contains `slot.grading_date` (also matching `branch_id`). For 11 Apr 2026 at Morley, that resolves to **Term 1 2026** (Jan 19 – Apr 10) only by nearest-end fallback — which is the policy we need.

### Fix

#### A. Derive term from the grading slot when present

`src/services/invoiceService.ts` — extend the auto-create block (lines 396–441):

1. Collect, in addition to lesson `term_id`s, a map of `(grading_slot_id → term_id)` for every invoice item with `metadata.grading_slot_id`.
2. For each such slot, fetch its `branch_id` and `grading_date`, then resolve `term_id` via:
   - First, `term_calendars` row where `branch_id = slot.branch_id AND start_date <= grading_date AND end_date >= grading_date` (in-window term).
   - Else, the term whose `end_date` is the **closest on or before** `grading_date` (handles the off-by-one case of grading taking place 1 day after term end, e.g. 11 Apr vs term ends 10 Apr).
   - Else, the term with the **earliest `start_date` after** `grading_date` (next term).
3. For each `(student_id, slot_term_id)` pair, upsert into `grading_registrations`:
   - If a row exists for that `(student_id, term_id)` → set `ready_for_grading = true`, refresh `current_belt`/`target_belt`, **and link `grading_slot_id`** if not already set.
   - Else insert new row with `grading_slot_id` populated.
4. Run this branch even when the invoice has **no lesson items** (grading-only invoices like Earl's).
5. Keep the existing lesson-term path, but **only insert** if no slot-derived registration was created/updated for that student in this same invoice (i.e. the slot-term takes precedence over the lesson-term to avoid duplicate registrations across two terms for the same grading event).

#### B. Backfill the three affected Morley registrations

Run a one-off SQL update so the user's current state matches the new logic:

- `INV-2026-00254` (Daniel): re-tag registration to Term 1 2026 + link slot `5d8aa9b1...`.
- `INV-2026-00248` (Elliot): re-tag registration to Term 1 2026 + link slot `bcc577d6...`.
- `INV-2026-00252` (Earl John): create missing registration for Term 1 2026 with slot `bcc577d6...`, `current_belt = White`, `target_belt = Yellow Tip`, `ready_for_grading = true`.

This is a data-only migration; no schema changes.

#### C. No cleanup change needed

The existing deletion path in `invoiceService.ts` already removes auto-created registrations (where `invoice_item_id IS NULL` and `result IS NULL`) when invoices are deleted, regardless of term, so it stays correct.

### Verification

1. **Branch Dashboard → Morley → Grading → Term 1 2026** → Daniel, Elliot, and Earl John appear with **Ready ✓** pre-checked, the correct slot pre-selected (11 Apr 2026, 08:10 / 08:20), and **Grading Paid** reflects invoice status.
2. **Term 2 2026** view no longer lists Daniel/Elliot for grading (they only appear there if/when a future term invoice with a Term 2-dated grading slot is issued).
3. Create a new test invoice combining a *Term 3 2026* lesson with a grading slot dated inside Term 2 → registration is filed against **Term 2** (slot's term wins).
4. Create a grading-only invoice → registration is still created (current code skips this).
5. Delete one of the auto-created registrations' invoice → registration is removed (existing cleanup path).
6. Re-issue an invoice for a student already at top belt → no row inserted (no `targetBelt`), unchanged.

### Out of scope

- Adding a `term_id` column to `grading_slots` (current fallback resolution from `grading_date` is sufficient and avoids a schema migration). Can revisit later as a cleanup.
- Changing how the create-invoice UI labels grading slots; only the term-tagging on `grading_registrations` is affected.

