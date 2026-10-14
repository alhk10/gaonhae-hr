# Change youngest /perthcomp age category from 4–6 to 5–6

## Change
The youngest competition age division becomes **5–6** instead of 4–6. A 4-year-old (by birth year) is no longer eligible to enter the competition.

## Steps

1. **Frontend rules** (`src/utils/perthCompRules.ts`)
   - `AGE_DIVISIONS`: first entry '4–6' → '5–6' (updates the "2. Age categories" list on the page).
   - `ageDivision()`: return null below age 5; map age 5–6 to '5-6'.

2. **Server-side enforcement** (new migration)
   - `submit_perth_event_registration(jsonb)`: minimum age check changes from "at least 4 years old" to "at least 5 years old"; age-division label becomes '5-6'.
   - All other rules (deadline, grades, events, caps) unchanged.

3. **Tests** (`src/utils/perthCompRules.test.ts`)
   - Update the age test: age 6 → division '5-6'; add assertion that age 4 returns null.

4. **Project memory** — update the Perth Comp 2026 note's division list to start at 5–6.

## Verification
- Run the rules test file.
- Confirm the migration applies and the stored function has the new checks; build stays clean and the page shows 5–6.
