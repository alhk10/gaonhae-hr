

## Plan: Add "Unpaid Class Fees (Current Term)" filter to Students tab

### Where
`src/components/dashboard/BranchDashboard.tsx` — Students tab Filter dropdown (around line 920-936) and the `filteredStudents` filter logic (line 780-803).

### New filter option
Add a new menu item below the existing four:
- **Active + Inactive**
- Active Only
- Inactive Only
- Trial
- **Unpaid Class Fees (Current Term)** ← new

When selected, the table shows only **non-withdrawn** students at this branch who:
- Have **no paid/verified lesson invoice** for the current term, and
- Are **not trial** students (trial students don't owe class fees).

This mirrors the existing "termPaid" logic already used for the Grading metric (line 584-613) — same definition of "lesson invoice for current term" (products with `is_lesson=true`, matched via `invoice_items.metadata.term_id`, branch-scoped, status `paid` or `verified`).

### Implementation

**1. New query — `paidTermStudentIds`** (only fetches when filter active or always, cached by `displayTerm.id`):
- Same shape as the existing `gradingMetrics` query but returns just the `Set<string>` of student IDs with a paid/verified lesson invoice for `displayTerm`.
- Source of truth: `invoice_items` where `product_id IN (lesson products)`, joined to `invoices` where `branch_id = branchId` and `status IN ('paid','verified')`, filtered in JS by `metadata.term_id === displayTerm.id`.
- Memoize as a `Set` for O(1) lookup.

**2. Extend `filteredStudents` (line 780-803)**:
- Add a new branch:
  ```ts
  } else if (statusFilter === 'unpaid_term') {
    matchesStatus =
      (studentStatus === 'active' || studentStatus === 'inactive') &&
      !!displayTerm &&
      !paidTermStudentIds.has(student.id);
  }
  ```
- Excludes trial and withdrawn (withdrawn already excluded at top of filter).

**3. Filter dropdown UI (line 922-936)**:
- Add `<DropdownMenuItem onClick={() => setStatusFilter('unpaid_term')}>Unpaid Class Fees (Current Term)</DropdownMenuItem>`.
- Update the badge logic (line 914-918) so the active filter shows label `Unpaid Term` when `statusFilter === 'unpaid_term'`.

**4. Empty-state copy**:
- If `displayTerm` is missing (no term defined for branch), the filter resolves to "no students" — show the existing empty row but with helper text "No active term configured for this branch" so it isn't mistaken for a bug.

### Term used
`displayTerm = currentTerm || mostRecentTerm` — same fallback used elsewhere in this dashboard (line 465). Keeps behaviour consistent with the Grading and Outstanding tiles.

### What stays the same
- All other filters, search, mass-edit, withdraw actions, columns.
- No DB changes, no schema migration, no RLS changes (re-uses tables already accessible: `products`, `invoice_items`, `invoices`).
- No new permissions — same visibility rules as current Students tab.

### Verification
- Switch filter → table shows only active/inactive students missing a paid/verified term invoice for current term.
- Issue & pay an invoice for one of those students → student disappears from the list (after refetch via existing realtime invalidation on `invoices`).
- Trial students never appear under this filter.
- Branch with no current term → empty list with explanatory message.

### Out of scope
- Bulk-actions on the filtered list (e.g., bulk reminder send) — can be a follow-up.
- Splitting "draft/sent" vs "overdue" — current definition is "no paid/verified lesson invoice for the term" which covers all unpaid states uniformly.

