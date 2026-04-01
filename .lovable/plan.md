

## Plan: Enable Approvals Tab for Invoice-Access Employees

### Problem
`ysn.gaonhaetaekwondo@gmail.com` has `employee_invoice_access` but no `employee_branch_access` record. The Approvals tab depends on three data sources, all of which return empty due to RLS:

1. **`student_registrations`** — SELECT policy uses `has_branch_access()` which only checks `employee_branch_access`
2. **`payments`** — unverified payments come from `branch-payments` query, whose RLS also checks `employee_invoice_access` (this one likely works already based on prior migrations)
3. **`student_update_requests`** — SELECT policy checks `employee_branch_access`

Since the user has `employee_invoice_access` with permissions for the Yishun branch, the registration and update request RLS policies need to also grant access to these users.

### Changes

#### 1. Database Migration — Update `student_registrations` RLS
Add an alternative SELECT and UPDATE policy path for employees with `employee_invoice_access`:

```sql
-- Allow invoice-access employees to view registrations for their branches
DROP POLICY IF EXISTS "Admins can view registrations" ON public.student_registrations;
CREATE POLICY "Admins can view registrations"
  ON public.student_registrations FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access(branch_id)
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
      AND eia.branch_id = student_registrations.branch_id
    )
  );

-- Same for UPDATE (approve/reject)
DROP POLICY IF EXISTS "Admins can update registrations" ON public.student_registrations;
CREATE POLICY "Admins can update registrations"
  ON public.student_registrations FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access(branch_id)
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
      AND eia.branch_id = student_registrations.branch_id
    )
  );
```

#### 2. Same migration — Update `student_update_requests` RLS
Add invoice-access employees to the "Branch managers can manage requests" policy:

```sql
DROP POLICY IF EXISTS "Branch managers can manage requests for their students"
  ON public.student_update_requests;

CREATE POLICY "Branch managers can manage requests for their students"
ON public.student_update_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employee_branch_access eba
    JOIN students s ON s.branch_id = eba.branch_id
    WHERE eba.employee_id = get_current_employee_id()
    AND eba.can_approve_changes = true
    AND s.id = student_update_requests.student_id
  )
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    JOIN students s ON s.branch_id = eia.branch_id
    WHERE e.email = auth.email()
    AND s.id = student_update_requests.student_id
  )
)
WITH CHECK (
  -- same conditions repeated for WITH CHECK
);
```

### No code changes needed
The `BranchDashboard.tsx` already renders the Approvals tab when `hasApprovals` is true. Once the RLS policies allow the data through, the tab will appear automatically.

### Result
Invoice-access employees will see pending registrations and student update requests for their assigned branches, making the Approvals tab visible and functional.

