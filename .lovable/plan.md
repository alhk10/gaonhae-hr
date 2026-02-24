

## Embed Term Payment Within PayGradingDialog (Same Dialog Flow)

### Overview
Instead of opening a separate `PaySchoolFeesDialog` after grading registration, embed the term payment fields directly inside `PayGradingDialog` when the "Also pay for the next term?" checkbox is checked. The summary card and total will combine both fees, and a single proof of payment covers both invoices.

### Changes

#### 1. `src/components/dashboard/PayGradingDialog.tsx`

**New props:**
- Add `previousEnrollment` (optional) to pre-fill the package selection
- Keep `availableTerms` (already exists)
- Add `student.date_of_birth` to the student interface for age-based class filtering
- Remove `onPaySchoolFees` prop (no longer needed)

**New state variables:**
- `selectedTermId`, `isRemainingWeeks`, `selectedProductId`, `selectedClassSlots[]` -- mirrors PaySchoolFeesDialog

**New queries (only fetched when `alsoPayTermFees` is true):**
- `student-paid-terms` -- to filter out already-paid terms (same logic as PaySchoolFeesDialog)
- `class-products-with-pricing` -- to fetch class packages for the branch
- Compute `unpaidTerms`, `termWeeks`, `calculatedPrice`, `combinedTotal`

**UI changes when checkbox is checked:**
When `alsoPayTermFees` is true, expand the card to show:
- Term selection dropdown (with remaining weeks option)
- Package selection dropdown
- ClassScheduleSelector component
- Updated summary card showing both grading fee + term fee + combined total

The expanded section appears directly below the checkbox card, before the payment section.

**Summary card update:**
When term fees are included, the summary shows:
```
Grading Fee              $70.00
School Fees (10 weeks)   $250.00
─────────────────────────────
Total                    $320.00
```

**Mutation update:**
When `alsoPayTermFees` is true and term fields are filled:
1. Create grading invoice + payment (existing logic)
2. Create term invoice + payment (same proof file, same pattern as PaySchoolFeesDialog)
3. Create enrollment record + scheduled classes
4. Invalidate all relevant query keys

**Success step update:**
- Show combined success message: "Grading registration and term enrollment confirmed!"
- Remove the "Continue to Term Payment" button logic; just show "Done"

**Button text:**
- When term fees included: "Create Invoices & Pay Both"
- When grading only: "Create Invoice & Pay"
- Disable button if term checkbox is checked but term/product not selected

#### 2. `src/components/dashboard/StudentDashboard.tsx`

**Update PayGradingDialog instances (2 places):**
- Remove `onPaySchoolFees` callback prop
- Add `previousEnrollment` prop
- Add `date_of_birth` to the student object passed

### Technical Details

**Imports to add to PayGradingDialog:**
```typescript
import { Term, calculateTeachingWeeks, calculateRemainingTeachingWeeks, isInsideTerm } from '@/services/termCalendarService';
import { createEnrollment, createScheduledClass } from '@/services/classEnrollmentService';
import ClassScheduleSelector from './ClassScheduleSelector';
import { differenceInYears, differenceInMonths } from 'date-fns';
```

**Combined mutation flow (pseudocode):**
```
1. Create grading invoice (existing)
2. Upload proof of payment (existing)
3. Create grading payment (existing)
4. IF alsoPayTermFees:
   a. Create term invoice with term metadata
   b. Create term payment (reuse same proof URL)
   c. Create enrollment record
   d. Create scheduled classes from selected slots
5. Return { gradingOnly: false } or { gradingOnly: true }
```

**Expanded term section UI (when checkbox is checked):**
```
[x] Also pay for the next term?

  Select Term *
  [Dropdown: Term 3 2026 (01 Jul - 18 Sep 2026)]

  Package *
  [Dropdown: 2x/week - $30/week]

  Select Your Classes
  [ClassScheduleSelector component]
```

### Files to Modify

| File | Change |
|---|---|
| `src/components/dashboard/PayGradingDialog.tsx` | Embed term payment fields, queries, and combined mutation logic |
| `src/components/dashboard/StudentDashboard.tsx` | Update props for both PayGradingDialog instances (remove onPaySchoolFees, add previousEnrollment + date_of_birth) |

