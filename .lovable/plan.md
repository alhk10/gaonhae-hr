

## Plan: Auto-refresh Uninvoiced filter + add live student count

### Problem

1. After creating an invoice (e.g. Dawn's), the **Uninvoiced Class Fees (Current Term)** filtered list still shows the student. Cause: `invalidateAllBranchData()` (and the realtime invoice subscription) does not invalidate the React Query cache key `['invoiced-term-student-ids', branchId, displayTerm?.id]`. The list is stale until a hard refresh.
2. There is no visible count of how many students still need to be invoiced for the current/upcoming term.

### Changes (one file: `src/components/dashboard/BranchDashboard.tsx`)

**A. Fix stale Uninvoiced list — add cache invalidation**

In `invalidateAllBranchData` (line ~958), add:
```ts
queryClient.invalidateQueries({ queryKey: ['invoiced-term-student-ids', branchId] });
```
This ensures the query is re-run whenever any invoice/payment changes. The existing realtime subscriptions on `invoices` and `payments` already call `invalidateAllBranchData`, so adding the key here covers both manual actions (create/edit/delete invoice in the dashboard) and external changes via realtime.

Also add a realtime listener on `invoice_items` (currently only `invoices` is watched). Term-id lives in `invoice_items.metadata`, so an `UPDATE` to a line item that changes the term needs to refresh the set too:
```ts
.on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_items' }, () => {
  queryClient.invalidateQueries({ queryKey: ['invoiced-term-student-ids', branchId] });
})
```
(No branch filter — `invoice_items` has no `branch_id` column; the query itself joins to `invoices.branch_id`.)

**B. Add live student count next to the filter**

Show the count in the **filter badge** when the Uninvoiced filter is active, and additionally show a small inline counter immediately to the right of the filter button whenever a term is configured (regardless of which filter is active), in the format:

```
Uninvoiced: <uninvoicedCount> / <totalActiveTerm>
```

Where:
- `uninvoicedCount` = active + inactive students at this branch who are NOT in `invoicedTermStudentIds` (i.e. no non-cancelled lesson invoice for `displayTerm`).
- `totalActiveTerm` = total active + inactive students at this branch (the existing `students` array minus withdrawn/trial).

Both values are derived from already-fetched React Query data, so they update automatically the moment the underlying queries are invalidated (which step A guarantees).

Implementation:
```ts
const eligibleTermStudents = React.useMemo(
  () => students.filter(s => {
    const st = s.status?.toLowerCase();
    return st === 'active' || st === 'inactive';
  }),
  [students]
);
const uninvoicedCount = React.useMemo(
  () => displayTerm
    ? eligibleTermStudents.filter(s => !invoicedTermStudentIds.has(s.id)).length
    : 0,
  [eligibleTermStudents, invoicedTermStudentIds, displayTerm]
);
const totalActiveTerm = eligibleTermStudents.length;
```

UI (just to the right of the Filter dropdown trigger, only when `displayTerm` exists):
```tsx
<span className="text-[11px] sm:text-xs text-muted-foreground shrink-0">
  Uninvoiced: <span className="font-semibold text-foreground">{uninvoicedCount}</span>
  {' / '}
  <span className="font-semibold text-foreground">{totalActiveTerm}</span>
</span>
```

Also update the filter badge label when `statusFilter === 'uninvoiced_term'` from `Uninvoiced Term` to `Uninvoiced Term (${uninvoicedCount}/${totalActiveTerm})` so the chip itself stays informative.

### Behaviour after change

| Action | Result |
|---|---|
| Create invoice for Dawn (with current-term lesson item) | Realtime `invoices` INSERT → `invoiceItems` INSERT → query invalidated → Dawn disappears from Uninvoiced list within ~1 s; counter drops by 1. |
| Delete an invoice line | Counter goes back up; student reappears in Uninvoiced list. |
| Switch term selector / branch loads | Counter recalculates against the new `displayTerm`. |
| No active/upcoming term configured | Counter is hidden; existing empty-state message unchanged. |

### Verification

1. Open Branch Dashboard → Students tab. Counter `Uninvoiced: X / Y` shows next to Filter.
2. Apply `Uninvoiced Class Fees (Current Term)` filter. List shows X rows. Badge reads `Uninvoiced Term (X/Y)`.
3. From a different tab/window, create a current-term lesson invoice for one of those students → within a second, the row vanishes and the counter decreases by 1 with no manual refresh.
4. Cancel that invoice → row reappears, counter increases by 1.
5. With no active term configured → counter is hidden, list shows existing empty state.

### Files NOT changed

- No DB migrations, no RLS changes.
- `invoiceService.ts` and other writers untouched — they already trigger Supabase realtime events.
- `supabase_realtime` publication already includes `invoices`, `invoice_items`, and `payments` (used by other dashboards), so no SQL needed.

### Out of scope

- Counts on other tabs (Grading, Invoice & Payment) — already handled by their own queries.
- Splitting "current term" vs "upcoming term" into two separate counters — `displayTerm` already resolves to current → upcoming → most-recent, matching today's logic.

