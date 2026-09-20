# Show GST on invoices

Today every invoice shows "Tax: $0.00" even though Singapore prices include 9% GST. Nothing about what parents pay changes — the invoice will simply break the same total into the amount before GST and the GST portion.

Example for a $420 grading fee:

```text
Subtotal (before GST):  $385.32
GST (9%):                $34.68
Total:                  $420.00
```

## What changes

1. **Singapore prices are treated as GST-inclusive.** Prices stay exactly as advertised; the GST is extracted from the total instead of added on top. Australia already works this way (10%).
2. **Every way an invoice is created gets the GST split**, not just the manual invoice screen:
   - Manual invoices from the branch/superadmin dashboard
   - School fees payments from /fees and /hello
   - Grading, competition, seminar and uniform/guards payment imports
   - Ad-hoc lesson and notice payment invoices
3. **Existing invoices are updated.** For Singapore invoices, the GST portion is computed from the current total. Totals, amounts paid, balances and credits are untouched — only the before-GST and GST figures are filled in.
4. **Labelling.** Invoice screens and PDFs show "Subtotal (before GST)" and "GST (9%)" (10% for the Australian branch) instead of "Subtotal" and "Tax". The GST row shows even when it is zero, so it is never ambiguous.

## Technical notes

- `COUNTRY_TAX_INCLUDED.Singapore` flips to `true` in `src/config/constants.ts`; `createInvoice` in `invoiceService.ts` and `InvoiceDialog`'s create/edit total maths already branch on this flag, so they follow automatically. Verify line-level `tax_rate` is seeded from the branch country rather than defaulting to 0.
- The SQL import RPCs (`admin_import_competition_submission`, `admin_import_grading_submission`, `admin_import_seminar_submission_student`, school fees / guards / notice / public-chat invoice creation) currently hardcode `tax_amount = 0` and `tax_rate = 0`. A migration adds a shared helper that, given the branch country and a gross line amount, returns the GST-inclusive split, and each RPC uses it for both `invoice_items` and the invoice header.
- A one-off data migration backfills `invoices.subtotal` / `invoices.tax_amount` and `invoice_items.tax_rate` / `tax_amount` for existing Singapore and Australia invoices from the stored totals. `total_amount`, `amount_paid` and `balance_due` are left unchanged; refunded/cancelled lines keep their signs.
- PDF totals in `src/utils/invoicePDFGenerator.ts` and the on-screen totals in `InvoiceDialog.tsx` / invoice lists get the new labels driven by the invoice's branch rate.
- Accounting postings (`accountingPostings.ts`) already split net and tax from these fields, so GST will start flowing into the GST F5 report correctly once the fields are populated.

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
