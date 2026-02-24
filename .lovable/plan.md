

## Hide "Pay Grading" Card for Students Not Ready for Grading

### Problem
The "Pay Grading" card is always visible on the Student Dashboard, even for students like Akhil who have not been marked as "ready for grading" by the branch admin. It should be completely hidden for ineligible students.

### Solution
Add an `isReadyForGrading` query (same pattern used in `PaySchoolFeesDialog.tsx`) to `QuickActionsSection.tsx`, and conditionally render the Pay Grading card only when the student is ready.

### Changes

#### `src/components/dashboard/QuickActionsSection.tsx`

1. Add a query to check if the student is marked as ready for grading:
```typescript
const { data: isReadyForGrading } = useQuery({
  queryKey: ['student-ready-for-grading', student.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('grading_registrations')
      .select('id, ready_for_grading')
      .eq('student_id', student.id)
      .eq('ready_for_grading', true)
      .limit(1)
      .maybeSingle();
    return !!data;
  },
  enabled: !!student.id,
});
```

2. Update `canPayGrading` (line 125) to include the readiness check:
```typescript
const canPayGrading = hasBranch && !!student.current_belt && gradingSlots.length > 0 && !!isReadyForGrading;
```

3. Wrap the entire Pay Grading card block (lines 165-201) in a conditional so it only renders when the student is ready:
```typescript
{canPayGrading && (
  <Card ...>
    ...
  </Card>
)}
```

This completely hides the card rather than showing it in a disabled/greyed-out state.

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/QuickActionsSection.tsx` | Add `isReadyForGrading` query; update `canPayGrading`; conditionally render the Pay Grading card |

### Result
- Students not marked as ready (like Akhil) will not see the Pay Grading card at all.
- Students marked as ready will see and interact with the card as before.

