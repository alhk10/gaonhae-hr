
# Plan: Add Student Portal Access for Existing Students

## Overview
This feature enables administrators to provision Student Portal access for students who were created before the automatic portal access feature was implemented. Currently, 4 existing students have no portal access (missing `student_auth` records).

---

## Solution Approach

### User Experience
- Add a "Portal Access" section on the Student Details page
- Show current portal status (enabled/disabled)
- Provide an "Enable Portal Access" button for students without access
- Option to revoke portal access if needed

---

## Changes Required

### 1. Extend Student Auth Service

Add helper functions to the existing `studentAuthService.ts`:

**New Functions:**
- `enableStudentPortalAccess(studentId, email)` - Creates student_auth record for existing student
- `hasPortalAccess(studentId)` - Quick check if student has portal access
- `revokePortalAccess(studentId)` - Removes portal access

---

### 2. Create Student Portal Access Manager Component

**New Component:** `src/components/sales/StudentPortalAccessManager.tsx`

**Features:**
- Displays current portal access status with badge
- Shows email linked to portal (if enabled)
- "Enable Portal Access" button (appears only when student has email but no access)
- "Revoke Access" button with confirmation dialog
- Loading states and error handling

**Visual Layout:**
```text
+--------------------------------------------------+
| Portal Access                              [Badge]|
|                                                   |
| Email: student@example.com                        |
| Status: [Enabled] or [Not Enabled]                |
|                                                   |
| [Enable Portal Access] or [Revoke Access]         |
+--------------------------------------------------+
```

---

### 3. Integrate into Student Details Page

**Location:** `src/pages/parties/StudentDetails.tsx`

Add the Portal Access Manager component as a new section:
- Place it after the Contact Information section
- Only visible to Superadmins and Senior Partners
- Fetches portal status on page load

---

### 4. Add Bulk Enable Option (Optional Enhancement)

Add bulk action in StudentManagementList to enable portal access for multiple students at once.

**Location:** `src/components/sales/StudentManagementList.tsx`

New bulk action: "Enable Portal Access" for selected students with valid email addresses.

---

## Technical Summary

| Task | File | Type |
|------|------|------|
| Add portal access helper functions | `src/services/studentAuthService.ts` | Modify |
| Create Portal Access Manager | `src/components/sales/StudentPortalAccessManager.tsx` | Create |
| Integrate into Student Details | `src/pages/parties/StudentDetails.tsx` | Modify |
| Add bulk enable action | `src/components/sales/StudentManagementList.tsx` | Modify |

---

## Implementation Details

### Service Layer Additions

```typescript
// New functions in studentAuthService.ts

export const hasPortalAccess = async (studentId: string): Promise<boolean> => {
  const auth = await getStudentAuthByStudentId(studentId);
  return auth !== null;
};

export const enablePortalAccess = async (
  studentId: string, 
  email: string
): Promise<{ success: boolean; error?: string }> => {
  // Check if already has access
  const existing = await getStudentAuthByStudentId(studentId);
  if (existing) {
    return { success: false, error: 'Portal access already enabled' };
  }
  
  // Check if email is already used by another student
  const emailInUse = await getStudentAuthByEmail(email);
  if (emailInUse) {
    return { success: false, error: 'Email already linked to another student' };
  }
  
  // Create the auth record
  const result = await createStudentAuth(studentId, email);
  return result ? { success: true } : { success: false, error: 'Failed to create portal access' };
};

export const revokePortalAccess = async (studentId: string): Promise<boolean> => {
  return deleteStudentAuth(studentId);
};
```

### Component Integration

The `StudentPortalAccessManager` will:
1. Query `student_auth` table on mount to check current status
2. Display status with appropriate badge (green for enabled, gray for disabled)
3. Show action button based on status
4. Handle enable/revoke with proper feedback via toast notifications
5. Require student email to be set before enabling portal access

---

## Validation Rules

1. **Email Required:** Cannot enable portal access without a valid email
2. **Unique Email:** Each email can only be linked to one student
3. **Active Student:** Portal access should typically only be enabled for active students
4. **Permission Check:** Only Superadmins and Senior Partners can manage portal access

---

## Edge Cases Handled

- Student without email: Show message "Add email to enable portal access"
- Email already in use: Show error with clear message
- Portal already enabled: Disable the enable button, show current status
- Network errors: Proper error handling with retry option
