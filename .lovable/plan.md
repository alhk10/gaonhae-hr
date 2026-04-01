

## Plan: Fix Grading Tab Term Dropdown and Count

### Problems
1. **Past terms not shown in dropdown**: `BranchGradingList` uses `getActiveTermsForSelection()` which filters by `end_date >= today`, hiding past terms.
2. **Grading count shows 0/0**: The tab label metric uses `currentTerm` from `getCurrentTerm(branchId)` which returns null if today isn't within any active term. When null, metrics default to all zeros.

### Changes

#### 1. `src/services/termCalendarService.ts` — Add `getAllTermsForBranch()` function
- New function that fetches ALL terms (active and past) for a branch, ordered by `start_date DESC`
- No `end_date >= today` filter — includes past terms
- Used by the grading list dropdown

#### 2. `src/components/dashboard/BranchGradingList.tsx` — Use new function for terms
- Replace `getActiveTermsForSelection` with `getAllTermsForBranch(branchId)`
- Keep the auto-select logic: find the current term (today falls within start/end), otherwise pick the most recent term
- Past terms will appear in the dropdown below current/future terms

#### 3. `src/components/dashboard/BranchDashboard.tsx` — Fix grading tab count
- The tab label `Grading ({gradingPaidCount}/{totalTermStudents})` currently depends on `currentTerm` which can be null
- If `currentTerm` is null, fall back to the most recent term for the branch (same logic as grading list auto-select)
- Alternatively: fetch the nearest/most recent term when `currentTerm` is null, so metrics still display
- Change the query key and fetch to use a `displayTerm` that falls back to the latest term when no current term exists

### Technical Detail

**New service function:**
```typescript
export async function getAllTermsForBranch(branchId: string): Promise<Term[]> {
  const { data } = await supabase
    .from('term_calendars')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('start_date', { ascending: false });
  // attach branch name, breaks...
  return data || [];
}
```

**BranchDashboard fallback**: When `currentTerm` is null, fetch the most recent active term for the branch (latest `end_date` before today) and use it as `displayTerm` for grading metrics. The tab count query will use `displayTerm` instead of `currentTerm`.

