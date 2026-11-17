# Import students and invoices from GaonhaeX (x.gaonhae.app)

## Getting the data
This chat can read GaonhaeX's code but not its records. So the first step is:
1. In the GaonhaeX project chat, ask for CSV exports of **students**, **invoices**, **invoice items** and **payments** (all records).
2. Upload those files here.

## What gets built in /access (all-branch password Hp97533488 and superadmin only)
A new **Import from GaonhaeX** page with a review list:
- Each imported student shows its best match here (same name + date of birth, then phone/email), with a confidence label: Exact, Likely, or No match.
- Staff choose per row: **Link to this student**, **Pick another student**, or **Create new student**. Nothing is saved until confirmed.
- Existing student details are kept; GaonhaeX details only fill new students.
- Confirmed matches are remembered, so re-running the import never duplicates students.

## After a student is confirmed
- Their invoices and line items are copied in under the student's home branch, keeping the original GaonhaeX invoice number as a reference (re-importing skips ones already copied).
- Payments come across as **pending** so staff verify them in the normal payments flow; invoice balances then update as usual.
- Prices and GST are kept exactly as on the original invoice (no re-pricing).
- Every import is logged (who, when, which records).

## Technical details
- Check out GaonhaeX code to map its columns (students, invoices, items, payments, branches) to this schema.
- Staging tables `import_x_students`, `import_x_invoices`, `import_x_items`, `import_x_payments` with `source_id`, `matched_student_id`, `status`; GRANTs + RLS, written only via all-branch-gated SECURITY DEFINER functions.
- `access_import_x_confirm(p_password, p_source_student_id, p_student_id|null)` creates/links student and copies invoices with `metadata.source='gaonhaex'`, `source_ref` unique index for idempotency; payments inserted `status='pending'`, letting `recalc_invoice_from_payments` run.
- Invoice insert trigger skips auto-enrolment/entitlement side effects for imported historical invoices unless the term is current (to confirm with mapping).
- Branch mapping table confirmed by staff before first import.
