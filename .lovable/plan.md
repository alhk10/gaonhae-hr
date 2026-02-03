
# Plan: Robust Portal Email Synchronization

## Problem Analysis

### Root Cause Identified
The email synchronization between `students` and `student_auth` tables is **failing silently** because:

1. **Single-trigger logic**: The sync only runs when detecting an email change in the *current* update operation
2. **Stale comparison**: If a previous sync failed, subsequent saves (with the same email) don't re-trigger the sync
3. **No mismatch detection**: The code doesn't check if `students.email` differs from `student_auth.email`

### Current State (from database)
```
students.email = alvinleehk@gmail.com
student_auth.email = sangeonsong@gmail.com (OUT OF SYNC!)
```

When saving with email = `alvinleehk@gmail.com`, the comparison is:
- `oldData.email` = `alvinleehk@gmail.com` (already updated)
- `newEmail` = `alvinleehk@gmail.com` (same)
- **Result**: No sync triggered because they match!

---

## Solution Design

### Approach: Mismatch-Based Sync Instead of Change-Based

| Current Logic | New Logic |
|---------------|-----------|
| Sync if `oldEmail !== newEmail` | Sync if `student_auth.email !== newEmail` |
| Runs only on email change | Runs whenever there's a mismatch |
| Single attempt | Automatic correction on every save |

### Implementation Changes

| File | Change |
|------|--------|
| `src/services/studentService.ts` | Always check for student_auth mismatch during update |
| `src/services/studentAuthService.ts` | Add forced sync function with verification |

---

## Technical Details

### 1. studentService.ts Changes

Replace the change-based sync with mismatch-based sync:

```typescript
// After database update succeeds...

// Sync email to student_auth if applicable
// Always check for mismatch, not just when email changes
const newEmail = studentData.email?.toLowerCase().trim();
if (newEmail) {
  try {
    const { hasPortalAccess, syncStudentAuthEmail } = await import('./studentAuthService');
    const hasAuth = await hasPortalAccess(studentId);
    
    if (hasAuth) {
      // This function will:
      // 1. Check if student_auth.email matches students.email
      // 2. If not, update student_auth
      // 3. Also update Supabase Auth if auth_user_id exists
      await syncStudentAuthEmail(studentId, newEmail);
    }
  } catch (syncError) {
    logger.error('Error syncing email to student_auth', syncError);
  }
}
```

### 2. New syncStudentAuthEmail Function

Add a robust sync function that always checks and corrects mismatches:

```typescript
/**
 * Sync student email to student_auth table
 * Always checks for mismatch and updates if needed
 */
export const syncStudentAuthEmail = async (
  studentId: string,
  newEmail: string
): Promise<{ synced: boolean; reason: string }> => {
  const normalizedEmail = newEmail.toLowerCase().trim();
  
  // Get current student_auth record
  const existing = await getStudentAuthByStudentId(studentId);
  if (!existing) {
    return { synced: false, reason: 'No student_auth record exists' };
  }
  
  const currentAuthEmail = existing.email?.toLowerCase().trim() || '';
  
  // Check if already in sync
  if (currentAuthEmail === normalizedEmail) {
    return { synced: true, reason: 'Already in sync' };
  }
  
  // Perform the update
  const { error } = await supabase
    .from('student_auth')
    .update({ 
      email: normalizedEmail,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId);

  if (error) {
    logger.error('Failed to sync student_auth email', { error, studentId });
    return { synced: false, reason: error.message };
  }
  
  logger.info('student_auth email synced', { 
    studentId, 
    oldEmail: currentAuthEmail, 
    newEmail: normalizedEmail 
  });
  
  // If there's a Supabase Auth account, update that too
  if (existing.auth_user_id) {
    await updateSupabaseAuthEmail(existing.auth_user_id, normalizedEmail);
  }
  
  return { synced: true, reason: 'Email updated' };
};
```

### 3. Verification Helper

Add a helper to verify sync status:

```typescript
/**
 * Check if student email is synced with student_auth
 */
export const isEmailInSync = async (studentId: string): Promise<boolean> => {
  const [student, studentAuth] = await Promise.all([
    supabase.from('students').select('email').eq('id', studentId).single(),
    getStudentAuthByStudentId(studentId)
  ]);
  
  if (!student.data || !studentAuth) return true; // No auth to sync
  
  const studentEmail = student.data.email?.toLowerCase().trim() || '';
  const authEmail = studentAuth.email?.toLowerCase().trim() || '';
  
  return studentEmail === authEmail;
};
```

---

## Key Improvements

| Before | After |
|--------|-------|
| Sync only on email change | Sync whenever mismatch exists |
| Silent failures ignored | Explicit sync result logged |
| No retry mechanism | Auto-corrects on every save |
| RLS might block silently | Error messages logged |

---

## Verification Steps

After implementation:
1. Open student with mismatched emails
2. Click "Edit Student" then save (without changing email)
3. Verify Portal Email now matches Student Email
4. Check browser console for sync confirmation

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/studentService.ts` | Replace change-based sync with mismatch-based sync |
| `src/services/studentAuthService.ts` | Add `syncStudentAuthEmail` function with verification |
