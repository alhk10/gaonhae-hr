# Allow swapped name order in /perthcomp student matching

## Current rules (unchanged)
An entrant gets the $40 Gaonhae rate when one student record matches all of:
- First and last name (case and extra spaces ignored)
- Date of birth within 1 day
- Status active or trial (any branch)

## Change
Also accept a match when the entrant typed the names the wrong way round (first name entered as last name, and vice versa). Date of birth and status rules stay the same.

## Technical details
- Migration: update `check_perth_gaonhae_student` to add an OR branch comparing `p_first` to `last_name` and `p_last` to `first_name`. Still returns boolean only; grants unchanged.
- Apply the same swap rule in the server-side registration price check that uses this function, so the price shown and the price charged agree.
- No front-end changes needed.
