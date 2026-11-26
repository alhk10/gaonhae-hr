# Partner-paid branch switch

## What you'll get
In /access → Grading → **Settings** (visible only to Superadmin / the all-branch password), each branch row gets a new tick box:

**Term fees paid by partner (school-billed)**

When ticked, students at that branch count as term-fees-paid for grading in both /hello and /access, exactly like Carpe Diem Stradia and Carpe Diem Jurong West today (those two will show as already ticked). Unticking restores the normal 50%-of-term check. Branch passwords cannot change it.

## Technical details
- New SECURITY DEFINER RPC `access_branch_term_fees_external_set(p_password, p_branch_id, p_value)` calling `_settings_guard(p_password, branch, require_all => true)`, updating `branches.term_fees_external`; EXECUTE granted to anon/authenticated (password-gated like the other settings RPCs).
- `GradingScoreSettingsDialog.tsx`: load `term_fees_external` with the branch list, add the checkbox per `BranchRow`, call the RPC, refetch on success.
- Existing `_branch_fees_external` already feeds `hello_grading_eligibility` and `access_grading_term_fee_status`, so no eligibility change needed.
- Verify: toggle a branch on/off as all-branch password and confirm the flag changes; confirm a branch password is refused.
