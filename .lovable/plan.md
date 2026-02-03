
# Plan: Fix Student Dashboard Display for alvinleehk@gmail.com

## Problem Summary

When logging in with `alvinleehk@gmail.com` (a student account), the system displays an **Employee Dashboard** instead of the **Student Dashboard**.

## Root Cause Analysis

The investigation revealed a **RLS (Row Level Security) policy issue** on the `student_auth` table:

| Finding | Details |
|---------|---------|
| **Database State** | `student_auth.auth_user_id` is NULL for this student |
| **Auth User Exists** | User `b200a7b2-e4a1-4943-834f-009ac172c8d3` exists in `auth.users` |
| **RLS Policy** | Current policy: `auth_user_id = auth.uid()` blocks SELECT when `auth_user_id` is NULL |
| **Network Evidence** | Both queries to `student_auth` return empty arrays `[]` due to RLS blocking |

### Current Flow (Broken)

```text
1. User logs in with alvinleehk@gmail.com
2. authSessionService calls getStudentByAuthId()
3. Query: student_auth WHERE auth_user_id = 'b200a7b2...'
4. RLS blocks because auth_user_id is NULL → Returns []
5. Fallback: Query student_auth WHERE email = 'alvinleehk@gmail.com'
6. RLS still blocks (same policy) → Returns []
7. System concludes user is NOT a student
8. Falls back to employee logic → Shows EmployeeDashboard
```

---

## Solution

### Part 1: Fix RLS Policy on student_auth Table

Create a new RLS policy that allows users to read their own `student_auth` record by matching their **email** OR their **auth_user_id**.

**SQL Migration:**

```sql
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Students can view their own auth" ON public.student_auth;

-- Create new inclusive policy that allows email OR auth_user_id matching
CREATE POLICY "Students can view their own auth"
ON public.student_auth
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid() 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
```

### Part 2: Fix Existing Record

After policy update, link the existing auth user to the `student_auth` record:

```sql
-- Link the auth_user_id for alvinleehk@gmail.com
UPDATE public.student_auth 
SET auth_user_id = 'b200a7b2-e4a1-4943-834f-009ac172c8d3'
WHERE email = 'alvinleehk@gmail.com' AND auth_user_id IS NULL;
```

---

## Expected Result After Fix

```text
1. User logs in with alvinleehk@gmail.com
2. authSessionService calls getStudentByAuthId()
3. Query succeeds because email matches (new RLS policy)
4. Returns student data, userType set to 'student'
5. Auto-links auth_user_id for future logins
6. Index.tsx renders StudentDashboard (correct!)
```

---

## Implementation Summary

| Task | File | Type |
|------|------|------|
| Update RLS policy for student_auth | SQL Migration | Create |
| Link auth_user_id for alvinleehk@gmail.com | SQL Migration | Create |

---

## Technical Details

### Why Email-Based RLS is Safe

The policy uses `(SELECT email FROM auth.users WHERE id = auth.uid())` which:
- Only returns the authenticated user's email from the auth system
- Cannot be spoofed by client-side code
- Ensures users can only access their own `student_auth` record

### Auto-Linking Mechanism

The existing code in `authSessionService.ts` (lines 351-368) already handles auto-linking the `auth_user_id` once the record is found. After fixing the RLS policy, this code will work as intended:

```typescript
// If we found a match by email but auth_user_id is missing, update it
if (!emailData.auth_user_id && authUserId) {
  supabase
    .from('student_auth')
    .update({ auth_user_id: authUserId })
    .eq('student_id', student.id)
    .then(/* ... */);
}
```

This means future logins will use the faster `auth_user_id` lookup path.
