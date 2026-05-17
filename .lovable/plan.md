## Required fields + age-based belt filtering

**File:** `src/pages/public/PublicGradingPayment.tsx`

### Required fields
Add `*` markers to labels for Student Name, Email, Date of Birth, Branch. Add `required` to Branch and DOB validation (DOB already required in `canSubmit`; surface visual cue + block belt selection until DOB present).

### Age-based belt filter
Compute `age` from DOB (already available). Filter `beltOptions` before rendering the Current Belt `Select`:
- Foundation 1/2/3 (and AU "Foundation"): visible only if `age <= 5`
- 1st–4th Poom: visible only if `age < 15`
- 1st–4th Dan, 5th Dan: visible only if `age >= 15`
- All other belts (White → Black Tip, plus no DOB yet): always visible

Disable the Current Belt select until both Branch AND DOB are set (placeholder: "Select date of birth first" when DOB missing).

If currentBelt becomes invalid after DOB change, reset it (extend existing reset effect at line 192).

### Implementation details
- Add helper `filterBeltsByAge(belts, age)` near `resolveAgeGating`.
- Apply filter in the `beltOptions` memo (line 149).
- Update labels at lines 414, 426, 439, 455 to append ` *`.
- Update Select trigger at line 466 to be `disabled={!branchId || !dob}` and change placeholder dynamically.

No backend/schema changes.
