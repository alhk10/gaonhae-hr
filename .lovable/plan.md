

## Plan: Use Remaining Entitlement Sessions Before Issuing Ad-Hoc Invoice

### Problem
When a student is added to a class slot, the system checks attendance count vs purchased quota (from invoice items). If exceeded, it creates an overage invoice. But it doesn't account for **unbooked entitlement sessions** — the student may have paid for the term but simply hasn't booked all their sessions yet.

### Revised Logic for `checkAndIssueOverageInvoice`

**File: `src/services/classAttendanceService.ts`**

**Current flow:**
1. Count attended lessons in term
2. Get purchased quota from invoice items
3. If attended > quota → create overage invoice

**New flow:**
1. Count attended lessons in term
2. Get purchased quota from invoice items
3. **Also check `entitlements` table** for the student — sum `sessions_remaining` from active entitlements (`is_active = true`, `valid_to` is null or >= today)
4. If `sessions_remaining > 0` → **consume one session** (decrement `sessions_remaining`, increment `sessions_used`) → no invoice needed
5. If `sessions_remaining === 0` AND attended > quota → create ad-hoc lesson invoice using the correct "Ad-Hoc Lesson" product (`66b8a674-73b9-4460-a87c-809882ba0b13`, $27 base price)

### Additional Fix: Auto-Populate Attendance

**Same file, `autoPopulateAttendanceFromSchedule` function:**

The embedded join `student_class_enrollments(student_id)` should work given the FK exists. However, to be safe and handle edge cases, split into two queries:
1. Query `student_scheduled_classes` for `enrollment_id`s matching the timetable and date
2. Query `student_class_enrollments` for `student_id`s using those enrollment IDs

### Ad-Hoc Invoice Details

- Update `OVERAGE_PRODUCT_ID` to `66b8a674-73b9-4460-a87c-809882ba0b13` (Ad-Hoc Lesson)
- Update price to $27 (with branch `price_rules` override lookup)
- Invoice metadata: `type: 'adhoc'` when no entitlement exists, `type: 'overage'` when quota exceeded after entitlement depletion
- Description: "Ad-Hoc Lesson" instead of "1x Weekend"

### Scope
Single file: `src/services/classAttendanceService.ts`

