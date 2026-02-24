
## Auto-Popup Dialogs for School Fees and Grading Fees on Login

### Overview
Add two automatic popup dialogs that appear when a student logs in:
1. **Pay School Fees** popup -- if no invoice exists for the current active term with a "lesson" type item
2. **Pay Grading Fees** popup -- if the student is marked "ready for grading" but has no paid grading invoice

These popups will integrate into the existing popup chain: Unpaid Invoices -> School Fees -> Grading Fees -> Profile Completion.

### Changes

#### `src/components/dashboard/StudentDashboard.tsx`

1. **Add a query to check if a current-term lesson invoice exists:**
   Query `invoices` joined with `invoice_items` to see if there is any invoice for the student where an item has `item_type = 'lesson'` and a `metadata->term_id` matching one of the current `availableTerms`. If none found, the student needs to pay school fees.

2. **Add a query to check grading readiness and unpaid grading fees:**
   - Query `grading_registrations` for `ready_for_grading = true` (reuse existing pattern)
   - Check if any grading invoice exists in the last 60 days (same logic as in `PaySchoolFeesDialog`)

3. **Add state variables:**
   - `showAutoSchoolFees` (boolean)
   - `showAutoGrading` (boolean)

4. **Update the login popup chain in `useEffect`:**
   Current chain: Unpaid Invoices -> Profile Completion.
   New chain: **Unpaid Invoices -> School Fees (if no term invoice) -> Grading Fees (if ready but unpaid) -> Profile Completion**.
   
   Each dialog's `onOpenChange` callback will trigger the next dialog in the chain when closed.

5. **Render the auto-triggered dialogs:**
   Reuse existing `PaySchoolFeesDialog` and `PayGradingDialog` components with the auto-triggered state variables.

### Popup Chain Flow

```
On Login
  |
  v
Has unpaid invoices? --> YES --> Show UnpaidInvoiceReminderDialog
  |                                    |
  NO                              (on close)
  |                                    |
  v                                    v
No current term invoice? --> YES --> Show PaySchoolFeesDialog
  |                                    |
  NO                              (on close)
  |                                    |
  v                                    v
Ready for grading + no grading invoice? --> YES --> Show PayGradingDialog
  |                                                      |
  NO                                                (on close)
  |                                                      |
  v                                                      v
Profile incomplete? --> YES --> Show ProfileCompletionDialog
  |
  NO --> Done
```

### Technical Details

**Current term invoice check query:**
```typescript
const { data: hasCurrentTermInvoice } = useQuery({
  queryKey: ['student-current-term-invoice', studentId, availableTerms],
  queryFn: async () => {
    if (!availableTerms.length) return true; // no terms = nothing to pay
    const termIds = availableTerms.map(t => t.id);
    const { data: items } = await supabase
      .from('invoice_items')
      .select('id, invoice_id, metadata')
      .eq('item_type', 'lesson');
    // Filter by student's invoices and matching term_id in metadata
    const studentInvoiceIds = invoices.map(i => i.id);
    const hasMatch = items?.some(item => {
      if (!studentInvoiceIds.includes(item.invoice_id)) return false;
      const meta = item.metadata as any;
      return meta?.term_id && termIds.includes(meta.term_id);
    });
    return !!hasMatch;
  },
  enabled: !!studentId && invoices.length >= 0 && availableTerms.length > 0,
});
```

**Grading readiness + unpaid check:**
```typescript
const { data: isReadyForGrading } = useQuery({
  queryKey: ['student-ready-for-grading', studentId],
  queryFn: async () => {
    const { data } = await supabase
      .from('grading_registrations')
      .select('id, ready_for_grading')
      .eq('student_id', studentId)
      .eq('ready_for_grading', true)
      .limit(1)
      .maybeSingle();
    return !!data;
  },
  enabled: !!studentId,
});
```

The existing grading invoice check (60-day dedup) already exists inside `PaySchoolFeesDialog` and `PayGradingDialog`. For the auto-popup trigger, we add a similar check in `StudentDashboard` to decide whether to show the popup.

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/StudentDashboard.tsx` | Add current-term invoice check query, grading readiness query, new state variables, updated popup chain logic, render auto-triggered dialogs |
