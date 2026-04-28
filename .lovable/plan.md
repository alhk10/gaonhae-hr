## Goal

Add a fourth filter tab — **"Yet to Receive"** — to the Students for Grading list, alongside the existing All / Missing Details / Ready for Printing tabs. It surfaces students who are ready for printing, have a passing result, and have not yet had their belt and certificate confirmed as received.

## Filter definition

A student is "Yet to Receive" when ALL hold:
- They pass the existing **Ready for Printing** condition (`allFilled && hasResult` from `getCompleteness`)
- Their result is `pass` or `double` (fails never receive a new belt/cert)
- The certificate has NOT been confirmed yet:
  - Single (`pass`): `certificate_issued === false`
  - Double: `!(certificate_issued && certificate_ii_issued)`

This exactly mirrors the disabled-state logic already used by the green Award confirmation button (`BranchGradingList.tsx` lines 884–885 / `GradingListTab.tsx` lines 875–876), so the tab disappears a row the moment confirmation is made.

## Files to edit

Apply identical changes to both list components (they're parallel implementations):

1. **`src/components/sales/GradingListTab.tsx`**
   - Line 75: extend `CompletionFilter` type to include `'yet_to_receive'`
   - Lines 482–489: extend `displayedStudents` filter to handle the new value
   - Line 785 area: add a new `<TabsTrigger value="yet_to_receive">Yet to Receive</TabsTrigger>` after Ready for Printing

2. **`src/components/dashboard/BranchGradingList.tsx`**
   - Line 75, 474–481, 773 area — same three changes

No service, schema, or query changes — all required fields (`result`, `certificate_issued`, `certificate_ii_issued`) are already selected.

**Approve to switch to default mode and implement.**