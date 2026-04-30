## Problem

CORPUZ ALBERT JR TIGGANGAY shows **Basic S$3,700, Allowances "None", Deductions "None", Claims S$0.00 → Net Pay S$4,000** for April 2026. Net Pay should be **S$3,700**.

## Root Cause

Albert has a row in the `allowances` table:

| name | amount | type |
|---|---|---|
| Grading Allowance | 300.00 | Adhoc |

He also has a `payroll_monthly_overrides` row for **2026-04** with `allowances: []` (the user explicitly cleared April's allowances in the UI).

The merge logic that combines base `allowances` with the per-month override has a bug — it only honours an override when the override array is **non-empty**:

```ts
// PayrollProcessing.tsx (load paths around lines 173, 555)
if (override.allowances && (override.allowances as any[]).length > 0) {
  mergedAllowances[empId] = override.allowances...;
}
// else: keep base allowances ($300)  ← BUG
```

The same buggy fallback exists everywhere `effectiveEmployee` is built for net-pay recalculation:

```ts
// lines 885, 1145, 1577-1582
allowances: allowances.length > 0 ? allowances : (employee.allowances || [])
deductions: deductions.length > 0 ? deductions : (employee.deductions || [])
```

So for April 2026:
- The **UI display** uses `employeeAllowances[empId]`, which is `[]` (set by `handleAllowancesSave` after the user cleared) → shows "None". ✓ correct.
- The **Net Pay calculation** uses `effectiveEmployee.allowances`, which falls back to `employee.allowances` (the un-period-aware row from the `allowances` table = $300) → adds $300 → Net Pay $4,000. ✗ wrong.
- After a fresh page reload, the merge logic at lines 173/555 also falls back to base, so even the displayed "None" would flip back to "$300". A second silent symptom.

The fundamental problem: an empty override is indistinguishable from "no override", but they mean different things. An existing override row with `allowances: []` means "user explicitly cleared this month".

## Fix

Treat the **presence of a `payroll_monthly_overrides` row** for the period as the source of truth for that month's allowances/deductions, regardless of whether the override array is empty.

### 1. `src/pages/PayrollProcessing.tsx` — load/merge paths (≈ lines 172–195 and 555–581)

Replace:
```ts
if (override.allowances && (override.allowances as any[]).length > 0) {
  mergedAllowances[empId] = ...override...;
}
```
with:
```ts
if (Array.isArray(override.allowances)) {
  mergedAllowances[empId] = (override.allowances as any[]).map(...);
}
```
Same change for `override.deductions`. This makes an empty override array correctly clear the month's allowances/deductions, instead of silently reverting to the base table.

### 2. `src/pages/PayrollProcessing.tsx` — `effectiveEmployee` builders (lines 885, 1145, 1577–1582)

The "fallback to `employee.allowances` only when override is empty" pattern is also wrong. After fix #1, the merged `employeeAllowances[empId]` is already authoritative for the current period (empty means cleared, non-empty means use those values, missing key means no override → use base).

Change all three call sites from:
```ts
allowances: allowances.length > 0 ? allowances : (employee.allowances || [])
deductions: deductions.length > 0 ? deductions : (employee.deductions || [])
```
to:
```ts
allowances: empId in employeeAllowances ? (employeeAllowances[empId] || []) : (employee.allowances || []),
deductions: empId in employeeDeductions ? (employeeDeductions[empId] || []) : (employee.deductions || []),
```

This makes the calculation match exactly what the UI displays — including when the user has explicitly emptied the list for the current month.

### 3. No DB migration needed

Albert's existing override row (`allowances: []` for 2026-04) is already correct — the bug is purely in the merge/effective-employee logic.

## Files to Edit

- `src/pages/PayrollProcessing.tsx`
  - Lines ~172–195: merge logic in `forceRecalculatePayroll`
  - Lines ~555–581: merge logic in initial load
  - Line ~885: `effectiveEmployee` for save snapshot
  - Line ~1145: `effectiveEmployee` for displayed Net Pay
  - Lines ~1577–1582: `effectiveEmployee` for Payment summary

## Verification

1. Navigate to Payroll → April 2026.
2. CORPUZ ALBERT JR TIGGANGAY row should show:
   - Basic Salary S$3,700
   - Allowances "None" (override is empty)
   - Deductions "None"
   - Claims S$0.00
   - **Net Pay S$3,700** ✓
3. Switch to **March 2026** for the same employee — the override there contains Grading Allowance S$300 + Private Lesson Allowance S$340. Verify Allowances column shows "S$640, 2 item(s)" and Net Pay reflects those allowances.
4. Pick a month with **no override row** (e.g., a future month with no edits) — verify base allowances from the `allowances` table still apply correctly.
5. Edit allowances for any employee, save with an empty list, refresh the page — list must remain empty (no silent revert), and Net Pay must reflect the empty list.
6. Confirm the Payment screen shows the same Net Pay as the Processing screen.
