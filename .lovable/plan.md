

## Plan: Superadmin can view & edit invoice date

### Current behavior
- `invoiceService.createInvoice` hardcodes `issue_date` to today (`new Date().toISOString().split('T')[0]`) and recomputes `due_date = issue_date + payment_terms_days`.
- The **Create Invoice** dialog (`InvoiceDialog.tsx`, create mode) has no date input — it only collects Branch + Student + Items.
- The **View / Edit** mode shows the date as read-only text in the summary tile (line 1482) and never updates `issue_date` on save (only `notes`, totals, items).
- All other roles must keep the auto-today behaviour (no surprises for staff).

### Target behavior
- Only when `userrole === 'superadmin'`:
  - **Create mode**: a new `Invoice Date` field appears next to Branch/Student. Defaults to today. Submitting passes the picked date to the service.
  - **Edit mode**: the read-only "Date" tile becomes an editable date input. Saving updates `invoices.issue_date` (and recalculates `due_date = new issue_date + payment_terms_days`).
- For non-superadmins: no UI change, behaviour identical to today.

### Implementation

**1. `src/services/invoiceService.ts`**
- Add `issue_date?: string` to `CreateInvoiceData`.
- In `createInvoice`: if `invoiceData.issue_date` is provided, parse it as the issue date; otherwise fall back to today. Recalculate `due_date` from that issue date + payment terms.

**2. `src/components/sales/InvoiceDialog.tsx`**
- Extend `formData` with `issue_date: string` (default today, format `YYYY-MM-DD`).
- **Create mode (around line 1300-1326)**: change the grid to 3 columns on md when superadmin (or keep 2 cols and add a new row). Render a third field labelled `Invoice Date` using a date input (consistent with project's date helpers — display via `formatDate` for previews but a native `type="date"` for picking is acceptable since this is admin-only and not user-facing presentation; alternatively reuse `<DatePicker>` from `@/components/ui/date-picker` to keep DD/MM/YYYY display and avoid the native-input ban). Field only renders when `isSuperadmin`.
- In `handleSubmit` (around line 960): pass `issue_date: formData.issue_date` into `createInvoice` when `isSuperadmin`.
- Reset `issue_date` to today in `resetForm`.
- **Edit mode (around line 1480-1483)**: replace the static `Date` tile with an inline `DatePicker` when `mode === 'edit' && isSuperadmin`; otherwise keep the existing read-only display.
- Track edited date in local state (e.g., `editIssueDate`), prefilled from `invoice.issue_date` on load.
- In the edit-save block (line 1089), when `isSuperadmin`, include `issue_date: editIssueDate` and recompute `due_date` from `editIssueDate + (invoice.payment_terms_days ?? 30)` in the same `update` call.
- Log the date change via existing `logInvoiceChange` so the change history shows the edit.

**3. Date-format compliance**
- Per project memory, all user-facing dates display as DD/MM/YYYY via `@/utils/dateFormat`. The picker UI uses the existing shadcn `DatePicker` (calendar popover) so the displayed date follows DD/MM/YYYY. Internally the value is stored as ISO `YYYY-MM-DD` (DB format) — no native `<input type="date">`.

**4. Approval flow interaction**
- Editing a paid/verified invoice still routes through `handleSaveWithApproval`. When non-superadmin (current path), no date field is shown — unchanged.
- For superadmin direct edits on paid/verified invoices, the date update is applied immediately alongside other changes (consistent with existing superadmin-bypasses-approval pattern).

### Verification
- Login as superadmin → Branch dashboard → Create Invoice → confirm `Invoice Date` field appears, defaults to today, accepts past/future dates, persists to `invoices.issue_date`.
- Open existing invoice → Edit → date tile is editable → change date → Save → invoice list shows new issue date and due date shifts accordingly; change log records "Issue date changed".
- Login as branch staff (non-superadmin) → Create/Edit invoice → no date field visible, behaviour unchanged.

### Out of scope
- Editing `due_date` independently (it always tracks `issue_date + payment_terms_days`).
- Bulk date edits.

