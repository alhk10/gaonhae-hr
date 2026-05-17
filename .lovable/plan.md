## Issue

On the public grading payment page, a student at branch **Bukit Merah**, belt **Foundation 3**, selecting the transition **Foundation 3 >> White**, sees "No upcoming slots available". The intended slot is **Foundation Video Test** (28/06/2026).

## Root cause

The `Foundation Video Test` slot row in `grading_slots` is mis-configured for this case:

| Field | Current value | Problem |
|---|---|---|
| `belt_levels` | `[Foundation, Foundation 1, Foundation 2]` | Missing `Foundation 3` → belt gate in `get_public_grading_slots` filters the slot out |
| `grading_product_ids` | `Foundation>>White`, `Foundation 1>>Foundation 2`, `Foundation 2>>Foundation 3` | Missing `Foundation 3 >> White` (product `ae08f80c…`) |
| `branch_id` | `balmoral`, `available_branch_ids = []` | Bukit Merah students cannot see it |
| `max_age` | `5` | Restricts to ≤5 years old (student is ~3, fine) |

The slot-eligibility SQL (`get_public_grading_slots`) and the React filtering logic are correct — they faithfully apply belt / branch / product gating. The bad data lives on this single slot row.

## Fix

Update slot `5b9c0183-7a15-44fc-a80b-4ce4321ea21b` (Foundation Video Test) via migration:

- `belt_levels` → add `Foundation 3` → `[Foundation, Foundation 1, Foundation 2, Foundation 3]`
- `grading_product_ids` → add `ae08f80c-90e0-4faa-b30a-470e2f9656f0` (Foundation 3 >> White)
- `available_branch_ids` → add all Foundation-running branches (at minimum `bukit-merah`) so non-Balmoral students can book the online video test

No code changes required — purely a data migration on `grading_slots`.

## Out of scope

- No changes to `get_public_grading_slots` SQL, `PublicGradingPayment.tsx`, or any product/price config.
- No changes to other grading slots.

## Open question

Should `available_branch_ids` be set to **all branches** (since it's a video test and inherently remote), or only specific ones? Defaulting to all active branches unless told otherwise.
