

# Plan: Sync Portal Email When Student Email is Updated

## Problem Summary

When a student's email address is updated via the Edit Student dialog, the `students` table is updated but the `student_auth` table retains the old email. This causes a mismatch:

| Field | Value |
|-------|-------|
| Student Email (students table) | `alvinleehk@gmail.com` |
| Portal Email (student_auth table) | `jega1408@gmail.com` |

The student would need to log in with the old email, which is confusing and incorrect.

---

## Solution

When updating a student's email, also update the corresponding `student_auth` record if it exists.

---

## Changes Required

### 1. Add Email Update Function to studentAuthService.ts

Create a new function to update the portal email for a student.

**New Function:**
```typescript
export const updateStudentAuthEmail = async (
  studentId: string,
  newEmail: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('student_auth')
    .update({ email: newEmail.toLowerCase().trim() })
    .eq('student_id', studentId);

  if (error) {
    console.error('Error updating student auth email:', error);
    return false;
  }

  return true;
};
```

---

### 2. Update studentService.ts - updateStudent Function

Modify the `updateStudent()` function to check if the email field changed and sync it to `student_auth`.

**Logic to Add (after successful student update):**
```typescript
// Sync email change to student_auth if applicable
if (studentData.email && oldData?.email !== studentData.email) {
  try {
    const { updateStudentAuthEmail } = await import('./studentAuthService');
    const hasAuth = await import('./studentAuthService').then(m => m.hasPortalAccess(studentId));
    
    if (hasAuth) {
      await updateStudentAuthEmail(studentId, studentData.email);
      logger.info('Synced email change to student_auth', { 
        studentId, 
        oldEmail: oldData?.email, 
        newEmail: studentData.email 
      });
    }
  } catch (syncError) {
    logger.error('Error syncing email to student_auth', syncError);
    // Don't fail the update if sync fails
  }
}
```

---

## Implementation Summary

| Task | File | Type |
|------|------|------|
| Add updateStudentAuthEmail function | `src/services/studentAuthService.ts` | Modify |
| Sync email on student update | `src/services/studentService.ts` | Modify |

---

## How It Works

```text
User Updates Student Email:
1. updateStudent() saves new email to students table
2. Check if email field changed (oldData.email !== newData.email)
3. If changed and student has portal access:
   - Call updateStudentAuthEmail() to sync to student_auth table
4. Both tables now have the same email
```

---

## Edge Cases Handled

- **No portal access**: If student doesn't have a `student_auth` record, skip the sync
- **Sync failure**: If updating `student_auth` fails, log the error but don't fail the main update
- **Same email**: If email didn't change, no sync needed
- **Null to email**: When setting email for first time (null → email), no sync needed since portal access would be set up separately

