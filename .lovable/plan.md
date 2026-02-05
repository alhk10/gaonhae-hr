
# Lesson Slot Attendance Dialog with Automatic Overage Invoicing

## Overview
Add functionality to the Weekly Timetable so that clicking on a lesson slot opens a dialog to manage student attendance for that specific class. The dialog allows adding/removing students and marking attendance via checkboxes. Additionally, when a student exceeds their purchased lesson quota for a term, the system will automatically generate an invoice for "1x Weekend" product.

## Current Architecture Analysis

### Data Flow
- **Weekly Timetable**: Displays slots from `branch_timetables` merged with `student_scheduled_classes` data
- **Students**: Stored in `students` table with `branch_id` for association
- **Class Attendance**: Tracked in `class_attendance` table (`student_id`, `class_date`, `branch_id`, `timetable_id`, `status`)
- **Invoice Items**: Contain `metadata.term_id` to link purchases to terms; `metadata.selected_class_slots` tracks which slots were purchased
- **Products**: "1x Weekend" product exists (id: `7886c756-580e-4966-ba6f-e4fae6c6d4b5`, SKU: `1XWE`, price: $26.00)

### Term Lesson Tracking
- Students purchase lesson packages (e.g., "1x Week", "Unlimited") linked to a term via `invoice_items.metadata.term_id`
- Maximum lessons per term = `product.lessons_per_week` x `term.total_weeks`
- Attendance is tracked in `class_attendance` table

## Implementation Plan

### 1. Create SlotAttendanceDialog Component
**File:** `src/components/dashboard/SlotAttendanceDialog.tsx`

A mobile-friendly dialog component that:
- Receives slot info: `branchId`, `timetableId`, `date`, `startTime`, `endTime`, `classType`
- Fetches branch students matching this class type (filtered by belt levels and age)
- Shows current attendees with attendance checkboxes
- Allows adding students from branch roster
- Allows removing students from the slot
- Saves attendance records to `class_attendance` table

**Dialog Features:**
- Header with slot date/time and class type
- Two sections:
  1. **Current Class Roster**: List of students scheduled for this slot with checkboxes for attended/absent
  2. **Add Students**: Searchable list of branch students not yet in this slot
- Action buttons: Save attendance, Add/Remove students
- Mobile-responsive layout with scroll areas

### 2. Create Attendance Tracking Service Functions
**File:** `src/services/classAttendanceService.ts` (new file)

Functions needed:
```typescript
// Get attendance records for a specific slot
getSlotAttendance(branchId, timetableId, date)

// Record attendance (attended/absent)
recordAttendance(studentId, branchId, timetableId, date, status)

// Add student to a class slot
addStudentToSlot(studentId, branchId, timetableId, date)

// Remove student from a class slot
removeStudentFromSlot(attendanceId)

// Count attended lessons for a student in a term
countTermAttendance(studentId, termId)

// Get student's purchased lesson quota for a term
getStudentTermQuota(studentId, termId)

// Check if student exceeds quota and issue invoice if needed
checkAndIssueOverageInvoice(studentId, branchId, termId)
```

### 3. Implement Overage Invoice Logic
When marking attendance, the system will:
1. Count total attended lessons for the student in the current term
2. Get the student's purchased lesson quota from invoice_items with matching `term_id`
3. If `attended_count > purchased_quota`:
   - Check if an overage invoice already exists for this student/term
   - If not, create a new invoice with "1x Weekend" product (qty: 1)
   - This overrides the normal "one term class invoice" rule

**Invoice Creation Logic:**
```text
1. Student attends class
2. Count all class_attendance records WHERE student_id = X AND date within term dates
3. Get purchased sessions from invoice_items with metadata.term_id
4. If attended > purchased AND no existing overage invoice:
   - Create invoice with 1x Weekend product
   - Mark in metadata as { type: 'overage', term_id: X }
```

### 4. Update BranchWeeklyTimetable Component
**File:** `src/components/dashboard/BranchWeeklyTimetable.tsx`

Changes:
- Add `onClick` handler to lesson slot cards (not grading slots)
- Track selected slot state
- Open `SlotAttendanceDialog` when a slot is clicked
- Pass slot details to the dialog

### 5. Database Queries Summary

**Getting slot students:**
```sql
SELECT * FROM class_attendance 
WHERE branch_id = X AND timetable_id = Y AND class_date = Z
```

**Getting branch students for class type:**
```sql
SELECT s.* FROM students s
WHERE s.branch_id = X 
  AND s.status = 'active'
  AND (belt/age filters based on timetable slot criteria)
```

**Counting term attendance:**
```sql
SELECT COUNT(*) FROM class_attendance
WHERE student_id = X 
  AND class_date BETWEEN term_start AND term_end
  AND status = 'present'
```

**Getting purchased quota:**
```sql
SELECT ii.quantity, p.lessons_per_week
FROM invoice_items ii
JOIN products p ON ii.product_id = p.id
JOIN invoices i ON ii.invoice_id = i.id
WHERE i.student_id = X
  AND ii.metadata->>'term_id' = Y
  AND p.is_lesson = true
```

## Technical Details

### Component Props
```typescript
interface SlotAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  slot: {
    timetableId: string;
    date: string; // YYYY-MM-DD
    startTime: string;
    endTime: string;
    classType: string;
    beltLevels?: string[];
    ageFrom?: number;
    ageTo?: number;
  };
}
```

### Attendance Record Structure
```typescript
interface ClassAttendanceRecord {
  id: string;
  student_id: string;
  class_date: string;
  branch_id: string;
  timetable_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  attendance_method: string;
  recorded_by: string;
  notes?: string;
}
```

### Mobile-Friendly UI
- Full-width dialog on mobile (max-w-lg on desktop)
- Scrollable student list with virtual scroll for large rosters
- Touch-friendly checkboxes with adequate tap targets
- Clear visual distinction between attended (green) and absent (red) states

## Files to Create
1. `src/components/dashboard/SlotAttendanceDialog.tsx`
2. `src/services/classAttendanceService.ts`

## Files to Modify
1. `src/components/dashboard/BranchWeeklyTimetable.tsx`
   - Add click handler to lesson slots
   - Add state for selected slot
   - Render SlotAttendanceDialog

## Edge Cases Handled
- Multiple lesson products per term (sum all quotas)
- Students with no purchased lessons (quota = 0, first attendance triggers overage)
- Grading slots excluded from click-to-attend (only regular class slots)
- Duplicate overage invoice prevention (check existing invoices with overage metadata)
- Term boundary detection for attendance counting
