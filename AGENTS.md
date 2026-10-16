# Project architecture

- Staff slot capacity uses the shared `slotCapacity` weekday and availability helpers, never display-formatted dates as configuration keys, so calendars and branch moves agree on daily limits.

- Resolve invoice PDFs through the saved active template for each invoice's own branch country, never a generic country fallback, so branding and payment details stay accurate after branch changes.
- Public invoice-detail SECURITY DEFINER functions attach only the matched invoice's country template; `/hello` uses its session-validated invoice list to preserve access checks.
- Shared `/access` staff-list presentation uses an `.access-list-shell` container and `.access-list-table` field markers, so rows flow into labelled two-line layouts based on available list width without changing actions or queries.
- `/hello` reusable passport photos and Poom/Dan certificates are private `student-photos` objects, uploaded and previewed only after a server-validated recognized-student chat session; competition forms copy authorized images into each submission and save new profile copies only when the default-on switch remains enabled, so later replacements never alter past entries.
- Convert invoice-edit overpayments through the database function keyed by invoice reference, so the existing invoice reaches zero balance and repeated saves cannot duplicate student credits.- Payroll month adjustments (pro-ration, unpaid/excess annual leave, encashment) come from `payrollAdjustmentsService` and are applied through `computeFullTime` in Payroll Processing, so review, bank and CPF steps always agree.
