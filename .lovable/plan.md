# Charge and show 9% GST on invoices

Today every invoice shows "Tax: $0.00". GST will now be added on top of the price, so a $420 grading fee is invoiced as:

```text
Subtotal (before GST):  $420.00
GST (9%):                $37.80
Total:                  $457.80
```

## What changes

1. **Singapore: 9% GST added on top of the listed price.** Australia keeps its existing 10% GST-inclusive treatment.
2. **Every way an invoice is created applies GST**, not just the manual invoice screen:
   - Manual invoices from the branch/superadmin dashboard
   - School fees payments from /fees and /hello
   - Grading, competition, seminar and uniform/guards payment imports
   - Ad-hoc lesson and notice payment invoices
3. **Amounts quoted to parents move up by 9%.** Prices shown in /fees, /hello and the payment chat will display the GST-inclusive amount to pay, so what a parent is asked to transfer always matches the invoice total.
4. **Existing invoices.** Unpaid, draft and sent invoices are recalculated so they show GST and the correct new total. Invoices already paid, verified or cancelled are left untouched — recalculating them would create a balance owed on fees parents have already settled in full. If you want those reissued too, that can be done as a separate pass.
5. **Labelling.** Invoice screens and PDFs show "Subtotal (before GST)" and "GST (9%)" (10% for the Australian branch) instead of "Subtotal" and "Tax", with the GST row always visible.

## Technical notes

- Singapore stays `COUNTRY_TAX_INCLUDED = false` with a 9% rate, so `createInvoice` in `invoiceService.ts` and `InvoiceDialog`'s create/edit maths already compute tax on top. The real gap is line-level `tax_rate` defaulting to 0 — seed it from the branch country in the dialog's item builder and in `createInvoice`.
- The SQL import RPCs (`admin_import_competition_submission`, `admin_import_grading_submission`, `admin_import_seminar_submission_student`, school fees / guards / notice / public-chat invoice creation) hardcode `tax_amount = 0` and `tax_rate = 0`. A migration adds a shared helper that, given a branch and a net line amount, returns the rate and GST, and each RPC uses it for both `invoice_items` and the invoice header (`subtotal`, `tax_amount`, `total_amount`, `balance_due`).
- Public-facing amount calculations (`schoolFeePlan`, `publicChatService`, guards/grading/competition/seminar payment summaries) must add GST to the "amount to pay" they display and store on submissions, so the collected amount matches the invoice.
- A one-off data migration recalculates `invoices.subtotal` / `tax_amount` / `total_amount` / `balance_due` and `invoice_items.tax_rate` / `tax_amount` only for Singapore invoices with status `draft`, `sent`, `overdue` or `partial`.
- PDF totals in `src/utils/invoicePDFGenerator.ts` and on-screen totals in `InvoiceDialog.tsx` / invoice lists get the new labels driven by the invoice's branch rate.
- Accounting postings (`accountingPostings.ts`) already split net and tax, so GST will flow into the GST F5 report once these fields are populated.

# Fuller Edit Student form on /access

The Edit Student box currently only offers belt, branch and status. It will be extended so staff can also correct:

- First name and last name (saved in uppercase, as elsewhere)
- Date of birth (day/month/year pickers, DD/MM/YYYY)
- Main email and main contact number
- Any additional emails and contact numbers already saved for the student (for example a second parent), each listed with a small "x" to remove it, plus an "Add email" / "Add number" option

Withdrawal still stays out of this box and needs superadmin approval. Every change continues to be recorded in the student change log, and edits still require the existing password unlock.

## Technical notes

- Extend `admin_update_student_basic` (SECURITY DEFINER) with optional first/last name, date of birth, email, phone and full replacement arrays for `students.alt_emails` / `students.alt_phones`, keeping the existing explicit-clear pattern so blanking a value is distinguishable from "unchanged". Blocked staff addresses must still be rejected.
- `get_public_student_directory` returns `alt_emails` and `alt_phones` so the dialog can prefill them.
- `studentDirectoryService.ts` gains the new parameters; `StudentsTab.tsx` grows the edit form state, chip-style removable contact rows, and a name/DOB section, with validation on email format and required names.
