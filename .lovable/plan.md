# Plan: Dashboard System Overhaul

## Status: ✅ IMPLEMENTATION COMPLETE

---

## Summary

Multi-dashboard system with four distinct dashboards:
1. **Superadmin Dashboard** ✅ - Global system oversight with ability to view all other dashboards via DashboardSwitcher
2. **Branch Dashboard** ✅ - Branch-specific student list and sales data (for employees with branch permission)
3. **Employee Dashboard** ✅ - Personal workspace with clock in/out functionality  
4. **Student Dashboard** ✅ - Self-service portal for students (new user type)

---

## Completed Implementation

### Phase 1: Database Schema ✅
- Created `employee_branch_access` table for branch permissions
- Created `student_update_requests` table for student profile edit approvals
- Created `student_auth` table to link Supabase Auth users to students
- Added RLS policies and helper functions (`is_student()`, `get_current_student_id()`, `has_branch_access()`)

### Phase 2: Authentication & Dashboards ✅
- Updated `AuthContext` with `userType` field ('employee' | 'student')
- Updated `authSessionService.ts` to detect student login via `student_auth` table
- Students now route to `StudentDashboard` without sidebar

### Phase 3: Dashboard Components ✅
- **DashboardSwitcher** - Superadmin can switch between Overview/Branch/Employee/Student views
- **BranchDashboard** - Shows branch stats, student list, revenue, and pending approvals
- **StudentDashboard** - Self-service portal with profile editing (approval workflow)
- **EmployeeDashboard** - Updated to support simulated employee view for superadmin

### Phase 4: Access Control ✅
- Updated Sidebar to hide menu for students
- Added Branch Dashboard link for employees with branch access
- Created `/branch-dashboard` route with `BranchDashboardPage`

---

## Architecture

```
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
        │ (Switcher)    │   └───────┬───────┘   └───────────────┘
        └───────┬───────┘           │                   
                │           (if has branch    
       Can view ALL                 │  permission)      
       dashboards                   │                   
                │                   ▼                   
                └──────────▶┌───────────────────┐
                            │  Branch Dashboard │
                            │  (by branch_id)   │
                            └───────────────────┘
```

---

## Key Files Created

| File | Purpose |
|------|---------|
| `src/components/dashboard/DashboardSwitcher.tsx` | Superadmin view switcher |
| `src/components/dashboard/BranchDashboard.tsx` | Branch-focused dashboard |
| `src/components/dashboard/StudentDashboard.tsx` | Student self-service portal |
| `src/services/branchAccessService.ts` | Branch permission CRUD |
| `src/services/studentUpdateRequestService.ts` | Student edit request workflow |
| `src/services/studentAuthService.ts` | Student auth creation |
| `src/hooks/useBranchAccess.ts` | React hook for branch permissions |
| `src/pages/BranchDashboardPage.tsx` | Branch dashboard page wrapper |

---

## Key Files Modified

| File | Changes |
|------|---------|
| `src/types/auth.ts` | Added UserType ('employee' \| 'student') |
| `src/contexts/AuthContext.tsx` | Added userType state and handling |
| `src/services/authSessionService.ts` | Student detection via student_auth table |
| `src/pages/Index.tsx` | Routes students to StudentDashboard |
| `src/components/layout/Sidebar.tsx` | Hides menu for students, adds Branch Dashboard for employees |
| `src/components/dashboard/SuperadminDashboard.tsx` | Added pending student updates alert |
| `src/App.tsx` | Added /branch-dashboard route |

---

## How It Works

### Student Login Flow
1. User logs in with email/password
2. `authSessionService` checks `student_auth` table for matching auth user ID
3. If found, user is identified as student (`userType: 'student'`)
4. Student sees `StudentDashboard` without sidebar (has logout button)

### Branch Dashboard Access
1. Employees can be granted access via `employee_branch_access` table
2. `useBranchAccess` hook checks permissions
3. Employees with access see "Branch Dashboard" in sidebar
4. Superadmins can view any branch via DashboardSwitcher

### Student Profile Edit Approval
1. Student edits profile in StudentDashboard
2. Changes are submitted to `student_update_requests` table (status: pending)
3. Branch manager sees request in BranchDashboard "Pending Approvals" tab
4. Manager approves/rejects - approved changes are applied to `students` table

---

## Remaining Tasks (Future Enhancements)

- [ ] Add UI to manage employee_branch_access in Settings
- [ ] Add student account creation when adding students in AddStudentDialog
- [ ] Add email notifications for approval workflow
- [ ] Add Stripe payment integration for student payments
- [ ] Add class schedule view for students
