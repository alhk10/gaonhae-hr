

## Plan: Fix Age Exception Not Working in Attendance

### Problem
Despite `allowed_class_types: ['Kids']` being correctly saved in the database for students like Ker You Tan and Qi Wei, they still don't appear in the attendance "Add Students" list for Kids class slots.

### Root Cause
The `StudentForAttendance` interface in `classAttendanceService.ts` does not include the `allowed_class_types` field. While the Supabase query selects it and it exists at runtime, TypeScript's type checking may cause issues. More critically, the Supabase client may infer the return type from the table schema and the `.select()` call, but the explicit cast to `StudentForAttendance[]` loses the field's type information, potentially causing subtle issues.

### Changes

#### 1. `src/services/classAttendanceService.ts`
- Add `allowed_class_types?: string[] | null` to the `StudentForAttendance` interface
- This ensures the field is properly typed and accessible in the age filter logic at line 116

#### 2. Verify the filter logic
- The existing filter logic at lines 116-118 is correct in principle — just needs the type fix above
- No changes needed to the filter logic itself

### Why This Should Fix It
The `StudentForAttendance` interface currently has 7 fields but the select query fetches 8 (including `allowed_class_types`). Adding the missing field to the interface ensures TypeScript properly recognizes and preserves the property throughout the data flow.

