# Show "Add invoice" to all /access users, not just signed-in staff

## Problem

On the /access Students tab, the "Add invoice" button is hidden for anyone who unlocked /access with a password but isn't signed in with a staff account (`canInvoice = !!user` in `StudentsTab.tsx`). The Create Invoice dialog saves straight to protected tables, which only works for signed-in staff — so password-only staff currently can't use it.

## Goal

Every /access login (all branch passwords and the all-branch password) sees the Add invoice button and can successfully create an invoice for a student, same as signed-in staff.

## What changes

1. **Show the button to everyone** (`src/components/grading-list/StudentsTab.tsx`)
   - Remove the `canInvoice = !!user` gate so the button renders for all /access sessions.

2. **New database function for password-only staff** (Supabase migration)
   - `create_access_invoice(...)` — a SECURITY DEFINER function following the same pattern as the existing `admin_update_student_basic` used for /access student edits.
   - Accepts: student id, branch id, line items (product, description, quantity, unit price, tax, size variant, metadata), discount/credit info, term, and notes.
   - Server-side it: validates the student and branch exist, generates the invoice number, inserts the invoice and its line items, applies GST per the branch country, applies student credits first (same as the normal flow), and creates class slot bookings / entitlements for lesson items — mirroring what the dialog does today.
   - Returns the new invoice id and number.

3. **Dialog save path** (`src/components/sales/InvoiceDialog.tsx`)
   - Add an optional `onSubmitOverride` prop. When set (password-only /access session), the dialog skips its direct table writes and calls `create_access_invoice` with the same calculated payload instead — all pricing, GST, sibling/early-payment discounts and credit logic in the dialog stay unchanged.
   - `StudentsTab` passes the override only when there is no signed-in user; signed-in staff keep the existing direct save.

## Notes

- No change to invoice numbering, PDFs, approvals, or the signed-in staff flow.
- The new function is executable by anonymous callers like the other /access admin functions, so it will appear in the security linter alongside the existing ones — same accepted risk level as current /access edits.

## Verification

- Typecheck + build.
- Create a test invoice as a password-only /access session and confirm it appears in the student's invoice list with correct items, GST and total.
