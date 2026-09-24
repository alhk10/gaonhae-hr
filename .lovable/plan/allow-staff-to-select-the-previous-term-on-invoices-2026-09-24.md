# Allow staff to select the previous term on invoices

## Goal

When staff create or edit an invoice (Create New Invoice dialog), the Term dropdown for class items currently only shows terms that haven't ended yet. Staff sometimes need to bill for the term that just finished. This change adds the **immediate previous term** to that dropdown.

## What changes

- The Term dropdown in the staff invoice dialog shows:
  - the most recent term that has already ended (the immediate previous term), plus
  - the current and all upcoming terms, as today.
- Only the one immediately preceding term is added — older terms stay hidden to keep the list short.
- The automatic term pre-selection is unchanged: it still defaults to the first term without an existing invoice, preferring current/upcoming terms. The previous term is only used when staff pick it manually.
- Selecting the previous term works like any other term: class schedule picker, slot selection, and pricing behave the same.

## What does not change

- Student portal and /hello term choices stay as they are (no past terms for parents).
- No database changes.

## Technical detail

- `src/components/sales/InvoiceDialog.tsx`, two spots (`loadBranchTerms` ~line 677 and `refreshTermSelection` ~line 872):
  - Both query `term_calendars` with `.gte('end_date', today)`, which excludes past terms.
  - Change to: fetch active terms for the branch ordered by `start_date`, then keep all terms with `end_date >= today` plus the single most recent term with `end_date < today`.
  - In `refreshTermSelection`, keep the existing auto-pick loop over current/upcoming terms only, so the previous term is never auto-selected.
