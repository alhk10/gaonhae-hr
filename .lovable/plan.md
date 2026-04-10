

## Plan: Add Age Exception per Student for Class Type Access

### Problem
Students promoted from Little Gaonhae to Kids class are blocked by the Kids class age restriction (min_age: 6). If a student is younger than 6, the system hides Kids class slots from the schedule selector, blocks invoice product selection, and prevents attendance marking.

### Solution
Add an `allowed_class_types` column to the `students` table that stores an array of class types a student is explicitly granted access to, bypassing age filtering. Admins can set this from the student profile. All age-filtering code will check this override before applying age restrictions.

### Changes

#### 1. Database Migration
- Add `allowed_class_types text[]` column to `students` table (nullable, default null)
- When set, these class types bypass both branch-level and timetable-level age checks for the student

#### 2. `ClassScheduleSelector.tsx`
- Accept an optional `studentAllowedClassTypes` prop
- In the `eligibleClasses` filter, if a class's `class_type` is in the student's allowed list, skip the age check for that class

#### 3. `InvoiceDialog.tsx` (Create Invoice)
- Fetch the student's `allowed_class_types` when a student is selected
- In `isProductAvailableForAge`, if the product's allowed class types overlap with the student's exception list, skip the age check
- Pass `studentAllowedClassTypes` to `ClassScheduleSelector`

#### 4. `StudentHeader.tsx` or `EditStudentDialog.tsx`
- Add a multi-select field for "Class Type Exceptions" in the student profile/edit form
- Populated from available class types in the branch
- Shows which class types the student can access regardless of age

#### 5. Attendance components
- Where class attendance filters by age, also check the student's `allowed_class_types` to permit access

### Technical Details
- Column: `students.allowed_class_types text[]` — nullable, null means no exceptions (normal age filtering applies)
- The `ClassScheduleSelector` age filter (lines 83-111) will add: if `studentAllowedClassTypes?.includes(cls.class_type)` then skip age checks for that class
- The `isProductAvailableForAge` function (line 152-163 in InvoiceDialog) will similarly bypass when the product's class types overlap with student exceptions
- No impact on existing students — null means current behavior is preserved

