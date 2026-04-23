

## Plan: Move Uninvoiced count to the Students tab label

### What changes

In `src/components/dashboard/BranchDashboard.tsx`:

1. **Add the count to the Students tab label.** Change the tab trigger text from `Students` to `Students (X/Y)` where:
   - `X` = `uninvoicedCount` (active+inactive students at this branch with no non-cancelled lesson invoice for `displayTerm`)
   - `Y` = `totalActiveTerm` (active+inactive students at this branch)
   - Only shown when `displayTerm` exists; otherwise just `Students`.

2. **Remove the inline counter** (`Uninvoiced: X / Y`) currently rendered to the right of the Filter dropdown.

3. **Revert the filter badge label** for the Uninvoiced filter from `Uninvoiced Term (X/Y)` back to `Uninvoiced Term` — the count now lives only in the tab label.

### Behaviour after change

| Element | Before | After |
|---|---|---|
| Students tab label | `Students` | `Students (28/50)` |
| Inline counter beside Filter | `Uninvoiced: 28 / 50` | removed |
| Filter chip when active | `Uninvoiced Term (28/50)` | `Uninvoiced Term` |

The count still updates live via the existing query invalidation (no logic changes to `uninvoicedCount` / `totalActiveTerm` derivation or to the realtime subscriptions added previously).

### Files affected

- `src/components/dashboard/BranchDashboard.tsx` (only)

### Verification

1. Branch Dashboard → tabs row shows `Students (X/Y)` matching the previous inline counter values.
2. No `Uninvoiced: X / Y` text appears next to the Filter dropdown.
3. Selecting the Uninvoiced filter shows a plain `Uninvoiced Term` chip with no parenthetical count.
4. Creating/cancelling a current-term lesson invoice updates the `(X/Y)` in the tab label within ~1 s.
5. When no term is configured, the tab label is plain `Students`.

### Out of scope

- Counts on other tabs (Weekly Timetable, Invoice & Payment, Grading, Inventory, Notices) — unchanged.
- Filter logic, realtime subscriptions, query keys — unchanged.

