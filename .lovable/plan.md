

## Fix: Net Pay mismatch after Force Recalculate / monthly override edits

### The bug (Albert's row)

| Column | Shown | Source |
|---|---|---|
| Basic Salary | S$3,700 | `employee.baseSalary` (override merged ✅) |
| Allowances | S$640 (2 items) | `employeeAllowances[id]` state (override merged ✅) |
| Deductions | None | `employeeDeductions[id]` state |
| Claims | S$0.00 | approved claims |
| **Net Pay** | **S$4,000** ❌ | `calculateFullTimePayroll(employee, …).netSalary` |

Expected with no CPF/deductions: 3,700 + 640 + 0 = **S$4,340**.
Actual S$4,000 = 3,700 + 300 → the calculator is using the **base** allowances from the `allowances` table (S$300), not the per-month overrides (S$640) the rest of the row displays.

### Root cause

In `src/pages/PayrollProcessing.tsx`:

1. `forceRecalculatePayroll` (lines 165–197) loads `payroll_monthly_overrides`, merges them into the `employeeAllowances` / `employeeDeductions` **state maps**, and writes back `base_salary` / `hourly_rate` into the `employees[]` objects — but it never writes the override `allowances` / `deductions` arrays back onto the employee objects.
2. The Net Pay cell (line 1127) calls `calculateFullTimePayroll(employee, approvedClaims, 0)`, and that function (`src/utils/payrollCalculations.ts` lines 110–115) reads `employee.allowances` / `employee.deductions` — i.e. the **base** values from `getEmployeesForPayroll`, ignoring the merged overrides.

So the displayed Allowances/Deductions columns and the Net Pay column use two different sources, and they diverge whenever a monthly override exists. The same divergence will affect the Payment step's Net Pay calc (line 1338) and the saved payroll snapshot (line 1607), since both feed off similar `employee.*` arrays.

### Fix

Single source of truth: when building the row data, override `employee.allowances` and `employee.deductions` from the merged state maps before passing to `calculateFullTimePayroll` (and the equivalent paths for the payment step + save).

**File:** `src/pages/PayrollProcessing.tsx`

1. **`forceRecalculatePayroll`** (around lines 172–188): when merging overrides, also write the override arrays back onto the employee object so the in-memory `employees[]` becomes the single source of truth:

   ```ts
   if (override.allowances?.length) {
     employees[empIdx] = { ...employees[empIdx], allowances: override.allowances };
   }
   if (override.deductions?.length) {
     employees[empIdx] = { ...employees[empIdx], deductions: override.deductions };
   }
   ```

2. **Full-time table render** (line 1115 `fullTimeEmployees.map`): build an `effectiveEmployee` that merges the state arrays before calculating:

   ```ts
   const effectiveEmployee = {
     ...employee,
     allowances: employeeAllowances[employee.id] ?? employee.allowances ?? [],
     deductions: employeeDeductions[employee.id] ?? employee.deductions ?? [],
   };
   const payrollCalc = calculateFullTimePayroll(effectiveEmployee, approvedClaims, 0);
   ```

   This is the minimal, defensive fix — it works even if step 1 misses an edge case (e.g. when the user edits allowances inline after recalc).

3. **Payment step Net Pay** (around line 1336): the same `grossPay - employeeCPF - totalDeductions` chain needs to use `employeeAllowances`/`employeeDeductions` state for `grossPay` and `totalDeductions`. Apply the same `effectiveEmployee` pattern there.

4. **Save snapshot** (around line 1604–1620, `handleProcessPayment` write path): use the merged state arrays when computing `grossPay`, `totalDeductions`, and `netPay` written into Supabase, so the persisted record matches the displayed values.

5. After fixing, the same `EditAllowancesDialog` / `EditDeductionsDialog` `onSave` handlers should already update `employeeAllowances` / `employeeDeductions` state — the table will recompute Net Pay correctly because of step 2. (No change needed there, just verifying flow.)

### Verification

1. Open Payroll Processing → March 2026.
2. Albert's row: Basic 3,700, Allowances 640, Deductions None → Net Pay shows **S$4,340 − Employee CPF** (Singapore Citizen) or **S$4,340** if PR-foreigner with no CPF.
3. Click **Force Recalculate** → values stay consistent (Allowances column = 640, Net Pay = matching gross − CPF − deductions).
4. Edit allowances inline → Allowances column and Net Pay both update.
5. Move to Payment step → Net Pay column matches the Processing step.
6. Process payment → saved payslip's `net_pay` matches the displayed value.
7. Other employees in the table (Cha Jinwoo, Jason Chiang, etc.) keep correct totals.

### Files affected

- `src/pages/PayrollProcessing.tsx` — merge override allowances/deductions onto employee in `forceRecalculatePayroll`; build `effectiveEmployee` before `calculateFullTimePayroll` in the Processing table, Payment table, and save path.

### Out of scope

- Refactoring `getEmployeePayrollDataOptimized` to natively merge overrides (broader change; the targeted fix above resolves the visible bug without touching shared services).
- Casual employee Net Pay (no override-driven mismatch reported; can be revisited if needed).
- Changing the CPF or claims calculation logic.

