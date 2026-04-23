

## Plan: Rename "Unpaid Class Fees" to "Uninvoiced Class Fees" and change filter logic

### What changes

In the Branch Dashboard → Students tab → Filter dropdown:

- The option currently labelled **"Unpaid Class Fees (Current Term)"** becomes **"Uninvoiced Class Fees (Current Term)"**.
- The chip/badge currently shown as **"Unpaid Term"** becomes **"Uninvoiced Term"**.
- The underlying logic changes to the strict definition: a student appears in this filter only when **no lesson invoice exists at all** for the current term at this branch — regardless of invoice status (draft, sent, unpaid, partially_paid, paid, verified, overdue, cancelled). Students with any existing lesson invoice for the term are excluded.

### File to update

**`src/components/dashboard/BranchDashboard.tsx`**

1. **Replace the existing query** (currently `paid-term-student-ids`, lines ~881–921):
   - Rename to `invoiced-term-student-ids`.
   - Drop the `.in('invoices.status', ['paid', 'verified'])` filter so it matches lesson invoice items for the term across **all statuses except `cancelled`** (cancelled invoices should not block a student from appearing as "uninvoiced").
   - Keep the rest: filter by `is_lesson = true`, `invoices.branch_id = branchId`, and `metadata.term_id = displayTerm.id`.
   - Return the set of student IDs that already have any non-cancelled lesson invoice for the displayed term.

2. **Rename the local variables** for clarity:
   - `paidTermStudentIdsArr` → `invoicedTermStudentIdsArr`
   - `paidTermStudentIds` → `invoicedTermStudentIds`

3. **Update the filter branch** (lines ~1102–1107):
   ```ts
   } else if (statusFilter === 'uninvoiced_term') {
     matchesStatus =
       (studentStatus === 'active' || studentStatus === 'inactive') &&
       !!displayTerm &&
       !invoicedTermStudentIds.has(student.id);
   }
   ```
   - Rename the filter key `'unpaid_term'` → `'uninvoiced_term'` everywhere it appears in this file (state default check, badge label, dropdown item, empty-state copy).

4. **Update visible labels**:
   - Dropdown item text: `Uninvoiced Class Fees (Current Term)`
   - Active filter badge text: `Uninvoiced Term`
   - Empty-state message when no term is configured stays the same: `No active term configured for this branch`.

### Files NOT changed

- `PayGradingDialog.tsx` and `PaySchoolFeesDialog.tsx` use a separate concept ("unpaid terms" meaning terms the student hasn't fully paid for in the payment workflows) — unrelated to this branch dashboard filter. Left untouched.
- No database, RLS, or schema changes.
- No other dashboards or pages reference this filter key.

### Behavior after change

- A student with no lesson invoice for the current term at this branch → appears in the list.
- A student with a draft / sent / unpaid / partially_paid / paid / verified / overdue lesson invoice for the current term at this branch → does NOT appear.
- A student whose only lesson invoice for the term is `cancelled` → appears (treated as if they have no invoice).
- Withdrawn students are still excluded, as today.
- Trial-only students are still excluded (filter requires `active` or `inactive`).

### Verification

1. Open Branch Dashboard → Students tab → Filter → confirm the option reads **"Uninvoiced Class Fees (Current Term)"**.
2. Select it → the active filter badge shows **"Uninvoiced Term"**.
3. Pick a known student with an unpaid (status `unpaid` or `sent`) term lesson invoice → they should NOT be listed.
4. Pick a known student with no invoice for the current term → they SHOULD be listed.
5. Pick a student whose only term lesson invoice is `cancelled` → they SHOULD be listed.
6. Withdrawn / trial students → never appear in this filter.
7. If the branch has no active term configured → the empty state still reads "No active term configured for this branch".

### Out of scope

- Changing the filter for any other dashboard or list.
- Adding a separate "unpaid invoices" filter (can be a follow-up).
- Modifying invoice status semantics or the dashboard outstanding-balance metric.

