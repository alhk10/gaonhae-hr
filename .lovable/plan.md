# Ariel (WIN LUN ARIEL CHANG) – no grading pop-up on /hello

## What I found
- Ariel is ticked "Ready for grading" for 2026 Term 4 at Carpe Diem Stradia, and her grading is not yet paid.
- /hello only shows the grading pop-up when the student has paid at least 50% of the current term's class fees (or staff set a fee exception).
- Ariel has **no Term 4 class-fee invoice** at all (her only recent invoice is the Foundation 2 >> 3 grading fee from October). So /hello treats her as "term fees not paid" and hides the pop-up and the grading option.
- Carpe Diem Stradia class fees are billed to the school through external invoices, not to each child. So every Carpe Diem student will hit this same block, not just Ariel.

## Fix
1. Treat students at branches whose class fees are paid by the partner/school (Carpe Diem Stradia) as having paid term fees for grading, on both /hello and the /access "Ready for grading" check, so both pages agree.
2. Add a "Term fees paid by partner" switch per branch in settings (all-branch password / superadmin only), turned on for Carpe Diem Stradia, so other partner branches can be added later.
3. After the change, confirm Ariel sees the "Register & pay for grading" pop-up on /hello and her Foundation 3 grading fee is offered.

## Technical details
- New boolean `branches.term_fees_external` (default false), set true for Carpe Diem Stradia.
- `hello_grading_eligibility` and `access_grading_term_fee_status`: `term_eligible` true when the student's home branch has `term_fees_external`.
- Gated setter RPC via `_settings_guard(..., require_all => true)`.
- Add a test asserting partner-branch students are grading-eligible without a class invoice.
