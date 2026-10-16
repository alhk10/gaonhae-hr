# Finish the payroll overhaul

These are the parts of the approved payroll plan that are still missing.

## 1. A real three-step flow
- **Review**: one full-width table with salary, allowances, claims, leave, deductions, CPF and net pay. Monthly edits happen inline.
- **Confirm CPF & Bank**: a read-only summary of totals, the CPF file and the bank file, built from the same figures as Review.
- **Finalise & Payslips**: locks the month, marks the claims included in it as paid, and creates payslips. Each payslip can be downloaded, or all of them sent by email.
- A stepper at the top. You can't move to the next step until the current one has no blocking issues.

## 2. Warning strip (Review step)
A short list of problems to fix first, for example:
- missing bank details
- a part-month employee whose pay was pro-rated
- excess annual leave that was deducted
- claims still waiting for approval
- an employee whose figures were edited by hand

## 3. Casual staff
Casual staff get the same compact layout: sessions/hours, rate, claims, gross and net. They appear in the same Review → Bank → Finalise flow.

## 4. Recalculate saved months
A "Recalculate" button for draft months that haven't been finalised. It reapplies pro-rating and leave deductions but keeps your manual edits.

## 5. Check it works
- Small tests for: claims marked paid only once, totals matching across steps, and casual pay.
- Open September 2026 as a signed-in superadmin. Check that Tan Zun Wen shows about S$990 and that the totals match across all three steps.

## Technical details
- Keep `payrollAdjustmentsService` + `computeFullTime` as the single source of truth; the Bank/CPF steps read only from them.
- Add `paid_in_payroll_month` to claims, set in an idempotent finalise RPC (SECURITY DEFINER, superadmin check through `has_role`).
- Generate payslips client-side as PDFs. Email sending uses the existing email edge function if there is one; otherwise it is left for later.
- Store month status (draft/confirmed/finalised) in Supabase so the month locks.
