# Project architecture

- Resolve invoice PDFs through the saved active template for each invoice's own branch country, never a generic country fallback, so branding and payment details stay accurate after branch changes.
- Public invoice-detail SECURITY DEFINER functions attach only the matched invoice's country template; `/hello` uses its session-validated invoice list to preserve access checks.
- Shared `/access` staff-list presentation uses `.access-list-table` with row `data-label`/`data-field` attributes, so phone rows can be labelled without changing table actions or queries.
- `/hello` passport photos are private `student-photos` objects, uploaded and previewed only after a server-validated recognized-student chat session; competition forms reuse the authorized image as a new submission upload, never by exposing a permanent photo URL.