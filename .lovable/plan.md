# Clickable student names and invoice numbers on /access

Across every list on /access (School fees, Students, Grading, Competitions, Seminars, Uniforms & Guards):

- Every student name that is linked to a student record opens the student card (details + their invoices). Names not yet matched to a student stay plain text, as today.
- Every invoice number becomes tappable and opens a read-only invoice card: the invoice as it would be printed, plus Open/Print and Download PDF buttons. No editing from here.
- Rows that have an invoice but currently show no number (Grading, Competitions, Seminars, Uniforms & Guards) will show the invoice number next to the status, so it can be tapped.
- Inside the student card, each invoice row also gets a Download PDF button alongside the existing expandable items and payments.

## What changes where

| List | Student name | Invoice number |
|---|---|---|
| School fees | already clickable | already opens a preview — switches to the shared card |
| Students | already clickable | invoice numbers in the student card become tappable with PDF |
| Grading | desktop rows clickable; mobile cards to be covered too | new, tappable |
| Competitions | desktop + mobile card headers | new, tappable |
| Seminars | rows clickable | new, tappable |
| Uniforms & Guards | rows clickable | new, tappable |

## Technical details

Database (one migration):
- Add `invoice_number text` to the public list functions that already return an invoice id/status: `get_public_grading_list`, `get_public_competition_list`, `get_public_seminar_list`, `get_public_guards_list` (exact names confirmed at implementation time), joined from `public.invoices`. Signatures unchanged, so generated types refresh automatically.
- No new access surface: these RPCs are already SECURITY DEFINER and read by /access. Invoice detail already has `get_public_invoice_detail(uuid)`.

Frontend:
- New `src/components/grading-list/InvoiceDetailDialog.tsx`: props `{ invoiceId, invoiceNumber?, open, onOpenChange }`. Loads `getPublicInvoiceDetail(invoiceId)` from `invoiceRefundService`, renders the PDF with `getInvoicePDFBlob` in an iframe (object URL revoked on close), with Open/Print and Download buttons — the same behaviour the School fees tab has today, extracted so all lists share it.
- New `src/components/grading-list/InvoiceNumberButton.tsx`, mirroring `StudentNameButton`: link-styled when an invoice id exists, plain text otherwise, click stops propagation.
- `SchoolFeesTab.tsx`: replace its private invoice preview dialog and PDF effect with the shared dialog (keeps `getSchoolFeesInvoiceDetail` behaviour by passing the resolved invoice id).
- `PublicGradingList.tsx` (grading, competitions, guards tables and mobile cards), `SeminarsTab.tsx`, `PublicGuardsPurchaseList.tsx`: render `InvoiceNumberButton` next to the status badge / Refund button using `invoice_id` / `matched_invoice_id`, and mount one `InvoiceDetailDialog` per tab driven by a `invoiceDialogId` state.
- `StudentProfileDialog.tsx`: invoice number in each row becomes a button opening `InvoiceDetailDialog`; expand chevron keeps its current behaviour.
- Sweep all six lists for any remaining student-name renders (mobile card headers especially) not yet using `StudentNameButton` and wire them.

Verification: typecheck, build log, and a click-through of each /access tab.

## Out of scope

- Editing invoices or student data from these cards.
- Staff dashboards (branch, superadmin, sales) — unchanged.
