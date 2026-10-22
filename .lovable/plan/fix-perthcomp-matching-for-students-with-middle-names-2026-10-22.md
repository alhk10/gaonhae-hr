# Fix /perthcomp matching for students with middle names

## Cause
Thomas is saved as first name "THOMAS HAJOON", last name "HORSFALL" (DOB 15/02/2017, active). Matching needs the whole first name to be identical, so typing just "Thomas" fails. His sister Emily ("EMILY HANA") would fail the same way.

## Change
Count names as matching when:
- the full names are the same (current rule), or
- the first name typed is one complete word of the saved first name (e.g. "Thomas" or "Hajoon" both match "THOMAS HAJOON"), or the other way round, and the last name matches exactly.

Swapped first/last order, the 1-day date-of-birth tolerance and the active/trial rule all stay. Because date of birth must still match, siblings won't be confused.

## Technical details
- Add a shared SQL helper `_perth_name_match(rec_first, rec_last, in_first, in_last)` that compares whole words, case and spaces ignored, in both name orders.
- Use it in `check_perth_gaonhae_student` (the instant check) and in `submit_perth_event_registration` (the price charged), so they always agree.
- Verify that Thomas Horsfall with DOB 15/02/2017 now returns a match.
