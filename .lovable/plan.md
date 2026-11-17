# Fix "Failed to create invoice" for Balmoral staff (Hp96706488)

## Cause
The database rejected the invoice at 07:10 and 07:12 UTC with "new row violates row-level security policy for table invoices". This is the same problem as the earlier "Failed to fetch invoice" error. The staff member is also signed in to a Gaonhae account that is not a superadmin. When anyone is signed in, the app skips the branch-password route and writes the invoice directly. Their account isn't allowed to do that, so the save fails.

Last time I only fixed the payment screen. The same check is still used in three places that create invoices.

## Fix
Use the branch-password route unless the signed-in user is a superadmin. Make this change in:
- Students tab "Create invoice" (`src/components/grading-list/StudentsTab.tsx`)
- Student profile dialog invoice (`src/components/grading-list/StudentProfileDialog.tsx`)
- Conversion dialog (`src/components/conversion/ConversionDialog.tsx`)

Each one changes from `user ? undefined : createAccessInvoice` to `user && userrole === 'superadmin' ? undefined : createAccessInvoice`. Each one reads `userrole` from `useAuth()`, the same way `InvoiceDetailDialog` does.

## Check
Using Hp96706488 in /access, start a Balmoral invoice and stop before saving, so no real invoice is created. Confirm the dialog will save through the password route.
