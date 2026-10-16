# Finish the payroll overhaul (remaining parts)

The warning list and "claims marked as paid" are done. This plan covers what is still missing.

## 1. Rebuilt three-step flow
- **Review**: the full-width table you edit inline, with the warning list on top.
- **Confirm CPF & Bank**: a read-only summary. It shows totals, the CPF file and the bank file, all using the same figures as Review.
- **Finalise & Payslips**: locks the month and creates payslips. You can download each one or email them all.
- A stepper across the top. You can't move to the next step while red (blocking) warnings remain.

## 2. Month locking
- Each month is marked Draft, Confirmed or Finalised.
- A finalised month is read-only. Only a superadmin can reopen it.

## 3. Casual staff in the same layout
- A compact table: sessions/hours, rate, claims, gross and net pay.
- Casual staff go through the same Review, Bank and Finalise steps as full-time staff.

## 4. Recalculate that keeps manual edits
- On draft months, Recalculate re-runs pro-rating and the leave deductions.
- Amounts you changed by hand stay as you set them.

## 5. Check it works
- Tests for:
  - totals match across all three steps
  - casual pay
  - Recalculate keeps manual edits
- Open September 2026 signed in as superadmin. Tan Zun Wen should show about S$990, and the totals should match on every step.

## Technical details
- Split `PayrollProcessing.tsx` into `ReviewStep`, `ConfirmStep` and `FinaliseStep`. All three read from `payrollAdjustmentsService` + `computeFullTime` and `sumNet`.
- New `payroll_periods` table (period, status, finalised_at, finalised_by). Status changes go through a SECURITY DEFINER RPC that checks superadmin via `has_role`. RLS lets staff read it and lets only superadmins write.
- Recalculate merges the fresh figures with the `payroll_monthly_overrides` rows and never deletes them.
- Payslip PDFs reuse `payslipPDFGenerator` / `casualPayslipPDFGenerator`. Emails use the existing `send-payslip-email` function, which needs `RESEND_API_KEY`. If that key is missing, the app shows a message and download still works.
