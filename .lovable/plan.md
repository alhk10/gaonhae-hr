
## Plan: Country-aware foundation belt system

### Current state
- `BELT_LEVELS` in `src/constants/beltLevels.ts` is a single list starting `Foundation 1, Foundation 2, Foundation 3, White, Yellow Tip, ...`
- Branches already carry a `country` field (`Singapore` / `Australia`) — Morley is just an Australian branch.
- Belt selectors everywhere render the same `BELT_LEVELS` regardless of country.
- New-student / registration forms default `current_belt` to empty string (no auto-default by age).
- Belt progression helpers (`getNextBeltLevel`, `compareBeltLevels`, etc.) operate on whichever array we feed them.

### Target rules
- **Singapore** branches use foundation belts: `Foundation 1`, `Foundation 2`, `Foundation 3`, then `White`, `Yellow Tip`, … (unchanged from today).
- **Australia** branches (Morley + any future AU branch) use a single `Foundation` belt, then `White`, `Yellow Tip`, … (no `Foundation 1/2/3`).
- **Default belt on new student creation/registration** based on country + DOB:
  - AU + age < 5 → `Foundation`
  - SG + age < 5 → `Foundation 1`
  - Any country + age ≥ 5 → `White`
  - If DOB or branch missing → no default (leave blank, as today).
- The system stays consistent: belt dropdowns, badges, validation, grading progression, and migrations all respect the per-country list.

### Implementation

**1. `src/constants/beltLevels.ts` — split lists by country**
```ts
export const COMMON_BELTS = ['White','Yellow Tip','Yellow','Green Tip','Green','Blue Tip','Blue','Red Tip','Red','Black Tip','1st Poom','1st Dan',...,'5th Dan'] as const;

export const SG_FOUNDATION = ['Foundation 1','Foundation 2','Foundation 3'] as const;
export const AU_FOUNDATION = ['Foundation'] as const;

export const SG_BELT_LEVELS = [...SG_FOUNDATION, ...COMMON_BELTS] as const;
export const AU_BELT_LEVELS = [...AU_FOUNDATION, ...COMMON_BELTS] as const;

// Union for storage validation / legacy displays
export const BELT_LEVELS = [...SG_FOUNDATION, ...AU_FOUNDATION, ...COMMON_BELTS] as const;
export const BELT_LEVELS_ARRAY: string[] = [...BELT_LEVELS];

export type Country = 'Singapore' | 'Australia';
export const getBeltLevelsForCountry = (country?: string | null): string[] =>
  country === 'Australia' ? [...AU_BELT_LEVELS] : [...SG_BELT_LEVELS];

export const getDefaultBeltForNewStudent = (country?: string | null, dob?: string | Date | null): string | null => {
  if (!country || !dob) return null;
  const age = /* years between dob and today */;
  if (age >= 5) return 'White';
  return country === 'Australia' ? 'Foundation' : 'Foundation 1';
};
```
Existing helpers (`getNextBeltLevel`, `compareBeltLevels`, `getDoubleBeltLevel`) gain an optional `country` argument and use the matching list when provided; default behaviour falls back to the SG list to preserve current callers.

**2. New helper `src/hooks/useBranchCountry.ts` (lightweight)**
Resolves a `branch_id` → country via the cached `useBranches()` data so any selector knows which list to render.

**3. Belt selector callsites — render country-specific list**
For each belt dropdown, look up the relevant student's / form's branch country and pass it to `getBeltLevelsForCountry(country)` instead of `BELT_LEVELS_ARRAY`. Files touched (uses found via grep):
- `src/components/sales/AddStudentDialog.tsx`, `EditStudentDialog.tsx`, `AddTrialDialog.tsx`, `ImportStudentsDialog.tsx`, `StudentManagementList.tsx`, `StudentHeader.tsx`
- `src/components/dashboard/StudentRegistrationApprovals.tsx`, `StudentDetailsDialog.tsx`, `StudentDashboard.tsx`, `BranchGradingList.tsx`, `QuickActionsSection.tsx`, `SlotAttendanceDialog.tsx`
- `src/components/notices/CreateEditNoticeDialog.tsx`, `src/components/miscellaneous/AddEditTemplateDialog.tsx`, `LetterTemplateSettingsDialog.tsx` (these target multiple branches → keep full union list, no change)
- `src/components/sales/AddProductDialog.tsx`, `EditProductDialog.tsx`, `AddGradingSlotDialog.tsx`, `BulkAddGradingSlotsDialog.tsx`, `InvoiceDialog.tsx`, `BranchClassScheduleManagement.tsx`, `ClassScheduleDialog.tsx` — branch-scoped, switch to country-aware list when a single branch is selected; otherwise show the union list.

**4. Defaults on new-student creation**
- `src/pages/StudentRegistration.tsx` (public form): on submit, before insert, compute default belt from selected branch + DOB and store on `student_registrations.current_belt`. Approval dialog already lets a superadmin override.
- `src/components/dashboard/StudentRegistrationApprovals.tsx`: when opening the review dialog, if `current_belt` is empty, prefill the selector with the computed default (still editable; "No Belt" remains an option).
- `src/components/sales/AddStudentDialog.tsx`: when branch + DOB are filled, auto-select the default belt (only if the user hasn't manually picked one).

**5. Grading progression**
`src/services/gradingService.ts` and any caller of `getNextBeltLevel`/`getDoubleBeltLevel` already work belt-by-belt. Pass the student's branch country so AU students go `Foundation → White → Yellow Tip …` while SG students keep `Foundation 1 → Foundation 2 → Foundation 3 → White …`. No behavioural change for SG.

**6. Database migration — extend belt validation**
`is_valid_belt_level` currently allows `'Foundation 1', 'Foundation 2', 'Foundation 3', 'White', …`. Add `'Foundation'` to the allowed array so AU students can be persisted. Existing SG records remain valid. No data backfill required (Morley students presumably already on White/None today; nothing forces a rewrite of historical belts).

**7. Verification (manual smoke test after build)**
- Open Add Student in a Singapore branch → belt dropdown shows `Foundation 1/2/3 + White…`. Pick DOB under 5 → defaults to `Foundation 1`.
- Switch to Morley (Australia) branch → belt dropdown shows `Foundation + White…` (no 1/2/3). DOB under 5 defaults to `Foundation`. DOB ≥ 5 defaults to `White`.
- Public `/register` for Morley with a 4-year-old → `current_belt = 'Foundation'` after approval.
- Existing AU students currently stored as `Foundation 1` keep working (still in union list) but the dropdown for that AU student displays AU-only options; the legacy value is shown as a one-time non-list value with a fallback render so it isn't lost.
- Grading list for Morley shows `Foundation → White` as next belt; SG branches unaffected.

### Out of scope
- Bulk migration of existing AU students from `Foundation 1/2/3` → `Foundation` (none expected, but if any exist a one-off SQL update can be run on request).
- Renaming branches or adding new countries (logic is country-keyed and easy to extend later).
