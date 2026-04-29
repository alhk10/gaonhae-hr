## Goal

Fix the Grade Certificate so it shows the belt the student **passed FROM** (their `current_belt` at the time of grading), not the new belt awarded.

For Kalli (current_belt = White, target = Yellow Tip, result = pass), the certificate should read:

> Has successfully passed the **White Belt**

…instead of "Yellow Tip Belt".

## Root cause

In `src/components/dashboard/BranchGradingList.tsx` and `src/components/sales/GradingListTab.tsx`:

- **Certificate I** uses `beltAchieved = student.current_belt`. This is correct in spirit, but if a user clicked **Certificate II** (which uses `getNextBeltLevel(current_belt)`), or if `current_belt` had already been promoted via "Confirm Belt", the cert prints the next belt — which the user is interpreting as wrong.
- The Kalli certificate in the screenshot shows "Yellow Tip", which means either Cert II was used OR the bulk-double path printed the next belt.
- The user's rule: the certificate should always print the belt the student **passed (i.e. their pre-grading belt = `current_belt` on the grading registration)**.

## Changes

### 1. `gradingCertificatePDFGenerator.ts`
- No structural change needed. The text "Has successfully passed the {belt}" stays the same.
- Add a clarifying JSDoc on `beltAchieved` so future devs know it should be the **belt passed FROM (pre-grading belt)**.

### 2. `src/components/dashboard/BranchGradingList.tsx`
- `runCertificate(student, certificateNumber)`:
  - Single certificate (Cert I) → `beltAchieved = registration.current_belt` (the belt at time of grading), falling back to `student.current_belt`.
  - Cert II button → also use `current_belt` (since the rule is "passed FROM"). Effectively Cert II becomes a duplicate for single-pass students. **For double-pass students**, Cert II = `getNextBeltLevel(current_belt)` (the intermediate belt they also passed FROM on the way to double promotion).
- `buildBulkInputs` (bulk print):
  - Primary cert → `beltAchieved = current_belt` (already correct).
  - Double-pass second cert → `beltAchieved = getNextBeltLevel(current_belt)` (already correct — this is the intermediate "passed FROM" belt for the second jump).
  - No change needed for bulk; already aligned with new rule.

### 3. `src/components/sales/GradingListTab.tsx`
- Mirror the same fix as `BranchGradingList.tsx` (file is structurally identical for cert logic).

## Behaviour after fix

| Scenario | Cert I | Cert II |
|---|---|---|
| Single pass (e.g. Kalli, White → Yellow Tip) | "passed the **White Belt**" | "passed the **White Belt**" (same — Cert II only meaningful for doubles) |
| Double pass (e.g. White → Yellow) | "passed the **White Belt**" | "passed the **Yellow Tip Belt**" (the intermediate belt) |

## Out of scope

- No DB migration. Kalli's record is correct (current_belt=White, target=Yellow Tip, pass).
- No change to the "Confirm Belt" flow that promotes `student.current_belt` after grading.
- No change to certificate layout, fonts, or footer.

## Files to edit

- `src/utils/gradingCertificatePDFGenerator.ts` (doc only)
- `src/components/dashboard/BranchGradingList.tsx` (runCertificate)
- `src/components/sales/GradingListTab.tsx` (runCertificate)
