# View-only password: open student details + download certificates

## What the user gets (password Hp87783395)
- Student names in Attendance become clickable again and open the student details window.
- In that window: no Edit, no Create invoice, no Upload certificate, no conversion actions.
- Clicking an invoice number still shows the invoice, but without Edit, Delete, Record Payment, Pay or Refund buttons. Viewing/downloading the invoice PDF stays.
- Grading history shows the certificate download icons, and downloading works.

## Technical details
- `AttendanceTab.tsx`: revert the plain-text names; keep `StudentNameButton`, pass `canEdit={false}` and `readOnly={viewOnly}` to `StudentProfileDialog`.
- `StudentProfileDialog.tsx`: new `readOnly` prop, forwarded to `InvoiceDetailDialog`. Edit/invoice/conversion are already hidden when `canEdit` is false.
- `InvoiceDetailDialog.tsx`: new `readOnly` prop hides the edit/delete/payment/refund action buttons; PDF view/download buttons remain.
- Migration: switch `access_student_grading_records` from the write scope check to `_access_scope_read` so the view-only password can load grading history (needed for certificate downloads). All write functions keep refusing view-only passwords.
