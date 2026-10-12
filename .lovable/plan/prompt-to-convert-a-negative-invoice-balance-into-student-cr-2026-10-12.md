# Prompt to convert a negative invoice balance into student credit

## Goal
When saving an edited invoice whose paid amount exceeds its recalculated total, prompt staff to add the excess to the student’s available credits.

For the shown invoice, the prompt would offer **$10.90** as credit. The database currently confirms invoice `INV-202610-0036` has a **-$10.90** balance and no matching credit entry.

## Changes
1. **Detect the overpayment on Save**
   - Compare the edited invoice total with its recorded paid amount.
   - If the resulting balance is negative, show a confirmation before saving: “This invoice is overpaid by $10.90. Add this amount to the student’s credits?”
   - Cancelling the prompt stops the save, preventing an unresolved negative balance.

2. **Save the invoice and credit together**
   - Add a secure database function that locks the invoice, recalculates the excess, updates the existing invoice balance to **$0.00**, and creates one `overpayment` credit for exactly the excess.
   - Keep the original payment and existing invoice; do not create or duplicate either.
   - Use a stable invoice-based reference so repeated saves cannot add the same credit twice.

3. **Keep approval behavior consistent**
   - Superadmin saves apply the credit immediately.
   - If a paid/verified invoice edit requires superadmin approval, include the proposed overpayment credit in the existing adjustment request and apply it only when approved.

4. **Refresh the result**
   - After saving, refresh the invoice and student credit data.
   - Show a success message containing the credited amount; the invoice should show **$0.00 Balance Due**.

## Technical details
- Update the edit-save flow in `InvoiceDialog` rather than the create-payment flow, because this negative balance is produced when an existing paid invoice total is reduced.
- Reuse `student_credits` with type `overpayment`, but enforce idempotency in the database because that table currently has no unique reference constraint.
- Record the invoice adjustment and credit addition in invoice history.

## Verification
- Test an edited invoice with paid **$517.75** and new total **$506.85**: prompt shows **$10.90**, one credit is created, and balance becomes **$0.00**.
- Save the same invoice again: no second credit is created.
- Test no-overpayment, already-credited, cancelled-prompt, and approval-required cases.
