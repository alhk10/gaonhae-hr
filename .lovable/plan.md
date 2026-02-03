
# Plan: Multi-Student Access for Parents

## Overview

Parents with multiple children enrolled under the same email address need to access all their students' data with a single login. Currently, the system links one email to one student via the `student_auth` table. This plan extends the architecture to support one-to-many parent-to-student relationships.

## Current Architecture

```text
[student_auth]
- id (PK)
- student_id (FK → students, UNIQUE) ← Problem: 1:1 relationship
- auth_user_id (FK → auth.users)
- email
```

The `student_id` column has an implicit 1:1 relationship. When a parent logs in, the system finds the first matching `student_auth` record and shows only that student's dashboard.

## Solution Design

### 1. Database Changes

**Modify `student_auth` table to support multiple students per email:**

The current structure already allows multiple records with the same email (no unique constraint on email column), but the authentication flow only retrieves a single record.

| Current Behavior | New Behavior |
|------------------|--------------|
| Query returns single student | Query returns all students linked to email |
| Dashboard shows one student | Dashboard shows student selector if > 1 |
| No switching mechanism | Student switcher component for parents |

### 2. New Components

| Component | Purpose |
|-----------|---------|
| `StudentSwitcher` | Dropdown/card selector when parent has multiple children |
| Modified `StudentDashboard` | Accept selected student context |
| Session context update | Store `selectedStudentId` in context/state |

### 3. Authentication Flow Changes

```text
Current Flow:
1. Login → getStudentByAuthId() → returns FIRST match → single student dashboard

New Flow:
1. Login → getStudentsByAuthId() → returns ALL matches
2. If count = 1 → show single student dashboard (unchanged)
3. If count > 1 → show student selector → user picks child → show their dashboard
4. Store selection in session for navigation persistence
```

### 4. RLS Policy Updates

Current RLS allows a user to see data where their email matches the student record OR auth_user_id matches. This naturally extends to multiple students - the parent will see data for ALL students that share their email.

**No RLS changes needed** - existing policies already support multiple students per email.

## Implementation Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/services/authSessionService.ts` | Modify | Return array of linked students instead of single |
| `src/contexts/AuthContext.tsx` | Modify | Add `linkedStudents` and `selectedStudentId` to context |
| `src/components/dashboard/StudentSwitcher.tsx` | Create | UI component for switching between children |
| `src/components/dashboard/StudentDashboard.tsx` | Modify | Accept selected student from switcher |
| `src/pages/Index.tsx` | Modify | Render switcher when multiple students exist |
| `src/services/studentAuthService.ts` | Modify | Add `getStudentsByEmail` to return all linked students |

---

## Technical Details

### authSessionService Changes

Update `getStudentByAuthId` to return all matching students:

```typescript
// Before: Returns single student
const getStudentByAuthId = async (authUserId, email): Promise<Student | null>

// After: Returns all linked students
const getStudentsByAuthId = async (authUserId, email): Promise<Student[]>
```

### AuthContext Extension

Add new properties to track multiple students:

```typescript
interface AuthContextType {
  // Existing properties...
  linkedStudents: StudentBasic[];     // All students linked to this parent
  selectedStudentId: string | null;   // Currently viewed student
  setSelectedStudent: (id: string) => void;
}
```

### StudentSwitcher Component

New component rendered at top of student dashboard when `linkedStudents.length > 1`:

- Shows currently selected child's name
- Dropdown to switch between children
- Persists selection in session storage for page refreshes
- Updates dashboard data when switching

### Dashboard Rendering Logic

```text
if (userType === 'student') {
  if (linkedStudents.length > 1) {
    return <StudentSwitcher /> + <StudentDashboard studentId={selectedStudentId} />
  } else {
    return <StudentDashboard studentId={linkedStudents[0].id} />
  }
}
```

### Admin Workflow for Linking Students

When registering siblings:
1. Use same parent email for multiple students
2. Each student gets a separate `student_auth` record with same email
3. Same `auth_user_id` links all records after first login

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Parent has 1 child | No switcher shown, behaves as before |
| Parent has multiple children | Switcher shown, defaults to first alphabetically |
| New sibling added | Automatically appears in switcher on next login |
| Child removed/archived | Filtered from switcher, auto-switch to next child |
| Page refresh | Selection persisted in sessionStorage |

---

## Impact Assessment

| Area | Impact |
|------|--------|
| Existing single-student logins | No change - backward compatible |
| Authentication performance | Minimal - one extra query to count students |
| RLS policies | None - already supports multiple students per email |
| Admin portal | Minor enhancement to show sibling links |
