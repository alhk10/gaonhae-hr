

## Plan: Show unpaid invoice count + outstanding amount in Invoice & Payment tab

### What changes

In `src/components/dashboard/BranchDashboard.tsx`:

1. **Update the `outstanding-invoices` query** (line ~743) to return both the count and the sum:
   ```ts
   const { data: outstandingData = { count: 0, amount: 0 } } = useQuery({
     queryKey: ['outstanding-invoices', branchId, displayTerm?.id],
     queryFn: async () => {
       if (!displayTerm) return { count: 0, amount: 0 };
       const { data: unpaidInvoices } = await supabase
         .from('invoices')
         .select('balance_due')
         .eq('branch_id', branchId)
         .in('status', ['unpaid', 'partial', 'partially_paid', 'draft', 'sent', 'overdue'])
         .gte('issue_date', displayTerm.start_date)
         .lte('issue_date', displayTerm.end_date);
       const list = unpaidInvoices || [];
       return {
         count: list.length,
         amount: list.reduce((s, inv) => s + (inv.balance_due || 0), 0),
       };
     },
     enabled: !!branchId && !!displayTerm,
   });
   ```

2. **Update the tab label** (line 1209) from:
   ```
   Invoice & Payment ($0.00)
   ```
   to:
   ```
   Invoice & Payment (3 | $750.00)
   ```
   ```tsx
   <TabsTrigger value="invoices" className="text-xs sm:text-sm">
     Invoice & Payment ({outstandingData.count} | {formatCurrency(outstandingData.amount, branchCurrency)})
   </TabsTrigger>
   ```

3. **Definition of "not paid"** — uses the existing status set already in the query: `unpaid`, `partial`, `partially_paid`, `draft`, `sent`, `overdue`. Excludes `paid`, `verified`, and `cancelled`. Scope stays restricted to invoices issued within `displayTerm`.

### Behaviour after change

| State | Tab label |
|---|---|
| 3 unpaid invoices totalling $750 | `Invoice & Payment (3 \| $750.00)` |
| No unpaid invoices | `Invoice & Payment (0 \| $0.00)` |
| No `displayTerm` configured | `Invoice & Payment (0 \| $0.00)` (fallback default) |

Live updates: existing realtime subscription on `invoices` already invalidates `['outstanding-invoices', branchId]` queries via `invalidateAllBranchData`, so both count and amount refresh within ~1 s of any invoice/payment change.

### Files affected

- `src/components/dashboard/BranchDashboard.tsx` (only)

### Verification

1. Branch Dashboard tabs row shows `Invoice & Payment (N | $X.XX)`.
2. Mark an unpaid invoice as paid → count decreases by 1, amount drops by its balance, no manual refresh.
3. Create a new draft/unpaid invoice → count increases by 1, amount increases.
4. Cancel an unpaid invoice → count decreases by 1.
5. Branch with no display term → tab reads `Invoice & Payment (0 | $0.00)`.

### Out of scope

- Changing which statuses count as "not paid".
- Counts on other tabs (Students, Grading, etc.) — unchanged.
- Date-range or filter logic in the Invoice list itself.

