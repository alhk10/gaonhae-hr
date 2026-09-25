# Add a + button to the Invoices section of the student details dialog

## Goal

Staff viewing a student's details (e.g. from the branch dashboard student list) can create a new invoice for that student directly from the dialog, without going back to the invoice list.

## What changes

1. **+ button in the Invoices section header** (`src/components/dashboard/StudentDetailsDialog.tsx`)
   - Small ghost icon button (Plus icon) next to the "Invoices" heading, aligned right.
   - Clicking it opens the existing Create Invoice dialog.

2. **Reuse the existing Create Invoice dialog** (`src/components/sales/InvoiceDialog.tsx`)
   - Open it in `create` mode with `prefilledStudentId` set to the student's id and `branchId` set to the dialog's branch — the student is preselected and locked in, same as creating an invoice from the student list.
   - Rendered as a controlled dialog inside StudentDetailsDialog (state: `invoiceDialogOpen`), so it layers on top of the details dialog.

3. **Refresh after creation**
   - On invoice created, invalidate the `student-invoices-dialog` query so the new invoice appears in the list immediately, and call `onStudentUpdated` if provided.

## Technical details

- `InvoiceDialog` already supports `mode="create"`, `prefilledStudentId`, `branchId`, `open`/`onOpenChange`, and `onInvoiceCreated` — no changes needed there.
- New imports in StudentDetailsDialog: `Plus` (lucide), `InvoiceDialog`, `useQueryClient`.
- No database changes.

## Notes

- Branch-scoped staff (/access passwords) use the public student profile dialog, not this one — this change affects the staff dashboard dialog only.
