
# Plan: Fix Student Portal Access for Existing Students

## Problem Summary

Students with "enabled" portal access still cannot access the Student Portal because:

1. **No Supabase Auth account is created** - When enabling portal access, we only create a `student_auth` record, but no actual authentication credentials exist in Supabase Auth
2. **Missing auth_user_id link** - All 4 students in the database have `auth_user_id: null`, so the login flow cannot identify them as students

**Current Database State:**
```
student_auth table:
- rbondarenko1098@gmail.com: auth_user_id = null
- sangeonsong@gmail.com: auth_user_id = null  
- ngmeilin2@gmail.com: auth_user_id = null
- jega1408@gmail.com: auth_user_id = null
```

---

## Solution

When enabling portal access for a student, we need to:
1. Create a Supabase Auth account for the student (using their email)
2. Link the auth account's ID to the `student_auth.auth_user_id` field
3. Send a password reset email so the student can set their password

This mirrors how employee accounts are provisioned via `bulkUserCreationService.ts`.

---

## Changes Required

### 1. Create Student Auth Provisioning Service

**New File:** `src/services/studentAuthProvisioningService.ts`

This service will:
- Create Supabase Auth account for students using standard signup
- Generate secure temporary password
- Link the auth_user_id to the student_auth record
- Send password reset email for student to set their own password

### 2. Update studentAuthService.ts

Modify `enablePortalAccess` function to:
- Create the auth account via the new provisioning service
- Link the auth_user_id when creating the student_auth record
- Handle cases where auth account already exists (lookup and link)

### 3. Update StudentPortalAccessManager Component

Add visual feedback for provisioning status:
- Show if auth account exists but not linked
- Add "Create Account" vs "Enable Access" distinction
- Display password reset email sent confirmation

### 4. Add Fallback Email Lookup in Auth Session Service

Update `getStudentByAuthId` in `authSessionService.ts` to also check by email if `auth_user_id` lookup fails. This provides a fallback during the transition period.

---

## Technical Details

### New Provisioning Flow

```text
Enable Portal Access:
1. Create student_auth record (student_id, email)
2. Create Supabase Auth account (email, temp password)
3. Update student_auth with auth_user_id
4. Send password reset email to student
5. Student clicks link → sets password → can login
```

### Key Functions

**createStudentAuthAccount (new):**
```typescript
export const createStudentAuthAccount = async (
  studentId: string,
  email: string,
  name: string
): Promise<{ success: boolean; authUserId?: string; error?: string }> => {
  // Generate temp password
  const tempPassword = generateSecurePassword();
  
  // Create auth account
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password: tempPassword,
    options: {
      emailRedirectTo: window.location.origin,
      data: { name, student_id: studentId }
    }
  });
  
  if (error) return { success: false, error: error.message };
  
  // Send password reset email
  await supabase.auth.resetPasswordForEmail(email);
  
  return { success: true, authUserId: data.user?.id };
};
```

### Updated enablePortalAccess:
```typescript
export const enablePortalAccess = async (
  studentId: string,
  email: string,
  studentName: string
): Promise<{ success: boolean; error?: string }> => {
  // 1. Create auth account
  const authResult = await createStudentAuthAccount(studentId, email, studentName);
  
  // 2. Create or update student_auth record with auth_user_id
  const { data, error } = await supabase
    .from('student_auth')
    .upsert({
      student_id: studentId,
      email: email.toLowerCase(),
      auth_user_id: authResult.authUserId
    }, { onConflict: 'student_id' })
    .select()
    .single();
  
  return data ? { success: true } : { success: false, error };
};
```

---

## Implementation Summary

| Task | File | Type |
|------|------|------|
| Create provisioning service | `src/services/studentAuthProvisioningService.ts` | Create |
| Update portal access functions | `src/services/studentAuthService.ts` | Modify |
| Add email fallback lookup | `src/services/authSessionService.ts` | Modify |
| Update manager UI | `src/components/sales/StudentPortalAccessManager.tsx` | Modify |

---

## User Experience After Fix

1. **Admin enables portal access** → System creates auth account + sends password reset email
2. **Student receives email** → Clicks link to set password
3. **Student logs in** → System recognizes them as student → Shows Student Portal

---

## Edge Cases Handled

- **Auth account already exists**: Look up existing user ID and link to student_auth
- **Email in use by employee**: Show error - email cannot be used for both
- **Password reset email fails**: Log warning but still complete the account creation
- **Rate limiting**: Add delays between bulk provisioning operations
