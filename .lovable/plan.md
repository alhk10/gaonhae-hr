## Problem

The "Public Grading Submissions" card never renders in either dashboard even though 9 `pending_verification` rows exist. Component is mounted correctly in both `SuperadminDashboard.tsx` (line 186) and `BranchDashboard.tsx` (line 1841), and the RLS policy (`has_branch_access(branch_id)`) permits superadmin/staff reads.

Root cause: `getPendingGradingSubmissions()` in `src/services/gradingPaymentSubmissionService.ts` uses embedded selects:

```
.select('*, branches:branch_id(name), products:resolved_product_id(name), grading_slots:resolved_grading_slot_id(...)')
```

But `grading_payment_submissions` has **no foreign key** to `branches` (`branch_id` is just a `text` column, no FK constraint). PostgREST rejects the relationship → the whole query throws → React Query has 0 rows → component returns `null` (lines 122-123 short-circuit on empty).

## Fix

Rewrite `getPendingGradingSubmissions` in `src/services/gradingPaymentSubmissionService.ts` to:

1. Fetch submissions with a plain `select('*')` (no embeds) filtered by status and optional branch.
2. Collect distinct `branch_id`, `resolved_product_id`, and `resolved_grading_slot_id` values.
3. Issue three parallel lookup queries (`branches`, `products`, `grading_slots`) and build lookup maps.
4. Enrich each row with `branch_name`, `product_name`, and `slot_label` from the maps.

Also apply the same pattern to `getPendingGradingSubmissionsCount` — already uses a head/count query with no embeds, leave as-is.

No DB migration required. No UI changes required.

## Files

- `src/services/gradingPaymentSubmissionService.ts` — replace embed-style query in `getPendingGradingSubmissions` with multi-fetch + enrichment.

## Verification

- After the fix, both dashboards should display the card with the 9 pending submissions and proper branch/product/slot labels.
- Branch dashboard filtering by `branchId` continues to work (filter still applied server-side on `branch_id`).