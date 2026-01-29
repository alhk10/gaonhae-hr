
# Plan: Show Saved Payroll Data for Past Months

## Problem Statement
When viewing past months in payroll processing (especially with "Force Recalculate"), the system fetches **current** employee data (allowances, deductions, claims) instead of loading the **saved** historical payroll data from the `payroll_records` table. This means changes made to employee records after payroll was processed incorrectly affect the displayed values for past months.

## Current State
- Payroll data IS being saved correctly to `payroll_records.payroll_data` with arrays for:
  - `baseSalary`, `allowances[]`, `deductions[]`, `claims`, CPF amounts, gross/net salary
  - Slot breakdown data for casual employees
- However, when loading a past month, the system:
  1. Deletes cached payroll records for Nov 2025+
  2. Fetches CURRENT employee allowances/deductions from `allowances` and `deductions` tables
  3. Recalculates everything from scratch

## Solution Overview
Implement a system that:
1. **For processed months**: Load saved historical data from `payroll_records`
2. **For unprocessed months**: Calculate fresh from current employee data
3. **Provide explicit "Recalculate" option**: Users can choose to recalculate if needed

---

## Implementation Steps

### Step 1: Create a service function to load saved payroll data
**File: `src/services/payrollService.ts`**

Add a new function to fetch saved payroll records for a specific period with full historical data:

```typescript
export const getSavedPayrollForPeriod = async (period: string): Promise<{
  hasData: boolean;
  fullTimeEmployees: Array<{
    employeeId: string;
    name: string;
    baseSalary: number;
    allowances: Array<{ name: string; amount: number }>;
    deductions: Array<{ name: string; amount: number }>;
    approvedClaims: number;
    grossSalary: number;
    employeeCPF: number;
    employerCPF: number;
    netSalary: number;
  }>;
  casualEmployees: Array<{
    employeeId: string;
    name: string;
    baseSalary: number;
    allowances: Array<{ name: string; amount: number }>;
    deductions: Array<{ name: string; amount: number }>;
    approvedClaims: number;
    grossSalary: number;
    employeeCPF: number;
    employerCPF: number;
    netSalary: number;
    slotBookingPay?: number;
    slotBreakdown?: any[];
    calculationMethod?: string;
  }>;
}>
```

This will:
- Parse the period format (e.g., "November 2025")
- Query `payroll_records` for all records with matching year and month
- Return structured data with historical values

### Step 2: Modify `usePayrollPersistence.ts` to handle November 2025+ periods
**File: `src/hooks/usePayrollPersistence.ts`**

Update `loadPayrollFromSupabase` to:
- Remove the skip for Nov 2025+ periods
- Use the new `getSavedPayrollForPeriod` function
- Include full allowances/deductions arrays in the loaded data
- Handle both period formats ("November 2025" and "11")

### Step 3: Update `PayrollProcessing.tsx` loading logic
**File: `src/pages/PayrollProcessing.tsx`**

Modify the main `useEffect` that loads payroll data:

```typescript
useEffect(() => {
  const loadAllEmployeeData = async () => {
    // 1. First, check if there's saved payroll data for this period
    const savedPayroll = await getSavedPayrollForPeriod(selectedPeriod);
    
    if (savedPayroll.hasData) {
      // 2. If saved data exists, use it directly
      // Set employeeAllowances and employeeDeductions from saved data
      // Don't fetch current employee allowances/deductions
      // Show "Using Saved Data" indicator
    } else {
      // 3. If no saved data, calculate from current employee data
      // Current logic for fetching and calculating
    }
  };
}, [selectedPeriod]);
```

### Step 4: Add "Recalculate from Current Data" button
**File: `src/pages/PayrollProcessing.tsx`**

Add a button that allows superadmins to explicitly recalculate payroll from current employee data when viewing saved periods:

- Show indicator when viewing saved historical data
- Provide "Recalculate" button with confirmation dialog
- Make current `forceRecalculatePayroll` available as explicit action

### Step 5: Update the `usePayrollPersistence` save function
**File: `src/hooks/usePayrollPersistence.ts`**

Ensure the save function includes ALL necessary fields:

```typescript
payroll_data: {
  name: employee.name,
  baseSalary: employee.baseSalary,
  // Save ARRAYS not just totals
  allowances: employee.allowancesArray?.map(a => ({ name: a.name, amount: a.amount })) || [],
  deductions: employee.deductions?.map(d => ({ name: d.name, amount: d.amount })) || [],
  totalAllowances: totalAllowancesAmount,
  totalDeductions: totalDeductionsAmount,
  approvedClaims: employee.claims || 0,
  grossPay: employee.grossPay,
  employeeCPF: employee.cpfEmployee,
  employerCPF: employee.cpfEmployer,
  netPay: employee.netPay,
  type: 'Full-Time'
}
```

### Step 6: Update state variables for historical data
**File: `src/pages/PayrollProcessing.tsx`**

Add new state variables:

```typescript
const [isUsingHistoricalData, setIsUsingHistoricalData] = useState(false);
const [historicalPayrollData, setHistoricalPayrollData] = useState<any>(null);
```

When historical data is loaded:
- Set `employeeAllowances` and `employeeDeductions` from saved payroll data
- Set flag to indicate historical mode
- Show visual indicator in UI

### Step 7: Update PayrollContext to support historical data loading
**File: `src/contexts/PayrollContext.tsx`**

Add a new function `loadHistoricalPayroll` that:
- Takes a period and loads from `payroll_records`
- Sets payroll state with historical values
- Doesn't trigger recalculation

---

## UI Changes

### Visual Indicator for Historical Data
When viewing saved payroll data, display a banner:

```
📋 Viewing saved payroll data from [date processed]
   Allowances, deductions, and CPF amounts reflect values at time of processing.
   [Recalculate from Current Data] button
```

### Recalculate Button Behavior
- Available only when viewing saved historical data
- Shows confirmation dialog explaining that this will overwrite saved values
- Calls `forceRecalculatePayroll` with `showToast: true`

---

## Technical Details

### Data Structure in `payroll_records.payroll_data`

For Full-Time employees:
```json
{
  "type": "Full-Time",
  "name": "Employee Name",
  "baseSalary": 3200,
  "allowances": [
    { "name": "Preschool Allowance", "amount": 300 },
    { "name": "Grading Allowance", "amount": 100 }
  ],
  "deductions": [],
  "totalAllowances": 400,
  "totalDeductions": 0,
  "approvedClaims": 0,
  "grossSalary": 3600,
  "employeeCPF": 720,
  "employerCPF": 612,
  "netSalary": 2880
}
```

For Casual employees:
```json
{
  "type": "Casual",
  "name": "Employee Name",
  "baseSalary": 0,
  "hourlyRate": 15,
  "hoursWorked": 48,
  "daysWorked": 8,
  "allowances": [{ "name": "Performance Bonus", "amount": 50 }],
  "deductions": [],
  "slotBookingPay": 1200,
  "slotBreakdown": [...],
  "calculationMethod": "dynamic_pricing",
  "totalAllowances": 50,
  "approvedClaims": 0,
  "grossSalary": 1250,
  "employeeCPF": 250,
  "employerCPF": 212.5,
  "netSalary": 1000
}
```

---

## Files to Modify

1. **`src/services/payrollService.ts`** - Add `getSavedPayrollForPeriod` function
2. **`src/hooks/usePayrollPersistence.ts`** - Update save/load to include full arrays, remove Nov 2025+ skip
3. **`src/pages/PayrollProcessing.tsx`** - Update loading logic, add historical data indicator, add recalculate button
4. **`src/contexts/PayrollContext.tsx`** - Add `loadHistoricalPayroll` function
5. **`src/types/payroll.ts`** - Ensure `allowancesArray` and `deductions` array types are properly defined

---

## Edge Cases to Handle

1. **Mixed state**: Some employees have saved data, others don't
   - Solution: For employees without saved data, calculate from current data
   
2. **Employee no longer exists**: Saved record references deleted employee
   - Solution: Show employee data from saved record (historical view)
   
3. **New employee added mid-month**: Employee has no saved record for past month
   - Solution: Skip employee from historical view, or calculate if explicitly requested

4. **Period format variations**: "November 2025" vs "11" vs "2025-11"
   - Solution: Normalize period format in `getSavedPayrollForPeriod`

---

## Testing Checklist

- [ ] Viewing December 2025 (already processed) shows saved allowances, not current
- [ ] Editing an allowance for an employee doesn't change past month's saved data
- [ ] "Recalculate" button successfully updates saved data with current values
- [ ] New months without saved data calculate correctly from current employee data
- [ ] Casual employee slot breakdown data displays correctly from saved records
- [ ] CPF amounts display historical values for processed months
