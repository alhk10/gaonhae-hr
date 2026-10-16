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
- **Excess annual leave counts as unpaid.** Once someone's approved annual leave for the year goes past their entitlement (base days + service bonus + Monday-holiday days), the extra days in that month are deducted as unpaid leave. For example, with 14 days allowed and 16 taken, 2 days are deducted in the month they went over. The row shows "2 excess AL days" and the amount can be overridden.

## Layout
- Uses the full screen width, with no narrow centred box. The table grows to fill wide screens.
- Columns adjust to the space available. On medium screens, less important columns (CPF split, deductions) fold into the row, and on phones each person becomes a compact 2-line card.
- A sticky top bar holds the month picker, the step tabs and the totals (Gross, CPF, Claims, Net), which stay visible while scrolling.
- Names on the left and net pay on the right stay fixed while the table scrolls sideways.
- Clean, minimal text: short labels, figures right-aligned, and colour only for warnings and net pay.

## Speed
- Load the month in a few combined requests instead of separate queries for each employee.
- Split the 2,200-line payroll page into smaller pieces so it opens and updates quickly.

## Technical details
- New `src/utils/payrollProration.ts`: `proRateSalary(base, joinDate, resignDate, period)`, `unpaidLeaveDeduction(base, days, period)` (both based on calendar days), and `excessAnnualLeaveDays(entitlement, takenBeforeMonth, takenThisMonth)`. The last one counts only the days that go past the entitlement in this month, so later months don't deduct the same days again. Entitlement comes from the existing `calculate_annual_leave_entitlement` RPC. Tests cover 27/09 resignation = 27/30, a mid-month join, a full month, 14 allowed / 16 taken = 2 excess, and no double-counting across months.
- Payroll inputs per employee: base, proRate, allowances, deductions, approvedClaims, unpaidLeaveDays, encashment. The figures are calculated with the existing `calculateFullTimePayroll` (encashment is already supported). Manual overrides are stored in `payroll_monthly_overrides` (adding fields for `salary_override`, `unpaid_leave_days_override` and `encashment_override` if they are missing).
- Data loaded per month: employees, approved `leave_requests` overlapping the month, `leave_encashment_records`, approved `claims`, overrides and slot bookings. These run in parallel using react-query.
- Restructure `PayrollProcessing.tsx` into `ReviewStep`, `ConfirmStep` and `FinaliseStep`, plus an inline `AllowanceCell`. Remove the separate payment step and CPF step pages, and stop using the per-item allowance dialogs.
- Finalising marks the included claims as paid and saves `payroll_records` the same way as today.
- Keep the final-month rule (`isEmployedInPeriod`).
