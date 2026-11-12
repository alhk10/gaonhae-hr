# Stop shared first names from linking forms to the wrong student

## What goes wrong today
- The guards order search pulls any student whose first **or** last name merely *contains* the typed name, and gives points for a partial name. "FARHAN" inside "LANA FARHAN YUSOFF" counted as a hit.
- The "is this the same person" check counts overlapping name words against the *shorter* name, so one shared word can look like a strong match.

## New rules (all forms: guards/uniform, grading, competition, seminar, school fees)
1. **Surname must agree.** A student can only be auto-linked when the surname matches a whole word of the submitted name (not a substring). A shared first name alone never links.
2. **Whole-word names only.** "FARHAN" matches the word FARHAN, never part of a longer name; partial-name points are removed.
3. **Date of birth must match** (the existing one-day tolerance for old records stays). No date of birth on either side means staff decide.
4. **Stricter name overlap.** Overlap is measured against the longer name, and at least two words must be shared, so "FARHAN SHAIKH" vs "LANA FARHAN YUSOFF" is treated as different people.
5. Anything that fails these rules still appears as a suggestion for staff, marked "Name differs" / "Surname differs", but is never linked automatically.
6. Remembered staff choices (like the Farhan fix) keep working and take priority.

## Clean-up check
- Scan all currently linked guards, grading, competition, seminar and school-fee submissions and list any that would fail the new rules, so you can review them. Nothing is changed automatically.

## Technical details
- `src/services/guardsPurchaseService.ts` `findStudentMatches`: token-based first/last name comparison; drop `includes` scoring; candidate query stays broad but scoring uses whole tokens.
- `src/utils/submissionMatchConfidence.ts`: `nameSimilarity` denominator = longer name, require >= 2 shared tokens or exact full match; add surname-token check to `matchContradiction`; require DOB present for `pickAutoMatch` to link.
- Add tests in `src/utils/submissionMatchConfidence.test.ts`: FARHAN SHAIKH vs LANA FARHAN YUSOFF not auto-linked; exact name + DOB links; one-day DOB drift with same name links; siblings sharing surname + email but different DOB not linked.
- Read-only SQL report of existing linked rows failing the rule.
