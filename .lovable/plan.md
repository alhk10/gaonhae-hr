

# Plan: Fix Term Breaks Not Hiding in Class Schedule Selector

## Problem Analysis

The weeks of Oct 5 and Oct 12 are showing in the class schedule despite being configured as term breaks ("Mid Term Break" from 2026-10-05 to 2026-10-16). 

**Root Cause**: The `getActiveTermsForSelection()` function in `termCalendarService.ts` does **not** fetch the `term_breaks` data for each term. When terms are passed to the `ClassScheduleSelector` component, the `term.breaks` property is `undefined`, causing the break filtering logic to never exclude any weeks.

### Evidence from Database
```
Term: Term 4 2026 (id: 1a625152-ed4f-4163-9c3f-33ed935c2df2)
Break: Mid Term Break | start_date: 2026-10-05 | end_date: 2026-10-16
```

### Current Code Issue
```typescript
// getActiveTermsForSelection() returns:
return termData.map(term => ({
  ...term,
  branch_name: branchMap[term.branch_id] || term.branch_id,
  grace_days: term.grace_days ?? 7
  // ❌ Missing: breaks: [...]
}));
```

---

## Solution

Modify the `getActiveTermsForSelection()` function to also fetch and include term breaks, similar to how the `getTerms()` function already does.

---

## Implementation Details

### File: `src/services/termCalendarService.ts`

**Changes to `getActiveTermsForSelection()` (lines 361-401)**:

1. After fetching the terms, also fetch all term breaks for those terms
2. Group breaks by term_id
3. Include the breaks array in the returned term objects

### Updated Function Logic

```typescript
export async function getActiveTermsForSelection(): Promise<Term[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('term_calendars')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', today)
      .order('branch_id')
      .order('start_date');

    if (error) throw error;

    const termData = data || [];
    
    // Fetch branch names
    const branchIds = [...new Set(termData.map(t => t.branch_id))];
    let branchMap: Record<string, string> = {};
    
    if (branchIds.length > 0) {
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);
      
      branchMap = (branchesData || []).reduce((acc, b) => {
        acc[b.id] = b.name;
        return acc;
      }, {} as Record<string, string>);
    }

    // NEW: Fetch term breaks for all terms
    const termIds = termData.map(t => t.id);
    let breaks: TermBreak[] = [];
    
    if (termIds.length > 0) {
      const { data: breaksData, error: breaksError } = await supabase
        .from('term_breaks')
        .select('*')
        .in('term_id', termIds)
        .order('start_date');
      
      if (breaksError) {
        logger.warn('Failed to fetch term breaks for selection', breaksError);
      } else {
        breaks = breaksData || [];
      }
    }

    return termData.map(term => ({
      ...term,
      branch_name: branchMap[term.branch_id] || term.branch_id,
      grace_days: term.grace_days ?? 7,
      breaks: breaks.filter(b => b.term_id === term.id)  // NEW
    }));
  } catch (error) {
    logger.error('Failed to get active terms for selection', error);
    return [];
  }
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/termCalendarService.ts` | Update `getActiveTermsForSelection()` to fetch and include term breaks |

---

## Expected Result

After this fix:
- Weeks that overlap with term breaks (Oct 5-16) will be correctly hidden
- The class schedule selector will only show teaching weeks
- No changes needed to `ClassScheduleSelector.tsx` as it already has the logic to filter break weeks

---

## Technical Notes

- This mirrors the pattern already used in `getTerms()` function (lines 85-154) which correctly fetches breaks
- The `ClassScheduleSelector` component's `isWeekInBreak()` helper is already correctly implemented
- The public holiday filtering also works correctly (just no holidays configured for October 2026)

