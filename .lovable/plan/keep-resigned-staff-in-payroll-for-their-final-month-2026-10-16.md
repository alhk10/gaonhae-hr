# Keep resigned staff in payroll for their final month

## What I found
ZUN WEN TAN (EMP1785602565059, Full-Time) has a resign date of 27/09/2026. The Payroll Processing page hides **anyone with a resign date at all**, whatever month is being processed. That is why he is missing from September 2026.

## What changes
- A staff member shows in payroll for every month up to and including the month of their resign date. They drop off from the following month. For example, Zun Wen appears in Sep 2026 and is gone from Oct 2026.
- This applies to every payroll step that hides resigned staff: the Processing list, the Payment/bank list, the CPF list and the active-staff count.
- His pay is still worked out the usual way, at the full monthly salary. If his final month should be partial, you can change the amount with the existing edit button. Automatic part-month pay is not part of this change.
- Other pages (Employees, Leave, Claims) are not changed.

## Technical details
- In `src/pages/PayrollProcessing.tsx`, add `isEmployedInPeriod(emp, selectedPeriod)`. It returns true when there is no resign date, or the resign date falls on or after the first day of the selected period.
- Replace each `!emp.resignDate` / `!employeeInfo.resignDate` check (lines ~990, 1007, 1030, 1585, 1635, 1824) with this helper.
- Confirm Zun Wen's September row is calculated (he should be included in `payrollState`). If the calculation also leaves him out, apply the same rule there.
- Put the helper in a small utility and add a test: resigned 27/09/2026 is included for September 2026 and excluded for October 2026.
