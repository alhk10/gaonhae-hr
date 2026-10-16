# Payroll: finish the last open items

## 1. CPF moves into step 2
- **Step 2 "Confirm CPF & Bank"** shows the bank payment list and the CPF list on one screen, with the existing exports. Nothing on this screen can be edited.
- **Step 3 "Finalise & Payslips"** has only the Finalise button and the payslip list (download each, or email all).

## 2. Casual staff in the same flow
- Review gets a "Casual" section in the same compact style. Each row shows sessions, rate, claims, gross and net pay.
- Casual staff also appear in the step 2 bank list and the step 3 payslip list. Their payslips are downloaded as casual payslips.

## 3. Tests
- All three steps report the same net total.
- Casual net pay = slot pay + claims − employee CPF.
- Recalculate keeps the manual edits you made for the month.

## 4. Check
- Open September 2026 signed in as superadmin. Tan Zun Wen should show about S$990, and the totals should match on every step.

## Technical details
- Pull the totals into a small `payrollTotals.ts` helper. The step screens and the tests both use it.
- Casual rows read from `payrollState.casualEmployees`. Payslips use `casualPayslipPDFGenerator`.
- Recalculate keeps edits because it only deletes the `PERIOD_` cache, never `payroll_monthly_overrides`. A test will confirm the override merge.
