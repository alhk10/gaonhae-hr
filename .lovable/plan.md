
# Plan: Fix Student Login and Password Reset Issues

## Problem Summary

Two issues are preventing the student from logging in:

| Issue | Description |
|-------|-------------|
| **Missing Auth Account** | The `student_auth` record has `auth_user_id: null`, meaning no Supabase Auth account exists for `alvinleehk@gmail.com` |
| **Missing Password Reset Route** | The app redirects to `/auth/reset-password` which doesn't exist (404) |

---

## Solution Overview

1. Create a password reset page to handle the reset flow
2. Add a route for `/auth/reset-password`
3. Use the Portal Access Manager UI to properly create the auth account for the student

---

## Part 1: Create Password Reset Page

Create a new page that handles the password reset token from Supabase and allows users to set a new password.

**New File:** `src/pages/auth/ResetPassword.tsx`

```typescript
// Password reset page that:
// 1. Detects the access token from Supabase redirect
// 2. Shows a form to enter new password
// 3. Updates the password via supabase.auth.updateUser()
// 4. Redirects to login on success
```

---

## Part 2: Add Route in App.tsx

Add the missing route for password reset.

```text
<Route 
  path="/auth/reset-password" 
  element={<ResetPassword />} 
/>
```

---

## Part 3: Create Auth Account for Student

The existing student's `student_auth` record has no auth account. The system needs to:

1. Navigate to the student's details page
2. Use the "Create Login Account" button in the Portal Access section
3. This will create the Supabase Auth user and send a password reset email

Alternatively, run a SQL command to check if the auth user exists and link it if found:

```sql
-- Check if auth user exists for this email
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'alvinleehk@gmail.com';
```

---

## Implementation Summary

| Task | File | Type |
|------|------|------|
| Create password reset page | `src/pages/auth/ResetPassword.tsx` | Create |
| Add reset password route | `src/App.tsx` | Modify |
| (Optional) Create auth folder | `src/pages/auth/` | Create directory |

---

## How The Password Reset Flow Will Work

```text
1. User clicks "Forgot Password" on login page
2. Password reset email sent with link to /auth/reset-password
3. User clicks link, redirected to ResetPassword page
4. Supabase auto-validates token via URL hash
5. User enters new password
6. Password updated, user redirected to login
```

---

## For The Current Student (alvinleehk@gmail.com)

After implementing the above, you'll need to:

1. **Go to the student's profile page** → Portal Access section
2. **Click "Create Login Account"** to provision the Supabase Auth user
3. **Student will receive a password reset email** with a working link
4. **Student can then set their password** and log in

---

## Technical Details

**Password Reset Page Component:**
- Uses `supabase.auth.onAuthStateChange` to detect `PASSWORD_RECOVERY` event
- Shows password input form with confirmation
- Validates password strength (min 8 characters recommended)
- Calls `supabase.auth.updateUser({ password })` to set new password
- Displays success message and redirects to login

**Security Considerations:**
- Password reset tokens are time-limited by Supabase
- Invalid/expired tokens will show appropriate error messages
- No route guards needed (public page for password recovery)
