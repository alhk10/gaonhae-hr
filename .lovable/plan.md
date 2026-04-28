## Add status filter + age sort to the Grading List

Apply identical changes to both grading list components:
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`

### 1. Fetch `date_of_birth`
Extend the `students` select (line ~271 / ~280) to include `date_of_birth`, and add it to the `GradingListStudent` type and result mapping (both reg-based and lesson-fallback branches).

### 2. New helper: scorecard completeness
Add a small helper near the top of each file:
```ts
const getScorecardValue = (scorecard: ScorecardRow[], label: RegExp): string =>
  (scorecard.find(r => label.test(r.label))?.value || '').trim();

const isFieldFilled = (v: string) => v !== '' && v !== '-';

const getCompleteness = (s: GradingListStudent) => {
  const h = getScorecardValue(s.scorecard, /height/i);
  const w = getScorecardValue(s.scorecard, /weight/i);
  const p = getScorecardValue(s.scorecard, /poomsae/i);
  const k = getScorecardValue(s.scorecard, /kyorugi/i);
  const required = [h, w, p, k];
  const allFilled = required.every(isFieldFilled);
  const hasResult = !!s.result; // 'pass' | 'double' | 'fail'
  return { allFilled, hasResult };
};
```
The four required fields (Height, Weight, Poomsae, Kyorugi) match existing scorecard label patterns already used in the file (lines 672-673, 662-663).

### 3. Sort: belt asc, then age asc (youngest first)
Replace the current sort (lines ~420-430 / ~428) with a single rule applied to all rows:
```ts
result.sort((a, b) => {
  const beltCmp = beltRank(a.current_belt) - beltRank(b.current_belt);
  if (beltCmp !== 0) return beltCmp;
  // Age ascending = DOB descending (younger first)
  const aDob = a.date_of_birth || '';
  const bDob = b.date_of_birth || '';
  if (aDob !== bDob) return bDob.localeCompare(aDob);
  return a.student_name.localeCompare(b.student_name);
});
```
This removes the previous "unassigned-first / by slot date" grouping per the user's "Always sort" instruction.

### 4. Filter UI
Add `const [completionFilter, setCompletionFilter] = useState<'all' | 'missing' | 'ready_print'>('all');` and render a small `Tabs` (or segmented `Select`) next to the term selector in the CardHeader (line ~684):
```tsx
<Tabs value={completionFilter} onValueChange={v => setCompletionFilter(v as any)}>
  <TabsList className="h-8">
    <TabsTrigger value="all" className="text-xs h-6">All</TabsTrigger>
    <TabsTrigger value="missing" className="text-xs h-6">Missing Details</TabsTrigger>
    <TabsTrigger value="ready_print" className="text-xs h-6">Ready for Printing</TabsTrigger>
  </TabsList>
</Tabs>
```

### 5. Apply filter to displayed rows
Derive a `displayedStudents` memo from `students`:
```ts
const displayedStudents = useMemo(() => {
  if (completionFilter === 'all') return students;
  return students.filter(s => {
    const { allFilled, hasResult } = getCompleteness(s);
    if (completionFilter === 'missing') return !allFilled;
    return allFilled && hasResult; // ready_print
  });
}, [students, completionFilter]);
```
Use `displayedStudents` everywhere the desktop and mobile lists currently render `students` (table body, mobile cards, "no rows" empty state, bulk-select helpers).

Reset filter to `'all'` when the term changes (alongside `setSelectedIds(new Set())`).

### Files touched
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`

### Verification
- All tab → shows every student as before, sorted by belt then youngest-first.
- Missing Details → only students with empty Height, Weight, Poomsae, or Kyorugi.
- Ready for Printing → only students whose four fields AND Result are populated.
- Sort persists across filter changes.

Approve to implement.