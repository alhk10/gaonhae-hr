## Plan: Show all lesson-invoiced students in the term grading list, none Ready by default

### Findings

1. **Sample data (Morley = `BR1768967806476`, Term 2 2026):**
   - Only **7** `grading_registrations` rows exist for the term — all manually keyed by `alhk10@gmail.com` on 2026-04-23 with `ready_for_grading = true`.
   - **42** distinct students actually have a Term 2 lesson invoice at this branch.
   - Result: 35 invoiced students are missing from the Grading list, and the 7 shown are incorrectly marked Ready.

2. **Root cause:** Both `BranchGradingList.tsx` (Branch Dashboard) and `GradingListTab.tsx` (Sales) became **registration-driven** in the previous fix. A student only appears if a `grading_registrations` row exists for the selected term. Lesson-invoice-only students are now invisible.

3. **Term 1 2026 (BR1768967806476):** 27 registrations exist (19 backfilled, 8 manual). The user said Term 1 was hand-keyed by superadmin — we must not touch existing Term 1 rows or alter their `ready_for_grading` flags.

### Changes

#### 1. `src/components/dashboard/BranchGradingList.tsx` and `src/components/sales/GradingListTab.tsx` — query refactor

Make the list **union-driven**: registrations ∪ lesson-invoiced students for the selected term/branch.

For the selected `(branchId, termId)`:

- **Source A (existing):** all `grading_registrations` for `term_id = selectedTerm` whose student has any invoice at `branchId`.
- **Source B (new):** all distinct `student_id`s with a lesson invoice item at `branchId` whose `metadata.term_id = selectedTerm` and invoice status ∈ active set (`draft, sent, unpaid, partial, partially_paid, overdue, paid, verified`). These students appear with **no `registration_id`**, `ready_for_grading = false`, `result = null`, `grading_slot_id = null`, `current_belt = student.current_belt`, and `term_paid` derived from their lesson invoice status.
- **De-dupe** by `student_id`; if the student exists in Source A, that row wins (preserves existing manual data, slot assignment, grading-paid status).
- Keep the existing active-student filter and branch scoping.

#### 2. Save logic — create-on-edit

Currently `batchSaveMutation` updates rows when `registration_id` exists and inserts otherwise. The insert path already exists in `GradingListTab.tsx` and `BranchGradingList.tsx`; we just need to ensure that when a Source B (no-registration) student is edited (Ready toggled, slot assigned, or result entered), a new `grading_registrations` row is created with:

- `student_id`, `term_id = selectedTerm`
- `current_belt = student.current_belt` (or `'White'` if null)
- `target_belt` parsed from belt progression (existing `formatBeltLevel` helper) or `current_belt` if unknown
- `ready_for_grading`, `result`, `grading_slot_id` from the pending change

No DB schema changes needed.

#### 3. Reset the 7 incorrect Term 2 2026 Ready flags (one-time data fix)

The 7 manually-keyed Term 2 rows were set with `ready_for_grading = true` even though the term hasn't started. Migration:

```sql
UPDATE public.grading_registrations
SET ready_for_grading = false
WHERE term_id = '93c68375-31d9-406a-adfa-07fc24614428' -- Term 2 2026 (BR1768967806476)
  AND ready_for_grading = true
  AND result IS NULL;
```

Scoped narrowly: only this term, only rows with no result yet (so we can't accidentally clear graded students). **Term 1 2026 rows are not touched.**

If other branches' Term 2 2026 registrations exist in the future with the same issue, this same scoped update can be re-run; for now only one branch has any.

### Verification

1. Open Branch Dashboard → Morley → Grading tab → Term 2 2026.
2. Expect ~42 students listed (all with Term 2 lesson invoices), sorted as today.
3. The 7 previously-Ready students still appear (with their belt transitions preserved) but the **Ready ✓** column is empty for everyone.
4. Toggling Ready or assigning a slot for a Source B student (e.g., a brand-new entry) successfully creates a `grading_registrations` row on Save.
5. Open Term 1 2026 → all 27 existing rows render unchanged (Ready flags, slots, results all preserved).
6. Repeat sanity check on Sales → Grading List tab for the same branch/terms.

### Out of scope

- Auto-creating `grading_registrations` at invoice time for lesson-only invoices (kept on-demand, as before).
- Changing the Ready logic / business rules beyond defaulting to `false` for invoice-only rows.
- Cross-branch grading visibility.
