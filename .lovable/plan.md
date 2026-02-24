

## Fix: Add "Ready for Grading" Check to Hide Grading Section for Ineligible Students

### Problem
The grading opt-in section still appears for students like Akhil who are NOT marked as "ready for grading" by the branch admin. The `isReadyForGrading` query was never added to the code despite being in the previous plan.

### Root Cause
Line 299 in `PaySchoolFeesDialog.tsx` computes `gradingEligible` without checking the `grading_registrations` table:
```typescript
const gradingEligible = gradingSlots.length > 0 && !!gradingProduct && !existingGradingInvoice;
```

### Fix

In `src/components/dashboard/PaySchoolFeesDialog.tsx`, between line 296 and 298:

1. Add a new query to check if the student is marked as ready:
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

2. Update line 299 to include the check:
```typescript
const gradingEligible = gradingSlots.length > 0 && !!gradingProduct && !existingGradingInvoice && !!isReadyForGrading;
```

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/PaySchoolFeesDialog.tsx` | Add `isReadyForGrading` query; add `&& !!isReadyForGrading` to `gradingEligible` |

### Result
- Students NOT marked as ready (like Akhil) will no longer see the grading opt-in.
- Students marked as ready will continue to see it.
