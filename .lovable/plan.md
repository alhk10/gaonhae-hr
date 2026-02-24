

## Filter Grading Slots by Student Age (min_age / max_age)

### Problem
Grading slots have optional `min_age` and `max_age` fields, but the dropdown in both `PaySchoolFeesDialog` and `PayGradingDialog` (and the dashboard queries) do not filter by the student's age. Students like Abby see slots they are not eligible for.

### Solution
Add age-based filtering to the grading slot queries in three locations where slots are fetched for students. The student's `date_of_birth` is already available in the student object. We calculate the student's age and exclude slots where they fall outside the `min_age`/`max_age` range.

### Changes

#### 1. `src/services/gradingService.ts` - Add `min_age` and `max_age` to the `GradingSlot` interface

Add the two optional fields so TypeScript recognizes them:
```typescript
min_age?: number | null;
max_age?: number | null;
```

#### 2. `src/components/dashboard/QuickActionsSection.tsx` - Filter by age

After the belt-level filter (around line 113), add an age filter using the student's `date_of_birth`:
```typescript
// Calculate student age
const studentDob = student.date_of_birth;
if (studentDob) {
  const today = new Date();
  const dob = new Date(studentDob);
  const ageInYears = (today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  return beltFiltered.filter(slot => {
    const s = slot as any;
    if (s.min_age != null && ageInYears < s.min_age) return false;
    if (s.max_age != null && ageInYears > s.max_age) return false;
    return true;
  });
}
return beltFiltered;
```

#### 3. `src/components/dashboard/StudentDashboard.tsx` - Filter by age

The grading slots query (line 163) uses `getGradingSlots` but does not filter by age. Add an age filter after fetching, using `student.date_of_birth`:
```typescript
// After fetching slots, filter by age
if (student.date_of_birth) {
  const today = new Date();
  const dob = new Date(student.date_of_birth);
  const ageInYears = (today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return slots.filter(slot => {
    if (slot.min_age != null && ageInYears < slot.min_age) return false;
    if (slot.max_age != null && ageInYears > slot.max_age) return false;
    return true;
  });
}
return slots;
```

### Files to Modify

| File | Change |
|---|---|
| `src/services/gradingService.ts` | Add `min_age` and `max_age` to `GradingSlot` interface |
| `src/components/dashboard/QuickActionsSection.tsx` | Add age filter after belt-level filter |
| `src/components/dashboard/StudentDashboard.tsx` | Add age filter to grading slots query |

### Result
- Students like Abby who are outside the age range will no longer see ineligible grading slots in the dropdown.
- Slots without age restrictions (null min/max) remain visible to all students.
- The filtering applies consistently across the Pay School Fees dialog, Pay Grading dialog, and the Quick Actions card.

