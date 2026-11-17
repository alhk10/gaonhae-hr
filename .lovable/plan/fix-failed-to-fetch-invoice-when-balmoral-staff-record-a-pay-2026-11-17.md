# Fix "Failed to fetch invoice" when Balmoral staff record a payment in /access

## What is happening
- Hp96706488 is the Balmoral branch password.
- In /access, the invoice window decides how to record a payment based only on whether the browser is also signed in to a Gaonhae account. That account can be any account, not only a staff one.
- If it is signed in, the window uses the head-office payment form. That form reads the invoice directly, and the database hides invoices the signed-in account isn't allowed to see. It finds no invoice and shows "JSON object requested, multiple (or no) rows returned".
- On the same device, sign-in records show a non-superadmin account (alhk10@gmail.com) logged in at gaonhae.app just before the error. That fits this cause, but I haven't confirmed that account was the one signed in at the time.

## Fix
- In the /access invoice window, only use the head-office forms (Record Payment, Edit, Refund) when the signed-in account is a superadmin.
- Everyone else, including a branch password used while some other account is signed in, gets the password-checked forms that already work for branch staff. The proof upload, PayNow QR and reference number stay the same.
- Fix the same check in the other /access places that pick a form by "signed in" (payment, edit and refund dialogs).

## Check
- Sign in as a non-superadmin test user, unlock /access with a branch password, open a Balmoral unpaid invoice, record a PayNow payment with an image, and confirm it saves as pending and the balance updates. Repeat at phone width.

## Technical details
- `InvoiceDetailDialog.tsx`: replace `signedIn = !!user` with `signedIn = !!user && isSuperadmin` (from `useIsSuperadminUser`) for choosing `CreatePaymentDialog` vs `AccessRecordPaymentDialog`, `InvoiceDialog` `onSubmitOverride`, and `RefundAsCreditDialog publicMode`.
- `rg` other grading-list components for `!!user` gating direct-table writes and apply the same rule.
