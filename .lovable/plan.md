
# Plan: Enhance Branch Dashboard Tab Labels with Dynamic Counts

## Overview
Update the Branch Dashboard tabs to show dynamic counts in brackets:
1. **Students tab**: Show count of active students (students who have paid invoices for classes this term)
2. **Invoice & Payment tab** (renamed from Revenue): Show sum of outstanding invoice amounts for the branch during current term
3. **Pending Approvals tab**: Show count of pending approval requests

## Data Flow

| Tab | Source | Logic |
|-----|--------|-------|
| Students | Paid invoices + term calendars | Count students with paid lesson invoices in current term date range |
| Invoice & Payment | Invoices table + term calendars | Sum `balance_due` for unpaid/partial invoices within current term |
| Pending Approvals | `student_update_requests` | Already fetched, just use `pendingRequests.length` |

## Changes Summary

| File | Change |
|------|--------|
| `src/components/dashboard/BranchDashboard.tsx` | Add queries for active students, outstanding invoices; update tab labels |

## Implementation Details

### 1. Add Query to Get Current Term for Branch

```typescript
const { data: currentTerm } = useQuery({
  queryKey: ['current-term', branchId],
  queryFn: () => getCurrentTerm(branchId),
  enabled: !!branchId,
});
```

### 2. Add Query for Active Students (Paid for Classes This Term)

Students who have paid invoices for lesson products within the current term's date range:

```typescript
const { data: activeStudentIds = [] } = useQuery({
  queryKey: ['active-students-paid', branchId, currentTerm?.id],
  queryFn: async () => {
    if (!currentTerm) return [];
    
    // Get invoices that are paid for this branch within the term dates
    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('student_id')
      .eq('branch_id', branchId)
      .eq('status', 'paid')
      .gte('issue_date', currentTerm.start_date)
      .lte('issue_date', currentTerm.end_date);
    
    // Get unique student IDs who have paid
    const uniqueStudentIds = [...new Set((paidInvoices || []).map(inv => inv.student_id))];
    return uniqueStudentIds;
  },
  enabled: !!branchId && !!currentTerm,
});

const activeStudentsCount = activeStudentIds.length;
```

### 3. Add Query for Outstanding Invoice Amount

Sum of `balance_due` for unpaid/partial invoices in current term:

```typescript
const { data: outstandingAmount = 0 } = useQuery({
  queryKey: ['outstanding-invoices', branchId, currentTerm?.id],
  queryFn: async () => {
    if (!currentTerm) return 0;
    
    const { data: unpaidInvoices } = await supabase
      .from('invoices')
      .select('balance_due')
      .eq('branch_id', branchId)
      .in('status', ['unpaid', 'partial', 'draft', 'sent', 'overdue'])
      .gte('issue_date', currentTerm.start_date)
      .lte('issue_date', currentTerm.end_date);
    
    return (unpaidInvoices || []).reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  },
  enabled: !!branchId && !!currentTerm,
});
```

### 4. Update Tab Labels

**Before:**
```tsx
<TabsTrigger value="students">Students</TabsTrigger>
<TabsTrigger value="revenue">Revenue</TabsTrigger>
<TabsTrigger value="approvals">
  Pending Approvals
  {pendingRequests.length > 0 && (
    <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
  )}
</TabsTrigger>
```

**After:**
```tsx
<TabsTrigger value="students">
  Students ({activeStudentsCount})
</TabsTrigger>
<TabsTrigger value="invoices">
  Invoice & Payment ({formatCurrency(outstandingAmount, branchCurrency)})
</TabsTrigger>
<TabsTrigger value="approvals">
  Pending Approvals ({pendingRequests.length})
</TabsTrigger>
```

### 5. Rename TabsContent Value

Update the revenue tab to use `value="invoices"` and update the content title:

```tsx
<TabsContent value="invoices">
  <Card>
    <CardHeader>
      <CardTitle>Invoices & Payments</CardTitle>
      <CardDescription>Last 20 invoices for this branch</CardDescription>
    </CardHeader>
    ...
  </Card>
</TabsContent>
```

### 6. Import Required Dependencies

```typescript
import { getCurrentTerm } from '@/services/termCalendarService';
import { formatCurrency } from '@/utils/currencyUtils';
```

## Technical Notes

### Active Students Logic
- A student is considered "active" if they have at least one paid invoice during the current term's date range
- The query filters by `issue_date` within term start and end dates
- Only counts unique students (one student with multiple paid invoices counts as 1)

### Outstanding Amount Logic
- Sums `balance_due` from all non-paid invoices (draft, sent, unpaid, partial, overdue)
- Only includes invoices issued within the current term
- Falls back to 0 if no current term exists

### Branch Currency
- Uses the branch's currency for formatting the outstanding amount
- Falls back to SGD if not specified

## Visual Preview

```text
+----------------+---------------------------+-----------------------+------------------+
| Students (12)  | Invoice & Payment ($450)  | Pending Approvals (3) | Weekly Timetable |
+----------------+---------------------------+-----------------------+------------------+
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No current term | Shows 0 for active students, $0 for outstanding |
| No invoices | Shows 0 for active students, $0 for outstanding |
| No pending approvals | Shows (0) in tab |
| Term without lesson products | Still counts all paid invoices in term date range |
