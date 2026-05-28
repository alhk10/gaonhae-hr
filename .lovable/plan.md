## Grading List — Result lock window + new Remark column

### 1. Result column — time-based lock

The Result dropdown stays visible on every row but is **only editable** while today's date falls within `[grading_date, grading_date + 30 days]`. Outside that window the `<Select>` renders disabled (greyed) showing the current value.

Override: when the page is unlocked with the existing **full** password `Hp84311884` (`unlockLevel === 'full'`), the dropdown is always editable, regardless of date. The standard password `Hp97533488` does **not** bypass the lock.

Implementation in `src/pages/public/PublicGradingList.tsx`:
- Add helper `isResultEditable(r)` = `unlockLevel === 'full'` OR `today` ∈ `[grading_date, grading_date + 30d]`.
- Pass `disabled={!isResultEditable(r)}` to the existing Result `<Select>` (around line 1320). Same treatment in the per-row Edit dialog (line 1573) and Mass Edit dialog (line 1625) — disable the Result section when no selected row is within the window and not full-unlock.

### 2. New "Remark" column (edit mode only)

Options: `AWOL`, `Medical Certificate`, `Double Testing`, `Video Testing`, `—` (clear). Stored as nullable text.

#### Database migration

```sql
ALTER TABLE public.grading_registrations       ADD COLUMN IF NOT EXISTS remark text;
ALTER TABLE public.grading_payment_submissions ADD COLUMN IF NOT EXISTS remark text;

-- RPCs (SECURITY DEFINER, mirror the existing _result helpers)
CREATE OR REPLACE FUNCTION public.admin_update_grading_remark(
  p_registration_id uuid, p_remark text
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.grading_registrations SET remark = p_remark WHERE id = p_registration_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_grading_submission_remark(
  p_submission_id uuid, p_remark text
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.grading_payment_submissions SET remark = p_remark WHERE id = p_submission_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_grading_remark(uuid, text)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_grading_submission_remark(uuid, text) TO anon, authenticated;
```

Recreate `public.get_public_grading_list` adding a `remark text` column to the RETURNS TABLE, selecting `gr.remark` for the registration branch and `gps.remark` for the submission branch.

#### Service (`src/services/gradingPaymentSubmissionService.ts`)

- Extend `PublicGradingListRow` with `remark: string | null`.
- Add `adminUpdateGradingRemark(registrationId, remark)` and `adminUpdateGradingSubmissionRemark(submissionId, remark)` calling the new RPCs.

#### UI (`src/pages/public/PublicGradingList.tsx`)

- New header `<TableHead>Remark</TableHead>` placed immediately after `Result` (inside the `editMode &&` block).
- New `<TableCell>` rendering a `<Select>` with the four options + clear, value = `r.remark`. Wire to `handleRemarkChange(r, v)` that dispatches to the right RPC (registration vs submission), shows toast, and invalidates `['public-grading-list']`. Always editable in edit mode (no time lock — staff need to log absences at any time).
- Sorting: in the `groups` memo (line 175-181) add a primary sort key `hasRemark = !!r.remark` so rows with a non-empty remark fall to the bottom of their slot group, branch + name sorting preserved within each bucket.
- Add Remark to the per-row Edit dialog and Mass Edit dialog (same options).

### Out of scope

- No changes to certificate generation, PDFs, or other tabs (competition / seminar / guards).
- Existing rejected/verified flows untouched.
