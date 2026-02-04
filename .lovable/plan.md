
# Plan: Add Grading List Tab to Branch Dashboard

## Overview
Add a new "Grading List" tab to the Branch Dashboard that displays the grading list filtered for the specific branch. This will create a new component that reuses the logic from `GradingListTab.tsx` but pre-filters by the branch.

## Changes Summary

| File | Change |
|------|--------|
| `src/components/dashboard/BranchGradingList.tsx` | **Create** - New component for branch-filtered grading list |
| `src/components/dashboard/BranchDashboard.tsx` | Add new Grading List tab with count |

## Implementation Details

### 1. Create BranchGradingList Component

Create a new component `src/components/dashboard/BranchGradingList.tsx` that:
- Accepts `branchId` as a prop
- Auto-selects the current term for the branch
- Shows the same grading list table as `GradingListTab.tsx`
- Removes the branch selector (since it's already filtered)
- Keeps term selector and payment filter

**Component Structure:**
```typescript
interface BranchGradingListProps {
  branchId: string;
}

const BranchGradingList: React.FC<BranchGradingListProps> = ({ branchId }) => {
  // Term selector (auto-select current term)
  // Payment filter
  // Students table with grading status
};
```

### 2. Update BranchDashboard

Add a new tab "Grading List" with a count of students in brackets:

**Tab Label:**
```tsx
<TabsTrigger value="grading">
  Grading List ({gradingListCount})
</TabsTrigger>
```

**Tab Content:**
```tsx
<TabsContent value="grading">
  <BranchGradingList branchId={branchId} />
</TabsContent>
```

### 3. Count Query

Add a query to count students with lesson invoices for current term:

```typescript
const { data: gradingListCount = 0 } = useQuery({
  queryKey: ['grading-list-count', branchId, currentTerm?.id],
  queryFn: async () => {
    if (!currentTerm) return 0;
    
    // Get lesson products
    const { data: lessonProducts } = await supabase
      .from('products')
      .select('id')
      .eq('is_lesson', true);
    
    const lessonProductIds = (lessonProducts || []).map(p => p.id);
    if (lessonProductIds.length === 0) return 0;

    // Count unique students with lesson invoices for this term
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('invoices!inner(student_id)')
      .in('product_id', lessonProductIds)
      .eq('invoices.branch_id', branchId);
    
    // Filter by term_id in metadata and get unique count
    // ... return count
  },
  enabled: !!branchId && !!currentTerm,
});
```

## Tab Order

The tabs will be ordered as:
1. Students (count)
2. Invoice & Payment (outstanding amount)
3. Grading List (count)
4. Pending Approvals (count)
5. Weekly Timetable

## Features Included

The BranchGradingList component will include:
- Term selector (pre-selects current term)
- Payment status filter (All/Paid/Unpaid)
- Student table with:
  - Student Name (clickable link)
  - Current Belt
  - Class Invoice status (Paid/Unpaid badge)
  - Ready for Grading checkbox
  - Result dropdown (Double/Pass/Fail/Confirmed)
  - New Current Belt (calculated)
  - Certificate view buttons

## Data Flow

```text
BranchDashboard
    ├── branchId (prop)
    ├── currentTerm (query)
    └── BranchGradingList
            ├── branchId (prop, locked)
            ├── terms (query, filtered by branch)
            ├── selectedTerm (state, auto-selects current)
            └── students (query, filtered by branch + term)
```
