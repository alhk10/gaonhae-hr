

# Plan: Dashboard System Overhaul

## Summary

Create a comprehensive multi-dashboard system with four distinct dashboards:
1. **Superadmin Dashboard** - Global system oversight with ability to view all other dashboards
2. **Branch Dashboard** - Branch-specific student list and sales data (for employees with branch permission)
3. **Employee Dashboard** - Personal workspace with clock in/out functionality
4. **Student Dashboard** - Self-service portal for students (new user type)
5. Ensure all other functionality are unaffected and systems are well integrated

---

## Current State Analysis

| Component | Status |
|-----------|--------|
| SuperadminDashboard | Exists - needs dashboard switcher |
| ManagerDashboard | Exists - will be repurposed as Branch Dashboard |
| EmployeeDashboard | Exists - needs refinement |
| StudentDashboard | Does not exist - new component |
| Student Login | Not supported - students table has email but no auth |
| Student Edit Approval | Not implemented |

---

## Architecture Overview

```text
                          ┌─────────────────────────────┐
                          │      Login System           │
                          │  (employees + students)     │
                          └─────────────┬───────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
            │   Superadmin  │   │   Employee    │   │    Student    │
            │   Dashboard   │   │   Dashboard   │   │   Dashboard   │
            └───────┬───────┘   └───────┬───────┘   └───────────────┘
                    │                   │                   
           Can view ALL ──────┐         │ (if has branch    
           dashboards         │         │  permission)      
                              │         │                   
                              ▼         ▼                   
                       ┌───────────────────┐                
                       │  Branch Dashboard │                
                       │  (by branch_id)   │                
                       └───────────────────┘                
```

---

## Implementation Phases

### Phase 1: Database Schema Updates

Create new tables and update existing ones:

| Table | Purpose |
|-------|---------|
| `student_update_requests` | Store pending student self-edit requests |
| `employee_branch_access` | Track which employees can access which branch dashboards |

**student_update_requests columns:**
- `id` (uuid, PK)
- `student_id` (uuid, FK to students)
- `requested_changes` (jsonb) - contains field changes
- `status` (text: pending, approved, rejected)
- `requested_at` (timestamp)
- `reviewed_by` (text, employee_id)
- `reviewed_at` (timestamp)
- `review_notes` (text)

**employee_branch_access columns:**
- `id` (uuid, PK)
- `employee_id` (text, FK to employees)
- `branch_id` (text, FK to branches)
- `can_view_dashboard` (boolean)
- `can_approve_changes` (boolean)
- `created_at`, `updated_at` (timestamps)

### Phase 2: Student Authentication

Enable students to log in:

1. Create student accounts in Supabase Auth when students are created
2. Update `LoginForm` to detect if user is a student vs employee
3. Create new `StudentAuthContext` or extend existing `AuthContext` with user type detection

**Login Flow:**
```text
Email entered → Check employees table
             → If not found, check students table
             → Set userType: 'employee' | 'student'
             → Route to appropriate dashboard
```

### Phase 3: Dashboard Components

#### 3.1 Superadmin Dashboard Enhancement

Add dashboard switcher tabs:

```text
┌─────────────────────────────────────────────────────────────┐
│ [Overview] [Branches ▼] [Employee View] [Student View]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current content + ability to switch views                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Overview tab**: Current superadmin dashboard content
- **Branches dropdown**: Select any branch to view Branch Dashboard
- **Employee View**: Simulate employee dashboard
- **Student View**: Enter student ID to view their dashboard

#### 3.2 Branch Dashboard (New Component)

Replaces current ManagerDashboard with branch-focused content:

```text
┌─────────────────────────────────────────────────────────────┐
│ Branch Dashboard - [Kembangan ▼]                            │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ Active       │ │ This Month   │ │ Outstanding  │          │
│ │ Students: 45 │ │ Revenue: $5k │ │ Invoices: 12 │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                             │
│ [Students] [Classes] [Revenue] [Pending Approvals]          │
│                                                             │
│ Student List with search, filters, quick actions            │
│ Pending student edit requests needing approval              │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Branch selector (for users with multi-branch access)
- Student list filtered by branch
- Sales/revenue summary for branch
- Class schedule for branch
- Pending student edit requests to approve

#### 3.3 Employee Dashboard Enhancement

Keep existing functionality, add clarity:

```text
┌─────────────────────────────────────────────────────────────┐
│ Welcome back, John                                          │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ Leave        │ │ Pending      │ │ Hours This   │          │
│ │ Balance: 14d │ │ Claims: 2    │ │ Month: 42h   │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                             │
│ [Clock In/Out Card]         [Quick Actions Card]            │
│                                                             │
│ [Upcoming Bookings Card]    [Recent Activity Card]          │
└─────────────────────────────────────────────────────────────┘
```

Each employee sees only their own dashboard - no access to others' data.

#### 3.4 Student Dashboard (New Component)

New self-service portal for students:

```text
┌─────────────────────────────────────────────────────────────┐
│ Student Portal - Welcome, Alex                              │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ Sessions     │ │ Outstanding  │ │ Next Class   │          │
│ │ Left: 8      │ │ Balance: $50 │ │ Tue 5:30pm   │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                             │
│ [My Profile]       View & edit personal details             │
│ [My Invoices]      View invoices, outstanding payments      │
│ [Make Payment]     Pay school fees online                   │
│ [Class Schedule]   View enrolled classes                    │
│                                                             │
│ ⚠️ Pending Changes: Your profile update is awaiting review  │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- View personal profile with edit capability
- Edits create pending change requests (not immediate updates)
- View all invoices and payment history
- Outstanding balance display
- Online payment integration (if Stripe enabled)
- Class schedule and attendance history

### Phase 4: Student Edit Approval Workflow

When students edit their profile:

```text
Student submits edit
        │
        ▼
┌───────────────────┐
│ student_update_   │
│ requests table    │
│ status: pending   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────────────────────────┐
│ Branch Dashboard / Superadmin sees    │
│ "Pending Approvals" notification      │
└─────────────────────┬─────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼                           ▼
    [Approve]                   [Reject]
        │                           │
        ▼                           ▼
   Apply changes              Notify student
   to students table          with reason
```

### Phase 5: Access Control Updates

Update sidebar and routing:

| User Type | Visible Dashboards |
|-----------|-------------------|
| Superadmin | All dashboards (via switcher) |
| Employee with branch access | Employee + Branch Dashboard |
| Employee without branch access | Employee Dashboard only |
| Student | Student Dashboard only |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/BranchDashboard.tsx` | Branch-focused dashboard |
| `src/components/dashboard/StudentDashboard.tsx` | Student self-service portal |
| `src/components/dashboard/DashboardSwitcher.tsx` | Tab/dropdown for superadmin |
| `src/components/dashboard/StudentUpdateRequests.tsx` | Approval queue component |
| `src/components/student/StudentProfileEdit.tsx` | Student profile editor |
| `src/components/student/StudentInvoiceList.tsx` | Student invoice viewer |
| `src/components/student/StudentPaymentForm.tsx` | Payment submission |
| `src/services/branchAccessService.ts` | Branch permission checks |
| `src/services/studentUpdateRequestService.ts` | CRUD for edit requests |
| `src/hooks/useBranchAccess.ts` | Hook for branch permissions |
| `src/pages/StudentPortal.tsx` | Student login landing page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Add userType detection (employee/student) |
| `src/pages/Index.tsx` | Route to StudentDashboard if student |
| `src/components/auth/LoginForm.tsx` | Handle student login |
| `src/components/dashboard/SuperadminDashboard.tsx` | Add dashboard switcher |
| `src/components/layout/Sidebar.tsx` | Student-specific menu items |
| `src/App.tsx` | Add student portal routes |
| `src/services/studentService.ts` | Add createStudentAuth function |

---

## Database Migrations Required

**Migration 1: Create employee_branch_access table**

**Migration 2: Create student_update_requests table**

**Migration 3: Add RLS policies for new tables**

---

## Technical Considerations

### Student Authentication Strategy

**Option A: Shared auth.users table (Recommended)**
- Students get entries in Supabase auth.users
- Add `user_type` column or check students table on login
- Pros: Single auth system, familiar patterns
- Cons: Need to create auth user when adding students

### Branch Permission Check

```typescript
// Example permission check flow
const hasBranchDashboardAccess = async (employeeId: string, branchId?: string) => {
  // Superadmins always have access to all branches
  if (userrole === 'superadmin') return true;
  
  // Check employee_branch_access table
  const access = await getBranchAccess(employeeId, branchId);
  return access?.can_view_dashboard ?? false;
};
```

### Student Edit Request Flow

```typescript
// When student updates profile
const submitProfileUpdate = async (studentId: string, changes: Record<string, any>) => {
  // Don't update students table directly
  // Instead create a pending request
  await supabase.from('student_update_requests').insert({
    student_id: studentId,
    requested_changes: changes,
    status: 'pending',
    requested_at: new Date().toISOString()
  });
};

// When admin approves
const approveStudentUpdate = async (requestId: string) => {
  const request = await getRequest(requestId);
  // Apply changes to students table
  await updateStudent(request.student_id, request.requested_changes);
  // Mark as approved
  await updateRequest(requestId, { status: 'approved' });
};
```

---

## Testing Requirements

1. Superadmin can view all four dashboard types
2. Employee with branch access sees Branch Dashboard link
3. Employee without branch access only sees Employee Dashboard
4. Student can log in and see Student Dashboard
5. Student profile edits create pending requests
6. Branch dashboard shows pending approvals
7. Approving updates changes student data
8. Rejecting updates notifies student
9. Ensure all other functionality are unaffected and systems are well integrated

---

## Estimated Scope

| Phase | Complexity | Files |
|-------|------------|-------|
| Phase 1: DB Schema | Medium | 2 migrations |
| Phase 2: Student Auth | High | 5 files |
| Phase 3: Dashboards | High | 8 new + 5 modified |
| Phase 4: Approval Flow | Medium | 4 files |
| Phase 5: Access Control | Medium | 3 files |
| **Total** | **Large** | **~20+ files** |

