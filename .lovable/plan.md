

## Fix: Only Show Grading Opt-In When Student is Marked "Ready for Grading"

### Problem
The grading opt-in section in the Pay School Fees dialog currently appears whenever there are matching grading slots for the student's belt level. It does not check whether the student has actually been marked as "ready for grading" by the branch admin in the grading list. This means students like Akhil, who are not ready, still see the prompt.

### Root Cause
The `gradingEligible` flag in `PaySchoolFeesDialog.tsx` (line 299) only checks:
1. `gradingSlots.length > 0` (slots exist)
2. `gradingProduct` exists (belt transition product)
3. No duplicate invoice in 60 days

It does NOT check the `grading_registrations.ready_for_grading` field.

### Solution
Add a query to check if the student has a `grading_registrations` record with `ready_for_grading = true`, and include that in the `gradingEligible` condition.

### Changes

#### `src/components/dashboard/PaySchoolFeesDialog.tsx`

1. **Add a new query** to check if the student is marked as ready for grading:
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

2. **Update the eligibility flag** (line 299) to include the new check:
```typescript
const gradingEligible = gradingSlots.length > 0 
  && !!gradingProduct 
  && !existingGradingInvoice 
  && !!isReadyForGrading;
```

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/PaySchoolFeesDialog.tsx` | Add `isReadyForGrading` query against `grading_registrations`; add `&& !!isReadyForGrading` to the `gradingEligible` condition |

### Result
- Students NOT marked as ready for grading (like Akhil) will no longer see the grading opt-in section.
- Students marked as ready by the branch admin will continue to see the prompt as expected.

