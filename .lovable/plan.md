## Plan: Term 1 2026 grading list shows 0 students despite paid invoices

### Root cause (two compounding issues)

Verified against Morley (`BR1768967806476`) + Term 1 2026 (`dd062ecd…`):

**1. `BranchGradingList.tsx` filters by the wrong term field.**
The query filters lesson invoice items by `metadata.term_id === selectedTerm`. But the typical workflow at term-end is "Pay Grading + opt-in to next term" — the **lesson item carries the next term's id (Term 2 2026)** while the **grading slot is for the current term (Apr 11, in Term 1 2026)**. So when the user selects Term 1 2026, zero lesson items match and the list is empty — even for the 8 students who DO have a `grading_registrations` row for Term 1 2026 (Leah You, Olivia Lee, Yuzhou He, Zuhayr Jafarsadiq, etc.).

The Sales-side `GradingListTab.tsx` already does this correctly: it queries `grading_registrations.term_id` directly. `BranchGradingList` should mirror that approach.

**2. ~10 paid grading invoices have no `grading_registrations` row at all.**
Affected at Morley (Term 1 2026 slots, Apr 11): Ethan Bondarenko, Alex Noh, Eden Jung, Ejun Jung, Daniel Im, Earl John Lucero II, Elliot Hii, Henry Morgan, Evander King, Genie You, Iqraa Jafarsadiq, Keller Chaine.

Auto-creation in `invoiceService.ts` (lines 385–422) only fires when the grading line item's name matches `formatBeltLevel(currentBelt) >> formatBeltLevel(getNextBeltLevel(currentBelt))`. It fails when:
- the invoice is a **double-belt grading** (e.g. Ethan: current_belt `Green`, product `Green >> Blue Tip` — skipping `Green Tip`), or
- the student's belt was advanced in a prior grading after this invoice was issued.

### Fix

#### A. Make `BranchGradingList.tsx` registration-driven (mirror Sales `GradingListTab.tsx`)

Replace the lesson-invoice-item driven student-discovery block (current lines ~183–337) with a registration-first flow:

1. Query `grading_registrations` filtered by `term_id = selectedTerm` (no branch filter on the registration itself — registrations don't have branch_id).
2. Filter to active students via `students` table (`status ilike 'active'`).
3. Branch-scope by keeping only students who have ANY invoice at `branchId` (single `invoices` query already used in Sales tab).
4. Keep existing enrichment: attendance count, slot info, `grading_paid` lookup via `invoice_item_id → invoices.status`.
5. Keep `term_paid` derivation, but source the lesson invoice for the term via the existing branch-invoice list rather than via the term-id metadata filter.
6. Update `invoicedTermIds` query to include terms appearing on `grading_registrations` for branch students (matches Sales tab logic at lines 160–167) so future grading-only terms still appear in the dropdown.

Files:
- `src/components/dashboard/BranchGradingList.tsx` — query at lines 183–337 and `invoicedTermIds` query at lines 126–153.

No prop, type, mutation, or UI changes. Pure query refactor.

After this change, the existing 8 Morley Term 1 2026 registrations (Leah, Olivia, Yuzhou, Zuhayr, …) will appear immediately.

#### B. Backfill missing `grading_registrations` rows (one-off SQL migration)

For every invoice item where:
- `metadata->>'grading_slot_id'` is set,
- the parent invoice status is in (`paid`, `verified`, `partially_paid`, `draft`, `sent`, `unpaid`, `partial`, `overdue`) and not `cancelled`,
- product `category_name = 'Grading'`,
- and there is no existing `grading_registrations` row with that `invoice_item_id`,

insert a `grading_registrations` row using:
- `student_id` from the parent invoice,
- `invoice_item_id` from the line item,
- `grading_slot_id` from `metadata`,
- `term_id` resolved from the slot's `grading_date` against `term_calendars` for the slot's branch (window match → previous term → next term), matching `resolveTermFromSlot` logic in `invoiceService.ts` (lines 424–465),
- `current_belt` from the belt-transition name (`"<from> >> <to>"` → `from`),
- `target_belt` from the same parse (`to`),
- `ready_for_grading = false`, `result = null`.

Scope: branch-agnostic, but verified to cover the 12 Morley cases above. Idempotent: only inserts where no matching `invoice_item_id` row exists.

#### C. Fix the auto-create gap for future invoices

In `src/services/invoiceService.ts` (lines 385–422), relax the matching:
- If a `grading_slot_id` is present on any invoice item AND the line item belongs to a `Grading` category product, auto-create the registration regardless of whether the product name matches `current_belt → getNextBeltLevel(current_belt)`.
- Parse `current_belt`/`target_belt` from the product name (split on `>>`) instead of computing from the student record. This handles double-belt gradings and post-grading-belt-update scenarios.
- Keep the existing `resolveTermFromSlot` term-derivation.
- Preserve idempotency (skip if a registration already exists for the same `invoice_item_id`).

### Verification

1. Open Morley → Grading tab → Term 1 2026: list shows all ~20 students with paid/draft grading invoices for Apr 11 slots, including Ethan, Alex, Eden, Ejun, Daniel, Earl John, Elliot, Henry, Evander, Genie, Iqraa, Keller (after backfill) plus the 8 already-registered.
2. Switching to Term 2 2026 still shows that term's grading registrations (no regression).
3. Grading (paid/total) header counter stays correct (already registration-driven via `gradingMetrics`).
4. Mass Edit save still works (no mutation code touched).
5. Create a new draft invoice with a grading line item where the product name skips a belt (e.g. White → Yellow): a `grading_registrations` row is auto-created with `current_belt='White'`, `target_belt='Yellow'`.
6. Sales → Grading List tab unaffected (already registration-driven).

### Out of scope

- Cross-branch grading list merging.
- Changing the dashboard "Grading (X/Y)" tab counter (already correct — uses registrations).
- Touching `class_attendance`, slot eligibility, or grading-payment-prerequisite logic.
- UI/visual changes to the grading table.
