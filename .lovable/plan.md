

## Plan: Fix Invoice & Payment tab counter showing 0 for upcoming-term invoices

### Problem

The tab shows `Invoice & Payment (0 | $0.00)` even though many unpaid `draft` invoices for the upcoming term are visible (issued 23/04/2026). Today is between terms, so `displayTerm` falls back to the **upcoming term**, whose `start_date` is in the future. The current query (`src/components/dashboard/BranchDashboard.tsx`, lines 742–763) filters by `issue_date BETWEEN displayTerm.start_date AND displayTerm.end_date`, which excludes invoices issued *before* the term starts — exactly the case here. The Students counter `(2/44)` works because it matches via `metadata.term_id` on invoice items, not by `issue_date`.

### Fix

Change the `outstanding-invoices` query to identify invoices that contain at least one line item with `metadata.term_id === displayTerm.id` (mirroring the pattern already used by the `invoiced-term-student-ids` query at lines 886–921), then aggregate count and `balance_due` of the unique parent invoices whose status is in the unpaid set.

### Implementation

In `src/components/dashboard/BranchDashboard.tsx`, replace the `outstandingData` query (lines 742–763) with:

```ts
const { data: outstandingData = { count: 0, amount: 0 } } = useQuery({
  queryKey: ['outstanding-invoices', branchId, displayTerm?.id],
  queryFn: async () => {
    if (!displayTerm) return { count: 0, amount: 0 };

    const UNPAID = ['unpaid', 'partial', 'partially_paid', 'draft', 'sent', 'overdue'];

    // Pull invoice_items joined to their invoice, scoped to this branch + unpaid statuses
    const { data: items } = await supabase
      .from('invoice_items')
      .select(`
        metadata,
        invoices!inner (
          id,
          balance_due,
          status,
          branch_id
        )
      `)
      .eq('invoices.branch_id', branchId)
      .in('invoices.status', UNPAID);

    // Dedupe to invoices whose any line item belongs to displayTerm
    const map = new Map<string, number>();
    (items || []).forEach((row: any) => {
      const md = row.metadata as Record<string, any> | null;
      if (md?.term_id !== displayTerm.id) return;
      const inv = row.invoices;
      if (!inv) return;
      if (!map.has(inv.id)) map.set(inv.id, Number(inv.balance_due) || 0);
    });

    const balances = Array.from(map.values());
    return {
      count: balances.length,
      amount: balances.reduce((s, n) => s + n, 0),
    };
  },
  enabled: !!branchId && !!displayTerm,
});
```

No changes to the tab label rendering (line 1213) or to invalidation calls — query key stays `['outstanding-invoices', branchId, displayTerm?.id]`, which is already invalidated everywhere it needs to be.

### Behaviour after change

| Scenario | Tab label |
|---|---|
| Inter-term: 5 draft unpaid invoices for upcoming term, total $1,250 | `Invoice & Payment (5 \| $1,250.00)` |
| All term invoices paid | `Invoice & Payment (0 \| $0.00)` |
| Mid-term unpaid invoices | unchanged behaviour, now matched via `metadata.term_id` |
| No `displayTerm` configured | `Invoice & Payment (0 \| $0.00)` |

### Why this matches the rest of the dashboard

- Students tab `uninvoicedCount` already uses `metadata.term_id` (lines 886–921).
- Grading tab `gradingMetrics` uses `metadata.term_id` (line 770+).
- Aligning the Invoice tab keeps all tab counters consistent: "this term" = items tagged with the term, regardless of invoice issue date.

### Files affected

- `src/components/dashboard/BranchDashboard.tsx` (only)

### Verification

1. Branch Dashboard during inter-term period with draft invoices visible for upcoming term → tab shows `(N | $X.XX)` matching the visible Unpaid list.
2. Mark one of those invoices as Paid → counter decrements within ~1 s (existing realtime invalidation).
3. Cancel an unpaid invoice → counter decrements.
4. During mid-term: counter still reflects unpaid invoices for the current term.
5. Branch with no terms configured → `(0 | $0.00)`.

### Out of scope

- Changing which statuses count as "unpaid".
- Behaviour of other tab counters (already correct).
- The Invoice list filtering inside the tab.

