# Project architecture

- Resolve invoice PDFs through the saved active template for each invoice's own branch country, never a generic country fallback, so branding and payment details stay accurate after branch changes.
- Public invoice-detail SECURITY DEFINER functions attach only the matched invoice's country template; `/hello` uses its session-validated invoice list to preserve access checks.
- Shared `/access` staff-list presentation uses `.access-list-table` with row `data-label`/`data-field` attributes, so phone rows can be labelled without changing table actions or queries.
- `/hello` reusable passport photos and Poom/Dan certificates are private `student-photos` objects, uploaded and previewed only after a server-validated recognized-student chat session; competition forms copy authorized images into each submission and save new profile copies only when the default-on switch remains enabled, so later replacements never alter past entries.