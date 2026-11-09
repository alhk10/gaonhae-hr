# Fix Finance tab error "column s.full_name does not exist"

## Cause
The Finance running journal builds its entries from payments and credit refunds. It labels each entry with the student's name using a `full_name` field, but student records store first and last names separately. So every Finance view fails, and totals show $0.00.

## Fix
- Build the student name from first and last name, in capitals, for both payment entries and credit-refund entries.
- Other entries are unchanged.

## Check
- Run the journal for Balmoral, 01/11/2026–30/11/2026, and confirm entries and totals come back.

## Technical details
In `access_branch_journal`, replace the two `s.full_name` references with `upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')))`. Recreate the function with the identical signature.
