## Bug

When confirming belt receipt for an AU `Foundation` student, the dialog shows "—" instead of "White Belt", and confirming throws "No higher belt available from Foundation".

## Root cause

`getBeltLevelsForCountry(country)` in `src/constants/beltLevels.ts` only matches `country === 'Australia'`. The grading list pages (and the `confirmBeltAndCertificate` call) pass the string `'AU'` instead, so the function falls back to the Singapore belt list — which has no `Foundation` entry — and `getNextBeltLevel('Foundation', 'AU')` returns `null`.

## Fix

Replace every `'AU'` country argument in the AU-only certificate / promotion code paths with `'Australia'`, matching the value the constants module expects.

Changes (6 sites total — all simple string swaps):

- `src/components/sales/GradingListTab.tsx`
  - line 578: `country: 'AU'` → `'Australia'`
  - line 593: `getNextBeltLevel(baseBelt, 'AU')` → `'Australia'`
  - line 664: `getNextBeltLevel(baseBelt, 'AU')` → `'Australia'`
  - lines 1118–1119: `getDoubleBeltLevel(cur, 'AU')` / `getNextBeltLevel(cur, 'AU')` → `'Australia'`

- `src/components/dashboard/BranchGradingList.tsx`
  - line 590: `getNextBeltLevel(baseBelt, 'AU')` → `'Australia'`
  - line 661: `getNextBeltLevel(baseBelt, 'AU')` → `'Australia'`
  - lines 1270–1271: `getDoubleBeltLevel(cur, 'AU')` / `getNextBeltLevel(cur, 'AU')` → `'Australia'`

No service or schema changes needed — `confirmBeltAndCertificate` already passes the country through transparently.

**Approve to switch to default mode and apply the fix.**