

## Plan: Make Grading Registrations Term-Specific

### Problem
The `grading_registrations` table has no `term_id` column. A student marked "Ready" in one term appears "Ready" in all terms. The grading count also breaks when no current term is active.

### Changes

#### 1. Database Migration — Add `term_id` and backfill existing records

Add `term_id` column, then backfill all existing registrations by matching the student's branch to the term that was active at the registration's `created_at` date.

```sql
-- Add column
ALTER TABLE public.grading_registrations
ADD COLUMN term_id UUID REFERENCES public.term_calendars(id);

-- Backfill: assign term_id based on student's branch + registration created_at date
UPDATE public.grading_registrations gr
SET term_id = (
  SELECT tc.id FROM public.term_calendars tc
  JOIN public.students s ON s.branch_id = tc.branch_id
  WHERE s.id = gr.student_id
    AND tc.is_active = true
    AND gr.created_at::date BETWEEN tc.start_date AND tc.end_date
  ORDER BY tc.start_date DESC
  LIMIT 1
)
WHERE gr.term_id IS NULL;

-- For any remaining NULLs (created outside any term range), assign the nearest past term
UPDATE public.grading_registrations gr
SET term_id = (
  SELECT tc.id FROM public.term_calendars tc
  JOIN public.students s ON s.branch_id = tc.branch_id
  WHERE s.id = gr.student_id
    AND tc.is_active = true
    AND tc.start_date <= gr.created_at::date
  ORDER BY tc.start_date DESC
  LIMIT 1
)
WHERE gr.term_id IS NULL;

-- Unique constraint: one registration per student per term
ALTER TABLE public.grading_registrations
ADD CONSTRAINT grading_registrations_student_term_unique UNIQUE (student_id, term_id);
```

#### 2. `src/components/dashboard/BranchGradingList.tsx` — Filter by term
- Add `.eq('term_id', selectedTerm)` when fetching registrations
- Include `term_id: selectedTerm` in new registration inserts

#### 3. `src/components/sales/GradingListTab.tsx` — Same term filtering
- Add `.eq('term_id', selectedTerm)` filter on fetch
- Include `term_id` in insert payload

#### 4. `src/components/dashboard/BranchDashboard.tsx` — Fix grading tab count
- Filter grading registrations by `displayTerm.id` when calculating paid/total counts
- Verify `invoice_item_id` links to a valid, non-cancelled invoice before counting as "paid"

#### 5. `src/components/dashboard/PayGradingDialog.tsx` — Write term_id on payment
- Include `term_id` from the selected term when updating the registration after invoice creation

#### 6. `src/components/dashboard/QuickActionsSection.tsx` — Scope to current term
- Filter `ready_for_grading` check by current term so "Pay Grading" only shows for the active term

#### 7. Update TypeScript types
- Add `term_id` to `grading_registrations` type (auto-generated after migration)

### Technical Detail

**Backfill strategy**: All existing registrations (currently ~20+ records, all from Yishun branch created in March 2026) fall within Term 1 (2026-01-03 to 2026-03-29). The migration matches each registration to the correct term by comparing the student's `branch_id` and the registration's `created_at` timestamp against the term calendar date ranges. A second pass catches any edge cases where registration was created outside a term window by assigning the nearest preceding term.

**Invoice connection verification**: The `gradingPaid` count in the dashboard tab will cross-check that `invoice_item_id` on the registration points to a valid invoice (not deleted/cancelled), ensuring the count stays accurate when invoices are deleted.

