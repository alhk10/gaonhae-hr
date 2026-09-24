# Fix "column st.name does not exist" when opening invoices in /access

## Problem
Invoice details in /access (School Fees, and anywhere else an invoice number is clicked) fail to open. The invoice lookup asks for the student's "name" and "address", but student records store first name and last name separately and have no address field.

## Fix
- Build the student name from first name + last name (falling back to display name).
- Drop the address field, or use it only if a real address field exists.
- Apply the same fix to both invoice lookups that have this mistake: the general invoice view and the school-fees invoice view.
- Open INV-202609-0390 (Tan Wee Liong) and INV-202609-0386 (Javen Gan) to confirm the details, items and PDF download now load.

## Technical details
- Migration: recreate `get_public_invoice_full` and `get_public_school_fees_invoice`, replacing `st.name` with `trim(concat_ws(' ', st.first_name, st.last_name))` (coalesce with `st.display_name`), and removing `st.address` (return null) unless the students table has an address column. Keep SECURITY DEFINER and the existing grants.
- Verify by calling both RPCs for the two invoices above.
