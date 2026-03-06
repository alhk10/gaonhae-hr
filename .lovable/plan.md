

## Plan: Add Languages & Reorder Dropdowns

### Problem
The language dropdown is missing Italian, Polish, and other common languages. Neither the language nor nationality dropdowns prioritize the most commonly selected options at the top.

### Changes

Update the `commonLanguages` and `commonNationalities` arrays in **3 files**:
- `src/components/sales/AddStudentDialog.tsx`
- `src/components/sales/EditStudentDialog.tsx`
- `src/pages/StudentRegistration.tsx`

#### Languages
- Add: Italian, Polish, Portuguese, Dutch, Swedish, Norwegian, Danish, Finnish, Greek, Turkish, Ukrainian, Romanian, Czech, Hungarian
- Reorder so **top 5 most common** appear first (separated by a natural ordering):
  1. English
  2. Mandarin
  3. Malay
  4. Tamil
  5. Hindi
  - Then the rest alphabetically

#### Nationalities
- Reorder so **top 5 most common** appear first:
  1. Singaporean
  2. Malaysian
  3. Chinese
  4. Indian
  5. Indonesian
  - Then the rest alphabetically (removing duplicates like country-name variants already in the list)

### Files to modify
- `src/components/sales/AddStudentDialog.tsx` (lines 41-70)
- `src/components/sales/EditStudentDialog.tsx` (lines 36-70)
- `src/pages/StudentRegistration.tsx` (lines 17-35 approx)

