# Streamlined payroll: 3 short steps with claims and leave built in

## Goals
- Faster loading and fewer clicks.
- Leave, claims and part-month pay show up automatically in each person's pay.
- Every amount can still be changed by hand for that month.

## The new flow
```text
1. Review  ->  2. Confirm CPF & Bank  ->  3. Finalise & Payslips
```

**1. Review (one table per month)**
Each row shows: Name | Salary (pro-rated) | Allowances | Claims | Leave | Deductions | CPF | Net pay.
- **Salary pro-rated by default** for joiners and leavers, using days employed out of days in the month (e.g. resigned 27 Sep = 27/30). A small "Pro-rated" tag shows on the row; click the amount to override it.
- **Claims**: approved, unpaid claims for the month are added automatically, with a count you can click to see each claim.
- **Leave**: shows leave taken this month and the remaining balance. Unpaid leave days are deducted pro-rata, and approved leave encashment is added. Both can be overridden.
- **Allowances / deductions**: edit inline in the row with a quick add (type + amount), instead of opening a separate dialog for each one. Changes save to that month only.
- Casual staff keep their slot-based pay, shown in the same table under a "Casual" tab.
- A warning strip lists anything missing, such as no bank account or a negative net pay.

**2. Confirm CPF & Bank**
One combined screen: the CPF summary (employee, employer and SDL) and the bank payment list, with the existing exports.

**3. Finalise & Payslips**
Lock the month. Claims included in it are marked as paid. Payslips are generated, with an option to email them.

## Leave setup
- Add an **Unpaid Leave** leave type (none exists today). Staff can then request it through the normal leave process, and payroll deducts it.

## Speed
- Load the month in a few combined requests instead of separate queries for each employee.
- Split the 2,200-line payroll page into smaller pieces so it opens and updates quickly.

## Technical details
- New `src/utils/payrollProration.ts`: `proRateSalary(base, joinDate, resignDate, period)` and `unpaidLeaveDeduction(base, days, period)`, both based on calendar days. Tests cover 27/09 resignation = 27/30, a mid-month join, and a full month.
- Payroll inputs per employee: base, proRate, allowances, deductions, approvedClaims, unpaidLeaveDays, encashment. The figures are calculated with the existing `calculateFullTimePayroll` (encashment is already supported). Manual overrides are stored in `payroll_monthly_overrides` (adding fields for `salary_override`, `unpaid_leave_days_override` and `encashment_override` if they are missing).
- Data loaded per month: employees, approved `leave_requests` overlapping the month, `leave_encashment_records`, approved `claims`, overrides and slot bookings. These run in parallel using react-query.
- Restructure `PayrollProcessing.tsx` into `ReviewStep`, `ConfirmStep` and `FinaliseStep`, plus an inline `AllowanceCell`. Remove the separate payment step and CPF step pages, and stop using the per-item allowance dialogs.
- Finalising marks the included claims as paid and saves `payroll_records` the same way as today.
- Keep the final-month rule (`isEmployedInPeriod`).
