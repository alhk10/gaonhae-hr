

## Plan: Per-Month Payroll Data Storage

### Problem
When editing salary, allowances, or deductions on the payroll processing page, changes are saved to the global `employees`, `allowances`, and `deductions` tables — affecting ALL months. When switching months, data is recalculated from these global tables rather than loading saved per-month values.

### Current State
- `payroll_records` table already stores per-month data in `payroll_data` JSONB (including allowances/deductions arrays)
- `savePayrollToSupabase` correctly saves per-month snapshots
- `getSavedPayrollForPeriod` correctly loads historical data
- The problem: edits during payroll go to global tables, and fresh calculation always pulls from global tables

### Solution: Per-Month Override Storage

#### 1. New Database Table — `payroll_monthly_overrides`
Stores per-employee, per-month overrides for salary, allowances, and deductions separately from the global employee record.

```sql
CREATE TABLE public.payroll_monthly_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month text NOT NULL,
  base_salary numeric,
  hourly_rate numeric,
  allowances jsonb DEFAULT '[]',
  deductions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, year, month)
);
```

#### 2. `PayrollProcessing.tsx` — Edit Handlers Save to Overrides Table
- `handleSalarySave`: Instead of updating global `employees` table, upsert into `payroll_monthly_overrides` for the selected period
- `handleAllowancesSave`: Instead of updating global `allowances` table, upsert the allowances array into `payroll_monthly_overrides`
- `handleDeductionsSave`: Instead of updating global `deductions` table, upsert the deductions array into `payroll_monthly_overrides`

#### 3. `PayrollProcessing.tsx` — Load Overrides When Switching Months
- In `loadAllEmployeeData` (the main useEffect), after loading employee data, query `payroll_monthly_overrides` for the selected period
- If overrides exist for an employee, merge them into `employeeAllowances`, `employeeDeductions`, and salary values before calculation
- Historical saved data (from `payroll_records`) still takes precedence for finalized periods

#### 4. Calculation Flow Update
When calculating payroll for a month:
1. Check `payroll_records` for finalized historical data → use as-is
2. Check `payroll_monthly_overrides` for draft overrides → apply on top of base employee data
3. Fall back to current global `allowances`/`deductions`/`employees` tables

### Technical Details
- The overrides table uses a UNIQUE constraint on `(employee_id, year, month)` to ensure one override per employee per month
- Allowances and deductions stored as JSONB arrays: `[{"name": "Transport", "amount": 200}]`
- RLS policies mirror existing `payroll_records` policies
- When payroll is finalized and saved to `payroll_records`, the override data is baked into the historical snapshot

