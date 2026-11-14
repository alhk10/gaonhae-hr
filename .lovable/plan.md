# Notify superadmins when a grading fee override is used

## What changes
- **New "Grading fee overrides" card** on the superadmin dashboard and on the /access Summary tab. On /access it appears only for the all-branch password Hp97533488. It sits next to the Trial Requests card.
- **Each entry shows:** student name, branch, term, weeks paid at the time (for example 0 of 12), which staff password made the override, and when.
- **New entries are flagged.** A red "N new" badge shows how many haven't been seen. A **Mark seen** button on each entry clears its flag, and seen entries stay listed for history.
- **Branch staff can't see this card.** They can still use the override as before.
- **Removing an override:** if staff untick Ready later, the entry stays and is labelled "Removed".

## Technical details
- New table `grading_override_log` with these columns:
  - `student_id`, `branch_id`, `term_id`, `registration_id`
  - `paid_weeks`, `term_weeks`
  - `password_label` (from `access_unlock_passwords`)
  - `created_at`, `seen_at`, `seen_by`, `removed_at`
- RLS on, with access for superadmins only. Grants go to authenticated (superadmin policy) and service_role.
- `access_set_ready_for_grading` inserts a log row when `p_fee_override` is true. When an override is cleared, it sets `removed_at` on the latest open row.
- New RPCs, both requiring the all-branch password through `_access_require_all`:
  - `access_grading_overrides(p_password)`
  - `access_grading_override_mark_seen(p_password, p_id)`
- New shared `GradingOverridesList` component (modes `access` and `superadmin`), modelled on `TrialRequestsList`. It is added to `SuperadminDashboard` and `SummaryTab`, and in `SummaryTab` it shows only for the all-branch password.
