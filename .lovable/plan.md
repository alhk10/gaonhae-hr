# Fix: Create Invoice dialog shows no data for password-only /access logins

## What was found
- The Students tab's Add invoice opens the staff Create Invoice form. It loads products, terms, price rules, product categories, class timetables and student details directly from the database.
- Those tables can only be read by signed-in staff accounts. A password-only `/access` session isn't signed in, so every list comes back empty (branches load because they are public).
- Note: `Hp84894041` is not one of the configured passwords. Kembangan is `Hp84944041`. If `Hp84894041` was meant to be a new login, please confirm which branch it belongs to.

## Fix
1. Add one read-only server function, `get_access_invoice_catalog(branch_id)`, which returns the data the form needs for that branch: active products, product categories, active price rules, active terms, active class timetables and class pricing tiers.
2. Add a second read-only function for the selected student's details (DOB, allowed class types, available credit balance).
3. In the Create Invoice form, when the session is password-only (the same switch that already sends saves to `create_access_invoice`), load data through these functions instead of reading the tables directly. Signed-in staff keep the current behaviour.
4. Branch-locked passwords: the form stays locked to that password's branch.

## Verification
- Use Playwright to unlock `/access` with the Kembangan password, open a student, click Add invoice, and confirm products, terms and slots appear, then save a test invoice and delete it.
- Repeat with the all-branch password.

## Technical notes
- Functions are SECURITY DEFINER, `search_path = public`, return only active catalogue rows and non-sensitive student fields (no contact details).
- Security caveat still stands: password-only `/access` has no server-validated session, so these functions (like `create_access_invoice`) are callable by anyone with the anon key. Replacing this with a server-validated staff token is recommended as a follow-up.
