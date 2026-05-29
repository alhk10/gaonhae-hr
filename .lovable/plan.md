# Fix: Branch column on /grading-list

## Problem
On `/grading-list`, every row shows "Balmoral" because the branch is taken from the **grading slot's branch** (where the grading event is held), not from the student's actual home branch.

The Balmoral 28/06/2026 slot is hosting students from multiple branches, but they all currently render as "Balmoral".

## Root cause
In the DB function `public.get_public_grading_list`:

- **Registration rows** (internal students) join `branches` via `grading_slots.branch_id` → always = slot's branch.
- **Submission rows** (public form) use `grading_payment_submissions.branch_id` → already = the branch keyed in on the form. ✅

## Fix

Migration: update `get_public_grading_list` so the **registration** half of the UNION resolves `branch_id` / `branch_name` / `branch_country` from the **student's home branch** (`students.branch_id`) instead of the slot's branch.

```text
Registration branch source:  students.branch_id  → branches
Submission branch source:    grading_payment_submissions.branch_id → branches   (unchanged)
```

Everything else in the RPC (slot date/time/title/location, paid status, amount, proof, etc.) stays unchanged.

## Frontend
No code changes. `PublicGradingList.tsx` already reads `r.branch_name` and `r.branch_id` from the RPC; the per-row branch filter, mass-edit branch picker, and PDF subtotals will automatically reflect the corrected values.

## Out of scope
- Branch-change requests, grading-slot eligibility, payments, invoices.
- `/comp`, `/seminars`, `/guards`, Superadmin Dashboard sections.
- The slot title (e.g. "Balmoral - 28/06/2026 - 11:10 - Yellow Tip >> Yellow") stays as the slot's branch — only the per-row **Branch** column changes.

## Note
After this change, the branch filter on `/grading-list` will list every home-branch present in the registrations (e.g. Balmoral, Tampines, etc.), and the per-branch PDF subtotals will be split by the student's home branch — please confirm that's the intended grouping for the amount-collected report before I apply the migration.
