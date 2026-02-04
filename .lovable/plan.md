
# Plan: Show Current Term in School Fees Selection

## Problem Analysis

The current term (Term 1 2026) is missing from the term selection dropdown in the "Pay School Fees" dialog. Looking at your screenshot, only Terms 2, 3, and 4 are showing.

**Root Cause**: In `QuickActionsSection.tsx`, the term filtering logic excludes any term where `start_date < today`:

```javascript
terms.filter(t => 
  t.branch_id === student.branch_id && 
  t.start_date >= today  // ❌ Excludes current term!
);
```

Since Term 1 2026 started on 2026-01-19 and today is 2026-02-04, the condition `start_date >= today` is false, so Term 1 is excluded—even though it's still active (ending 2026-04-10).

---

## Solution

Update the filter to include terms where:
1. The term is in the future (`start_date >= today`), OR
2. The term is currently active (`start_date <= today AND end_date >= today`)

Since `getActiveTermsForSelection()` already filters by `end_date >= today`, we simply need to remove the `start_date >= today` condition to show all active and future terms.

---

## Implementation Details

### File: `src/components/dashboard/QuickActionsSection.tsx`

**Change** (lines 54-58):

**Before**:
```javascript
const terms = await getActiveTermsForSelection();
const today = new Date().toISOString().split('T')[0];
return terms.filter(t => 
  t.branch_id === student.branch_id && 
  t.start_date >= today
);
```

**After**:
```javascript
const terms = await getActiveTermsForSelection();
// Only filter by branch - getActiveTermsForSelection() already 
// returns terms where end_date >= today
return terms.filter(t => t.branch_id === student.branch_id);
```

---

## Summary

| File | Change |
|------|--------|
| `src/components/dashboard/QuickActionsSection.tsx` | Remove `start_date >= today` filter to include current term |

---

## Expected Result

After this fix:
- Term 1 2026 will appear in the dropdown (since it's still active with end_date 2026-04-10)
- The "Remaining weeks" option will appear for Term 1 (as it's the current term)
- Future terms (Term 2, 3, 4) will continue to show
- Terms that have already ended will remain hidden (handled by `getActiveTermsForSelection`)
