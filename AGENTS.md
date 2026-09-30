# Project architecture

- Resolve invoice PDFs through the saved active template for each invoice's own branch country, never a generic country fallback, so branding and payment details stay accurate after branch changes.
- Public invoice-detail SECURITY DEFINER functions attach only the matched invoice's country template; `/hello` uses its session-validated invoice list to preserve access checks.
- Shared `/access` staff-list presentation uses `.access-list-table` with row `data-label`/`data-field` attributes, so phone rows can be labelled without changing table actions or queries.