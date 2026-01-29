

# Plan: Add Invoicing Function Access by Branch

## Overview
Add a branch-based access control system for the Invoicing function, allowing superadmins to grant specific employees access to create and manage invoices for designated branches. Superadmins will automatically have access to all branches.

---

## Architecture Decision

The system will use a **new database table** (`employee_invoice_access`) to store employee-to-branch invoicing permissions, following the existing access control patterns in the codebase.

```text
+----------------------+     +-------------------------+     +----------+
|     employees        | --> | employee_invoice_access | <-- | branches |
+----------------------+     +-------------------------+     +----------+
| id (PK)              |     | id (PK)                 |     | id (PK)  |
| name                 |     | employee_id (FK)        |     | name     |
| email                |     | branch_id (FK)          |     | country  |
+----------------------+     | can_create              |     +----------+
                             | can_edit                |
                             | can_delete              |
                             | created_at              |
                             +-------------------------+
```

---

## Database Changes

### New Table: `employee_invoice_access`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| employee_id | text | NO | - | References employees.id |
| branch_id | text | NO | - | References branches.id |
| can_create | boolean | YES | true | Can create invoices |
| can_edit | boolean | YES | true | Can edit invoices |
| can_delete | boolean | YES | false | Can delete invoices |
| created_at | timestamptz | YES | now() | Created timestamp |
| updated_at | timestamptz | YES | now() | Last updated |
| created_by | text | YES | - | Created by employee_id |

### RLS Policies
- **Superadmins**: Full CRUD access
- **Employees**: Can view their own invoice access permissions

### Unique Constraint
- `UNIQUE(employee_id, branch_id)` - One permission record per employee per branch

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/employee/InvoiceAccessManager.tsx` | UI component for managing employee invoice access by branch |
| `src/services/invoiceAccessService.ts` | Service for CRUD operations on employee_invoice_access table |
| `src/hooks/useInvoiceAccess.ts` | Hook for checking current user's invoice access |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/EmployeeDetails.tsx` | Add InvoiceAccessManager component for superadmins |
| `src/types/employee.ts` | Add InvoiceAccessPermission interface |
| `src/components/sales/CreateInvoiceDialog.tsx` | Filter branches based on user's invoice access |
| `src/components/sales/InvoiceManagementList.tsx` | Filter invoices by accessible branches |
| `src/pages/sales/InvoiceManagement.tsx` | Add access check for non-superadmin users |
| `src/components/sales/SalesAccessGuard.tsx` | Allow access for users with invoice permissions |

---

## Implementation Details

### 1. Database Migration

```sql
-- Create employee_invoice_access table
CREATE TABLE public.employee_invoice_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  can_create BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  UNIQUE(employee_id, branch_id)
);

-- Enable RLS
ALTER TABLE public.employee_invoice_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Superadmins can manage invoice access"
ON public.employee_invoice_access FOR ALL
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "Employees view own invoice access"
ON public.employee_invoice_access FOR SELECT
USING (employee_id = get_current_employee_id());

-- Index for performance
CREATE INDEX idx_employee_invoice_access_employee 
ON public.employee_invoice_access(employee_id);

CREATE INDEX idx_employee_invoice_access_branch 
ON public.employee_invoice_access(branch_id);
```

### 2. Service: `invoiceAccessService.ts`

Key functions:
- `getEmployeeInvoiceAccess(employeeId)` - Get all branch access for an employee
- `updateEmployeeInvoiceAccess(employeeId, branchAccess[])` - Update branch permissions
- `checkInvoiceAccess(branchId)` - Check if current user can access a branch
- `getAccessibleBranches()` - Get list of branches current user can access

### 3. Component: `InvoiceAccessManager.tsx`

UI features:
- Displays all branches with checkbox/toggle for each
- Per-branch permissions: Create, Edit, Delete
- Only visible to superadmins
- Located in Employee Details page after Admin Access section
- Similar UI pattern to `AdminAccessManager.tsx`

### 4. Hook: `useInvoiceAccess.ts`

```typescript
interface InvoiceAccessState {
  hasAccess: boolean;
  accessibleBranches: string[];
  canCreate: (branchId: string) => boolean;
  canEdit: (branchId: string) => boolean;
  canDelete: (branchId: string) => boolean;
  isLoading: boolean;
}

export const useInvoiceAccess = (): InvoiceAccessState
```

### 5. Update `SalesAccessGuard.tsx`

Modify access check logic:
- Superadmins: Full access (current behavior)
- Employees with invoice access: Allow entry to invoicing pages
- Filter visible data by accessible branches

### 6. Update `CreateInvoiceDialog.tsx`

- Filter branch dropdown to only show accessible branches
- Superadmins see all branches (unchanged)
- Non-superadmins see only their permitted branches

### 7. Update `InvoiceManagementList.tsx`

- Filter displayed invoices by accessible branches
- Hide edit/delete actions for branches without those permissions

---

## Access Control Flow

```text
User opens Invoice Management
            |
            v
    Is user superadmin?
     /            \
   Yes             No
    |               |
    v               v
Full access    Check employee_invoice_access
                        |
                        v
               Has any branch access?
                /             \
              Yes              No
               |                |
               v                v
          Filter by        Show "Access Denied"
          permitted
          branches
```

---

## UI Preview: InvoiceAccessManager

```text
+----------------------------------------------------------+
| Invoicing Access by Branch                               |
+----------------------------------------------------------+
| Grant this employee access to create and manage invoices |
| for specific branches.                                   |
+----------------------------------------------------------+
| [ ] Balmoral                                             |
|     [x] Create  [x] Edit  [ ] Delete                     |
+----------------------------------------------------------+
| [x] Bukit Merah                                          |
|     [x] Create  [x] Edit  [ ] Delete                     |
+----------------------------------------------------------+
| [ ] Jurong West                                          |
|     [ ] Create  [ ] Edit  [ ] Delete                     |
+----------------------------------------------------------+
| [x] Kembangan                                            |
|     [x] Create  [x] Edit  [x] Delete                     |
+----------------------------------------------------------+
```

---

## Summary of Changes

| Category | Files | Effort |
|----------|-------|--------|
| Database | 1 migration | Low |
| New Components | 1 (InvoiceAccessManager) | Medium |
| New Services | 1 (invoiceAccessService) | Medium |
| New Hooks | 1 (useInvoiceAccess) | Low |
| Modified Components | 4 (Guards, Dialogs, Lists) | Medium |
| Types | 1 (employee.ts) | Low |

---

## Testing Checklist

- [ ] Superadmin can see InvoiceAccessManager in Employee Details
- [ ] Superadmin can grant/revoke branch access for employees
- [ ] Employee with invoice access can see Invoice Management page
- [ ] Employee only sees branches they have access to
- [ ] Employee cannot create invoices for unauthorized branches
- [ ] Superadmin still has full access to all branches
- [ ] RLS policies prevent unauthorized data access

