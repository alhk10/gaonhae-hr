
# Plan: Enable Multi-Student Portal Access for Siblings/Family

## Current State

### Database Constraints
| Table | Constraint | Current | Issue |
|-------|------------|---------|-------|
| `students` | `email` | No unique constraint | Can share emails (siblings work) |
| `student_auth` | `student_auth_email_key` | **UNIQUE constraint** | Blocks siblings from sharing portal email |
| `student_auth` | `student_auth_student_id_key` | UNIQUE per student | Correct - 1 portal record per student |

### Current Data Conflict
The database already has siblings sharing the same `students.email`:
- Student A (Akhil Vel): `alvinleehk@gmail.com`
- Student B (Mingyu Song): `alvinleehk@gmail.com`

But only ONE can have a `student_auth` record with that email due to the unique constraint.

### Architecture Already Supports Multi-Student
The codebase has multi-student login infrastructure:
- `getStudentsByEmail()` - fetches ALL students with the same email
- `linkedStudents` - AuthContext tracks multiple students
- `StudentSwitcher` - UI to switch between children

The ONLY blocker is the database constraint.

---

## Solution Design

### Approach: Remove Email Unique Constraint + Update Logic

```text
+------------------+       +------------------+       +------------------+
|     Parent       |       |   student_auth   |       |    Supabase     |
|     Email        | 1---N | (one per student)| N---1 |     Auth User   |
+------------------+       +------------------+       +------------------+
 parent@email.com           Record 1: Child A          Single account
                            Record 2: Child B          shared by family
                            (same email, diff student)
```

### Key Insight
All siblings share:
- The same parent email (`students.email` and `student_auth.email`)
- The same Supabase Auth account (`auth_user_id` - ONE login for the parent)

Each sibling has:
- Their own `student_auth` record (one per `student_id`)

---

## Implementation Changes

### 1. Database Migration: Remove Unique Constraint on Email
```sql
-- Remove the unique constraint on student_auth.email
-- This allows multiple students (siblings) to share the same portal email
ALTER TABLE public.student_auth 
  DROP CONSTRAINT IF EXISTS student_auth_email_key;
```

### 2. Update studentAuthService.ts

**Remove email conflict checks:**
- Remove the pre-check in `syncStudentAuthEmail()` that blocks updates when email is "already in use"
- Remove the "already linked to another student" error in `enablePortalAccess()`

**Add sibling-aware provisioning:**
```typescript
export const enablePortalAccess = async (studentId: string, email: string) => {
  // Check if this student already has access
  const existing = await getStudentAuthByStudentId(studentId);
  if (existing && existing.auth_user_id) {
    return { success: false, error: 'Portal access already enabled' };
  }

  // Check if a sibling already has an auth account with this email
  const siblingAuth = await getStudentAuthByEmail(normalizedEmail);
  
  if (siblingAuth?.auth_user_id) {
    // Parent already has a Supabase Auth account - reuse it for this student
    if (existing) {
      // Update existing record to link to parent's auth account
      await update student_auth set auth_user_id = siblingAuth.auth_user_id
    } else {
      // Create new record linked to parent's auth account
      await createStudentAuth(studentId, email, siblingAuth.auth_user_id);
    }
    return { success: true, siblingLinked: true };
  } else {
    // First child - create new Supabase Auth account
    const authResult = await createStudentAuthAccount(...);
    // Create/update student_auth record
  }
};
```

### 3. Update syncStudentAuthEmail Function

Remove the conflict detection that blocks email updates:

```typescript
export const syncStudentAuthEmail = async (studentId: string, newEmail: string) => {
  // Get current student_auth record
  const existing = await getStudentAuthByStudentId(studentId);
  if (!existing) {
    return { synced: false, reason: 'No portal access' };
  }
  
  // Check if already in sync
  if (existing.email === newEmail) {
    return { synced: true, reason: 'Already in sync' };
  }
  
  // REMOVED: Email conflict check - siblings can share emails
  
  // Update student_auth table
  await supabase.from('student_auth')
    .update({ email: newEmail })
    .eq('student_id', studentId);
    
  // If there's a Supabase Auth account, update that too
  // Note: All siblings sharing this auth account will use the same login email
  if (existing.auth_user_id) {
    await updateSupabaseAuthEmail(existing.auth_user_id, newEmail);
  }
  
  return { synced: true, reason: 'Email updated' };
};
```

### 4. Update getStudentAuthByEmail Function

Change from `.single()` to return first match (since multiple records can exist):

```typescript
export const getStudentAuthByEmail = async (email: string): Promise<StudentAuth | null> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('*')
    .eq('email', email.toLowerCase())
    .limit(1)  // Changed: Get first match, not .single()
    .maybeSingle();
    
  return data;
};
```

### 5. Add Helper to Find All Siblings with Portal Access

```typescript
export const getAllStudentAuthByEmail = async (email: string): Promise<StudentAuth[]> => {
  const { data, error } = await supabase
    .from('student_auth')
    .select('*')
    .eq('email', email.toLowerCase());
    
  return data || [];
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| **Migration (new)** | Drop `student_auth_email_key` unique constraint |
| `src/services/studentAuthService.ts` | Remove email conflict checks; add sibling-aware provisioning |
| `src/services/studentService.ts` | Remove conflict error throwing in sync logic |

---

## Behavior After Changes

| Scenario | Before | After |
|----------|--------|-------|
| Add sibling with same email | Error: "Email already linked" | Creates new `student_auth` record, reuses parent's auth account |
| Update student email to sibling's | Error: "Conflict" | Succeeds - both can share email |
| Parent logs in | Sees one child | Sees all children with StudentSwitcher |
| Reset password | Affects one child | Affects parent account (all siblings) |

---

## Edge Case Handling

### Sibling Provisioning Flow
```text
1. First child enabled:
   - Create student_auth record with email
   - Create Supabase Auth account
   - Link auth_user_id to student_auth

2. Second child enabled (same email):
   - Create student_auth record with same email  
   - Find existing auth_user_id from sibling
   - Link SAME auth_user_id to new record
   
3. Parent logs in:
   - Auth matches multiple student_auth records by email
   - LinkedStudents populated with all matches
   - StudentSwitcher shows all children
```

### Email Update Flow
```text
1. Admin updates Student A's email
2. syncStudentAuthEmail runs
3. student_auth.email updated (no conflict check)
4. If auth_user_id exists, Supabase Auth email updated
5. Other siblings keep their current email (independent)
```

---

## Security Considerations

- `student_auth.student_id` remains unique (one portal record per student)
- `student_auth.auth_user_id` can be shared across siblings (one login per family)
- RLS policies already support email-based matching for multi-student access

---

## Testing Steps

After implementation:
1. Find or create two students with the same email
2. Enable portal access for the first student
3. Enable portal access for the second student (should succeed now)
4. Log in with the shared email
5. Verify StudentSwitcher shows both children
6. Test updating email on one student and verify it syncs correctly
