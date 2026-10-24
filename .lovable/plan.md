# Show term details on invoice PDFs

The PDF already can print a grey term line under a class item (e.g. "Term 4 2026 (05 Oct - 12 Dec)"), but the invoice viewer used in /access, Branch Dashboard invoice popups and /hello loads items without their term, so nothing shows (as in the screenshot).

## Changes
1. Update the invoice lookup database function so each item also returns its term name, start date and end date (read from the item's saved term).
2. In the shared invoice loader, turn that into the term line, e.g. `Term 4 2026 (05/10/2026 - 12/12/2026)`, and keep the term reference so the Qty column stays hidden for classes.
3. Check the other PDF paths (Sales list, Student and Branch dashboards, /hello) use the same DD/MM/YYYY term format.

## Result
Class lines like "Little Gaonhae 1x Weekend" will show the term name and dates directly below, on every invoice PDF.

## Technical details
- Migration: replace `get_public_invoice_full` adding `term_id`, `term_name`, `term_start`, `term_end` per item via join on `invoice_items.metadata->>'term_id'`, keeping existing access checks and template logic.
- `src/services/publicInvoiceService.ts`: map to `term_info` and `metadata.term_id`.
