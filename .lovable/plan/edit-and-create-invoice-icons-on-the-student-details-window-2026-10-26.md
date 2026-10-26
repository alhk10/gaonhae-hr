# Edit and Create Invoice icons on the student details window

Add two icon buttons next to the student's name in the student details window (the one that opens when you click a name in Attendance, Students and the other lists).

## What changes
- **Pencil icon (Edit):** opens the same Edit student window used in the Students tab, with the same fields, rules and permissions. For example, only Hp97533488 sees the Employee switch. Saving refreshes the details window.
- **Invoice icon (Create invoice):** opens the same New invoice window used in the Students tab, with this student and their branch already filled in. Saving refreshes the student's invoice list in the details window.
- The icons only show when staff are allowed to edit or invoice under the current password. Branch passwords stay locked to their own branches.

## Technical details
- Move the Edit dialog (its state, `openEdit`, save handler and JSX) out of `StudentsTab.tsx` into a reusable `StudentEditDialog` that takes a `PublicStudentDirectoryRow` plus `onSaved`. StudentsTab keeps its current behaviour by rendering that component.
- Make a matching `StudentInvoiceLauncher` that wraps `InvoiceDialog` + `createAccessInvoice` the way StudentsTab does now.
- `StudentProfileDialog` takes optional `canEdit`/`lockedBranchId` props and adds Pencil/FileText icon buttons in the header. The student row they need comes from the existing directory service, looked up by id.
- Attendance and Students pass the edit permission through. Other lists get the icons too, using the same permission check.
- No database changes.
