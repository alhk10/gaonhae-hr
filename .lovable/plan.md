## Goal

From Term 2 onward, all Australian branches (Morley + others) use the Foundation 1 / 2 / 3 progression instead of the single "Foundation" belt — matching Singapore. New-student default rules also widen: students under 7 (was under 5) default to Foundation 1.

Belt-list change only. No bulk update of existing student belt records in this plan — that can be a follow-up data migration once UI behaviour is confirmed.

## Changes — `src/constants/beltLevels.ts`

1. **AU foundation list** — change `AU_FOUNDATION` from `['Foundation']` to `['Foundation 1', 'Foundation 2', 'Foundation 3']`. `AU_BELT_LEVELS` then mirrors `SG_BELT_LEVELS`.
2. **Union `BELT_LEVELS`** — keep the legacy `'Foundation'` value in the union (and in `FOUNDATION_TO_BLACK_TIP`) so existing student records on `'Foundation'` still validate, display, and qualify for AU/Morley certificates. It will simply no longer appear in dropdowns.
3. **`getDefaultBeltForNewStudent`** — raise the age cutoff from `< 5` to `< 7` for BOTH countries, and return `'Foundation 1'` for AU as well as SG. Age ≥ 7 → `'White'`. Result:

   ```text
   age < 7  → Foundation 1   (any country)
   age ≥ 7  → White
   ```

## Out of scope (call-outs)

- No data migration of existing `students.belt_level = 'Foundation'` rows to `'Foundation 2'`. Confirm whether to run that as a separate one-off update afterward (Morley only, or all AU branches).
- No changes to grading product names, grading flow, or `nextGradingProduct.ts` — `Foundation >> White`-style products on existing students continue to resolve via the union list.
- No UI/component edits: every belt dropdown already reads from `getBeltLevelsForCountry(country)` (registration, add/edit student, trial, public payment forms), so they pick up the new list automatically.

## Verification

- AU branch student dropdowns show Foundation 1/2/3 (no plain "Foundation").
- SG behaviour unchanged in the dropdown; new SG student aged 6 now defaults to Foundation 1 instead of White.
- Existing students saved as `'Foundation'` still render and still get AU foundation certificates.
